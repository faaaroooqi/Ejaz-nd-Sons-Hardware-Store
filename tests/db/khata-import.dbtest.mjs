// DB-level acceptance tests for the "Import old khata" feature (migration 30).
// Runs against a REAL embedded PostgreSQL with the project's actual migrations.
//   npm run test:db
import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { TestDb, rpc, expectError, ADMIN_ID, STAFF_ID } from './helpers.mjs'

const CASH_ACCOUNT = '00000000-0000-0000-0000-000000000010'
const db = new TestDb()
let admin
let staff
const S = {}

const num = (v) => Number(v)
const q = async (sql, params = []) => (await db.admin.query(sql, params)).rows
const one = async (sql, params = []) => (await q(sql, params))[0]
const custBalance = async (id) =>
  num((await one('select coalesce((select current_balance from public.customer_balances where customer_id=$1),0) b', [id])).b)
const suppBalance = async (id) =>
  num((await one('select coalesce((select current_balance from public.supplier_balances where supplier_id=$1),0) b', [id])).b)
const day = async (n) => (await one('select (private.business_today() + $1::int)::text d', [n])).d
const count = async (table) => num((await one(`select count(*) n from public.${table}`)).n)
const importCust = (client, lines, force = false) =>
  rpc(client, 'post_khata_import', { party_type: 'customer', title: 'Test register', lines }, force)
const importSupp = (client, lines, force = false) =>
  rpc(client, 'post_khata_import', { party_type: 'supplier', lines }, force)

before(async () => {
  try {
    await db.start()
    await db.applyMigrations({})
    admin = await db.userClient(ADMIN_ID)
    staff = await db.userClient(STAFF_ID)
    S.c1 = (await one(`insert into public.customers (code, name, phone) values ('C-K001','Ahmed Traders','0300') returning id`)).id
    S.c2 = (await one(`insert into public.customers (code, name, phone) values ('C-K002','Bilal Hardware','0301') returning id`)).id
    S.s1 = (await one(`insert into public.suppliers (code, name, phone) values ('S-K001','Pak Steel Mills','0321') returning id`)).id
    S.d = { old: await day(-2000), mid: await day(-1500), recent: await day(-30) }
  } catch (e) {
    console.error('SETUP FAILED:', e.message, e.where || '', e.detail || '')
    throw e
  }
})

after(async () => {
  await db.stop()
})

test('K1 posts a customer khata page: ledger rows, balances, statement and import batch all agree', async () => {
  const r = await importCust(admin, [
    { party_id: S.c1, entry_date: S.d.old, description: 'Pipes 2in', charge: 12000 },
    { party_id: S.c1, entry_date: S.d.mid, description: 'Cash received', payment: 5000 },
    { party_id: S.c1, entry_date: S.d.recent, description: 'Fittings', charge: 3000 },
    { party_id: S.c2, entry_date: S.d.mid, description: 'Advance', payment: 2000 },
  ])
  S.first = r
  assert.equal(r.import_no, 'KH-0001')
  assert.equal(r.entry_count, 4)
  assert.equal(r.party_count, 2)
  assert.equal(r.new_party_count, 0)
  assert.equal(num(r.total_charges), 15000)
  assert.equal(num(r.total_payments), 7000)

  assert.equal(await custBalance(S.c1), 10000, '12000 - 5000 + 3000')
  assert.equal(await custBalance(S.c2), -2000, 'payment with no charge = advance')

  const st = await rpc(staff, 'get_customer_statement', S.c1, null, null, null)
  assert.deepEqual(
    st.rows.map((x) => [x.entry_date, num(x.debit), num(x.credit), num(x.running_balance)]),
    [[S.d.old, 12000, 0, 12000], [S.d.mid, 0, 5000, 7000], [S.d.recent, 3000, 0, 10000]],
  )
  assert.match(st.rows[0].description, /^Old khata: Pipes 2in/)
  assert.equal(st.rows[0].reference_no, 'KH-0001')
  assert.equal(st.balance_matches_cache, true)

  const lines = await q('select count(*)::int n from public.khata_import_lines where import_id=$1', [r.id])
  assert.equal(lines[0].n, 4)
  const log = await one(`select count(*)::int n from public.activity_logs where action='khata_import.posted' and entity_id=$1`, [r.id])
  assert.equal(log.n, 1)
})

test('K2 import never touches stock, sales, purchases, payments or cash accounts', async () => {
  const before = {
    sales: await count('sales'), pays: await count('customer_payments'), moves: await count('stock_movements'),
    purchases: await count('purchases'), spays: await count('supplier_payments'),
  }
  await importCust(admin, [{ party_id: S.c2, entry_date: S.d.recent, description: 'Cement', charge: 800 }])
  assert.deepEqual(
    { sales: await count('sales'), pays: await count('customer_payments'), moves: await count('stock_movements'),
      purchases: await count('purchases'), spays: await count('supplier_payments') },
    before,
  )
})

test('K3 staff without data.import cannot import, undo, or read batches; nobody can write the tables directly', async () => {
  const before = await count('khata_imports')
  assert.equal((await expectError(importCust(staff, [{ party_id: S.c1, entry_date: S.d.recent, charge: 1 }]))).message, 'PERMISSION_DENIED')
  assert.equal((await expectError(rpc(staff, 'undo_khata_import', S.first.id, 'x'))).message, 'PERMISSION_DENIED')
  assert.equal((await staff.query('select * from public.khata_imports')).rowCount, 0, 'RLS hides batches from staff')
  assert.ok((await admin.query('select * from public.khata_imports')).rowCount >= 1, 'admin sees batches')
  const err = await expectError(admin.query(`insert into public.khata_imports (import_no, party_type) values ('X','customer')`))
  assert.match(err.message, /permission denied/i)
  const err2 = await expectError(admin.query('update public.khata_imports set entry_count = 99'))
  assert.match(err2.message, /permission denied/i)
  assert.equal(await count('khata_imports'), before)
})

test('K4 invalid lines are rejected with a clear code and leave NOTHING behind (atomic, gap-free numbering)', async () => {
  const snap = async () => ({
    imports: await count('khata_imports'), lines: await count('khata_import_lines'),
    ledger: await count('customer_ledger_entries'), customers: await count('customers'),
    bal: await custBalance(S.c1), logs: await count('activity_logs'),
  })
  const before = await snap()
  const good = { party_id: S.c1, entry_date: S.d.recent, description: 'ok row', charge: 100 }
  const cases = [
    ['no date', { ...good, entry_date: null }, 'DATE_REQUIRED'],
    ['future date', { ...good, entry_date: await day(1) }, 'FUTURE_DATE'],
    ['both amounts', { ...good, charge: 10, payment: 10 }, 'INVALID_LINE_ITEM'],
    ['no amount', { ...good, charge: 0 }, 'INVALID_LINE_ITEM'],
    ['negative', { ...good, charge: -5 }, 'INVALID_LINE_ITEM'],
    ['unknown party id', { ...good, party_id: '99999999-9999-9999-9999-999999999999' }, 'CUSTOMER_NOT_FOUND'],
    ['walk-in customer', { ...good, party_id: '00000000-0000-0000-0000-000000000001' }, 'CUSTOMER_NOT_FOUND'],
    ['no party at all', { entry_date: S.d.recent, charge: 5 }, 'INVALID_PAYLOAD'],
    ['garbage date', { ...good, entry_date: 'not-a-date' }, 'INVALID_PAYLOAD'],
    ['garbage amount', { ...good, charge: 'abc' }, 'INVALID_PAYLOAD'],
  ]
  for (const [label, bad, code] of cases) {
    // good row FIRST and a brand-new party, so the failure happens after real work was done
    const err = await expectError(importCust(admin, [good, { party_name: 'Should Not Exist', entry_date: S.d.recent, charge: 9 }, bad]))
    assert.ok(err, `${label}: expected an error`)
    assert.equal(err.message, code, label)
    assert.deepEqual(await snap(), before, `${label}: nothing may be left behind`)
  }
  assert.equal((await expectError(importCust(admin, []))).message, 'INVALID_PAYLOAD')
  assert.equal((await expectError(rpc(admin, 'post_khata_import', { party_type: 'vendor', lines: [good] }, false))).message, 'INVALID_PAYLOAD')
  const detail = await expectError(importCust(admin, [good, { ...good, entry_date: null }]))
  assert.equal(JSON.parse(detail.detail).line, 2, 'error says which line is wrong')

  const next = await importCust(admin, [{ ...good, description: 'after failures' }])
  assert.equal(next.import_no, `KH-${String(num(S.first.import_no.slice(3)) + 2).padStart(4, '0')}`, 'failed attempts consumed no numbers')
})

test('K5 parties: exact-name match is reused (case/space-insensitive); unknown names are created once per batch', async () => {
  const custBefore = await count('customers')
  const r = await importCust(admin, [
    { party_name: '  ahmed   TRADERS ', entry_date: S.d.recent, description: 'reuse', charge: 500 },
    { party_name: 'New Shop Karachi', party_phone: '0333-111', entry_date: S.d.mid, description: 'a', charge: 700 },
    { party_name: 'new shop karachi', entry_date: S.d.recent, description: 'b', payment: 200 },
  ])
  assert.equal(r.new_party_count, 1)
  assert.equal(r.party_count, 2)
  assert.equal(await count('customers'), custBefore + 1)
  const created = await one(`select id, code, phone, is_active from public.customers where name = 'New Shop Karachi'`)
  assert.match(created.code, /^C-\d{5}$/)
  assert.equal(created.phone, '0333-111')
  assert.equal(created.is_active, true)
  assert.equal(await custBalance(created.id), 500, '700 - 200')
  const names = await q('select distinct party_id from public.khata_import_lines where import_id=$1 and party_name = $2', [r.id, 'Ahmed Traders'])
  assert.equal(names.length, 1)
  assert.equal(names[0].party_id, S.c1, 'reused the existing Ahmed Traders')
  S.newCust = created.id
  S.k5 = r

  // a phone-less new party still satisfies the NOT-blank phone rule
  const r2 = await importCust(admin, [{ party_name: 'No Phone Party', entry_date: S.d.recent, charge: 10 }])
  assert.equal((await one(`select phone from public.customers where name='No Phone Party'`)).phone, 'N/A')
  assert.equal(r2.new_party_count, 1)
})

test('K6 duplicates: re-importing the same page is blocked (nothing posted); repeated rows INSIDE one page are fine; force overrides', async () => {
  const page = [
    { party_id: S.c2, entry_date: S.d.old, description: 'Bricks', charge: 4400 },
    { party_id: S.c2, entry_date: S.d.old, description: 'Bricks', charge: 4400 }, // two identical deliveries same day
    { party_id: S.c2, entry_date: S.d.mid, description: 'Cash', payment: 1000 },
  ]
  const first = await importCust(admin, page)
  assert.equal(first.entry_count, 3, 'identical rows inside one import are legitimate')
  const bal = await custBalance(S.c2)
  const importsBefore = await count('khata_imports')
  const ledgerBefore = await count('customer_ledger_entries')

  const err = await expectError(importCust(admin, page))
  assert.equal(err.message, 'DUPLICATE_ENTRIES')
  assert.deepEqual(JSON.parse(err.detail).lines, [1, 2, 3])
  assert.equal(await count('khata_imports'), importsBefore)
  assert.equal(await count('customer_ledger_entries'), ledgerBefore)
  assert.equal(await custBalance(S.c2), bal)

  const partial = await expectError(importCust(admin, [
    { party_id: S.c2, entry_date: S.d.mid, description: 'Cash', payment: 1000 },
    { party_id: S.c2, entry_date: S.d.mid, description: 'Something different', payment: 1 },
  ]))
  assert.deepEqual(JSON.parse(partial.detail).lines, [1], 'only the real duplicate is reported')

  const forced = await importCust(admin, page, true)
  assert.equal(forced.entry_count, 3)
  assert.equal(await custBalance(S.c2), bal + (8800 - 1000), 'forced second copy posted')
  const flag = await one(`select new_data from public.activity_logs where action='khata_import.posted' and entity_id=$1`, [forced.id])
  assert.equal(Number(flag.new_data.forced_duplicates), 3, 'forced duplicates are recorded in the audit log')
  S.dupBatch = first
})

test('K7 supplier khata: charge = payable (credit), payment = paid (debit), balance = what we still owe', async () => {
  const r = await importSupp(admin, [
    { party_id: S.s1, entry_date: S.d.old, description: 'Steel rods', charge: 90000 },
    { party_id: S.s1, entry_date: S.d.mid, description: 'Paid by cheque', payment: 40000 },
    { party_name: 'Karachi Cement Co', entry_date: S.d.mid, description: 'Cement', charge: 25000 },
  ])
  assert.equal(r.new_party_count, 1)
  assert.equal(await suppBalance(S.s1), 50000)
  const c = await one(`select id, code from public.suppliers where name='Karachi Cement Co'`)
  assert.match(c.code, /^S-\d{5}$/)
  assert.equal(await suppBalance(c.id), 25000)
  const rows = await q('select debit, credit, source_type, entry_type from public.supplier_ledger_entries where supplier_id=$1 order by entry_date', [S.s1])
  assert.deepEqual(rows.map((x) => [num(x.debit), num(x.credit), x.source_type, x.entry_type]),
    [[0, 90000, 'khata_import', 'adjustment'], [40000, 0, 'khata_import', 'adjustment']])
  S.suppImport = r
  S.cementSupplier = c.id
})

test('K8 period lock: books_locked_until blocks posting AND undoing historical entries', async () => {
  const locked = await day(-1000)
  const before = await count('khata_imports')
  await q('update public.settings set books_locked_until=$1 where id=1', [locked])
  try {
    const err = await expectError(importCust(admin, [{ party_id: S.c1, entry_date: S.d.old, description: 'locked era', charge: 1 }]))
    assert.equal(err.message, 'PERIOD_LOCKED')
    assert.equal(await count('khata_imports'), before)
    const err2 = await expectError(rpc(admin, 'undo_khata_import', S.first.id, 'locked'))
    assert.equal(err2.message, 'PERIOD_LOCKED')
    assert.equal((await one('select status from public.khata_imports where id=$1', [S.first.id])).status, 'posted')
    const ok = await importCust(admin, [{ party_id: S.c1, entry_date: S.d.recent, description: 'after the lock', charge: 1 }])
    assert.equal(ok.entry_count, 1)
  } finally {
    await q('update public.settings set books_locked_until=null where id=1')
  }
})

test('K9 undo: append-only reversal restores every balance, originals stay, idempotent, audited', async () => {
  const imp = S.k5
  const newBal = await custBalance(S.newCust)
  const c1Before = await custBalance(S.c1)
  assert.equal(newBal, 500)
  const ledgerBefore = await count('customer_ledger_entries')

  const res = await rpc(admin, 'undo_khata_import', imp.id, 'wrong register scanned')
  assert.equal(res.success, true)
  assert.equal(res.reversed_entries, 3)
  assert.equal(await custBalance(S.newCust), 0, 'new party back to nothing')
  assert.equal(await custBalance(S.c1), c1Before - 500, 'only this batch (500) removed from Ahmed')
  assert.equal(await count('customer_ledger_entries'), ledgerBefore + 3, 'rows ADDED, none deleted')

  const batch = await one('select status, undo_reason, undone_by from public.khata_imports where id=$1', [imp.id])
  assert.equal(batch.status, 'undone')
  assert.equal(batch.undo_reason, 'wrong register scanned')
  assert.ok(batch.undone_by)

  const revs = await q(`select debit, credit, reversal_of, reference_no, source_type from public.customer_ledger_entries where source_type='reversal' and source_id=$1`, [imp.id])
  assert.equal(revs.length, 3)
  assert.ok(revs.every((r) => r.reversal_of && r.reference_no === imp.import_no))

  const st = await rpc(staff, 'get_customer_statement', S.newCust, null, null, null)
  assert.equal(st.rows.length, 4, 'statement keeps the 2 originals and shows the 2 reversals')
  assert.equal(num(st.closing_balance), 0)
  assert.equal(st.balance_matches_cache, true)

  const ledgerN = await count('customer_ledger_entries')
  const again = await rpc(admin, 'undo_khata_import', imp.id, 'double click')
  assert.equal(again.already_undone, true)
  assert.equal(await count('customer_ledger_entries'), ledgerN, 'second undo adds nothing')

  const log = await one(`select count(*)::int n from public.activity_logs where action='khata_import.undone' and entity_id=$1`, [imp.id])
  assert.equal(log.n, 1)
  assert.equal((await expectError(rpc(admin, 'undo_khata_import', '99999999-9999-9999-9999-999999999999', 'x'))).message, 'KHATA_IMPORT_NOT_FOUND')
})

test('K10 an undone batch no longer counts as a duplicate source: the same page can be imported again', async () => {
  const lines = [{ party_name: 'New Shop Karachi', party_phone: '0333-111', entry_date: S.d.mid, description: 'a', charge: 700 }]
  const r = await importCust(admin, lines)
  assert.equal(r.entry_count, 1)
  assert.equal(r.new_party_count, 0, 'party from the undone batch still exists and is reused')
})

test('K11 supplier batch undo reverses payables', async () => {
  const before = await suppBalance(S.s1)
  assert.equal(before, 50000)
  await rpc(admin, 'undo_khata_import', S.suppImport.id, 'test')
  assert.equal(await suppBalance(S.s1), 0)
  assert.equal(await suppBalance(S.cementSupplier), 0)
})

test('K12 latent defects fixed: supplier payments / purchase returns can post; supplier opening balance RPC works', async () => {
  await rpc(admin, 'post_supplier_opening_balance', S.s1, 7000, null)
  assert.equal(await suppBalance(S.s1), 7000)
  assert.equal((await expectError(rpc(admin, 'post_supplier_opening_balance', S.s1, 5, null))).message, 'OPENING_BALANCE_EXISTS')
  assert.equal((await expectError(rpc(admin, 'post_supplier_opening_balance', S.s1, 0, null))).message, 'INVALID_AMOUNT')
  assert.equal((await expectError(rpc(staff, 'post_supplier_opening_balance', S.s1, 5, null))).message, 'PERMISSION_DENIED')

  // used to violate supplier_ledger_entries_source_type_check ('supplier_payment')
  const pay = await rpc(admin, 'post_supplier_payment', {
    supplier_id: S.s1, amount: 2000, payment_method: 'cash', payment_account_id: CASH_ACCOUNT,
  })
  assert.ok(pay.id)
  assert.equal(await suppBalance(S.s1), 5000)
})

test('K13 invariants: every ledger sum equals its cached balance, imports reconcile with their ledger rows', async () => {
  const badC = await q(`
    select b.customer_id from public.customer_balances b
    left join (select customer_id, sum(debit-credit) s from public.customer_ledger_entries group by 1) l using (customer_id)
    where b.current_balance <> coalesce(l.s,0)`)
  assert.equal(badC.length, 0)
  const badS = await q(`
    select b.supplier_id from public.supplier_balances b
    left join (select supplier_id, sum(credit-debit) s from public.supplier_ledger_entries group by 1) l using (supplier_id)
    where b.current_balance <> coalesce(l.s,0)`)
  assert.equal(badS.length, 0)

  // header totals == sum of its lines
  const drift = await q(`
    select i.id from public.khata_imports i
    left join (select import_id, count(*) n, sum(charge) c, sum(payment) p from public.khata_import_lines group by 1) l on l.import_id = i.id
    where i.entry_count <> coalesce(l.n,0) or i.total_charges <> coalesce(l.c,0) or i.total_payments <> coalesce(l.p,0)`)
  assert.equal(drift.length, 0)

  // every line points at exactly one real ledger row of the right party
  const orphans = await q(`
    select l.id from public.khata_import_lines l
    join public.khata_imports i on i.id = l.import_id
    where i.party_type='customer' and not exists (
      select 1 from public.customer_ledger_entries e where e.id = l.ledger_entry_id and e.customer_id = l.party_id)`)
  assert.equal(orphans.length, 0)

  // import numbers are unique and gap-free
  const nos = (await q('select import_no from public.khata_imports order by import_no')).map((r) => num(r.import_no.slice(3)))
  assert.deepEqual(nos, nos.map((_, i) => i + 1))
})
