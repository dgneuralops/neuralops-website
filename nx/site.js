/* NeuralOps — navegação, rodapé, UTMs e eventos de funil compartilhados */
(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');

  var CONFIG = window.NX_CONFIG = Object.assign({
    bookingUrl: '/agendar/',
    leadEndpoint: '/api/diagnostico-lead',
    contactEmail: 'contato@neuralops.com.br'
  }, window.NX_CONFIG || {});

  var ARROW = '<svg class="arrow" viewBox="0 0 17 14" fill="none" aria-hidden="true"><path d="M.247 6.576H15.144" stroke="currentColor" stroke-width="1.5"/><path d="M9.277 0c0 3.635 3.118 6.576 6.97 6.576" stroke="currentColor" stroke-width="1.5"/><path d="M16.247 6.576c-3.852 0-6.97 2.942-6.97 6.577" stroke="currentColor" stroke-width="1.5"/></svg>';
  var LOGO = '<svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="6" fill="#beff01"/><line x1="0" y1="16" x2="32" y2="16" stroke="#0d0d0d" stroke-width="2.5"/><circle cx="10" cy="16" r="3.5" fill="#0d0d0d"/><circle cx="10" cy="16" r="1.5" fill="#beff01"/><rect x="19.5" y="6" width="2.5" height="20" fill="#0d0d0d"/><circle cx="20.75" cy="10" r="3.5" fill="#0d0d0d"/><circle cx="20.75" cy="10" r="1.5" fill="#beff01"/><circle cx="20.75" cy="22" r="3.5" fill="#0d0d0d"/><circle cx="20.75" cy="22" r="1.5" fill="#beff01"/></svg>';
  window.NX_ARROW = ARROW;

  // ── UTMs: guardadas por 30 dias e repassadas por toda a jornada ──
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  (function captureUtm() {
    var p = new URLSearchParams(location.search), found = {}, any = false;
    UTM_KEYS.forEach(function (k) { var v = p.get(k); if (v) { found[k] = v.slice(0, 120); any = true; } });
    if (any) {
      found._ts = Date.now();
      found.landing = location.pathname;
      store('nx_utm', JSON.stringify(found));
    }
    if (!load('nx_first_page')) store('nx_first_page', location.pathname);
  })();
  function getUtm() {
    try {
      var u = JSON.parse(load('nx_utm') || 'null');
      if (u && Date.now() - u._ts < 30 * 864e5) return u;
    } catch (e) {}
    return {};
  }
  function withUtm(url, extra) {
    var u = new URL(url, location.origin), utm = getUtm();
    UTM_KEYS.forEach(function (k) { if (utm[k] && !u.searchParams.has(k)) u.searchParams.set(k, utm[k]); });
    Object.keys(extra || {}).forEach(function (k) { if (extra[k] != null) u.searchParams.set(k, extra[k]); });
    return u.origin === location.origin ? u.pathname + u.search + u.hash : u.toString();
  }

  // ── Eventos: só metadados mínimos; nunca respostas detalhadas nem dados pessoais ──
  function track(event, params) {
    var payload = Object.assign({ event: event, page_path: location.pathname }, params || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    if (window.NX_DEBUG) console.log('[nx]', payload);
  }

  window.NX = { config: CONFIG, track: track, getUtm: getUtm, withUtm: withUtm, store: store, load: load, arrow: ARROW };

  // ── Nav + footer ──
  var path = location.pathname.replace(/index\.html$/, '');
  var onHome = path === '/';
  function anchor(id) { return onHome ? '#' + id : '/#' + id; }
  function cur(p) { return path.indexOf(p) === 0 ? ' aria-current="page"' : ''; }

  var navHost = document.querySelector('[data-nx-nav]');
  if (navHost) {
    var diagHref = navHost.getAttribute('data-diag') || '/diagnostico/';
    var ctaLabel = navHost.getAttribute('data-cta') || 'Diagnosticar minha operação';
    navHost.outerHTML =
      '<a class="skip" href="#main">Pular para o conteúdo</a>' +
      '<header id="nx-nav"' + (navHost.hasAttribute('data-solid') ? ' class="solid"' : '') + '><div class="nav-inner">' +
      '<a href="/" class="nav-logo" aria-label="NeuralOps, página inicial">' + LOGO + '<b>Neural<em>Ops</em></b></a>' +
      '<nav class="nav-links" aria-label="Principal">' +
      '<a class="nav-link" href="' + anchor('problema') + '">O Problema</a>' +
      '<a class="nav-link" href="' + anchor('solucao') + '">Nossa Solução</a>' +
      '<a class="nav-link" href="' + anchor('metodo') + '">Como Funciona</a>' +
      '<a class="nav-link" href="/cases/"' + cur('/cases') + '>Cases</a>' +
      '<a class="nav-link" href="' + anchor('para-quem') + '">Para Quem</a>' +
      '<div class="nav-seg"><button type="button" aria-expanded="false" aria-haspopup="true">Segmentos <svg width="10" height="7" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>' +
      '<div class="nav-seg-menu"><a href="/saude/"' + cur('/saude') + '>Saúde<small>Clínicas e centros médicos</small></a></div></div>' +
      '<a class="nav-link" href="/diagnostico/"' + cur('/diagnostico') + '>Diagnóstico Neural</a>' +
      '</nav>' +
      '<a class="nav-cta" href="' + diagHref + '" data-track="cta_nav">' + ctaLabel + ARROW + '</a>' +
      '<button class="nav-burger" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="nx-mobile"><svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true"><path d="M0 1h18M0 7h18M0 13h18" stroke="#fff" stroke-width="1.6"/></svg></button>' +
      '</div>' +
      '<div class="nav-mobile" id="nx-mobile">' +
      '<a href="' + anchor('problema') + '">O Problema</a><a href="' + anchor('solucao') + '">Nossa Solução</a><a href="' + anchor('metodo') + '">Como Funciona</a><a href="/cases/">Cases</a><a href="' + anchor('para-quem') + '">Para Quem</a><a href="/saude/">Soluções por segmento → Saúde</a><a href="/diagnostico/">Diagnóstico Neural</a>' +
      '<a class="btn btn-lime" href="' + diagHref + '">' + ctaLabel + ARROW + '</a></div></header>';
  }

  var footHost = document.querySelector('[data-nx-footer]');
  if (footHost) {
    footHost.outerHTML =
      '<footer id="nx-footer"><div class="wrap"><div class="foot-grid">' +
      '<div><a href="/" class="nav-logo" aria-label="NeuralOps">' + LOGO + '<b>Neural<em>Ops</em></b></a>' +
      '<p class="foot-sig">Inteligência aplicada à operação. Infraestrutura construída para o crescimento.</p></div>' +
      '<div><div class="foot-h">Empresa</div><div class="foot-links"><a href="' + anchor('solucao') + '">Nossa Solução</a><a href="' + anchor('metodo') + '">Como Funciona</a><a href="/cases/">Cases</a><a href="' + anchor('faq') + '">Perguntas frequentes</a></div></div>' +
      '<div><div class="foot-h">Diagnósticos</div><div class="foot-links"><a href="/diagnostico/">Diagnóstico Neural</a><a href="/saude/">NeuralOps Saúde</a><a href="/saude/diagnostico/">Diagnóstico para clínicas</a><a href="' + CONFIG.bookingUrl + '">Agendar conversa</a></div></div>' +
      '<div><div class="foot-h">Contato</div><div class="foot-links"><a href="mailto:' + CONFIG.contactEmail + '">' + CONFIG.contactEmail + '</a><a href="/privacidade/">Política de privacidade</a></div></div>' +
      '</div><div class="foot-bottom"><span>© ' + new Date().getFullYear() + ' NeuralOps. Todos os direitos reservados.</span><span>NeuralOps — Inteligência aplicada à operação.</span></div></div></footer>';
  }

  var nav = document.getElementById('nx-nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 30); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    var burger = nav.querySelector('.nav-burger'), mob = document.getElementById('nx-mobile');
    burger.addEventListener('click', function () {
      var open = mob.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mob.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { mob.classList.remove('open'); burger.setAttribute('aria-expanded', false); document.body.style.overflow = ''; }
    });
    var seg = nav.querySelector('.nav-seg'), segBtn = seg.querySelector('button');
    segBtn.addEventListener('click', function (e) { e.stopPropagation(); var o = seg.classList.toggle('open'); segBtn.setAttribute('aria-expanded', o); });
    document.addEventListener('click', function () { seg.classList.remove('open'); segBtn.setAttribute('aria-expanded', false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { seg.classList.remove('open'); segBtn.setAttribute('aria-expanded', false); } });
  }

  // Links de agendamento e diagnóstico levam as UTMs junto
  document.querySelectorAll('a[href^="/diagnostico"],a[href^="/saude/diagnostico"],a[href^="/agendar"]').forEach(function (a) {
    a.setAttribute('href', withUtm(a.getAttribute('href')));
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-track],a[href^="/agendar"]');
    if (!a) return;
    var name = a.getAttribute('data-track');
    if (a.getAttribute('href').indexOf('/agendar') === 0) track('booking_click', { source: name || 'link' });
    else if (name) track('cta_click', { cta: name, label: a.textContent.trim().slice(0, 60) });
  });

  // ── Reveal ──
  var els = document.querySelectorAll('.fu');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('vis'); io.unobserve(en.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add('vis'); });
})();
