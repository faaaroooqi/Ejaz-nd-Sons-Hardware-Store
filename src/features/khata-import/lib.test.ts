import { describe, it, expect } from 'vitest'
import {
  normalizeName,
  nameSimilarity,
  bestPartyMatch,
  buildPartyChoice,
  scannedToDraftLines,
  applyForwardRowPolicy,
  reconcileLines,
  validateLine,
  totalsFor,
  checkReadiness,
  buildPostPayload,
  fillMissingDates,
} from './lib'
import type { ScannedEntry, DraftLine, PartyChoice, KnownParty } from './lib'

describe('khata-import/lib', () => {
  describe('normalizeName & nameSimilarity', () => {
    it('normalizes names by lowercasing and removing punctuation and filler titles', () => {
      expect(normalizeName('M/s. Haji Ahmed & Sons Traders!')).toBe('ahmed sons traders')
      expect(normalizeName('Ch. Muhammad Tariq')).toBe('muhammad tariq')
      expect(normalizeName('Sh. Bilal Hardware')).toBe('bilal hardware')
    })

    it('calculates name similarity accurately for near-exact matches', () => {
      expect(nameSimilarity('Ahmed Hardware', 'Ahmed Hardware')).toBe(1)
      expect(nameSimilarity('M/s Ahmed Hardware', 'Ahmed Hardware')).toBe(1) // filler token stripped
      const sim = nameSimilarity('Tariq Hardware Store', 'Tariq Hardware')
      expect(sim).toBeGreaterThanOrEqual(0.6)
    })

    it('matches known parties effectively', () => {
      const parties: KnownParty[] = [
        { id: 'p1', name: 'Al-Madina Traders', phone: '03001234567' },
        { id: 'p2', name: 'Kashmir Steel Mills', company_name: 'Kashmir Steel' },
      ]

      const m1 = bestPartyMatch('Al Madina Traders', parties)
      expect(m1.party?.id).toBe('p1')
      expect(m1.score).toBeGreaterThanOrEqual(0.85)

      const m2 = bestPartyMatch('Unknown Random Store', parties)
      expect(m2.score).toBeLessThan(0.6)
    })

    it('builds party choice with proper auto-match or suggestion thresholds', () => {
      const parties: KnownParty[] = [
        { id: 'p1', name: 'Al-Madina Traders', phone: '03001234567' },
      ]
      const choiceExact = buildPartyChoice('Al Madina Traders', parties)
      expect(choiceExact.mode).toBe('existing')
      expect(choiceExact.partyId).toBe('p1')

      const choiceNew = buildPartyChoice('Completely New Party', parties)
      expect(choiceNew.mode).toBe('new')
      expect(choiceNew.partyId).toBeNull()
    })
  })

  describe('scannedToDraftLines & applyForwardRowPolicy', () => {
    it('splits scanned entries with both charge and payment into two draft lines', () => {
      const entries: ScannedEntry[] = [
        {
          party_name: 'Tariq Sb',
          date: '2026-03-01',
          description: 'PVC Pipes & Fitting',
          charge: 15000,
          payment: 5000,
          written_balance: 10000,
          is_balance_forward: false,
          uncertain: false,
        },
      ]

      const lines = scannedToDraftLines(entries, 0)
      expect(lines).toHaveLength(2)
      expect(lines[0].kind).toBe('charge')
      expect(lines[0].amount).toBe(15000)
      expect(lines[0].writtenBalance).toBe(10000)

      expect(lines[1].kind).toBe('payment')
      expect(lines[1].amount).toBe(5000)
      expect(lines[1].writtenBalance).toBeNull() // Cleared on secondary split line
    })

    it('skips redundant brought-forward lines on multi-page accounts', () => {
      const lines: DraftLine[] = [
        {
          id: 'l1',
          partyKey: 'tariq',
          date: '2026-01-01',
          description: 'B/F',
          kind: 'charge',
          amount: 5000,
          writtenBalance: 5000,
          isForward: true,
          uncertain: false,
          include: true,
          source: 'scan',
          page: 0,
        },
        {
          id: 'l2',
          partyKey: 'tariq',
          date: '2026-01-05',
          description: 'Items',
          kind: 'charge',
          amount: 2000,
          writtenBalance: 7000,
          isForward: false,
          uncertain: false,
          include: true,
          source: 'scan',
          page: 0,
        },
        {
          id: 'l3',
          partyKey: 'tariq',
          date: '2026-02-01',
          description: 'B/F from page 1',
          kind: 'charge',
          amount: 7000,
          writtenBalance: 7000,
          isForward: true,
          uncertain: false,
          include: true,
          source: 'scan',
          page: 1,
        },
      ]

      const processed = applyForwardRowPolicy(lines)
      expect(processed[0].include).toBe(true)
      expect(processed[1].include).toBe(true)
      expect(processed[2].include).toBe(false)
      expect(processed[2].autoSkipped).toBe(true)
    })
  })

  describe('reconcileLines & validateLine', () => {
    it('detects balance discrepancies against written khata balance', () => {
      const lines: DraftLine[] = [
        {
          id: 'l1',
          partyKey: 'ahmed',
          date: '2026-01-01',
          description: 'Opening',
          kind: 'charge',
          amount: 1000,
          writtenBalance: 1000,
          isForward: true,
          uncertain: false,
          include: true,
          source: 'scan',
          page: 0,
        },
        {
          id: 'l2',
          partyKey: 'ahmed',
          date: '2026-01-05',
          description: 'Pipes',
          kind: 'charge',
          amount: 500,
          writtenBalance: 1800, // Expected 1000 + 500 = 1500, written says 1800 -> mismatch!
          isForward: false,
          uncertain: false,
          include: true,
          source: 'scan',
          page: 0,
        },
      ]

      const mismatches = reconcileLines(lines)
      expect(mismatches.has('l2')).toBe(true)
      expect(mismatches.get('l2')?.expected).toBe(1500)
      expect(mismatches.get('l2')?.written).toBe(1800)

      const issues = validateLine(lines[1], mismatches.get('l2'), '2026-12-31')
      const mismatchIssue = issues.find((i) => i.code === 'BALANCE_MISMATCH')
      expect(mismatchIssue).toBeDefined()
      expect(mismatchIssue?.level).toBe('warning')
    })

    it('validates missing dates, zero amounts, and future dates', () => {
      const badLine: DraftLine = {
        id: 'bad1',
        partyKey: 'ahmed',
        date: '2027-01-01',
        description: '',
        kind: 'charge',
        amount: '',
        writtenBalance: null,
        isForward: false,
        uncertain: true,
        include: true,
        source: 'manual',
        page: null,
      }

      const issues = validateLine(badLine, undefined, '2026-10-25')
      expect(issues.some((i) => i.code === 'FUTURE_DATE')).toBe(true)
      expect(issues.some((i) => i.code === 'NO_AMOUNT')).toBe(true)
      expect(issues.some((i) => i.code === 'UNCERTAIN')).toBe(true)
    })
  })

  describe('totalsFor, checkReadiness, buildPostPayload', () => {
    it('calculates totals correctly', () => {
      const lines: DraftLine[] = [
        {
          id: 'l1',
          partyKey: 'ahmed',
          date: '2026-01-01',
          description: 'Sale',
          kind: 'charge',
          amount: 2500,
          writtenBalance: null,
          isForward: false,
          uncertain: false,
          include: true,
          source: 'scan',
          page: 0,
        },
        {
          id: 'l2',
          partyKey: 'ahmed',
          date: '2026-01-02',
          description: 'Payment',
          kind: 'payment',
          amount: 1000,
          writtenBalance: null,
          isForward: false,
          uncertain: false,
          include: true,
          source: 'scan',
          page: 0,
        },
        {
          id: 'l3',
          partyKey: 'ahmed',
          date: '2026-01-03',
          description: 'Ignored',
          kind: 'charge',
          amount: 500,
          writtenBalance: null,
          isForward: false,
          uncertain: false,
          include: false, // skipped
          source: 'scan',
          page: 0,
        },
      ]

      const totals = totalsFor(lines)
      expect(totals.charges).toBe(2500)
      expect(totals.payments).toBe(1000)
      expect(totals.net).toBe(1500)
      expect(totals.count).toBe(2)
    })

    it('verifies readiness and blocks post when party is unset or amounts invalid', () => {
      const lines: DraftLine[] = [
        {
          id: 'l1',
          partyKey: 'ahmed',
          date: '2026-01-01',
          description: 'Sale',
          kind: 'charge',
          amount: 1000,
          writtenBalance: null,
          isForward: false,
          uncertain: false,
          include: true,
          source: 'scan',
          page: 0,
        },
      ]

      const unsetChoice: PartyChoice = {
        key: 'ahmed',
        scannedName: 'Ahmed',
        mode: 'unset',
        partyId: null,
        newName: 'Ahmed',
        phone: '',
        suggestionId: null,
        suggestionScore: 0,
      }

      const notReady = checkReadiness(lines, [unsetChoice], '2026-10-25')
      expect(notReady.ready).toBe(false)
      expect(notReady.problems.length).toBeGreaterThan(0)

      const readyChoice: PartyChoice = {
        ...unsetChoice,
        mode: 'existing',
        partyId: 'p-123',
      }
      const ready = checkReadiness(lines, [readyChoice], '2026-10-25')
      expect(ready.ready).toBe(true)
      expect(ready.problems.length).toBe(0)
      expect(ready.postable.length).toBe(1)
    })

    it('builds post payload accurately', () => {
      const lines: DraftLine[] = [
        {
          id: 'l1',
          partyKey: 'ahmed',
          date: '2026-01-01',
          description: 'Old bill 104',
          kind: 'charge',
          amount: 1250.5,
          writtenBalance: null,
          isForward: false,
          uncertain: false,
          include: true,
          source: 'scan',
          page: 0,
        },
      ]
      const choice: PartyChoice = {
        key: 'ahmed',
        scannedName: 'Ahmed Traders',
        mode: 'existing',
        partyId: 'p-123',
        newName: 'Ahmed Traders',
        phone: '',
        suggestionId: 'p-123',
        suggestionScore: 0.95,
      }

      const payload = buildPostPayload('customer', lines, [choice], {
        title: 'Batch Jan 2026',
        notes: 'Scanned from Khata Book #3',
      })

      expect(payload.party_type).toBe('customer')
      expect(payload.title).toBe('Batch Jan 2026')
      expect(payload.notes).toBe('Scanned from Khata Book #3')
      expect(payload.lines).toHaveLength(1)
      expect(payload.lines[0]).toEqual({
        party_id: 'p-123',
        entry_date: '2026-01-01',
        description: 'Old bill 104',
        charge: 1250.5,
      })
    })

    it('fills missing dates with fillMissingDates helper', () => {
      const lines: DraftLine[] = [
        {
          id: 'l1',
          partyKey: 'k',
          date: '',
          description: 'No date line',
          kind: 'charge',
          amount: 500,
          writtenBalance: null,
          isForward: false,
          uncertain: false,
          include: true,
          source: 'scan',
          page: 0,
        },
        {
          id: 'l2',
          partyKey: 'k',
          date: '2026-01-15',
          description: 'Has date',
          kind: 'charge',
          amount: 500,
          writtenBalance: null,
          isForward: false,
          uncertain: false,
          include: true,
          source: 'scan',
          page: 0,
        },
      ]

      const filled = fillMissingDates(lines, '2026-02-01')
      expect(filled[0].date).toBe('2026-02-01')
      expect(filled[1].date).toBe('2026-01-15')
    })
  })
})
