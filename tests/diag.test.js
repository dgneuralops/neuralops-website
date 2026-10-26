// Testes do motor de diagnóstico. Rodar: node tests/diag.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const ctx = { window: {}, console, setTimeout: () => {}, document: { readyState: 'complete', querySelector: () => null } };
ctx.window.window = ctx.window;
vm.createContext(ctx);
for (const f of ['nx/diag/engine.js', 'nx/diag/geral.js', 'nx/diag/saude.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
const D = ctx.window.NXDiag;
const G = D._verticals.geral, S = D._verticals.saude;
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log('ok -', name); };
const dim = (sc, id) => sc.dims.find(d => d.id === id);

const geralBest = { G01: 'servicos', G02: '300a700', G03: '11a20', G04: 'naosei', G05: 'pouco', G06: 'maioria', G07: 'raro', G08: 'estruturado', G09: 'normal', G10: 'sim', G11: 'geral', G12: 'imediato' };
const geralWorst = { G01: 'comercio', G02: '100a300', G03: '21a50', G04: 'manual', G05: 'maior', G06: 'nenhuma', G07: 'muitas', G08: 'semPadrao', G09: 'para', G10: 'nao', G11: 'manual', G12: '30d' };

t('respostas positivas: nenhuma área inventada como problema', () => {
  const sc = D._score(G, geralBest);
  assert.ok(sc.structured);
  sc.dims.forEach(d => assert.strictEqual(d.score, 0));
  const R = G.report(geralBest, sc);
  assert.strictEqual(R.strengths.length, 5);
  assert.ok(!R.mismatch);
  assert.strictEqual(sc.confidence, 'Boa para triagem');
});

t('respostas negativas: 100 em todas as áreas', () => {
  const sc = D._score(G, geralWorst);
  sc.dims.forEach(d => assert.strictEqual(d.score, 100, d.id));
  assert.ok(!sc.structured);
  assert.strictEqual(sc.top.id, 'eficiencia', 'empate desfeito pela prioridade declarada (G11 = manual)');
});

t('G07 entra com peso dividido em eficiência e integração', () => {
  const a = Object.assign({}, geralBest, { G07: 'muitas' }); // risco 3, peso 0,5
  const sc = D._score(G, a);
  assert.strictEqual(dim(sc, 'eficiencia').score, Math.round(1.5 / 4.5 * 100));
  assert.strictEqual(dim(sc, 'integracao').score, Math.round(1.5 / 4.5 * 100));
});

t('"Não se aplica" sai do denominador', () => {
  const sc = D._score(G, Object.assign({}, geralBest, { G08: 'na' }));
  assert.strictEqual(dim(sc, 'atendimento').score, null);
});

t('"Não sei" marca baixa visibilidade e reduz a confiança', () => {
  const a = Object.assign({}, geralBest, { G06: 'naosei', G10: 'naosei', G07: 'naosei' });
  const sc = D._score(G, a);
  assert.strictEqual(sc.lowAnswers, 3);
  assert.strictEqual(sc.confidence, 'Limitada');
  assert.ok(dim(sc, 'integracao').low > 0);
});

t('saúde: "Não sabemos" no tempo de resposta não pontua risco', () => {
  const a = { S05: 'naosei', S06: 'estruturado' };
  const sc = D._score(S, a);
  assert.strictEqual(dim(sc, 'velocidade').score, 0);
  assert.strictEqual(dim(sc, 'velocidade').low, 1);
});

t('saúde: perfis A–E mapeados pela área principal', () => {
  const base = { S01: 'popular', S02: '100a300', S03: '1001a2500', S04: ['whatsapp'], S05: 'ate5', S06: 'estruturado', S07: 'estruturado', S08: 'estruturado', S09: 'painel', S10: 'estruturado', S11: 'sim', S12: 'sim', S13a: 'rapido', S13b: 'imediato' };
  const prof = a => G && S.report(a, D._score(S, a)).focusKicker;
  assert.match(prof(base), /Perfil E/);
  assert.match(prof(Object.assign({}, base, { S05: '60mais', S06: 'semFluxo' })), /Perfil A/);
  assert.match(prof(Object.assign({}, base, { S08: 'semProcesso', S09: 'nao', S10: 'nao' })), /Perfil B/);
  assert.match(prof(Object.assign({}, base, { S11: 'isolados', S12: 'nao' })), /Perfil C/);
  assert.match(prof(Object.assign({}, base, { S07: 'semPadrao' })), /Perfil D/);
});

t('saúde: sem indicadores, o relatório não quantifica impacto financeiro', () => {
  const a = { S05: 'ate5', S06: 'estruturado', S07: 'estruturado', S08: 'manual', S09: 'nao', S10: 'nao', S11: 'algumas', S12: 'nao', S13a: 'orcamentos', S13b: '90d' };
  const R = S.report(a, D._score(S, a));
  assert.match(R.callout, /Não existem dados suficientes para quantificar o impacto financeiro/);
});

t('mismatch entre prioridade declarada e maior área de risco', () => {
  const a = Object.assign({}, geralBest, { G05: 'maior', G07: 'muitas', G11: 'dados' });
  const R = G.report(a, D._score(G, a));
  assert.match(R.mismatch, /Você indicou inteligência de gestão como prioridade/);
});

t('score comercial: máximo 12 e faixas', () => {
  const sc = D._score(G, geralWorst);
  const c = D._commercial(G, Object.assign({}, geralWorst, { G02: '300a700' }), 'dono', sc);
  assert.strictEqual(c.total, 12); assert.strictEqual(c.tier, 'alta');
  const low = D._commercial(G, Object.assign({}, geralBest, { G02: 'ate50', G12: 'pesquisando' }), 'colab', D._score(G, geralBest));
  assert.strictEqual(low.tier, 'nutricao');
  const big = D._commercial(G, Object.assign({}, geralWorst, { G02: 'acima1500' }), 'dono', sc);
  assert.ok(big.reviewComplexity);
});

t('codificação do relatório: ida e volta sem perda', () => {
  const code = D._encode(G, geralWorst);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(D._decode(G, code))), geralWorst);
  const sa = { S01: 'rede', S04: ['whatsapp', 'site'], S04b: ['chatwoot', 'crm', 'outra'], S13a: 'integrar', S13b: 'avaliando' };
  assert.deepStrictEqual(JSON.parse(JSON.stringify(D._decode(S, D._encode(S, sa)))), sa);
  assert.strictEqual(D._decode(G, 'abc'), null);
});

t('recomendações sem duplicar a de medição', () => {
  const a = Object.assign({}, geralWorst);
  const R = G.report(a, D._score(G, a));
  assert.strictEqual(new Set(R.recs).size, R.recs.length);
  assert.ok(!R.recs.includes(G.dimensions.find(d => d.id === 'gestao').content.rec));
  assert.ok(R.recs.length >= 3);
});

t('relatório personalizado com o nome da clínica, escapado', () => {
  const a = { S05: '60mais', S06: 'semFluxo', S07: 'estruturado', S08: 'estruturado', S09: 'painel', S10: 'estruturado', S11: 'sim', S12: 'sim' };
  const R = S.report(a, D._score(S, a), { company: 'Clínica <b>X</b>' });
  assert.match(R.heroTitle, /^Clínica &lt;b&gt;X&lt;\/b&gt; pode ter/);
});

console.log(`\n${pass} testes passaram.`);
