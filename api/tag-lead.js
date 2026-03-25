/**
 * Vercel Edge Function — POST /api/tag-lead
 *
 * Recebe dados do lead (email, phone, name) + array de tags
 * calculadas no quiz e aplica no contato GHL via API privada.
 *
 * A GHL_API_KEY nunca é exposta no browser.
 */

const LOCATION_ID = 'o9LtB6haFl99RD67rloF'
const GHL_BASE    = 'https://services.leadconnectorhq.com'

export default async function handler(request) {
  // ── CORS preflight ──────────────────────────────────────────────────────────
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405)
  }

  const API_KEY = process.env.GHL_API_KEY
  if (!API_KEY) return json({ error: 'GHL_API_KEY not configured' }, 500)

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { email, phone, firstName, lastName, tags } = body
  if (!email || !Array.isArray(tags)) {
    return json({ error: 'email and tags are required' }, 400)
  }

  const ghlHeaders = {
    Authorization: `Bearer ${API_KEY}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
  }

  try {
    // Step 1: Upsert contact → get contactId
    const upsertRes  = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method:  'POST',
      headers: ghlHeaders,
      body: JSON.stringify({
        locationId: LOCATION_ID,
        email,
        phone,
        firstName,
        lastName,
      }),
    })
    const upsertData = await upsertRes.json()
    const contactId  = upsertData?.contact?.id

    if (!contactId) {
      return json({ error: 'Could not resolve contactId', detail: upsertData }, 400)
    }

    // Step 2: Add smart tags
    const tagsRes  = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
      method:  'POST',
      headers: ghlHeaders,
      body:    JSON.stringify({ tags }),
    })
    const tagsData = await tagsRes.json()

    return json({ success: true, contactId, tagsAdded: tagsData.tagsAdded ?? tags })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

export const config = { runtime: 'edge' }
