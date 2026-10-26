// Pure helpers for the khata-scan Edge Function (no Deno APIs, so they are unit-tested with Vitest).
//
// The vision model is asked for loose JSON; everything it returns is treated as UNTRUSTED text and is
// normalised here into clean rows the review screen can show. Nothing is ever posted from this output:
// the owner reviews / edits every row first.

export interface ScannedEntry {
  party_name: string | null
  date: string | null // YYYY-MM-DD or null when it could not be read
  description: string
  charge: number // amount that INCREASED what is owed (udhaar / goods on credit)
  payment: number // amount that REDUCED what is owed (money received / paid)
  written_balance: number | null // running balance as written in the book (used to cross-check)
  is_balance_forward: boolean // "pichla baqaya" / "B/F" carried over from an earlier page
  uncertain: boolean // model was not sure it read this row correctly
}

export interface ScanResult {
  page_title: string | null
  entries: ScannedEntry[]
  notes: string | null
}

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩'
const EXT_ARABIC_INDIC = '۰۱۲۳۴۵۶۷۸۹'

/** Convert Urdu / Arabic-Indic digits to 0-9 and drop thousands separators. */
export function toWesternDigits(input: string): string {
  let out = ''
  for (const ch of input) {
    const a = ARABIC_INDIC.indexOf(ch)
    const b = EXT_ARABIC_INDIC.indexOf(ch)
    out += a >= 0 ? String(a) : b >= 0 ? String(b) : ch
  }
  return out
}

/** "Rs. 12,500/-", "۱۲٬۵۰۰", 12500, "12500.50" -> number; anything unreadable -> null. */
export function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(Math.abs(value) * 100) / 100 : null
  if (typeof value !== 'string') return null
  const cleaned = toWesternDigits(value).replace(/[,٬،\s]/g, '').replace(/rs\.?|pkr|\/-|-\/|\/=|=/gi, '')
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  const n = Math.abs(Number(cleaned))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

/** Accepts YYYY-MM-DD (the format we ask for) and a few common slips; returns null if not plausible. */
export function parseIsoDate(value: unknown, today: Date = new Date()): string | null {
  if (typeof value !== 'string') return null
  const v = toWesternDigits(value).trim()
  let y: number, m: number, d: number
  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(v)
  if (match) {
    y = Number(match[1]); m = Number(match[2]); d = Number(match[3])
  } else {
    // day-first, as written in Pakistani registers
    match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(v)
    if (!match) return null
    d = Number(match[1]); m = Number(match[2]); y = Number(match[3])
    if (y < 100) y += 2000
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  if (y < 1980 || y > today.getUTCFullYear()) return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

/** Turn the model's raw JSON into safe rows. Never throws. */
export function normalizeScan(raw: unknown, today: Date = new Date()): ScanResult {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const list = Array.isArray(obj.entries) ? obj.entries : []
  const entries: ScannedEntry[] = []

  for (const item of list.slice(0, 400)) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    let charge = parseAmount(r.charge) ?? 0
    const payment = parseAmount(r.payment) ?? 0
    const written = parseAmount(r.written_balance)
    const isForward = r.is_balance_forward === true

    // A "balance brought forward" row often only carries the balance figure.
    if (isForward && charge === 0 && payment === 0 && written !== null && written > 0) charge = written

    if (charge === 0 && payment === 0) continue // nothing to post

    entries.push({
      party_name: cleanText(r.party_name, 150) || null,
      date: parseIsoDate(r.date, today),
      description: cleanText(r.description, 250),
      charge,
      payment,
      written_balance: written,
      is_balance_forward: isForward,
      uncertain: r.uncertain === true,
    })
  }

  return {
    page_title: cleanText(obj.page_title, 150) || null,
    entries,
    notes: cleanText(obj.notes, 500) || null,
  }
}
