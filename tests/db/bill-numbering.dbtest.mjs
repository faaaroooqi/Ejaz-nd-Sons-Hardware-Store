// DB-level acceptance tests for the bill-number / statement / cancellation work.
// Runs against a REAL embedded PostgreSQL with the project's actual migrations.
//   npm run test:db
//
// Phase A  : migrations 01-27 only (the state of the code before this change).
//            Seeds "legacy" production-like data and PROVES the defects found in the audit.
// Phase B  : applies migrations 28-29 on top of that legacy data and checks that
//            existing bill references / customer balances are preserved.
// Phase C+ : behavioural tests for each client requirement (incl. true concurrency).
import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { TestDb, rpc, expectError, ADMIN_ID, STAFF_ID, WALKIN_ID } from './helpers.mjs'

const CASH_ACCOUNT = '00000000-0000-0000-0000-000000000010'
const db = new TestDb()
let admin // authenticated, role admin (all permissions)
let staff // authenticated, role sales (no sales.cancel)
const S = {} // shared state across ordered tests

const num = (v) => Number(v)
const q = async (sql, params = []) => (await db.admin.query(sql, params)).rows
const one = async (sql, params = []) => (await q(sql, params))[0]
const post = (client, payload) => rpc(client, 'post_sale', payload)
const item = (variant, quantity, rate) => ({ variant_id: variant, quantity, rate })
const balance = async (customerId) =>
  num((await one('select coalesce((select current_balance from public.customer_balances where customer_id=$1),0) b', [customerId])).b)
const stockOf = async (variantId) =>
  num((await one('select coalesce((select quantity_on_hand from public.stock_levels where variant_id=$1),0) s', [variantId])).s)
const dayOffset = async (n) => (await one('select (private.business_today() + $1::int)::text d', [n])).d

before(async () => {
 try {
  await db.start()
  await db.applyMigrations({ to: 27 })
  admin = await db.userClient(ADMIN_ID)
  staff = await db.userClient(STAFF_ID)

  // --- seed catalogue, stock and customers (as the migration/superuser role) ---
  const cat = await one(`insert into public.categories (name) values ('Tools') returning id`)
  const unit = await one(`select id from public.units where code='pcs'`)
  S.variants = {}
  for (const [key, sku, name, rate, stock] of [
    ['A', 'HAM-001', 'Hammer', 100, 1000],
    ['B', 'SCR-002', 'Screwdriver', 200, 40],
    ['C', 'NAL-003', 'Nails 2in', 50, 3], // deliberately scarce, for the concurrency/stock test
    ['D', 'DRL-004', 'Drill Bit', 300, 1000],
  ]) {
    const p = await one(`insert into public.products (name, category_id, unit_id) values ($1,$2,$3) returning id`, [name, cat.id, unit.id])
    const v = await one(
      `insert into public.product_variants (product_id, sku, variant_name, default_rate, wholesale_rate, retail_rate, is_default)
       values ($1,$2,$3,$4,$4,$4,true) returning id`,
      [p.id, sku, name, rate],
    )
    S.variants[key] = v.id
    await q(
      `insert into public.stock_movements (variant_id, movement_date, movement_type, quantity, unit_cost, balance_after, source_type)
       values ($1, current_date, 'opening_stock', $2, 10, 0, 'opening')`,
      [v.id, stock],
    )
  }
  S.cust = {}
  for (const [key, code, name] of [
    ['c1', 'C-T001', 'Ali Traders'], ['c2', 'C-T002', 'Bashir Hardware'], ['c3', 'C-T003', 'Chaudhry Store'],
    ['c4', 'C-T004', 'Dawood Sons'], ['c5', 'C-T005', 'Elahi Bros'], ['c6', 'C-T006', 'Farooq Paints'],
    ['c7', 'C-T007', 'Gul Enterprises'], ['c8', 'C-T008', 'Habib Tools'], ['c9', 'C-T009', 'Iqbal Mart'],
  ]) {
    S.cust[key] = (await one(`insert into public.customers (code, name, phone) values ($1,$2,'0300') returning id`, [code, name])).id
  }
 } catch (e) {
  console.error('SETUP FAILED:', e.message, e.where || '', e.detail || '')
  throw e
 }
})

after(async () => {
  await db.stop()
})

// =============================================================================
// PHASE A — legacy state (migrations 01-27)
// =============================================================================
test('A0 legacy bills are posted with the OLD post_sale (no bill number exists yet)', async () => {
  const l1 = await post(staff, { customer_id: S.cust.c1, amount_paid: 400, items: [item(S.variants.A, 10, 100)] }) // 1000, paid 400
  const l2 = await post(staff, { customer_id: S.cust.c1, items: [item(S.variants.B, 5, 200)], amount_paid: 0 }) // 1000 unpaid
  const l3 = await post(staff, { customer_id: S.cust.c2, items: [item(S.variants.A, 10, 100)], amount_paid: 0 }) // 1000 unpaid
  S.legacy = [l1, l2, l3]
  assert.equal(l1.bill_number, undefined, 'old RPC has no bill_number')
  assert.match(l1.invoice_no, /^INV-\d{4}-\d{6}$/)
  assert.equal(await balance(S.cust.c1), 1600)
})

test('A1 AUDIT: authenticated users cannot INSERT ledger rows → client-side opening balance never worked', async () => {
  const err = await expectError(
    staff.query(`insert into public.customer_ledger_entries (customer_id, entry_date, entry_type, description, reference_no, debit, credit, source_type)
                 values ($1, current_date, 'opening_balance', 'Opening Khata Balance', 'OPN-BAL', 500, 0, 'opening')`, [S.cust.c3]),
  )
  assert.ok(err, 'expected an error')
  assert.match(err.message, /permission denied|row-level security/i)
})

test('A2 AUDIT: old cancel_sale only flips status – ledger debit stays and stock stays deducted', async () => {
  const stockBefore = await stockOf(S.variants.A)
  const balBefore = await balance(S.cust.c2)
  await rpc(admin, 'cancel_sale', S.legacy[2].id, 'legacy cancel')
  const row = await one('select status from public.sales where id=$1', [S.legacy[2].id])
  assert.equal(row.status, 'cancelled')
  assert.equal(await balance(S.cust.c2), balBefore, 'customer still owes the cancelled bill (defect)')
  assert.equal(await stockOf(S.variants.A), stockBefore, 'stock not restored (defect)')
  const log = await one(`select count(*)::int n from public.activity_logs where action='sale.cancelled'`)
  assert.equal(log.n, 0, 'no audit entry written (defect)')
})

test('A3 AUDIT: staff can directly UPDATE money columns of a sale (RLS policy + table-wide grant)', async () => {
  const res = await staff.query('update public.sales set grand_total = 1 where id = $1', [S.legacy[1].id])
  assert.equal(res.rowCount, 1, 'direct update succeeded (defect)')
  await q('update public.sales set grand_total = 1000 where id = $1', [S.legacy[1].id]) // restore legacy value
})

test('A4 AUDIT: post_sales_return for a real customer fails on the ledger source_type CHECK', async () => {
  const sale = await one('select id from public.sale_items where sale_id=$1 limit 1', [S.legacy[0].id])
  const err = await expectError(
    rpc(staff, 'post_sales_return', {
      sale_id: S.legacy[0].id,
      items: [{ sale_item_id: sale.id, variant_id: S.variants.A, quantity: 1, rate: 100 }],
    }),
  )
  assert.ok(err, 'expected failure')
  assert.match(err.message, /source_type_check|violates check constraint/i)
})

// =============================================================================
// PHASE B — migrate legacy data
// =============================================================================
test('B1 migration 28/29 preserve legacy invoice refs + balances and backfill bill numbers 1..N', async () => {
  const before = {
    invoices: (await q('select invoice_no from public.sales order by created_at, id')).map((r) => r.invoice_no),
    c1: await balance(S.cust.c1),
    c2: await balance(S.cust.c2),
    ledger: num((await one('select count(*) n from public.customer_ledger_entries')).n),
    stock: await stockOf(S.variants.A),
  }
  await db.applyMigrations({ from: 28 })

  const rows = await q('select invoice_no, bill_number::int bn, status from public.sales order by created_at, id')
  assert.deepEqual(rows.map((r) => r.bn), [1, 2, 3], 'deterministic backfill in creation order (cancelled bill included)')
  assert.deepEqual(rows.map((r) => r.invoice_no), before.invoices, 'invoice_no untouched')
  assert.equal(await balance(S.cust.c1), before.c1)
  assert.equal(await balance(S.cust.c2), before.c2, 'balances untouched (legacy cancelled bill still included – see report)')
  assert.equal(num((await one('select count(*) n from public.customer_ledger_entries')).n), before.ledger)
  assert.equal(await stockOf(S.variants.A), before.stock)
  const seq = await one(`select next_value::int n from public.document_sequences where doc_type='bill_number' and fiscal_year=0`)
  assert.equal(seq.n, 4, 'counter seeded to max+1')
})

test('B2 A3 is closed: staff can no longer change money / status / number columns directly', async () => {
  for (const col of ['grand_total = 1', "status = 'cancelled'", 'bill_number = 77', 'balance_due = 0']) {
    const err = await expectError(staff.query(`update public.sales set ${col} where id = $1`, [S.legacy[1].id]))
    assert.ok(err, `update of ${col} should be rejected`)
    assert.match(err.message, /permission denied/i)
  }
  const err = await expectError(staff.query('delete from public.sales where id = $1', [S.legacy[1].id]))
  assert.ok(err)
})

test('B3 A4 is closed: sales return for a real customer now posts and credits the khata', async () => {
  const si = await one('select id from public.sale_items where sale_id=$1 limit 1', [S.legacy[0].id])
  const before = await balance(S.cust.c1)
  await rpc(staff, 'post_sales_return', {
    sale_id: S.legacy[0].id,
    items: [{ sale_item_id: si.id, variant_id: S.variants.A, quantity: 1, rate: 100 }],
  })
  assert.equal(await balance(S.cust.c1), before - 100)
})

// =============================================================================
// REQ 1 / 2 — numbering + new fields
// =============================================================================
test('R1 sequential automatic numbering continues after backfill; payload bill_number is ignored', async () => {
  const a = await post(staff, { customer_id: S.cust.c3, items: [item(S.variants.A, 1, 100)], bill_number: 999 })
  const b = await post(staff, { customer_id: S.cust.c3, items: [item(S.variants.A, 1, 100)] })
  const c = await post(staff, { items: [item(S.variants.A, 1, 100)], amount_paid: 100 }) // walk-in
  assert.deepEqual([a, b, c].map((r) => Number(r.bill_number)), [4, 5, 6])
  S.first = a
})

test('R2 bilty_number and laborer_name persist separately from bill_number and invoice_no', async () => {
  const r = await post(staff, {
    customer_id: S.cust.c3, items: [item(S.variants.A, 2, 100)],
    bilty_number: '  BLT-2026-17 ', laborer_name: ' Rafiq Ahmed ', notes: 'gate 2',
  })
  const row = await one('select bill_number::int bn, bilty_number, laborer_name, invoice_no, notes from public.sales where id=$1', [r.id])
  assert.equal(row.bilty_number, 'BLT-2026-17')
  assert.equal(row.laborer_name, 'Rafiq Ahmed')
  assert.equal(row.bn, Number(r.bill_number))
  assert.notEqual(String(row.bn), row.bilty_number)
  assert.equal(r.bilty_number, 'BLT-2026-17')
  S.withBilty = r

  const blank = await post(staff, { customer_id: S.cust.c3, items: [item(S.variants.A, 1, 100)], bilty_number: '   ', laborer_name: '' })
  const brow = await one('select bilty_number, laborer_name from public.sales where id=$1', [blank.id])
  assert.equal(brow.bilty_number, null)
  assert.equal(brow.laborer_name, null)

  const err = await expectError(post(staff, { customer_id: S.cust.c3, items: [item(S.variants.A, 1, 100)], bilty_number: 'x'.repeat(51) }))
  assert.ok(err)
  assert.equal(err.message, 'INVALID_PAYLOAD')
})

test('R3 existing numbers survive editing + refreshing; bill_number can never be changed', async () => {
  const id = S.withBilty.id
  const before = await one('select bill_number::int bn, invoice_no from public.sales where id=$1', [id])

  await staff.query(`update public.sales set notes='edited', bilty_number='BLT-NEW', laborer_name='Kareem' where id=$1`, [id])
  const after1 = await one('select bill_number::int bn, invoice_no, bilty_number, laborer_name from public.sales where id=$1', [id])
  assert.equal(after1.bn, before.bn)
  assert.equal(after1.invoice_no, before.invoice_no)
  assert.equal(after1.bilty_number, 'BLT-NEW')
  assert.equal(after1.laborer_name, 'Kareem')

  const err = await expectError(staff.query('update public.sales set bill_number = 12345 where id=$1', [id]))
  assert.match(err.message, /permission denied/i)
  const err2 = await expectError(db.admin.query('update public.sales set bill_number = 12345 where id=$1', [id])) // even the owner role
  assert.equal(err2.message, 'BILL_NUMBER_IMMUTABLE')
  const err3 = await expectError(db.admin.query('delete from public.sales where id=$1', [id]))
  assert.equal(err3.message, 'IMMUTABLE_RECORD')

  const refreshed = await one('select bill_number::int bn from public.sales where id=$1', [id])
  assert.equal(refreshed.bn, before.bn)
  const audit = await one(`select count(*)::int n from public.activity_logs where action='sale.updated' and entity_id=$1`, [id])
  assert.ok(audit.n >= 1, 'edit of descriptive fields is audited')
})

test('R4 bill numbering self-heals if the counter row is reset (never reuses a number)', async () => {
  const max = num((await one('select max(bill_number) m from public.sales')).m)
  await q(`update public.document_sequences set next_value = 1 where doc_type='bill_number'`)
  const r = await post(staff, { customer_id: S.cust.c3, items: [item(S.variants.A, 1, 100)] })
  assert.equal(Number(r.bill_number), max + 1)
})

test('R5 idempotent re-submit (same client_request_id) returns the same bill, no second number', async () => {
  const key = randomUUID()
  const a = await post(staff, { customer_id: S.cust.c3, items: [item(S.variants.A, 1, 100)], client_request_id: key })
  const b = await post(staff, { customer_id: S.cust.c3, items: [item(S.variants.A, 1, 100)], client_request_id: key })
  assert.equal(a.id, b.id)
  assert.equal(a.bill_number, b.bill_number)
  assert.equal(b.idempotent, true)
  const n = await one('select count(*)::int n from public.sales where client_request_id=$1', [key])
  assert.equal(n.n, 1)
})

// =============================================================================
// Concurrency
// =============================================================================
test('R6 TWO concurrent bill submissions never receive the same number', async () => {
  const [c1, c2] = [await db.userClient(STAFF_ID), await db.userClient(STAFF_ID)]
  const [a, b] = await Promise.all([
    post(c1, { customer_id: S.cust.c4, items: [item(S.variants.D, 1, 300)] }),
    post(c2, { customer_id: S.cust.c5, items: [item(S.variants.D, 1, 300)] }),
  ])
  assert.notEqual(a.bill_number, b.bill_number)
  assert.equal(Math.abs(Number(a.bill_number) - Number(b.bill_number)), 1, 'consecutive')
})

test('R7 20 concurrent submissions (same + different customers): unique, gap-free numbers', async () => {
  const clients = await Promise.all(Array.from({ length: 20 }, () => db.userClient(STAFF_ID)))
  const startMax = num((await one('select max(bill_number) m from public.sales')).m)
  const results = await Promise.all(
    clients.map((c, i) =>
      post(c, { customer_id: i % 2 ? S.cust.c6 : S.cust.c7, items: [item(S.variants.D, 1, 300)], bilty_number: `BLT-C-${i}` }),
    ),
  )
  const numbers = results.map((r) => Number(r.bill_number)).sort((x, y) => x - y)
  assert.equal(new Set(numbers).size, 20)
  assert.deepEqual(numbers, Array.from({ length: 20 }, (_, i) => startMax + 1 + i))
})

test('R8 concurrent bills racing for scarce stock: exact stock, only winners consume numbers (no gaps)', async () => {
  const startMax = num((await one('select max(bill_number) m from public.sales')).m)
  const clients = await Promise.all(Array.from({ length: 6 }, () => db.userClient(STAFF_ID)))
  const settled = await Promise.allSettled(
    clients.map((c) => post(c, { customer_id: S.cust.c8, items: [item(S.variants.C, 1, 50)] })),
  )
  const ok = settled.filter((s) => s.status === 'fulfilled')
  const bad = settled.filter((s) => s.status === 'rejected')
  assert.equal(ok.length, 3, 'stock was 3')
  assert.equal(bad.length, 3)
  assert.ok(bad.every((b) => b.reason.message === 'INSUFFICIENT_STOCK'))
  assert.equal(await stockOf(S.variants.C), 0)
  const numbers = ok.map((s) => Number(s.value.bill_number)).sort((x, y) => x - y)
  assert.deepEqual(numbers, [startMax + 1, startMax + 2, startMax + 3], 'failed attempts consumed no numbers')
  assert.equal(await balance(S.cust.c8), 150, 'ledger only reflects the 3 successful bills')
})

// =============================================================================
// REQ 5 — atomic posting: failure leaves nothing behind; success posts everything
// =============================================================================
test('R9 successful bill: ledger, balance, stock, price snapshot, audit log all posted together', async () => {
  const stock0 = await stockOf(S.variants.B)
  const bal0 = await balance(S.cust.c9)
  const r = await post(staff, {
    customer_id: S.cust.c9, amount_paid: 250, discount_amount: 50, additional_charges: 20,
    items: [{ variant_id: S.variants.B, quantity: 3, rate: 180, discount_amount: 10 }], // 540-10 = 530; +20-50 = 500
  })
  assert.equal(num(r.grand_total), 500)
  assert.equal(num(r.balance_due), 250)
  assert.equal(await balance(S.cust.c9), bal0 + 500 - 250)
  assert.equal(await stockOf(S.variants.B), stock0 - 3)
  const led = await q('select entry_type, debit, credit, description from public.customer_ledger_entries where source_id=$1 or source_id in (select id from public.customer_payments where sale_id=$1) order by credit', [r.id])
  assert.deepEqual(led.map((l) => [l.entry_type, num(l.debit), num(l.credit)]), [['sale', 500, 0], ['payment', 0, 250]])
  assert.match(led[0].description, new RegExp(`Bill #${r.bill_number}`))
  const si = await one('select rate, default_rate, sku_snapshot, product_name_snapshot, line_total from public.sale_items where sale_id=$1', [r.id])
  assert.deepEqual([num(si.rate), num(si.default_rate), si.sku_snapshot, si.product_name_snapshot, num(si.line_total)], [180, 200, 'SCR-002', 'Screwdriver', 530])
  await q('update public.product_variants set default_rate = 999 where id=$1', [S.variants.B])
  const si2 = await one('select default_rate from public.sale_items where sale_id=$1', [r.id])
  assert.equal(num(si2.default_rate), 200, 'price snapshot is immutable to later catalogue changes')
  await q('update public.product_variants set default_rate = 200 where id=$1', [S.variants.B])
  const log = await one(`select new_data from public.activity_logs where action='sale.created' and entity_id=$1`, [r.id])
  assert.equal(Number(log.new_data.bill_number), Number(r.bill_number))
})

test('R10 FAILED bill (2nd line short of stock) leaves ledger, stock, payments, counters and audit log untouched', async () => {
  const snap = async () => ({
    sales: num((await one('select count(*) n from public.sales')).n),
    ledger: num((await one('select count(*) n from public.customer_ledger_entries')).n),
    pays: num((await one('select count(*) n from public.customer_payments')).n),
    allocs: num((await one('select count(*) n from public.customer_payment_allocations')).n),
    moves: num((await one('select count(*) n from public.stock_movements')).n),
    logs: num((await one('select count(*) n from public.activity_logs')).n),
    bal: await balance(S.cust.c9),
    stockA: await stockOf(S.variants.A),
    stockB: await stockOf(S.variants.B),
    seq: (await q(`select doc_type, fiscal_year, next_value::int nv from public.document_sequences order by 1,2`)),
  })
  const before = await snap()
  const err = await expectError(
    post(staff, { customer_id: S.cust.c9, amount_paid: 100, items: [item(S.variants.A, 2, 100), item(S.variants.B, 9999, 200)] }),
  )
  assert.equal(err.message, 'INSUFFICIENT_STOCK')
  assert.deepEqual(await snap(), before)
  const maxBefore = num((await one('select max(bill_number) m from public.sales')).m)
  const next = await post(staff, { customer_id: S.cust.c9, items: [item(S.variants.A, 1, 100)] })
  assert.equal(Number(next.bill_number), maxBefore + 1, 'failed attempt consumed no number; next bill continues with no gap')
})

// =============================================================================
// REQ 3 / 4 — statement, links, search
// =============================================================================
test('R11 statement: opening balance, bill refs/amounts, payments, return, correct running balance', async () => {
  // fresh customer so numbers are easy to verify
  const cust = (await one(`insert into public.customers (code, name, phone) values ('C-T100','Statement Test','0301') returning id`)).id
  await rpc(staff, 'post_customer_opening_balance', cust, 5000, null) //  +5000
  const s1 = await post(staff, { customer_id: cust, amount_paid: 300, items: [item(S.variants.A, 10, 100)] }) // +1000 -300
  await rpc(staff, 'post_customer_payment', { customer_id: cust, amount: 1000, payment_method: 'cash', payment_account_id: CASH_ACCOUNT }) // -1000
  const s2 = await post(staff, { customer_id: cust, bilty_number: 'BLT-77', laborer_name: 'Rafiq', items: [item(S.variants.A, 6, 100)] }) // +600
  const si = await one('select id from public.sale_items where sale_id=$1', [s1.id])
  await rpc(staff, 'post_sales_return', { sale_id: s1.id, items: [{ sale_item_id: si.id, variant_id: S.variants.A, quantity: 2, rate: 100 }] }) // -200
  Object.assign(S, { stCust: cust, s1, s2 })

  const st = await rpc(staff, 'get_customer_statement', cust, null, null, null)
  assert.equal(num(st.opening_balance), 0)
  const rows = st.rows
  assert.deepEqual(
    rows.map((r) => [r.entry_type, num(r.debit), num(r.credit), num(r.running_balance)]),
    [
      ['opening_balance', 5000, 0, 5000],
      ['sale', 1000, 0, 6000],
      ['payment', 0, 300, 5700],
      ['payment', 0, 1000, 4700],
      ['sale', 600, 0, 5300],
      ['sales_return', 0, 200, 5100],
    ],
  )
  assert.equal(num(st.total_debit), 6600)
  assert.equal(num(st.total_credit), 1500)
  assert.equal(num(st.closing_balance), 5100)
  assert.equal(num(st.current_balance), 5100)
  assert.equal(st.balance_matches_cache, true)
  assert.equal(await balance(cust), 5100)
  // each running balance == cumulative sum (independent recomputation)
  let run = 0
  for (const r of rows) { run += num(r.debit) - num(r.credit); assert.equal(num(r.running_balance), run) }

  // bill references / link targets
  assert.equal(rows[1].bill_number, s1.bill_number)
  assert.equal(rows[2].bill_number, s1.bill_number, 'payment taken with the bill points at that bill')
  assert.equal(rows[3].sale_id, null, 'unallocated receipt voucher has no bill link')
  assert.equal(rows[4].bilty_number, 'BLT-77')
  assert.equal(rows[4].laborer_name, 'Rafiq')
  assert.equal(rows[5].sale_id, s1.id, 'return links back to its bill')
  for (const r of rows.filter((x) => x.sale_id)) {
    const sale = await one('select bill_number::int bn, grand_total from public.sales where id=$1', [r.sale_id])
    assert.equal(Number(r.bill_number), sale.bn, 'link target is the right bill')
    assert.equal(num(r.bill_total), num(sale.grand_total))
  }
})

test('R12 statement: date-range carries the previous balance; backdated posting keeps chronological running balance', async () => {
  const cust = (await one(`insert into public.customers (code, name, phone) values ('C-T101','Range Test','0302') returning id`)).id
  const d3 = await dayOffset(-3), d2 = await dayOffset(-2), d1 = await dayOffset(-1), d0 = await dayOffset(0)
  await rpc(staff, 'post_customer_opening_balance', cust, 1000, d3)
  // posted out of order on purpose: newer bill first, older bill second
  await post(admin, { customer_id: cust, sale_date: d1, items: [item(S.variants.A, 2, 100)] }) // +200 on d-1
  await post(admin, { customer_id: cust, sale_date: d2, items: [item(S.variants.A, 5, 100)] }) // +500 on d-2

  const all = await rpc(staff, 'get_customer_statement', cust, null, null, null)
  assert.deepEqual(all.rows.map((r) => [r.entry_date, num(r.running_balance)]), [[d3, 1000], [d2, 1500], [d1, 1700]])

  const ranged = await rpc(staff, 'get_customer_statement', cust, d1, d0, null)
  assert.equal(num(ranged.opening_balance), 1500, 'previous balance brought forward')
  assert.deepEqual(ranged.rows.map((r) => num(r.running_balance)), [1700])
  assert.equal(num(ranged.closing_balance), 1700)
  assert.equal(num(ranged.closing_balance), num(ranged.current_balance))
})

test('R13 statement search (per customer) by bill number, bilty number, laborer; running balance stays true', async () => {
  const cust = S.stCust
  const byBill = await rpc(staff, 'get_customer_statement', cust, null, null, `#${S.s2.bill_number}`)
  assert.deepEqual(byBill.rows.map((r) => [r.entry_type, num(r.running_balance)]), [['sale', 5300]])
  const byBilty = await rpc(staff, 'get_customer_statement', cust, null, null, 'blt-77')
  assert.equal(byBilty.rows.length, 1)
  assert.equal(byBilty.rows[0].bill_number, S.s2.bill_number)
  const byLaborer = await rpc(staff, 'get_customer_statement', cust, null, null, 'rafiq')
  assert.equal(byLaborer.rows.length, 1)
  const none = await rpc(staff, 'get_customer_statement', cust, null, null, '99999')
  assert.equal(none.rows.length, 0)
  assert.equal(num(none.closing_balance), 5100, 'totals are unaffected by the search filter')
  // a bill number of ANOTHER customer must not leak into this customer's statement
  const other = await rpc(staff, 'get_customer_statement', cust, null, null, String(S.first.bill_number))
  assert.equal(other.rows.length, 0)
})

test('R14 bill history/search RPC: by customer, bill number, bilty, laborer; cancelled bills included', async () => {
  const bySearch = async (term, customer = null) => (await staff.query('select bill_number::int bn, status from public.search_sales($1, $2, null, null)', [term, customer])).rows
  const hit = await bySearch(String(S.s2.bill_number))
  assert.deepEqual(hit.map((r) => r.bn), [Number(S.s2.bill_number)], 'exact bill number (4 must not match 14, 24 …)')
  assert.equal((await bySearch('BLT-77')).length, 1)
  assert.equal((await bySearch('rafiq')).length, 1)
  assert.ok((await bySearch('Statement Test')).length >= 2, 'customer name')
  const forCustomer = await bySearch(null, S.stCust)
  assert.ok(forCustomer.length >= 2 && forCustomer.every((r) => r.bn > 0))
  const all = await bySearch(null)
  assert.ok(all.some((r) => r.status === 'cancelled'), 'cancelled bills stay in history')
  const sorted = [...all].map((r) => r.bn)
  assert.equal(new Set(sorted).size, sorted.length)
})

// =============================================================================
// REQ 4/5 — opening balance RPC
// =============================================================================
test('R15 opening balance RPC: single entry, sign handling, validations, audit', async () => {
  const cust = (await one(`insert into public.customers (code, name, phone) values ('C-T102','Opening Test','0303') returning id`)).id
  await rpc(staff, 'post_customer_opening_balance', cust, -750, null)
  assert.equal(await balance(cust), -750, 'negative opening = advance (credit)')
  assert.equal((await expectError(rpc(staff, 'post_customer_opening_balance', cust, 10, null))).message, 'OPENING_BALANCE_EXISTS')
  assert.equal((await expectError(rpc(staff, 'post_customer_opening_balance', S.cust.c1, 0, null))).message, 'INVALID_AMOUNT')
  assert.equal((await expectError(rpc(staff, 'post_customer_opening_balance', WALKIN_ID, 10, null))).message, 'CUSTOMER_NOT_FOUND')
  const log = await one(`select count(*)::int n from public.activity_logs where action='customer.opening_balance' and entity_id=$1`, [cust])
  assert.equal(log.n, 1)
})

// =============================================================================
// REQ 8 — cancelled bills stay auditable; numbers never reused
// =============================================================================
test('R16 cancelling a bill: row kept, number kept, ledger reversed, stock restored, audited, number never reused', async () => {
  const cust = S.cust.c3
  const stock0 = await stockOf(S.variants.D)
  const bal0 = await balance(cust)
  const bill = await post(staff, { customer_id: cust, amount_paid: 400, items: [item(S.variants.D, 4, 250)] }) // 1000, paid 400
  assert.equal(await balance(cust), bal0 + 600)
  assert.equal(await stockOf(S.variants.D), stock0 - 4)

  assert.equal((await expectError(rpc(staff, 'cancel_sale', bill.id, 'oops'))).message, 'PERMISSION_DENIED')

  const res = await rpc(admin, 'cancel_sale', bill.id, 'customer refused delivery')
  assert.equal(res.success, true)
  assert.equal(num(res.payments_retained_as_credit), 400)

  const row = await one('select status, bill_number::int bn, cancel_reason, cancelled_at, cancelled_by from public.sales where id=$1', [bill.id])
  assert.equal(row.status, 'cancelled')
  assert.equal(row.bn, Number(bill.bill_number))
  assert.equal(row.cancel_reason, 'customer refused delivery')
  assert.ok(row.cancelled_at && row.cancelled_by)

  assert.equal(await balance(cust), bal0 - 400, 'debit reversed; the 400 already received remains as credit')
  assert.equal(await stockOf(S.variants.D), stock0, 'stock restored')
  const rev = await one(`select entry_type, debit, credit, reversal_of from public.customer_ledger_entries where source_type='reversal' and source_id=$1`, [bill.id])
  assert.deepEqual([rev.entry_type, num(rev.debit), num(rev.credit)], ['reversal', 0, 1000])
  assert.ok(rev.reversal_of, 'reversal references the original entry')
  const orig = await one(`select count(*)::int n from public.customer_ledger_entries where source_type='sale' and source_id=$1`, [bill.id])
  assert.equal(orig.n, 1, 'original entry is not deleted')
  const audit = await one(`select summary from public.activity_logs where action='sale.cancelled' and entity_id=$1`, [bill.id])
  assert.match(audit.summary, new RegExp(`Bill #${bill.bill_number}`))

  // statement of that customer shows both rows, reversal linked to the bill
  const st = await rpc(staff, 'get_customer_statement', cust, null, null, String(bill.bill_number))
  assert.ok(st.rows.some((r) => r.entry_type === 'reversal' && r.sale_id === bill.id && r.sale_status === 'cancelled'))
  assert.equal(st.balance_matches_cache, true)

  // idempotent
  const ledgerN = num((await one('select count(*) n from public.customer_ledger_entries')).n)
  const again = await rpc(admin, 'cancel_sale', bill.id, 'double click')
  assert.equal(again.already_cancelled, true)
  assert.equal(num((await one('select count(*) n from public.customer_ledger_entries')).n), ledgerN)

  // number never reused
  const next = await post(staff, { customer_id: cust, items: [item(S.variants.D, 1, 250)] })
  assert.ok(Number(next.bill_number) > Number(bill.bill_number))
  const dup = await one('select count(*)::int n from public.sales where bill_number=$1', [bill.bill_number])
  assert.equal(dup.n, 1)

  // staff cannot cancel through the table either
  const err = await expectError(staff.query(`update public.sales set status='cancelled' where id=$1`, [next.id]))
  assert.match(err.message, /permission denied/i)
})

test('R17 cannot cancel a bill that already has a posted return', async () => {
  const bill = await post(staff, { customer_id: S.cust.c3, items: [item(S.variants.D, 2, 300)] })
  const si = await one('select id from public.sale_items where sale_id=$1', [bill.id])
  await rpc(staff, 'post_sales_return', { sale_id: bill.id, items: [{ sale_item_id: si.id, variant_id: S.variants.D, quantity: 1, rate: 300 }] })
  const err = await expectError(rpc(admin, 'cancel_sale', bill.id, 'x'))
  assert.equal(err.message, 'DOCUMENT_HAS_RETURNS')
  assert.equal((await one('select status from public.sales where id=$1', [bill.id])).status, 'posted')
})

// =============================================================================
// Global invariant after everything above
// =============================================================================
test('R18 invariants: every customer ledger sum equals cached balance; bill numbers are unique and positive', async () => {
  const bad = await q(`
    select b.customer_id from public.customer_balances b
    left join (select customer_id, sum(debit-credit) s from public.customer_ledger_entries group by 1) l using (customer_id)
    where b.current_balance <> coalesce(l.s,0)`)
  assert.equal(bad.length, 0)
  const dup = await q('select bill_number from public.sales group by 1 having count(*)>1')
  assert.equal(dup.length, 0)
  const stockBad = await q(`
    select v.variant_id from public.stock_levels v
    left join (select variant_id, sum(quantity) s from public.stock_movements group by 1) m using (variant_id)
    where v.quantity_on_hand <> coalesce(m.s,0)`)
  assert.equal(stockBad.length, 0, 'stock cache equals movement ledger')
})
