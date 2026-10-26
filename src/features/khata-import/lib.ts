// Pure logic for the "Import old khata" wizard. No React, no network - everything here is unit-tested.
//
// Vocabulary (same for customers and suppliers, so beginners only learn it once):
//   charge  = an amount that INCREASED what is owed
//             customer: goods given on credit (udhaar)      supplier: goods bought on credit
//   payment = an amount that REDUCED what is owed
//             customer: money received                       supplier: money paid
//   net owed = sum(charges) - sum(payments). This matches the app's stored balance for both
//   customers (debit - credit) and suppliers (credit - debit).

export type PartyType = 'customer' | 'supplier'
export type LineKind = 'charge' | 'payment'

/** One row as returned by the khata-scan Edge Function. */
export interface ScannedEntry {
  party_name: string | null
  date: string | null
  description: string
  charge: number
  payment: number
  written_balance: number | null
  is_balance_forward: boolean
  uncertain: boolean
}

export interface DraftLine {
  id: string
  partyKey: string // grouping key, '' = no name could be read
  date: string // YYYY-MM-DD or ''
  description: string
  kind: LineKind
  amount: number | ''
  writtenBalance: number | null
  isForward: boolean
  uncertain: boolean
  include: boolean
  source: 'scan' | 'manual'
  page: number | null // 0-based index of the scanned page it came from
  autoSkipped?: boolean // excluded automatically (repeated "balance brought forward")
}

export type PartyMode = 'existing' | 'new' | 'unset' | 'skip'

export interface PartyChoice {
  key: string
  scannedName: string
  mode: PartyMode
  partyId: string | null
  newName: string
  phone: string
  suggestionId: string | null
  suggestionScore: number
}

export interface KnownParty {
  id: string
  name: string
  code?: string
  business_name?: string | null
  company_name?: string | null
  phone?: string | null
  balance?: number
}

/* -------------------------------------------------------------------------- */
/* Names                                                                       */
/* -------------------------------------------------------------------------- */

const FILLER_TOKENS = new Set(['m', 's', 'ms', 'mr', 'mrs', 'm/s', 'haji', 'hajji', 'ch', 'sh', 'mian', 'the'])

/** Lower-case, strip punctuation and filler titles so "M/s. Ahmed  Traders" ~ "ahmed traders". */
export function normalizeName(input: string): string {
  const base = (input || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
  const tokens = base.split(/\s+/).filter(Boolean)
  const kept = tokens.filter((t) => !FILLER_TOKENS.has(t))
  return (kept.length > 0 ? kept : tokens).join(' ')
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

/** 0..1 similarity of two party names (1 = same once normalised). */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return 0
  if (na === nb) return 1

  const ta = new Set(na.split(' '))
  const tb = new Set(nb.split(' '))
  const inter = [...ta].filter((t) => tb.has(t)).length
  const jaccard = inter / (ta.size + tb.size - inter)

  const lev = 1 - levenshtein(na, nb) / Math.max(na.length, nb.length)

  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na]
  const contained = short.length >= 4 && long.includes(short) ? 0.8 : 0

  return Math.max(jaccard, lev, contained)
}

export function partySearchText(p: KnownParty): string {
  return [p.name, p.business_name, p.company_name].filter(Boolean).join(' ')
}

export function bestPartyMatch(name: string, parties: KnownParty[]): { party: KnownParty | null; score: number } {
  let best: KnownParty | null = null
  let score = 0
  for (const p of parties) {
    const s = Math.max(
      nameSimilarity(name, p.name),
      p.business_name ? nameSimilarity(name, p.business_name) * 0.95 : 0,
      p.company_name ? nameSimilarity(name, p.company_name) * 0.95 : 0,
    )
    if (s > score) {
      score = s
      best = p
    }
  }
  return { party: best, score }
}

/** Score at/above which a scanned name is matched automatically. */
export const AUTO_MATCH_SCORE = 0.85
/** Score at/above which the owner is ASKED ("Is this Ahmed Traders?"). Below it a new party is proposed. */
export const ASK_MATCH_SCORE = 0.6

export function buildPartyChoice(scannedName: string, parties: KnownParty[]): PartyChoice {
  const key = normalizeName(scannedName)
  const { party, score } = bestPartyMatch(scannedName, parties)
  const base = {
    key,
    scannedName,
    newName: scannedName.trim(),
    phone: '',
    suggestionId: party?.id ?? null,
    suggestionScore: score,
  }
  if (party && score >= AUTO_MATCH_SCORE) return { ...base, mode: 'existing', partyId: party.id }
  if (party && score >= ASK_MATCH_SCORE) return { ...base, mode: 'unset', partyId: null }
  return { ...base, mode: scannedName.trim() ? 'new' : 'unset', partyId: null }
}

/* -------------------------------------------------------------------------- */
/* Lines                                                                       */
/* -------------------------------------------------------------------------- */

let seq = 0
export function newLineId(): string {
  seq += 1
  return `l${Date.now().toString(36)}${seq}`
}

/** Convert scan output into editable lines (a row with BOTH amounts becomes two rows). */
export function scannedToDraftLines(entries: ScannedEntry[], page: number): DraftLine[] {
  const out: DraftLine[] = []
  for (const e of entries) {
    const partyKey = e.party_name ? normalizeName(e.party_name) : ''
    const common = {
      partyKey,
      date: e.date ?? '',
      description: e.description ?? '',
      writtenBalance: e.written_balance,
      isForward: e.is_balance_forward,
      uncertain: e.uncertain,
      include: true,
      source: 'scan' as const,
      page,
    }
    if (e.charge > 0) out.push({ ...common, id: newLineId(), kind: 'charge', amount: e.charge })
    if (e.payment > 0) out.push({ ...common, id: newLineId(), kind: 'payment', amount: e.payment, writtenBalance: e.charge > 0 ? null : e.written_balance, isForward: e.charge > 0 ? false : e.is_balance_forward })
  }
  return out
}

/**
 * When a customer's account spans several pages, every later page starts with
 * "balance brought forward". Counting it again would double the amount, so only the FIRST
 * brought-forward row of each party is kept ticked; the owner can tick the others back on.
 */
export function applyForwardRowPolicy(lines: DraftLine[]): DraftLine[] {
  const seen = new Set<string>()
  return lines.map((l) => {
    if (!l.isForward || l.source !== 'scan') {
      seen.add(l.partyKey)
      return l
    }
    const firstForParty = !seen.has(l.partyKey)
    seen.add(l.partyKey)
    return firstForParty ? l : { ...l, include: false, autoSkipped: true }
  })
}

export interface LineIssue {
  level: 'error' | 'warning'
  code:
    | 'NO_DATE'
    | 'FUTURE_DATE'
    | 'NO_AMOUNT'
    | 'UNCERTAIN'
    | 'BALANCE_MISMATCH'
    | 'OLD_DATE'
  message: string
  messageUr: string
}

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export interface ReconcileResult {
  expected: number
  written: number
}

/**
 * Cross-check against the running balance written in the book: between two consecutive rows of the
 * same party that both show a balance, the balance must move by exactly +charge / -payment.
 * A difference means an amount (or the order of rows) was read wrongly.
 */
export function reconcileLines(lines: DraftLine[]): Map<string, ReconcileResult> {
  const result = new Map<string, ReconcileResult>()
  const prevByParty = new Map<string, DraftLine>()
  for (const l of lines) {
    if (!l.include) continue
    const prev = prevByParty.get(l.partyKey)
    if (prev && prev.writtenBalance !== null && l.writtenBalance !== null && typeof l.amount === 'number') {
      const delta = l.kind === 'charge' ? l.amount : -l.amount
      const expected = round2(prev.writtenBalance + delta)
      if (Math.abs(expected - l.writtenBalance) > 0.5) result.set(l.id, { expected, written: l.writtenBalance })
    }
    if (l.writtenBalance !== null) prevByParty.set(l.partyKey, l)
    else if (prev) prevByParty.set(l.partyKey, { ...l, writtenBalance: null })
    else prevByParty.set(l.partyKey, l)
  }
  return result
}

export function validateLine(
  line: DraftLine,
  mismatch: ReconcileResult | undefined,
  today: string = todayIso(),
): LineIssue[] {
  const issues: LineIssue[] = []
  if (!line.date) {
    issues.push({ level: 'error', code: 'NO_DATE', message: 'Date is missing', messageUr: 'تاریخ درج کریں' })
  } else if (line.date > today) {
    issues.push({ level: 'error', code: 'FUTURE_DATE', message: 'Date is in the future', messageUr: 'تاریخ آنے والے دن کی ہے' })
  } else if (line.date < '1980-01-01') {
    issues.push({ level: 'warning', code: 'OLD_DATE', message: 'Date looks too old - check the year', messageUr: 'سال دوبارہ دیکھ لیں' })
  }
  if (line.amount === '' || !(Number(line.amount) > 0)) {
    issues.push({ level: 'error', code: 'NO_AMOUNT', message: 'Amount must be more than 0', messageUr: 'رقم 0 سے زیادہ ہونی چاہیے' })
  }
  if (line.uncertain) {
    issues.push({ level: 'warning', code: 'UNCERTAIN', message: 'Scanner was not sure - please check this row against the book', messageUr: 'اسکینر کو یقین نہیں تھا، کاپی سے ملا لیں' })
  }
  if (mismatch) {
    issues.push({
      level: 'warning',
      code: 'BALANCE_MISMATCH',
      message: `Book shows balance ${fmt(mismatch.written)} but the rows add up to ${fmt(mismatch.expected)} - an amount may be misread`,
      messageUr: `کاپی میں بقایا ${fmt(mismatch.written)} ہے مگر جمع ${fmt(mismatch.expected)} بنتا ہے، رقم دوبارہ دیکھیں`,
    })
  }
  return issues
}

/* -------------------------------------------------------------------------- */
/* Party summaries                                                             */
/* -------------------------------------------------------------------------- */

export interface PartyTotals {
  charges: number
  payments: number
  net: number // charges - payments (positive = still owed)
  count: number
}

export function totalsFor(lines: DraftLine[]): PartyTotals {
  let charges = 0
  let payments = 0
  let count = 0
  for (const l of lines) {
    if (!l.include || typeof l.amount !== 'number' || !(l.amount > 0)) continue
    count += 1
    if (l.kind === 'charge') charges += l.amount
    else payments += l.amount
  }
  charges = round2(charges)
  payments = round2(payments)
  return { charges, payments, net: round2(charges - payments), count }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function fmt(n: number): string {
  return `Rs. ${n.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`
}

/* -------------------------------------------------------------------------- */
/* Readiness + payload                                                         */
/* -------------------------------------------------------------------------- */

export interface Readiness {
  ready: boolean
  problems: string[]
  postable: DraftLine[]
}

export function checkReadiness(lines: DraftLine[], choices: PartyChoice[], today: string = todayIso()): Readiness {
  const problems: string[] = []
  const choiceByKey = new Map(choices.map((c) => [c.key, c]))
  const mismatches = reconcileLines(lines)
  const postable: DraftLine[] = []

  const keysUsed = new Set(lines.filter((l) => l.include).map((l) => l.partyKey))
  for (const key of keysUsed) {
    const c = choiceByKey.get(key)
    const label = c?.scannedName || 'Unnamed page'
    if (!c || c.mode === 'unset') problems.push(`Choose who "${label}" is (existing party or new).`)
    else if (c.mode === 'existing' && !c.partyId) problems.push(`Choose the existing party for "${label}".`)
    else if (c.mode === 'new' && !c.newName.trim()) problems.push(`Type a name for the new party "${label}".`)
  }

  let rowNo = 0
  for (const l of lines) {
    rowNo += 1
    const c = choiceByKey.get(l.partyKey)
    if (!l.include || c?.mode === 'skip') continue
    const errs = validateLine(l, mismatches.get(l.id), today).filter((i) => i.level === 'error')
    if (errs.length > 0) problems.push(`Row ${rowNo}: ${errs.map((e) => e.message).join(', ')}.`)
    else postable.push(l)
  }

  if (postable.length === 0 && problems.length === 0) problems.push('There are no entries to save. Tick at least one row.')
  return { ready: problems.length === 0, problems, postable }
}

export interface PostLinePayload {
  party_id?: string
  party_name?: string
  party_phone?: string
  entry_date: string
  description: string
  charge?: number
  payment?: number
}

export function buildPostPayload(
  partyType: PartyType,
  lines: DraftLine[],
  choices: PartyChoice[],
  meta: { title?: string; notes?: string; sourceFiles?: string[] } = {},
) {
  const choiceByKey = new Map(choices.map((c) => [c.key, c]))
  const out: PostLinePayload[] = []
  for (const l of lines) {
    const c = choiceByKey.get(l.partyKey)
    if (!l.include || !c || c.mode === 'skip' || c.mode === 'unset') continue
    if (typeof l.amount !== 'number' || !(l.amount > 0)) continue
    const row: PostLinePayload = {
      entry_date: l.date,
      description: l.description.trim(),
      ...(l.kind === 'charge' ? { charge: round2(l.amount) } : { payment: round2(l.amount) }),
    }
    if (c.mode === 'existing' && c.partyId) row.party_id = c.partyId
    else {
      row.party_name = c.newName.trim()
      if (c.phone.trim()) row.party_phone = c.phone.trim()
    }
    out.push(row)
  }
  return {
    party_type: partyType,
    title: meta.title?.trim() || undefined,
    notes: meta.notes?.trim() || undefined,
    source_files: meta.sourceFiles && meta.sourceFiles.length > 0 ? meta.sourceFiles : undefined,
    lines: out,
  }
}

/** Fill every row that has no date with `date` (used by the "set date for all missing" helper). */
export function fillMissingDates(lines: DraftLine[], date: string): DraftLine[] {
  return lines.map((l) => (l.date ? l : { ...l, date }))
}
