/*
 * NeuralOps — motor de diagnóstico reutilizável.
 * Cada vertical (geral, saúde, próximas) registra uma configuração com NXDiag.register({...}).
 * Fluxo: perguntas → contato (obrigatório para ver o relatório) → tela de geração → relatório.
 */
(function () {
  'use strict';
  var V = {};
  var NX = window.NX || { track: function () {}, withUtm: function (u) { return u; }, getUtm: function () { return {}; }, config: {} };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var ARROW = (window.NX && NX.arrow) || '';

  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function uid() { return 'D' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase(); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ───────────────────────── Pontuação ─────────────────────────
  var LEVELS = [
    { max: 24, label: 'Poucos sinais de fragilidade nas respostas.' },
    { max: 49, label: 'Pontos de atenção identificados.' },
    { max: 74, label: 'Gargalos que merecem investigação.' },
    { max: 100, label: 'Alta concentração de sinais de fragilidade.' }
  ];
  function level(score) { for (var i = 0; i < LEVELS.length; i++) if (score <= LEVELS[i].max) return i; return 3; }

  function questionList(cfg) {
    var out = [];
    cfg.questions.forEach(function (q) { if (q.parts) q.parts.forEach(function (p) { out.push(p); }); else out.push(q); });
    return out;
  }
  function findQ(cfg, id) { return questionList(cfg).filter(function (q) { return q.id === id; })[0]; }
  function opt(cfg, qid, v) {
    var q = findQ(cfg, qid); if (!q || Array.isArray(v)) return null;
    return q.options.filter(function (o) { return o.v === v; })[0] || null;
  }

  /* risco_dimensao = soma_pontos_validos / soma_maximos_possiveis * 100.
     "Não se aplica" e respostas sem pontuação saem do denominador; "Não sei" marca baixa confiança. */
  function score(cfg, answers) {
    var dims = cfg.dimensions.map(function (d) {
      var sum = 0, max = 0, n = 0, low = 0, asked = 0;
      d.q.forEach(function (pair) {
        var qid = pair[0], w = pair[1] == null ? 1 : pair[1];
        var a = answers[qid]; if (a == null) return;
        asked++;
        var o = opt(cfg, qid, a); if (!o) return;
        if (o.lowConf) low++;
        if (o.na || o.risk == null) return;
        sum += o.risk * w; max += 3 * w; n++;
      });
      var s = max ? Math.round(sum / max * 100) : null;
      return { id: d.id, label: d.label, short: d.short || d.label.toLowerCase(), score: s, level: s == null ? null : level(s), scored: n, asked: asked, low: low, preliminary: d.q.length < 2 || n < 2, def: d };
    });
    var scoredAnswers = 0, lowAnswers = 0;
    questionList(cfg).forEach(function (q) {
      if (!q.scored) return;
      var o = opt(cfg, q.id, answers[q.id]); if (!o) return;
      scoredAnswers++; if (o.lowConf) lowAnswers++;
    });
    var noData = dims.filter(function (d) { return d.score == null; }).length;
    // Nunca "alta": respostas autodeclaradas não substituem medição real.
    var conf = (!lowAnswers && !noData) ? 'Boa para triagem' : (lowAnswers <= 2 && noData <= 1 ? 'Moderada' : 'Limitada');
    var pd = cfg.priorityDim ? cfg.priorityDim(answers) : null;
    var ranked = dims.filter(function (d) { return d.score != null; }).slice().sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if ((pd === a.id) !== (pd === b.id)) return pd === a.id ? -1 : 1;
      return cfg.dimensions.indexOf(a.def) - cfg.dimensions.indexOf(b.def);
    });
    return { dims: dims, ranked: ranked, top: ranked[0] || null, second: ranked[1] || null, lowAnswers: lowAnswers, scoredAnswers: scoredAnswers, confidence: conf, structured: !ranked.length || ranked[0].score < 25 };
  }

  // Score comercial: separado do diagnóstico. Hipótese inicial de qualificação.
  function commercial(cfg, answers, role, sc) {
    var c = cfg.commercial, pts = { faturamento: 0, urgencia: 0, complexidade: 0, papel: 0 };
    var rev = opt(cfg, c.revenueQ, answers[c.revenueQ]); pts.faturamento = rev && rev.cs != null ? rev.cs : 0;
    var urg = opt(cfg, c.urgencyQ, answers[c.urgencyQ]); pts.urgencia = urg && urg.cs != null ? urg.cs : 0;
    pts.complexidade = c.complexity(answers, sc);
    pts.papel = ({ dono: 3, diretor: 2, coord: 1, colab: 0, outro: 0 })[role] || 0;
    var total = pts.faturamento + pts.urgencia + pts.complexidade + pts.papel;
    return { total: total, max: 12, tier: total >= 9 ? 'alta' : (total >= 5 ? 'intermediaria' : 'nutricao'), points: pts, reviewComplexity: !!(rev && rev.review) };
  }

  // ───────────────────────── Codificação do relatório (sem dados pessoais) ─────────────────────────
  // Escolha única: 1 caractere (índice). Múltipla: 2 caracteres (máscara de bits, até 10 opções).
  function encode(cfg, answers) {
    return questionList(cfg).map(function (q) {
      var vals = q.options.map(function (o) { return o.v; });
      if (q.multi) {
        var m = 0; (answers[q.id] || []).forEach(function (v) { var k = vals.indexOf(v); if (k >= 0) m |= 1 << k; });
        return m ? ('0' + m.toString(36)).slice(-2) : '__';
      }
      var i = vals.indexOf(answers[q.id]);
      return i < 0 ? '_' : i.toString(36);
    }).join('');
  }
  function decode(cfg, code) {
    var a = {}, list = questionList(cfg), pos = 0;
    var total = list.reduce(function (n, q) { return n + (q.multi ? 2 : 1); }, 0);
    if (!code || code.length !== total) return null;
    list.forEach(function (q) {
      if (q.multi) {
        var chunk = code.substr(pos, 2); pos += 2;
        if (chunk === '__') return;
        var m = parseInt(chunk, 36), arr = q.options.filter(function (o, k) { return m & (1 << k); }).map(function (o) { return o.v; });
        if (arr.length) a[q.id] = arr;
        return;
      }
      var ch = code[pos++]; if (ch === '_') return;
      var o = q.options[parseInt(ch, 36)]; if (o) a[q.id] = o.v;
    });
    return a;
  }
  function resultHash(cfg, st) {
    return '#r=' + encode(cfg, st.answers) + '&v=' + encodeURIComponent(cfg.version) + '&id=' + encodeURIComponent(st.id) + '&t=' + (st.completedAt || Date.now());
  }
  function answerLabel(cfg, qid, answers) {
    var v = answers[qid];
    if (Array.isArray(v)) { var q = findQ(cfg, qid); var ls = q.options.filter(function (o) { return v.indexOf(o.v) >= 0; }).map(function (o) { return o.l; }); return ls.length ? ls.join(', ') : 'Não respondida'; }
    var o = opt(cfg, qid, v); return o ? o.l : 'Não respondida';
  }

  // ───────────────────────── Contato, envio e geração ─────────────────────────
  function field(id, label, type, ac, val) {
    return '<div class="field"><label for="f-' + id + '">' + label + '</label><input id="f-' + id + '" name="' + id + '" type="' + type + '" autocomplete="' + ac + '" required maxlength="120" value="' + esc(val || '') + '" /><span class="err" id="e-' + id + '"></span></div>';
  }
  function leadFormHtml(cfg, prev) {
    prev = prev || {};
    return '<form id="lead-form" novalidate><div class="form-grid">' +
      field('nome', 'Seu nome', 'text', 'name', prev.name) + field('empresa', cfg.companyLabel, 'text', 'organization', prev.company) +
      field('email', 'E-mail', 'email', 'email', prev.email) + field('whatsapp', 'WhatsApp com DDD', 'tel', 'tel', prev.whatsapp) +
      '<div class="field full"><label for="f-cargo">Seu cargo</label><select id="f-cargo" name="cargo" required><option value="">Selecione</option><option value="dono">Dono(a) ou sócio(a)</option><option value="diretor">Diretor(a) ou gestor(a) responsável</option><option value="coord">Coordenação ou supervisão</option><option value="colab">Colaborador(a)</option><option value="outro">Outro</option></select><span class="err" id="e-cargo"></span></div>' +
      '<div class="hp" aria-hidden="true"><label for="f-site">Site</label><input id="f-site" name="site" tabindex="-1" autocomplete="off" /></div>' +
      '<label class="consent full"><input type="checkbox" id="f-termos" required /><span>Li e aceito a <a href="/privacidade/" target="_blank" rel="noopener">política de privacidade</a>. Meus dados serão usados para enviar o diagnóstico e para contato sobre ele.</span></label>' +
      '<span class="err full" id="e-termos"></span>' +
      '<label class="consent full"><input type="checkbox" id="f-mkt" /><span>Opcional: quero receber conteúdos e novidades da NeuralOps por e-mail. Posso cancelar quando quiser.</span></label>' +
      '<div class="full"><button type="submit" class="btn btn-lime" id="f-submit" style="width:100%">Gerar meu diagnóstico' + ARROW + '</button></div></div></form>';
  }
  function readForm(cfg) {
    var v = function (id) { return ($('#f-' + id).value || '').trim(); };
    var errs = {};
    if (v('nome').length < 2) errs.nome = 'Informe seu nome.';
    if (v('empresa').length < 2) errs.empresa = 'Informe o nome da ' + cfg.entity + '.';
    if (!v('cargo')) errs.cargo = 'Selecione seu cargo.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) errs.email = 'Confira o e-mail: ele precisa ter o formato nome@empresa.com.br.';
    var digits = v('whatsapp').replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) errs.whatsapp = 'Informe o WhatsApp com DDD, por exemplo (11) 99999-9999.';
    if (!$('#f-termos').checked) errs.termos = 'Para gerar o diagnóstico, é preciso aceitar a política de privacidade.';
    ['nome', 'empresa', 'cargo', 'email', 'whatsapp', 'termos'].forEach(function (k) {
      var el = $('#e-' + k); if (el) el.textContent = errs[k] || '';
      var inp = $('#f-' + k); if (inp && k !== 'termos') inp.setAttribute('aria-invalid', errs[k] ? 'true' : 'false');
    });
    var first = Object.keys(errs)[0];
    if (first) { var fe = $('#f-' + first); if (fe) fe.focus(); return null; }
    return { name: v('nome'), company: v('empresa'), role: v('cargo'), email: v('email'), whatsapp: digits, marketing: $('#f-mkt').checked, hp: v('site') };
  }

  function sendLead(cfg, answers, meta, contact, formMs) {
    var sc = score(cfg, answers), R = cfg.report(answers, sc, contact);
    var com = commercial(cfg, answers, contact.role, sc);
    var now = new Date().toISOString();
    var payload = {
      quizType: cfg.id, quizVersion: cfg.version, diagnosticId: meta.id,
      contact: { name: contact.name, company: contact.company, role: contact.role, email: contact.email, whatsapp: contact.whatsapp },
      answers: questionList(cfg).map(function (q) { return { id: q.id, question: q.reportLabel || q.title, answer: answerLabel(cfg, q.id, answers) }; }).filter(function (a) { return a.answer !== 'Não respondida'; }),
      answerCode: encode(cfg, answers),
      profile: cfg.profileRows(answers),
      scores: sc.dims.map(function (d) { return { id: d.id, label: d.label, score: d.score, preliminary: d.preliminary, lowVisibility: d.low > 0 }; }),
      topDimension: sc.top && !sc.structured ? sc.top.label : null,
      mainPain: cfg.mainPain(answers), confidence: sc.confidence,
      summary: { title: R.focusTitle, recommendations: R.recs.slice(0, 3) },
      commercial: com,
      utm: NX.getUtm(), firstPage: (NX.load && NX.load('nx_first_page')) || null, referrer: document.referrer || null,
      startedAt: meta.startedAt || null, completedAt: meta.completedAt,
      consents: { privacy: { accepted: true, purpose: 'envio do diagnóstico e contato sobre ele', at: now }, marketing: { accepted: !!contact.marketing, purpose: 'conteúdos e novidades por e-mail', at: now } },
      bookingStatus: 'nao_agendado', hp: contact.hp, formMs: formMs
    };
    return fetch(NX.config.leadEndpoint || '/api/diagnostico-lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error('lead');
        NX.track('lead_submitted', { quiz_type: cfg.id, commercial_tier: com.tier, marketing_opt_in: !!contact.marketing });
        return { ok: true, email: res.j && res.j.email };
      })
      .catch(function () { NX.track('lead_submit_error', { quiz_type: cfg.id }); return { ok: false }; });
  }

  // Tela de geração: tempo mínimo para a pessoa ler o que está acontecendo; o envio roda em paralelo.
  function generating(cfg, host, contact, work) {
    var steps = (cfg.generatingSteps || ['Organizando suas respostas', 'Calculando os sinais por área', 'Identificando o principal ponto de atenção', 'Montando as recomendações']);
    host.innerHTML = '<div class="gen" role="status" aria-live="polite"><div class="gen-orb" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<span class="kicker">' + esc(cfg.shortName) + '</span>' +
      '<h1 class="qz-q gen-title">Analisando os dados e gerando o diagnóstico da <span class="green">' + esc(contact.company) + '</span></h1>' +
      '<ul class="gen-steps">' + steps.map(function (s, i) { return '<li data-i="' + i + '">' + esc(s) + '</li>'; }).join('') + '</ul></div>';
    window.scrollTo({ top: 0 });
    var items = host.querySelectorAll('.gen-steps li');
    var per = 1100;
    items.forEach(function (li, i) {
      setTimeout(function () { li.classList.add('on'); if (i) items[i - 1].classList.add('done'); }, i * per + 150);
    });
    return Promise.all([work, sleep(items.length * per + 400)]).then(function (r) {
      items[items.length - 1].classList.add('done');
      return sleep(350).then(function () { return r[0]; });
    });
  }

  // ───────────────────────── Quiz ─────────────────────────
  function visibleSteps(cfg, answers) { return cfg.questions.filter(function (q) { return !q.showIf || q.showIf(answers); }); }

  function runQuiz(cfg, host) {
    var KEY = cfg.storageKey;
    var saved = lsGet(KEY);
    var st = saved && !saved.completedAt && saved.version === cfg.version ? saved : null;
    var fresh = !st;
    if (!st) st = { id: uid(), version: cfg.version, answers: {}, idx: 0, startedAt: Date.now() };
    var lastAnswered = null, done = false, onLead = false;

    function save() { lsSet(KEY, st); }
    function steps() { return visibleSteps(cfg, st.answers); }
    var mainTotal = cfg.questions.filter(function (q) { return !q.optional; }).length;

    function progress() {
      var s = steps(), cur = s[st.idx], n = 0;
      for (var i = 0; i < st.idx; i++) if (!s[i].optional) n++;
      return { pos: Math.min(n + (cur && !cur.optional ? 1 : 0), mainTotal), pct: Math.round(n / (mainTotal + 1) * 100) };
    }
    function answered(q) {
      if (q.parts) return q.parts.every(function (p) { return st.answers[p.id] != null; });
      var v = st.answers[q.id];
      return Array.isArray(v) ? v.length > 0 : v != null;
    }

    function render() {
      onLead = false;
      var s = steps(); var q = s[st.idx];
      if (!q) return showLead();
      var pr = progress();
      var title = typeof q.title === 'function' ? q.title(st.answers, cfg) : q.title;
      var help = typeof q.help === 'function' ? q.help(st.answers, cfg) : q.help;
      var html = '<div class="qz-top"><span>' + esc(cfg.shortName) + '</span><span>' + (q.optional ? 'Pergunta complementar' : 'Pergunta <b>' + pr.pos + '</b> de ' + mainTotal) + '</span></div>' +
        '<div class="qz-progress" role="progressbar" aria-label="Progresso do diagnóstico" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pr.pct + '"><i style="width:' + pr.pct + '%"></i></div>' +
        '<div class="qz-card"><h1 class="qz-q" id="qz-title" tabindex="-1">' + esc(title) + '</h1>';
      if (help) html += '<p class="qz-help">' + esc(help) + '</p>';
      if (q.multi) html += '<p class="qz-multi-hint">Você pode marcar mais de uma opção.</p>';
      if (q.parts) q.parts.forEach(function (p) { html += '<div class="qz-sub" id="lbl-' + p.id + '">' + esc(p.title) + '</div>' + optsHtml(p, 'lbl-' + p.id); });
      else html += optsHtml(q, 'qz-title');
      html += '<div id="qz-extra" aria-live="polite"></div></div>' +
        '<div class="qz-nav"><button type="button" class="qz-back" id="qz-back"' + (st.idx === 0 ? ' hidden' : '') + '>← Voltar</button>' +
        '<div class="btn-row" style="gap:16px">' + (q.optional ? '<button type="button" class="qz-skip" id="qz-skip">Pular esta pergunta</button>' : '') +
        '<button type="button" class="btn btn-lime" id="qz-next"' + (answered(q) ? '' : ' disabled') + '>Continuar' + ARROW + '</button></div></div>' +
        '<p class="qz-foot">' + esc(cfg.footNote) + '</p>';
      host.innerHTML = html;
      bind(q);
      showExtra(q);
      NX.track('quiz_question_view', { quiz_type: cfg.id, quiz_version: cfg.version, question_id: q.id, step: st.idx + 1 });
      var t = $('#qz-title'); if (t && document.activeElement !== document.body) t.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function optsHtml(q, labelledby) {
      var two = q.options.length >= 6 && q.options.every(function (o) { return o.l.length < 34; });
      var cur = st.answers[q.id];
      return '<div class="qz-opts' + (two ? ' two' : '') + (q.multi ? ' multi' : '') + '" role="' + (q.multi ? 'group' : 'radiogroup') + '" aria-labelledby="' + labelledby + '" data-q="' + q.id + '">' +
        q.options.map(function (o, i) {
          var on = q.multi ? (cur || []).indexOf(o.v) >= 0 : cur === o.v;
          var tab = q.multi || on || (cur == null && i === 0) ? '0' : '-1';
          return '<button type="button" class="qz-opt' + (o.lowConf || o.na || o.exclusive ? ' soft' : '') + '" role="' + (q.multi ? 'checkbox' : 'radio') + '" aria-checked="' + on + '" tabindex="' + tab + '" data-v="' + esc(o.v) + '"><span class="k" aria-hidden="true">' + (q.multi && on ? '✓' : (i + 1)) + '</span><span>' + esc(o.l) + '</span></button>';
        }).join('') + '</div>';
    }

    function showExtra(q) {
      var box = $('#qz-extra'); if (!box) return false;
      var parts = [];
      (q.parts || [q]).forEach(function (p) {
        var v = st.answers[p.id]; if (v == null) return;
        var o = opt(cfg, p.id, v);
        if (p.branch && p.branch.when(v)) parts.push('<div class="qz-branch"><p>' + esc(p.branch.text) + '</p><a class="btn btn-ghost" href="' + NX.withUtm(p.branch.href) + '" data-branch="1">' + esc(p.branch.label) + '</a></div>');
        var ins = p.insight && p.insight(v, o, st.answers);
        if (ins) parts.push('<div class="qz-insight"><b>Para refletir</b>' + esc(ins) + '</div>');
      });
      box.innerHTML = parts.join('');
      var br = box.querySelector('[data-branch]');
      if (br) br.addEventListener('click', function () { NX.track('quiz_branch', { quiz_type: cfg.id, target: br.getAttribute('href').split('?')[0] }); });
      return parts.length > 0;
    }

    function bind(q) {
      host.querySelectorAll('.qz-opts').forEach(function (group) {
        var qid = group.getAttribute('data-q');
        var buttons = Array.prototype.slice.call(group.querySelectorAll('.qz-opt'));
        buttons.forEach(function (b, i) {
          b.addEventListener('click', function () { choose(q, qid, b.getAttribute('data-v'), group); });
          b.addEventListener('keydown', function (e) {
            var k = e.key, j = null;
            if (k === 'ArrowDown' || k === 'ArrowRight') j = (i + 1) % buttons.length;
            if (k === 'ArrowUp' || k === 'ArrowLeft') j = (i - 1 + buttons.length) % buttons.length;
            if (j != null) { e.preventDefault(); buttons[j].focus(); }
          });
        });
      });
      $('#qz-back').addEventListener('click', back);
      $('#qz-next').addEventListener('click', next);
      var sk = $('#qz-skip'); if (sk) sk.addEventListener('click', function () { delete st.answers[q.id]; st.idx++; save(); render(); });
    }

    var advanceTimer = null;
    function choose(q, qid, v, group) {
      clearTimeout(advanceTimer);
      var qq = findQ(cfg, qid);
      if (qq.multi) {
        var picked = qq.options.filter(function (o) { return o.v === v; })[0];
        var arr = (st.answers[qid] || []).slice(), k = arr.indexOf(v);
        if (k >= 0) arr.splice(k, 1);
        else if (picked.exclusive) arr = [v];
        else { arr = arr.filter(function (x) { return !qq.options.some(function (o) { return o.v === x && o.exclusive; }); }); arr.push(v); }
        if (arr.length) st.answers[qid] = arr; else delete st.answers[qid];
      } else st.answers[qid] = v;
      save(); lastAnswered = qid;
      group.querySelectorAll('.qz-opt').forEach(function (b, i) {
        var bv = b.getAttribute('data-v');
        var on = qq.multi ? (st.answers[qid] || []).indexOf(bv) >= 0 : bv === v;
        b.setAttribute('aria-checked', on);
        if (qq.multi) b.querySelector('.k').textContent = on ? '✓' : (i + 1);
        else b.tabIndex = on ? 0 : -1;
      });
      NX.track('quiz_answer', { quiz_type: cfg.id, question_id: qid, step: st.idx + 1 });
      var ok = answered(q);
      $('#qz-next').disabled = !ok;
      var hasExtra = showExtra(q);
      // Autoavanço só em escolha única sem conteúdo extra para ler; a pessoa pode voltar e revisar.
      if (ok && !q.parts && !qq.multi && !hasExtra && !q.noAuto) advanceTimer = setTimeout(next, 420);
    }
    function next() {
      clearTimeout(advanceTimer);
      var s = steps(); if (!answered(s[st.idx])) return;
      st.idx++; save(); render();
    }
    function back() {
      clearTimeout(advanceTimer);
      if (st.idx === 0) return;
      st.idx = Math.min(st.idx, steps().length) - 1; save();
      NX.track('quiz_back', { quiz_type: cfg.id, step: st.idx + 1 });
      render();
    }

    function showLead() {
      onLead = true;
      var prev = lsGet('nx_contact') || {};
      host.innerHTML = '<div class="qz-top"><span>' + esc(cfg.shortName) + '</span><span>Último passo</span></div>' +
        '<div class="qz-progress" aria-hidden="true"><i style="width:' + Math.round(mainTotal / (mainTotal + 1) * 100) + '%"></i></div>' +
        '<div class="qz-card"><h1 class="qz-q" id="qz-title" tabindex="-1">' + esc(cfg.leadTitle || 'Para quem vamos gerar o diagnóstico?') + '</h1>' +
        '<p class="qz-help">' + esc(cfg.leadHelp || 'Usamos estes dados para personalizar o relatório e enviar uma cópia por e-mail. Não pedimos informações confidenciais.') + '</p>' +
        leadFormHtml(cfg, prev) + '<div class="form-msg" id="f-msg" role="status" aria-live="polite"></div></div>' +
        '<div class="qz-nav"><button type="button" class="qz-back" id="qz-back">← Voltar</button><span></span></div>';
      var shownAt = Date.now();
      NX.track('lead_capture_view', { quiz_type: cfg.id, placement: 'before_report' });
      $('#qz-back').addEventListener('click', back);
      if (prev.role) $('#f-cargo').value = prev.role;
      var t = $('#qz-title'); if (t) t.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      $('#lead-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var contact = readForm(cfg); if (!contact) return;
        done = true;
        st.completedAt = Date.now(); save();
        var sc = score(cfg, st.answers);
        NX.track('quiz_complete', { quiz_type: cfg.id, quiz_version: cfg.version, top_dimension: sc.top ? sc.top.id : 'nenhuma', confidence: sc.confidence, duration_s: Math.round((st.completedAt - st.startedAt) / 1000) });
        lsSet('nx_contact', { name: contact.name, company: contact.company, email: contact.email, whatsapp: contact.whatsapp, role: contact.role });
        var meta = { id: st.id, completedAt: st.completedAt, startedAt: st.startedAt };
        var work = sendLead(cfg, st.answers, meta, contact, Date.now() - shownAt);
        generating(cfg, host, contact, work).then(function (res) {
          lsSet('nx_lead_' + st.id, { at: Date.now(), company: contact.company, name: contact.name, sent: !!res.ok, email: res.email || null, to: contact.email });
          lsSet(KEY + '_last', st); lsDel(KEY);
          location.href = cfg.paths.result + resultHash(cfg, st);
        });
      });
    }

    window.addEventListener('pagehide', function () {
      if (!done && Object.keys(st.answers).length) NX.track('quiz_abandon', { quiz_type: cfg.id, step: onLead ? 'contato' : st.idx + 1, last_question: lastAnswered || (steps()[st.idx] || {}).id });
    });
    document.addEventListener('keydown', function (e) {
      if (onLead || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      var n = parseInt(e.key, 10);
      var q = steps()[st.idx]; if (!q) return;
      if (n >= 1 && !q.parts) { var b = host.querySelectorAll('.qz-opt')[n - 1]; if (b) b.click(); }
      if (e.key === 'Enter' && e.target.classList && !e.target.classList.contains('qz-opt') && e.target.tagName !== 'A') { var nx = $('#qz-next'); if (nx && !nx.disabled) next(); }
    });

    if (!fresh && Object.keys(st.answers).length) {
      host.innerHTML = '<div class="qz-resume"><p>Você começou este diagnóstico antes. Quer continuar de onde parou?</p><div class="btn-row"><button type="button" class="btn btn-lime" id="qz-cont">Continuar</button><button type="button" class="btn btn-ghost" id="qz-restart">Recomeçar</button></div></div>';
      $('#qz-cont').addEventListener('click', render);
      $('#qz-restart').addEventListener('click', function () { st = { id: uid(), version: cfg.version, answers: {}, idx: 0, startedAt: Date.now() }; save(); NX.track('quiz_start', { quiz_type: cfg.id, quiz_version: cfg.version, restart: true }); render(); });
    } else {
      save();
      NX.track('quiz_start', { quiz_type: cfg.id, quiz_version: cfg.version });
      render();
    }
  }

  // ───────────────────────── Relatório ─────────────────────────
  function parseHash() {
    var h = location.hash.replace(/^#/, ''), out = {};
    h.split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) out[p[0]] = decodeURIComponent(p[1] || ''); });
    return out;
  }

  function runResult(cfg, host) {
    var h = parseHash(), answers = null, meta = {};
    if (h.r && h.v === cfg.version) { answers = decode(cfg, h.r); meta = { id: h.id, completedAt: +h.t || Date.now() }; }
    if (!answers) {
      var last = lsGet(cfg.storageKey + '_last');
      if (last && last.version === cfg.version && last.completedAt) { answers = last.answers; meta = { id: last.id, completedAt: last.completedAt }; history.replaceState(null, '', resultHash(cfg, last)); }
    }
    if (!answers) {
      host.innerHTML = '<section class="empty"><div class="wrap narrow center"><span class="eyebrow">' + esc(cfg.shortName) + '</span><h1 class="h-lg" style="margin:24px auto 18px">Nenhum resultado encontrado neste navegador.</h1><p class="lead">O relatório é gerado a partir das suas respostas. Faça o diagnóstico para ver o seu.</p><div class="btn-row" style="justify-content:center;margin-top:32px"><a class="btn btn-lime" href="' + NX.withUtm(cfg.paths.quiz) + '">Iniciar diagnóstico' + ARROW + '</a></div></div></section>';
      return;
    }
    var lead = lsGet('nx_lead_' + meta.id);
    // Link aberto do e-mail (?s=1) ou do mesmo navegador: relatório direto. Link repassado: pede os dados antes.
    if (lead || /[?&]s=1/.test(location.search)) return renderReport(cfg, host, answers, meta, lead);

    var prev = lsGet('nx_contact') || {};
    host.innerHTML = '<section class="rp-hero" style="border-bottom:0"><div class="gridbg"></div><div class="wrap narrow" style="position:relative">' +
      '<span class="eyebrow">' + esc(cfg.reportName) + '</span><h1 class="h-lg">Seu diagnóstico está pronto.</h1>' +
      '<p class="lead">Informe para quem é o relatório. Usamos estes dados para personalizar a análise e enviar uma cópia por e-mail.</p>' +
      '<div class="lead-box" style="margin-top:32px">' + leadFormHtml(cfg, prev) + '<div class="form-msg" id="f-msg" role="status"></div></div></div></section>';
    if (prev.role) $('#f-cargo').value = prev.role;
    var shownAt = Date.now();
    NX.track('lead_capture_view', { quiz_type: cfg.id, placement: 'shared_link' });
    $('#lead-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var contact = readForm(cfg); if (!contact) return;
      lsSet('nx_contact', { name: contact.name, company: contact.company, email: contact.email, whatsapp: contact.whatsapp, role: contact.role });
      var shell = document.createElement('div'); shell.className = 'qz-shell'; host.innerHTML = ''; host.appendChild(shell);
      generating(cfg, shell, contact, sendLead(cfg, answers, meta, contact, Date.now() - shownAt)).then(function (res) {
        var rec = { at: Date.now(), company: contact.company, name: contact.name, sent: !!res.ok, email: res.email || null, to: contact.email };
        lsSet('nx_lead_' + meta.id, rec);
        renderReport(cfg, host, answers, meta, rec);
      });
    });
  }

  function renderReport(cfg, host, answers, meta, lead) {
    lead = lead || {};
    var sc = score(cfg, answers);
    var R = cfg.report(answers, sc, lead);
    var date = new Date(meta.completedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    var bookingHref = NX.withUtm(NX.config.bookingUrl || '/agendar/', { diag: meta.id, quiz: cfg.id });
    var who = lead.company ? esc(lead.company) : '';

    var dimsHtml = sc.dims.map(function (d) {
      if (d.score == null) return '<div class="dim-row"><div class="lbl">' + esc(d.label) + ' <span class="chip">Sem dados suficientes</span></div><div class="val">—</div><div class="track" role="img" aria-label="' + esc(d.label) + ': sem dados suficientes"></div></div>';
      var chips = '';
      if (d.preliminary) chips += ' <span class="chip">Sinal preliminar</span>';
      if (d.low) chips += ' <span class="chip chip-warn">Baixa visibilidade</span>';
      return '<div class="dim-row lv' + d.level + (sc.top && sc.top.id === d.id && !sc.structured ? ' top' : '') + '"><div class="lbl">' + esc(d.label) + chips + '</div><div class="val">' + d.score + '/100</div>' +
        '<div class="track" role="img" aria-label="' + esc(d.label) + ': ' + d.score + ' de 100, ' + esc(LEVELS[d.level].label) + '"><i data-w="' + d.score + '"></i></div><div class="cls">' + esc(LEVELS[d.level].label) + '</div></div>';
    }).join('');

    var detailsHtml = sc.dims.map(function (d) {
      var c = d.def.content || {};
      var declared = d.def.q.map(function (p) { var q = findQ(cfg, p[0]); return '<li>' + esc(q.reportLabel || q.title) + ': <b>' + esc(answerLabel(cfg, p[0], answers)) + '</b></li>'; }).join('');
      return '<div class="detail"><h4><span>' + esc(d.label) + '</span><span class="small">' + (d.score == null ? 'Sem dados suficientes' : d.score + '/100 · ' + esc(LEVELS[d.level].label)) + '</span></h4><div class="rows">' +
        '<div class="r"><span>Informação declarada</span><ul class="dots">' + declared + '</ul></div>' +
        '<div class="r"><span>Interpretação</span><div>' + esc(d.score != null && d.score < 25 ? (c.strength || 'As respostas não indicam fragilidade relevante nesta área.') : (c.diag || '')) + '</div></div>' +
        '<div class="r"><span>Recomendação</span><div>' + esc(d.score != null && d.score < 25 ? 'Manter o acompanhamento e revisar periodicamente.' : (c.rec || '')) + '</div></div>' +
        '<div class="r"><span>Medição real</span><div class="small">Nenhum dado operacional foi analisado neste diagnóstico. Os números acima vêm só das respostas.</div></div>' +
        '</div></div>';
    }).join('');

    var profileRows = (who ? '<span>' + esc(cfg.companyLabel) + ': <b>' + who + '</b></span>' : '') + cfg.profileRows(answers).map(function (r) { return '<span>' + esc(r[0]) + ': <b>' + esc(r[1]) + '</b></span>'; }).join('');
    var sentNote = lead.sent ? (lead.email === 'sent' ? 'Uma cópia com o link deste relatório foi enviada para ' + esc(lead.to) + '.' : 'Recebemos seus dados. Guarde o link desta página para voltar ao relatório.') :
      (lead.at ? 'Não conseguimos registrar o envio por e-mail agora. Guarde o link desta página ou escreva para ' + esc(NX.config.contactEmail || 'contato@neuralops.com.br') + '.' : '');

    host.innerHTML =
      '<section class="rp-hero"><div class="gridbg"></div><div class="wrap" style="position:relative">' +
      '<span class="eyebrow">' + esc(cfg.reportName) + (who ? ' · ' + who : '') + ' · Relatório preliminar</span>' +
      '<h1 class="h-lg">' + R.heroTitle + '</h1><p class="lead">' + esc(R.heroSub) + '</p>' +
      '<div class="rp-meta"><span>Data: <b>' + esc(date) + '</b></span>' + profileRows + '<span>Confiança da análise: <b>' + esc(sc.confidence) + '</b></span><span>ID: <b>' + esc(meta.id || '—') + '</b></span></div>' +
      (sentNote ? '<p class="small" style="margin-top:18px">' + sentNote + '</p>' : '') +
      '</div></section>' +

      '<section class="rp-sec"><div class="wrap"><div class="rp-grid">' +
      '<div><span class="kicker">Mapa de pontos de atenção</span><h2 class="h-md" style="margin:12px 0 28px">' + esc(cfg.dimsTitle) + '</h2><div class="dims">' + dimsHtml + '</div>' +
      '<div class="scale" aria-hidden="true"><span><i style="background:rgba(190,255,1,.45)"></i>0–24</span><span><i style="background:#e3e86b"></i>25–49</span><span><i style="background:var(--warn)"></i>50–74</span><span><i style="background:var(--crit)"></i>75–100</span></div>' +
      '<p class="note" style="margin-top:20px">Pontuação mais alta significa mais sinais de fragilidade nas respostas. Não é percentual de dinheiro perdido, ineficiência medida, probabilidade de fracasso nem retorno esperado.</p></div>' +
      '<div><div class="focus"><span class="kicker">' + esc(R.focusKicker) + '</span><h3>' + esc(R.focusTitle) + '</h3><p>' + esc(R.focusText) + '</p>' + (R.focusRec ? '<p style="margin-top:14px"><b style="color:#fff">Recomendação inicial:</b> ' + esc(R.focusRec) + '</p>' : '') + '<span class="tagline">Interpretação a partir das respostas</span></div>' +
      (R.mismatch ? '<div class="mismatch">' + esc(R.mismatch) + '</div>' : '') +
      (R.callout ? '<div class="callout" style="margin-top:20px"><p>' + esc(R.callout) + '</p></div>' : '') + '</div>' +
      '</div></div></section>' +

      '<section class="rp-sec"><div class="wrap"><div class="rp-grid"><div><span class="kicker">Recomendações priorizadas</span><h2 class="h-md" style="margin:12px 0 28px">O que investigar primeiro</h2><ol class="recs">' +
      R.recs.slice(0, 3).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol></div>' +
      '<div><span class="kicker">Sinais de maturidade</span><h2 class="h-md" style="margin:12px 0 20px">Pontos fortes declarados</h2>' +
      (R.strengths.length ? '<ul class="checks">' + R.strengths.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' : '<p class="body">Nenhuma área ficou abaixo de 25 pontos. Isso não significa que nada funciona; significa que todas as áreas mostraram algum sinal que vale observar.</p>') +
      '</div></div></div></section>' +

      '<section class="rp-cta no-print"><div class="wrap"><h2 class="h-md">' + esc(R.cta.title) + '</h2><p>' + esc(R.cta.text) + '</p><div class="btn-row"><a class="btn btn-dark" href="' + bookingHref + '" data-track="result_booking">' + esc(R.cta.primary) + ARROW + '</a><a class="btn btn-ghost" href="#relatorio">Ver análise por área</a></div></div></section>' +

      '<section class="rp-sec" id="relatorio"><div class="wrap"><span class="kicker">Relatório completo</span><h2 class="h-md" style="margin:12px 0 16px">Análise por área</h2>' +
      '<div class="legend-box"><div><b>Declarado</b><span>Resposta que você deu.</span></div><div><b>Interpretação</b><span>Hipótese gerada a partir das respostas.</span></div><div><b>Recomendação</b><span>Ação possível para investigar.</span></div><div><b>Medição real</b><span>Só quando vem de dados operacionais analisados.</span></div></div>' +
      '<div class="details-grid">' + detailsHtml + '</div></div></section>' +

      '<section class="rp-sec"><div class="wrap narrow"><span class="kicker">Limitações da análise</span><h2 class="h-md" style="margin:12px 0 20px">Como ler este relatório</h2><ul class="dots">' +
      cfg.limitations.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') +
      (sc.lowAnswers ? '<li>' + sc.lowAnswers + ' resposta(s) foram marcadas como “não sei”, o que reduz a confiança desta triagem.</li>' : '') +
      '</ul><div class="btn-row" style="margin-top:32px"><a class="btn btn-lime" href="' + bookingHref + '" data-track="result_booking_bottom">Agendar análise com a NeuralOps' + ARROW + '</a><button type="button" class="btn btn-ghost" onclick="window.print()">Imprimir / salvar PDF</button><a class="btn btn-ghost" href="' + NX.withUtm(cfg.paths.quiz) + '" id="redo">Refazer</a></div></div></section>';

    requestAnimationFrame(function () { setTimeout(function () { host.querySelectorAll('.track i').forEach(function (i) { i.style.width = i.getAttribute('data-w') + '%'; }); }, 120); });
    var redo = $('#redo'); if (redo) redo.addEventListener('click', function () { lsDel(cfg.storageKey); });
    window.scrollTo({ top: 0 });
    NX.track('result_view', { quiz_type: cfg.id, quiz_version: cfg.version, top_dimension: sc.top ? sc.top.id : 'nenhuma', confidence: sc.confidence });
  }

  // ───────────────────────── API pública ─────────────────────────
  window.NXDiag = {
    register: function (cfg) { V[cfg.id] = cfg; },
    mount: function () {
      var host = document.querySelector('[data-nx-diag]'); if (!host) return;
      var cfg = V[host.getAttribute('data-vertical')]; if (!cfg) return;
      if (host.getAttribute('data-mode') === 'result') runResult(cfg, host); else runQuiz(cfg, host);
    },
    _score: score, _commercial: commercial, _encode: encode, _decode: decode, _verticals: V, levels: LEVELS
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { window.NXDiag.mount(); });
  else setTimeout(function () { window.NXDiag.mount(); }, 0);
})();
