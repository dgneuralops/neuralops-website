/**
 * POST /api/diagnostico-lead — captura do lead dos diagnósticos (geral e saúde).
 *
 * Destinos (todos configuráveis por variável de ambiente, nenhum segredo no navegador):
 *   GHL_API_KEY (+ GHL_LOCATION_ID)  → contato, tags e nota no GoHighLevel
 *   LEAD_WEBHOOK_URL (+ LEAD_WEBHOOK_SECRET) → cópia do lead em JSON para outro sistema (ex.: n8n)
 *   RESEND_API_KEY + RESEND_FROM_EMAIL → e-mail com o link do relatório
 *   SITE_URL (padrão https://neuralops.com.br) · BOOKING_URL (padrão /agendar/)
 * Sem nenhum destino de armazenamento configurado, responde 503 e o site avisa a pessoa.
 */

const GHL_BASE = 'https://services.leadconnectorhq.com'
const DEFAULT_LOCATION = 'o9LtB6haFl99RD67rloF'
const QUIZ = {
  geral: { name: 'Diagnóstico Neural', path: '/diagnostico/resultado/' },
  saude: { name: 'Diagnóstico de Clínicas — NeuralOps Saúde', path: '/saude/diagnostico/resultado/' },
}
const ROLES = { dono: 'Dono(a) ou sócio(a)', diretor: 'Diretor(a) ou gestor(a)', coord: 'Coordenação ou supervisão', colab: 'Colaborador(a)', outro: 'Outro' }
const TIERS = ['alta', 'intermediaria', 'nutricao']

export const config = { api: { bodyParser: { sizeLimit: '48kb' } } }

// Limite best-effort por instância. Para proteção forte, somar uma regra de rate limit no firewall da Vercel.
const hits = new Map()
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000
  const list = (hits.get(ip) || []).filter(t => now - t < win)
  list.push(now); hits.set(ip, list)
  if (hits.size > 5000) hits.clear()
  return list.length > 6
}

const str = (v, max = 160) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const clean = (v, max) => str(v, max).replace(/[\u0000-\u001f<>]/g, '')

function allowedOrigin(origin) {
  if (!origin) return true
  try {
    const h = new URL(origin).hostname
    return h === 'neuralops.com.br' || h === 'www.neuralops.com.br' || h === 'localhost' || h === '127.0.0.1' ||
      /^neuralops[a-z0-9-]*-dgneuralops-projects\.vercel\.app$/.test(h) || h === 'neuralops-website.vercel.app'
  } catch { return false }
}

function validate(b) {
  const quizType = str(b.quizType, 10)
  if (!QUIZ[quizType]) return { error: 'quizType inválido' }
  const c = b.contact || {}
  const lead = {
    quizType,
    quizVersion: clean(b.quizVersion, 20),
    diagnosticId: clean(b.diagnosticId, 24).replace(/[^A-Z0-9]/gi, ''),
    name: clean(c.name, 80),
    company: clean(c.company, 120),
    role: ROLES[c.role] ? c.role : 'outro',
    email: str(c.email, 120).toLowerCase(),
    whatsapp: str(c.whatsapp, 20).replace(/\D/g, ''),
    answerCode: str(b.answerCode, 40),
    instagram: (str(c.instagram, 40).replace(/^@+/, '').match(/^[A-Za-z0-9._]{1,30}$/) || [''])[0],
  }
  if (lead.name.length < 2) return { error: 'Nome inválido' }
  if (lead.company.length < 2) return { error: 'Empresa inválida' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) return { error: 'E-mail inválido' }
  if (lead.whatsapp.length < 10 || lead.whatsapp.length > 13) return { error: 'WhatsApp inválido' }
  if (!/^[0-9a-z_]{5,40}$/.test(lead.answerCode)) return { error: 'Respostas inválidas' }
  if (!b.consents || !b.consents.privacy || b.consents.privacy.accepted !== true) return { error: 'Aceite da política de privacidade é obrigatório' }

  lead.marketingOptIn = !!(b.consents.marketing && b.consents.marketing.accepted === true)
  lead.consents = {
    privacy: { accepted: true, purpose: clean(b.consents.privacy.purpose, 140), at: clean(b.consents.privacy.at, 30) },
    marketing: { accepted: lead.marketingOptIn, purpose: clean(b.consents.marketing && b.consents.marketing.purpose, 140), at: clean(b.consents.marketing && b.consents.marketing.at, 30) },
  }
  lead.answers = (Array.isArray(b.answers) ? b.answers : []).slice(0, 24).map(a => ({ id: clean(a.id, 8), question: clean(a.question, 160), answer: clean(a.answer, 120) }))
  lead.profile = (Array.isArray(b.profile) ? b.profile : []).slice(0, 6).map(p => [clean(p[0], 40), clean(p[1], 80)])
  lead.scores = (Array.isArray(b.scores) ? b.scores : []).slice(0, 8).map(s => ({
    id: clean(s.id, 20), label: clean(s.label, 60),
    score: Number.isFinite(s.score) ? Math.max(0, Math.min(100, Math.round(s.score))) : null,
    preliminary: !!s.preliminary, lowVisibility: !!s.lowVisibility,
  }))
  lead.topDimension = clean(b.topDimension, 60) || null
  lead.mainPain = clean(b.mainPain, 80) || null
  lead.confidence = clean(b.confidence, 30)
  lead.summary = {
    title: clean(b.summary && b.summary.title, 160),
    recommendations: ((b.summary && b.summary.recommendations) || []).slice(0, 3).map(r => clean(r, 260)),
  }
  const com = b.commercial || {}
  lead.commercial = {
    total: Math.max(0, Math.min(12, parseInt(com.total, 10) || 0)),
    tier: TIERS.includes(com.tier) ? com.tier : 'nutricao',
    reviewComplexity: !!com.reviewComplexity,
    points: com.points && typeof com.points === 'object' ? {
      faturamento: +com.points.faturamento || 0, urgencia: +com.points.urgencia || 0,
      complexidade: +com.points.complexidade || 0, papel: +com.points.papel || 0,
    } : null,
  }
  const u = b.utm || {}
  lead.utm = {}
  ;['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'landing'].forEach(k => { if (u[k]) lead.utm[k] = clean(u[k], 120) })
  lead.firstPage = clean(b.firstPage, 120) || null
  lead.referrer = clean(b.referrer, 200) || null
  lead.startedAt = Number.isFinite(b.startedAt) ? new Date(b.startedAt).toISOString() : null
  lead.completedAt = Number.isFinite(b.completedAt) ? new Date(b.completedAt).toISOString() : null
  lead.submittedAt = new Date().toISOString()
  lead.bookingStatus = 'nao_agendado'
  return { lead }
}

function resultUrl(lead) {
  const site = (process.env.SITE_URL || 'https://neuralops.com.br').replace(/\/$/, '')
  return `${site}${QUIZ[lead.quizType].path}?s=1#r=${lead.answerCode}&v=${encodeURIComponent(lead.quizVersion)}&id=${lead.diagnosticId}`
}

function noteBody(lead, url) {
  const L = []
  L.push(`📊 ${QUIZ[lead.quizType].name.toUpperCase()} (${lead.quizVersion})`)
  L.push(`ID: ${lead.diagnosticId} · Enviado: ${new Date(lead.submittedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`)
  L.push(`Empresa: ${lead.company} · Cargo: ${ROLES[lead.role]}${lead.instagram ? ' · Instagram: @' + lead.instagram : ''}`)
  lead.profile.forEach(p => L.push(`${p[0]}: ${p[1]}`))
  L.push('', `━━ SCORE COMERCIAL: ${lead.commercial.total}/12 · prioridade ${lead.commercial.tier}${lead.commercial.reviewComplexity ? ' · avaliar complexidade (fat. > R$1,5mi)' : ''}`)
  if (lead.commercial.points) L.push(`faturamento ${lead.commercial.points.faturamento} · urgência ${lead.commercial.points.urgencia} · complexidade ${lead.commercial.points.complexidade} · papel ${lead.commercial.points.papel}`)
  L.push('(hipótese de qualificação, não modelo comprovado)')
  L.push('', `━━ DIAGNÓSTICO (respostas autodeclaradas) · confiança: ${lead.confidence}`)
  L.push(`Principal ponto de atenção: ${lead.topDimension || 'nenhum acima de 25'}`)
  if (lead.mainPain) L.push(`Prioridade/dor declarada: ${lead.mainPain}`)
  lead.scores.forEach(s => L.push(`• ${s.label}: ${s.score == null ? '—' : s.score + '/100'}${s.preliminary ? ' (sinal preliminar)' : ''}${s.lowVisibility ? ' (baixa visibilidade)' : ''}`))
  L.push('', '━━ RESPOSTAS')
  lead.answers.forEach(a => L.push(`${a.id} · ${a.question}: ${a.answer}`))
  L.push('', '━━ ORIGEM')
  L.push(Object.keys(lead.utm).length ? Object.entries(lead.utm).map(([k, v]) => `${k}=${v}`).join(' · ') : 'sem UTM')
  if (lead.firstPage) L.push(`primeira página: ${lead.firstPage}`)
  L.push('', `Consentimento privacidade: sim (${lead.consents.privacy.at}) · Marketing: ${lead.marketingOptIn ? 'sim' : 'não'}`)
  L.push(`Relatório: ${url}`)
  return L.join('\n')
}

async function toGHL(lead, url) {
  const key = process.env.GHL_API_KEY
  if (!key) return 'off'
  const headers = { Authorization: `Bearer ${key}`, Version: '2021-07-28', 'Content-Type': 'application/json' }
  const [firstName, ...rest] = lead.name.split(/\s+/)
  const phone = lead.whatsapp.startsWith('55') && lead.whatsapp.length >= 12 ? `+${lead.whatsapp}` : `+55${lead.whatsapp}`
  const tags = [
    `diag-${lead.quizType}`, `diag-versao-${lead.quizVersion}`, `prioridade-${lead.commercial.tier}`,
    'agendamento-pendente', lead.marketingOptIn ? 'consentimento-marketing' : 'sem-consentimento-marketing',
  ]
  if (lead.topDimension) tags.push(`gargalo-${lead.topDimension.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}`)
  if (lead.utm.utm_campaign) tags.push(`campanha-${lead.utm.utm_campaign.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`)

  const up = await fetch(`${GHL_BASE}/contacts/upsert`, {
    method: 'POST', headers,
    body: JSON.stringify({
      locationId: process.env.GHL_LOCATION_ID || DEFAULT_LOCATION,
      email: lead.email, phone, firstName, lastName: rest.join(' ') || undefined,
      companyName: lead.company, source: QUIZ[lead.quizType].name, tags,
      customFields: [{ key: 'nome_da_sua_empresa', field_value: lead.company }].concat(lead.instagram ? [{ key: 'instagram', field_value: '@' + lead.instagram }] : []),
    }),
  })
  const data = await up.json().catch(() => ({}))
  const id = data && data.contact && data.contact.id
  if (!id) throw new Error(`GHL upsert falhou (${up.status})`)
  await fetch(`${GHL_BASE}/contacts/${id}/tags`, { method: 'POST', headers, body: JSON.stringify({ tags }) }).catch(() => {})
  await fetch(`${GHL_BASE}/contacts/${id}/notes`, { method: 'POST', headers, body: JSON.stringify({ body: noteBody(lead, url) }) })
  return 'ok'
}

async function toWebhook(lead, url) {
  const hook = process.env.LEAD_WEBHOOK_URL
  if (!hook) return 'off'
  const r = await fetch(hook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(process.env.LEAD_WEBHOOK_SECRET ? { 'X-Webhook-Secret': process.env.LEAD_WEBHOOK_SECRET } : {}) },
    body: JSON.stringify({ type: 'diagnostic_lead', resultUrl: url, ...lead }),
  })
  if (!r.ok) throw new Error(`webhook ${r.status}`)
  return 'ok'
}

// Webhook do GHL por vertical (workflow "Inbound Webhook"). Campos planos para mapear direto no workflow.
const GHL_WEBHOOKS = {
  saude: process.env.GHL_WEBHOOK_SAUDE || 'https://services.leadconnectorhq.com/hooks/o9LtB6haFl99RD67rloF/webhook-trigger/91OSdKdjQnrIznqXrD4A',
  geral: process.env.GHL_WEBHOOK_GERAL || 'https://services.leadconnectorhq.com/hooks/o9LtB6haFl99RD67rloF/webhook-trigger/zgNi6ksKK25ULrD884ca',
}
function flatLead(lead, url) {
  const [first, ...rest] = lead.name.split(/\s+/)
  const phone = lead.whatsapp.startsWith('55') && lead.whatsapp.length >= 12 ? `+${lead.whatsapp}` : `+55${lead.whatsapp}`
  const f = {
    first_name: first, last_name: rest.join(' '), full_name: lead.name, email: lead.email, phone,
    company_name: lead.company, instagram: lead.instagram ? '@' + lead.instagram : '', role: ROLES[lead.role],
    quiz_type: lead.quizType, quiz_name: QUIZ[lead.quizType].name, quiz_version: lead.quizVersion, diagnostic_id: lead.diagnosticId,
    result_url: url, top_dimension: lead.topDimension || 'nenhuma acima de 25', main_pain: lead.mainPain || '', confidence: lead.confidence,
    summary_title: lead.summary.title, recommendations: lead.summary.recommendations.join(' | '),
    commercial_score: lead.commercial.total, commercial_tier: lead.commercial.tier, commercial_review_complexity: lead.commercial.reviewComplexity ? 'sim' : 'nao',
    marketing_opt_in: lead.marketingOptIn ? 'sim' : 'nao', privacy_accepted_at: lead.consents.privacy.at,
    started_at: lead.startedAt || '', completed_at: lead.completedAt || '', submitted_at: lead.submittedAt,
    first_page: lead.firstPage || '', referrer: lead.referrer || '', source: 'neuralops.com.br',
  }
  ;['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'].forEach(k => { f[k] = lead.utm[k] || '' })
  lead.scores.forEach(sc => { f[`score_${sc.id}`] = sc.score == null ? '' : sc.score })
  lead.profile.forEach(p => { f[`perfil_${p[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_')}`] = p[1] })
  lead.answers.forEach(a => { f[`resposta_${a.id.toLowerCase()}`] = a.answer; f[`pergunta_${a.id.toLowerCase()}`] = a.question })
  f.respostas_texto = lead.answers.map(a => `${a.question}: ${a.answer}`).join('\n')
  f.scores_texto = lead.scores.map(sc => `${sc.label}: ${sc.score == null ? '—' : sc.score + '/100'}`).join('\n')
  return f
}
async function toGhlWebhook(lead, url) {
  const hook = GHL_WEBHOOKS[lead.quizType]
  if (!hook) return 'off'
  const r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(flatLead(lead, url)) })
  if (!r.ok) throw new Error(`ghl webhook ${r.status}`)
  return 'ok'
}

const escHtml = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

async function sendEmail(lead, url) {
  const key = process.env.RESEND_API_KEY
  if (!key) return 'skipped'
  const from = process.env.RESEND_FROM_EMAIL || 'diagnostico@neuralops.com.br'
  const site = (process.env.SITE_URL || 'https://neuralops.com.br').replace(/\/$/, '')
  const booking = (process.env.BOOKING_URL || `${site}/agendar/`) + `?diag=${lead.diagnosticId}&quiz=${lead.quizType}`
  const first = escHtml(lead.name.split(/\s+/)[0])
  const recs = lead.summary.recommendations.map(r => `<li style="margin:0 0 10px;color:#cfcfcf">${escHtml(r)}</li>`).join('')
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#0d0d0d;font-family:Arial,Helvetica,sans-serif;color:#fff">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#111;border:1px solid #222">
<tr><td style="padding:28px 32px;border-bottom:1px solid #222;font-weight:900;font-size:18px">Neural<span style="color:#beff01">Ops</span></td></tr>
<tr><td style="padding:32px">
<p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#beff01">${escHtml(QUIZ[lead.quizType].name)}</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.25">${first}, seu relatório preliminar está pronto.</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#bdbdbd">${lead.topDimension ? `O principal ponto de atenção nas suas respostas foi <b style="color:#fff">${escHtml(lead.topDimension)}</b>.` : 'Suas respostas mostraram poucos sinais de fragilidade.'}</p>
${recs ? `<p style="margin:0 0 10px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#888">O que investigar primeiro</p><ol style="margin:0 0 24px;padding-left:20px;font-size:14px;line-height:1.6">${recs}</ol>` : ''}
<a href="${escHtml(url)}" style="display:inline-block;background:#beff01;color:#0d0d0d;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:1px;text-transform:uppercase;padding:14px 22px">Abrir meu relatório completo</a>
<p style="margin:28px 0 8px;font-size:14px;line-height:1.6;color:#bdbdbd">Quer validar esses pontos com dados reais da operação?</p>
<a href="${escHtml(booking)}" style="color:#beff01;font-size:14px">Agendar análise com a NeuralOps →</a>
<p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#777">Este relatório é uma triagem baseada em respostas autodeclaradas, não um diagnóstico técnico definitivo. Você recebeu este e-mail porque pediu o relatório em ${escHtml(site.replace('https://', ''))}.</p>
</td></tr></table></td></tr></table></body></html>`
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `NeuralOps <${from}>`, to: [lead.email], subject: `Seu relatório: ${QUIZ[lead.quizType].name}`, html }),
  })
  if (!r.ok) throw new Error(`resend ${r.status}`)
  return 'sent'
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (origin && allowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })
  if (!allowedOrigin(origin)) return res.status(403).json({ error: 'Origem não permitida' })

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim()
  if (limited(ip)) return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' })

  const b = typeof req.body === 'object' && req.body ? req.body : {}
  // Robôs: campo isca preenchido ou envio rápido demais. Resposta neutra para não ensinar o filtro.
  if (str(b.hp) || (Number.isFinite(b.formMs) && b.formMs < 1500)) return res.status(200).json({ ok: true, email: 'skipped' })

  const { lead, error } = validate(b)
  if (error) return res.status(400).json({ error })

  if (!process.env.GHL_API_KEY && !process.env.LEAD_WEBHOOK_URL && !GHL_WEBHOOKS[lead.quizType]) {
    console.error('[diagnostico-lead] nenhum destino configurado (GHL_API_KEY ou LEAD_WEBHOOK_URL)')
    return res.status(503).json({ error: 'Armazenamento de leads não configurado' })
  }

  const url = resultUrl(lead)
  const [crm, webhook, ghlHook] = await Promise.all([
    toGHL(lead, url).catch(e => { console.error('[diagnostico-lead] GHL:', e.message); return 'error' }),
    toWebhook(lead, url).catch(e => { console.error('[diagnostico-lead] webhook:', e.message); return 'error' }),
    toGhlWebhook(lead, url).catch(e => { console.error('[diagnostico-lead] ghl webhook:', e.message); return 'error' }),
  ])
  if (crm !== 'ok' && webhook !== 'ok' && ghlHook !== 'ok') return res.status(502).json({ error: 'Não foi possível registrar o lead' })

  let email = 'skipped'
  try { email = await sendEmail(lead, url) } catch (e) { console.error('[diagnostico-lead] email:', e.message); email = 'error' }

  console.log(`[diagnostico-lead] ok quiz=${lead.quizType} id=${lead.diagnosticId} crm=${crm} ghlWebhook=${ghlHook} webhook=${webhook} email=${email} tier=${lead.commercial.tier}`)
  return res.status(200).json({ ok: true, crm, webhook, ghlHook, email })
}
