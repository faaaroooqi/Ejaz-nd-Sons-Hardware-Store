// =============================================================================
// khata-scan Edge Function
// -----------------------------------------------------------------------------
// Reads ONE photographed page of an old paper khata (ledger book) with a vision
// model and returns the entries as clean JSON. It never writes to the database:
// the owner reviews / edits the rows in the app and only then posts them through
// the post_khata_import() RPC.
//
// POST JSON {
//   image_base64: string          (no "data:" prefix; JPEG / PNG / WEBP, <= ~6 MB)
//   mime_type?:   'image/jpeg' | 'image/png' | 'image/webp'
//   party_type:   'customer' | 'supplier'
//   known_parties?: string[]      (names already in the app, helps spelling)
// }
// -> { page_title, entries: [...], notes, model }
//
// Secrets (supabase secrets set ...):
//   GEMINI_API_KEY   required. Without it the function answers OCR_NOT_CONFIGURED and the
//                    app falls back to manual entry.
//   GEMINI_MODEL     optional, default gemini-2.5-flash
//
// Authorization: caller's JWT must belong to an active user holding `data.import`.
// =============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, json, requireEnv } from '../_shared/http.ts'
import { normalizeScan } from './normalize.ts'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BASE64_CHARS = 8_000_000 // ~6 MB of image data
const REQUEST_TIMEOUT_MS = 55_000

type Payload = Record<string, unknown>

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    page_title: { type: 'STRING', nullable: true },
    notes: { type: 'STRING', nullable: true },
    entries: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          party_name: { type: 'STRING', nullable: true },
          date: { type: 'STRING', nullable: true },
          description: { type: 'STRING' },
          charge: { type: 'NUMBER', nullable: true },
          payment: { type: 'NUMBER', nullable: true },
          written_balance: { type: 'NUMBER', nullable: true },
          is_balance_forward: { type: 'BOOLEAN' },
          uncertain: { type: 'BOOLEAN' },
        },
        required: ['description', 'is_balance_forward', 'uncertain'],
      },
    },
  },
  required: ['entries'],
}

function buildPrompt(partyType: 'customer' | 'supplier', known: string[]): string {
  const meaning =
    partyType === 'customer'
      ? [
          'This is a CUSTOMER khata (money customers owe the shop, "lena").',
          '"charge" = goods / amount given to the customer on credit (udhaar, ادھار, بنام, Debit, Dr, بل, مال).',
          '"payment" = money the customer paid back (جمع, وصول, نقد وصول, Credit, Cr, cash received).',
        ]
      : [
          'This is a SUPPLIER khata (money the shop owes suppliers, "dena").',
          '"charge" = goods bought / amount the shop owes the supplier (بنام, Credit, Cr, bill, مال خریدا).',
          '"payment" = money the shop paid to the supplier (ادائیگی, Debit, Dr, cash paid, cheque paid).',
        ]

  return [
    'You are reading a photographed page of a handwritten or printed Pakistani shop ledger (khata / کھاتہ).',
    'The text may be Urdu, English or mixed (Roman Urdu). Digits may be Urdu / Arabic-Indic (۰۱۲۳۴۵۶۷۸۹) - always output normal 0-9 digits.',
    ...meaning,
    'Column titles differ between books. If the page has a running BALANCE column, use it: a row that INCREASES the balance is a "charge", a row that DECREASES it is a "payment". Put the balance written on that row in "written_balance".',
    'Rules:',
    '- Return ONE entry per ledger row, in the order written on the page (top to bottom).',
    '- "date": write YYYY-MM-DD. Dates in these books are DAY-FIRST (04/03/19 = 4 March 2019). Two-digit years are 20xx. If a row has no date (ditto marks, blank), reuse the date of the row above it; if the page has no readable year anywhere, use null.',
    '- "description": the particulars / bill no. / items exactly as written (keep Urdu text as Urdu). Short is fine.',
    '- Exactly ONE of "charge" or "payment" should be a positive number per row; leave the other null.',
    '- A row like "pichla baqaya", "B/F", "b/d", "carried forward", "بقایا", "پچھلا بقایا" is the balance brought forward: set "is_balance_forward": true and put the amount in "charge" (or "payment" if it is an advance).',
    '- Do NOT include total / sub-total / grand-total lines, page headers or empty rows.',
    '- "party_name": the customer / supplier this row belongs to. If the whole page is one account (name written at the top), put that name on EVERY row and in "page_title". If every row names a different party, copy each name.',
    '- Set "uncertain": true for any row where you are unsure of the amount, date or name (smudged, struck-out, cut off). NEVER guess silently.',
    '- Ignore rows that are clearly crossed out.',
    '- Put anything important you could not read in "notes".',
    known.length > 0
      ? `Names already in the shop's system (prefer these exact spellings when a name clearly matches): ${known.slice(0, 150).join('; ')}`
      : '',
    'Return JSON only.',
  ]
    .filter(Boolean)
    .join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED', 'Use POST.', 405)

  try {
    const url = requireEnv('SUPABASE_URL')
    const anonKey = requireEnv('SUPABASE_ANON_KEY')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('UNAUTHENTICATED', 'Missing authorization.', 401)
    }

    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) return errorResponse('UNAUTHENTICATED', 'Invalid session.', 401)

    const { data: allowed, error: permError } = await callerClient.rpc('has_permission', {
      p_permission: 'data.import',
    })
    if (permError) return errorResponse('PERMISSION_CHECK_FAILED', permError.message, 500)
    if (!allowed) return errorResponse('PERMISSION_DENIED', 'You are not allowed to import khata records.', 403)

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return errorResponse(
        'OCR_NOT_CONFIGURED',
        'Automatic scanning is not switched on yet (no GEMINI_API_KEY secret). You can still type the entries by hand.',
        503,
      )
    }

    const body = (await req.json().catch(() => null)) as Payload | null
    if (!body || typeof body !== 'object') return errorResponse('INVALID_PAYLOAD', 'Body must be JSON.')

    const partyType = body.party_type === 'supplier' ? 'supplier' : body.party_type === 'customer' ? 'customer' : null
    if (!partyType) return errorResponse('INVALID_PAYLOAD', 'party_type must be customer or supplier.')

    const image = typeof body.image_base64 === 'string' ? body.image_base64.replace(/^data:[^;]+;base64,/, '') : ''
    if (!image) return errorResponse('INVALID_PAYLOAD', 'image_base64 is required.')
    if (image.length > MAX_BASE64_CHARS) return errorResponse('IMAGE_TOO_LARGE', 'The photo is too large. Try a smaller photo.', 413)
    if (!/^[A-Za-z0-9+/=\s]+$/.test(image)) return errorResponse('INVALID_PAYLOAD', 'Image data is not valid base64.')

    const mime = typeof body.mime_type === 'string' && ALLOWED_MIME.has(body.mime_type) ? body.mime_type : 'image/jpeg'
    const known = Array.isArray(body.known_parties)
      ? body.known_parties.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 80))
      : []

    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash'
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: buildPrompt(partyType, known) }, { inline_data: { mime_type: mime, data: image } }],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      })
    } catch (e) {
      const aborted = e instanceof Error && e.name === 'AbortError'
      return errorResponse(
        aborted ? 'OCR_TIMEOUT' : 'OCR_FAILED',
        aborted ? 'Reading the page took too long. Please try again.' : 'Could not reach the scanning service.',
        504,
      )
    } finally {
      clearTimeout(timer)
    }

    if (res.status === 429) return errorResponse('OCR_BUSY', 'The scanning service is busy. Wait a minute and try again.', 429)
    if (!res.ok) {
      console.error('gemini error', res.status, (await res.text().catch(() => '')).slice(0, 500))
      return errorResponse('OCR_FAILED', 'The scanning service could not read this photo.', 502)
    }

    const result = await res.json().catch(() => null)
    const text: unknown = result?.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof text !== 'string') {
      return errorResponse('OCR_EMPTY', 'Nothing could be read from this photo. Try a clearer, well-lit photo.', 422)
    }

    let parsed: unknown = null
    try {
      parsed = JSON.parse(text)
    } catch {
      return errorResponse('OCR_FAILED', 'The scanning service returned an unreadable answer. Please try again.', 502)
    }

    return json({ ...normalizeScan(parsed), model })
  } catch (e) {
    console.error(e)
    return errorResponse('INTERNAL_ERROR', e instanceof Error ? e.message : 'Unexpected error', 500)
  }
})
