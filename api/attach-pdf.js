/**
 * Vercel Node.js Function — POST /api/attach-pdf
 *
 * Recebe os dados do diagnóstico completo + PDF em base64.
 * 1. Tenta fazer upload do PDF na biblioteca de mídia do GHL.
 * 2. SEMPRE cria uma nota rica no contato com todos os dados.
 * 3. Envia email personalizado com o diagnóstico via Resend.
 *
 * Limite de body: 6MB (configurado abaixo).
 */

const LOCATION_ID = 'o9LtB6haFl99RD67rloF'
const GHL_BASE    = 'https://services.leadconnectorhq.com'

export const config = {
  api: { bodyParser: { sizeLimit: '6mb' } },
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 76) return '#beff01'   // Avançado    — lime green
  if (score >= 61) return '#f5c518'   // Intermediário — amarelo
  if (score >= 41) return '#ff8c00'   // Atenção      — laranja
  return '#ff4444'                    // Crítico      — vermelho
}

function buildDiagnosticEmail({ firstName, score, category, diagnosis, metrics, radar, opportunities, bookingUrl }) {
  const color   = scoreColor(score ?? 0)
  const name    = firstName ?? 'Gestor'
  const sc      = score    ?? '—'
  const cat     = category ?? '—'
  const diag    = diagnosis ?? ''
  const met     = metrics ?? {}
  const opps    = opportunities ?? []
  const radarItems = (radar ?? []).slice(0, 6)

  // Metric card helper
  const metricCard = (icon, label, value, description, accent = '#1e1e1e') => `
    <td width="50%" style="padding:6px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:${accent};border:1px solid rgba(255,255,255,0.07);border-radius:12px;">
        <tr>
          <td style="padding:20px 22px;">
            <div style="font-size:20px;margin-bottom:8px;">${icon}</div>
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">${label}</div>
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#ffffff;font-size:17px;font-weight:700;line-height:1.3;margin-bottom:8px;">${value ?? '—'}</div>
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:rgba(255,255,255,0.3);font-size:11px;line-height:1.5;">${description}</div>
          </td>
        </tr>
      </table>
    </td>`

  // Opportunity row helper
  const oppRow = (label, value) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:rgba(255,255,255,0.55);font-size:13px;">${label}</td>
            <td align="right" style="color:#beff01;font-size:13px;font-weight:700;white-space:nowrap;padding-left:16px;">${value}</td>
          </tr>
        </table>
      </td>
    </tr>`

  // Radar bar helper
  const radarBar = (subject, value) => {
    const pct  = Math.min(Math.max(value ?? 0, 0), 100)
    const barColor = pct >= 60 ? '#beff01' : pct >= 35 ? '#f5c518' : '#ff4444'
    return `
    <tr>
      <td style="padding:7px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:rgba(255,255,255,0.5);font-size:12px;white-space:nowrap;padding-right:14px;width:1%;">${(subject ?? '').replace('\n', ' ')}</td>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.08);border-radius:100px;overflow:hidden;">
                <tr>
                  <td width="${pct}%" style="height:6px;background:${barColor};border-radius:100px;font-size:0;">&nbsp;</td>
                  <td></td>
                </tr>
              </table>
            </td>
            <td style="color:rgba(255,255,255,0.4);font-size:11px;padding-left:10px;white-space:nowrap;width:1%;">${pct}/100</td>
          </tr>
        </table>
      </td>
    </tr>`
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Seu Diagnóstico Neural™</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    :root { color-scheme: light; }
    /* Bloqueia recoloração automática do Gmail dark mode */
    u + .body .gmail-fix { display:block !important; }
    @media (prefers-color-scheme: dark) {
      body, .email-bg    { background-color: #0d0d0d !important; }
      .email-container   { background-color: #111111 !important; }
      .email-header      { background-color: #0d0d0d !important; }
      .email-score-card  { background-color: #1a1a1a !important; }
      .email-diag-card   { background-color: #181818 !important; }
      .email-metric-card { background-color: #1e1e1e !important; }
      .email-opp-card    { background-color: #181818 !important; }
      .email-cta-card    { background-color: #0f1f08 !important; }
      .email-green       { color: #beff01 !important; }
      .email-white       { color: #ffffff !important; }
      .email-muted       { color: rgba(255,255,255,0.45) !important; }
      .email-btn         { background-color: #beff01 !important; color: #0d0d0d !important; }
    }
  </style>
</head>
<body class="body" style="margin:0;padding:0;background-color:#0d0d0d;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;color-scheme:light;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-bg" style="background-color:#0d0d0d;">
  <tr>
    <td align="center" style="padding:40px 16px 60px;">

      <!-- ══ CONTAINER ══ -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
             class="email-container" style="max-width:600px;width:100%;background:#111111;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);">

        <!-- ── HEADER ── -->
        <tr>
          <td class="email-header" style="background:#0d0d0d;padding:32px 40px 28px;border-bottom:1px solid rgba(190,255,1,0.15);">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div class="email-green" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:26px;font-weight:900;letter-spacing:-1px;color:#beff01;">
                    NEURAL<span class="email-white" style="color:#ffffff;">OPS</span>
                  </div>
                  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:3px;margin-top:3px;">DIAGNÓSTICO NEURAL™</div>
                </td>
                <td align="right">
                  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.25);">${new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── GREETING ── -->
        <tr>
          <td style="padding:40px 40px 0;">
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.45);margin:0 0 10px 0;">Olá, <strong style="color:rgba(255,255,255,0.85);">${name}</strong> 👋</p>
            <h1 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:30px;font-weight:800;color:#ffffff;margin:0;line-height:1.25;">
              Seu Diagnóstico Neural™<br>
              <span style="color:#beff01;">acabou de chegar.</span>
            </h1>
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.4);margin:14px 0 0;line-height:1.7;">
              Analisamos a maturidade operacional da sua empresa com base nas suas respostas.<br>Abaixo está o diagnóstico completo.
            </p>
          </td>
        </tr>

        <!-- ── SCORE HERO ── -->
        <tr>
          <td style="padding:30px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(190,255,1,0.05) 0%,rgba(0,0,0,0) 100%);border:1px solid ${color}33;border-radius:16px;">
              <tr>
                <td style="padding:36px 32px;" align="center">
                  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:96px;font-weight:900;color:${color};line-height:1;letter-spacing:-4px;">${sc}</div>
                  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.3);letter-spacing:3px;margin-top:6px;">PONTOS DE 100</div>
                  <div style="display:inline-block;margin-top:18px;">
                    <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:${color};color:#0d0d0d;font-size:11px;font-weight:800;letter-spacing:2.5px;padding:7px 22px;border-radius:100px;text-transform:uppercase;">${cat}</span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── DIAGNOSIS TEXT ── -->
        <tr>
          <td style="padding:24px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#181818;border-left:3px solid ${color};border-radius:0 10px 10px 0;">
              <tr>
                <td style="padding:22px 26px;">
                  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:2.5px;text-transform:uppercase;margin-bottom:10px;">Diagnóstico</div>
                  <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.8);line-height:1.75;margin:0;">${diag}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── METRICS ── -->
        <tr>
          <td style="padding:24px 40px 0;">
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:2.5px;text-transform:uppercase;margin-bottom:12px;">Métricas Calculadas</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${metricCard('🕐', 'Trabalho Manual',    met.manualHours,    'Tempo gasto em tarefas repetitivas que poderiam ser automatizadas')}
                ${metricCard('💰', 'Custo Operacional',  met.operationalCost ? met.operationalCost + '/mês' : '—', 'Custo estimado com operação manual e retrabalho evitável')}
              </tr>
              <tr>
                ${metricCard('⚠️', 'Dependência Humana', met.dependency,     'Percentual de processos que dependem de intervenção humana para funcionar')}
                ${metricCard('📈', 'Pot. de Automação',  met.efficiency,     'Processos que podem ser automatizados com a infraestrutura certa')}
              </tr>
            </table>
          </td>
        </tr>

        ${opps.length > 0 ? `
        <!-- ── OPPORTUNITIES ── -->
        <tr>
          <td style="padding:24px 40px 0;">
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:2.5px;text-transform:uppercase;margin-bottom:12px;">Oportunidades Identificadas</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#181818;border-radius:12px;">
              <tr>
                <td style="padding:8px 22px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${opps.map(o => oppRow(o.label, o.value)).join('')}
                    <tr><td style="height:4px;"></td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>` : ''}

        ${radarItems.length > 0 ? `
        <!-- ── RADAR ── -->
        <tr>
          <td style="padding:24px 40px 0;">
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:2.5px;text-transform:uppercase;margin-bottom:12px;">Radar de Maturidade</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#181818;border-radius:12px;">
              <tr>
                <td style="padding:18px 22px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${radarItems.map(r => radarBar(r.subject, r.value)).join('')}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>` : ''}

        <!-- ── DIVIDER ── -->
        <tr>
          <td style="padding:36px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-top:1px solid rgba(255,255,255,0.08);font-size:0;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── CTA BLOCK ── -->
        <tr>
          <td style="padding:32px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" class="email-cta-card" style="background:#0f1f08;border:1px solid rgba(190,255,1,0.2);border-radius:16px;">
              <tr>
                <td style="padding:32px 36px;" align="center">
                  <div class="email-green" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:10px;color:#beff01;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;">Próximo Passo</div>
                  <h2 class="email-white" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:22px;font-weight:800;color:#ffffff;margin:0 0 12px;line-height:1.35;">
                    Transforme esse diagnóstico<br>em resultado real.
                  </h2>
                  <p class="email-muted" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.45);margin:0 0 28px;line-height:1.7;">
                    Agende uma <strong style="color:rgba(255,255,255,0.75);">Call Estratégica Gratuita</strong> com um dos nossos gestores.<br>
                    Vamos analisar juntos onde está o gargalo e o que fazer primeiro.
                  </p>
                  <a href="${bookingUrl}" class="email-btn"
                     style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;display:inline-block;background:#beff01;color:#0d0d0d;font-size:15px;font-weight:800;text-decoration:none;padding:16px 44px;border-radius:10px;letter-spacing:0.3px;">
                    Agendar minha Call Estratégica &rarr;
                  </a>
                  <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.2);margin:16px 0 0;">
                    Gratuito &middot; 30 minutos &middot; Sem compromisso
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── FOOTER ── -->
        <tr>
          <td style="padding:32px 40px 36px;" align="center">
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.15);margin:0 0 6px;">
              © ${new Date().getFullYear()} NeuralOps &middot; Infraestrutura Neural de Crescimento
            </p>
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.1);margin:0;">
              Você recebeu este email porque completou o Diagnóstico Neural™ em neuralops.com.br
            </p>
          </td>
        </tr>

      </table>
      <!-- ══ /CONTAINER ══ -->

    </td>
  </tr>
</table>

</body>
</html>`
}

async function sendDiagnosticEmail({ email, firstName, diagnosisData }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL  ?? 'diagnostico@neuralops.com.br'
  const BOOKING_URL    = process.env.GHL_BOOKING_URL     ?? 'https://neuralops.com.br/agendar'

  if (!RESEND_API_KEY) {
    console.warn('[send-email] RESEND_API_KEY not set — skipping email')
    return { skipped: true }
  }

  const d    = diagnosisData ?? {}
  const name = firstName ?? email.split('@')[0]
  const sc   = d.score ?? 0

  const html = buildDiagnosticEmail({
    firstName:     name,
    score:         sc,
    category:      d.category,
    diagnosis:     d.diagnosis,
    metrics:       d.metrics,
    radar:         d.radar,
    opportunities: d.opportunities,
    bookingUrl:    BOOKING_URL,
  })

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    `NeuralOps Diagnóstico <${FROM_EMAIL}>`,
      to:      [email],
      subject: `Seu Diagnóstico Neural™, ${name} — Score ${sc}/100`,
      html,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(`Resend error: ${JSON.stringify(data)}`)
  return { emailId: data.id }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const API_KEY = process.env.GHL_API_KEY
  if (!API_KEY) return res.status(500).json({ error: 'GHL_API_KEY not configured' })

  const {
    email, firstName, lastName,
    pdfBase64, fileName = 'diagnostico-neuralops.pdf',
    diagnosisData,
    company, instagram,
  } = req.body

  if (!email) return res.status(400).json({ error: 'email is required' })

  const ghlHeaders = {
    Authorization: `Bearer ${API_KEY}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
  }

  try {
    // ── Step 1: Upsert contact → get contactId ──────────────────────────────
    const upsertPayload = { locationId: LOCATION_ID, email, firstName, lastName }
    const customFields = []
    if (company)   customFields.push({ key: 'nome_da_sua_empresa', field_value: company })
    if (instagram) customFields.push({ key: 'instagram',           field_value: instagram.startsWith('@') ? instagram : `@${instagram}` })
    if (customFields.length > 0) upsertPayload.customFields = customFields

    const upsertRes  = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method:  'POST',
      headers: ghlHeaders,
      body: JSON.stringify(upsertPayload),
    })
    const upsertData = await upsertRes.json()
    const contactId  = upsertData?.contact?.id
    if (!contactId) {
      return res.status(400).json({ error: 'Could not resolve contactId', detail: upsertData })
    }

    // ── Step 2: Try PDF upload to GHL media library ─────────────────────────
    let fileUrl = null
    if (pdfBase64) {
      try {
        const pdfBuffer = Buffer.from(pdfBase64, 'base64')
        const form      = new FormData()
        form.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), fileName)
        form.append('locationId', LOCATION_ID)
        form.append('fileType', 'document')

        const uploadRes  = await fetch(`${GHL_BASE}/medias/upload-file`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${API_KEY}`, Version: '2021-07-28' },
          body:    form,
        })
        const uploadData = await uploadRes.json()
        fileUrl = uploadData?.url ?? uploadData?.fileUrl ?? uploadData?.data?.url ?? null
      } catch (_) { /* media upload failed silently — note still created */ }
    }

    // ── Step 3: Build rich note ─────────────────────────────────────────────
    const d    = diagnosisData ?? {}
    const date = new Date().toLocaleDateString('pt-BR')
    const lines = [
      `📊 DIAGNÓSTICO NEURAL — ${firstName ?? ''} ${lastName ?? ''}`.trim(),
      `Data: ${date}`,
      ...(company   ? [`🏢 Empresa:   ${company}`]   : []),
      ...(instagram ? [`📸 Instagram: ${instagram.startsWith('@') ? instagram : '@' + instagram}`] : []),
      '',
      `⚡ SCORE: ${d.score ?? '—'}/100`,
      `🏷️  Categoria: ${d.category ?? '—'}`,
      '',
      '━━━━ DIAGNÓSTICO ━━━━',
      d.diagnosis ?? '',
      '',
      '━━━━ MÉTRICAS CALCULADAS ━━━━',
      `🕐 Trabalho manual:     ${d.metrics?.manualHours     ?? '—'}`,
      `💰 Custo operacional:   ${d.metrics?.operationalCost ?? '—'}/mês`,
      `⚠️  Dependência humana:  ${d.metrics?.dependency      ?? '—'}`,
      `📈 Pot. de automação:   ${d.metrics?.efficiency      ?? '—'}`,
      '',
      '━━━━ RADAR DE MATURIDADE ━━━━',
      ...(d.radar ?? []).map(r => `• ${r.subject?.replace('\n', ' ')}: ${r.value}/100`),
      '',
      '━━━━ OPORTUNIDADES ━━━━',
      ...(d.opportunities ?? []).map(o => `• ${o.label}: ${o.value}`),
    ]

    if (fileUrl) {
      lines.push('', '━━━━ ARQUIVO ━━━━', `📎 PDF do diagnóstico: ${fileUrl}`)
    }

    lines.push(
      '',
      '─────────────────────────────',
      'Gerado automaticamente por neuralops.com.br',
    )

    const noteBody = lines.join('\n')

    await fetch(`${GHL_BASE}/contacts/${contactId}/notes`, {
      method:  'POST',
      headers: ghlHeaders,
      body: JSON.stringify({ body: noteBody }),
    })

    // ── Step 4: Send diagnostic email via Resend ────────────────────────────
    let emailResult = null
    try {
      emailResult = await sendDiagnosticEmail({ email, firstName, diagnosisData })
    } catch (emailErr) {
      // Email failure never blocks the main response
      console.error('[send-email] failed:', emailErr.message)
    }

    return res.status(200).json({ success: true, contactId, fileUrl, email: emailResult })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
