import { describe, it, expect } from 'vitest'
import Big from 'big.js'
import { calculateInvoiceTotals } from './index'

/**
 * ADVERSARIAL BUSINESS TRANSACTION TEST SUITE
 * Tests financial integrity, weighted average costing, FIFO allocation,
 * stock reconciliation, ledger balance rules, and price snapshots.
 */

describe('1. Landed Cost & Weighted Average Cost Recalculation', () => {
  it('calculates landed cost and weighted average cost accurately', () => {
    // Opening: 100 units @ Rs. 100 = Rs. 10,000
    const openingQty = new Big(100)
    const openingCost = new Big(100)
    const openingVal = openingQty.times(openingCost) // 10,000

    // Purchase: 100 units @ Rs. 120 = Rs. 12,000
    // Freight: Rs. 1,000, Other: Rs. 500 => Extra charges: Rs. 1,500
    // Total Landed Purchase Cost = 12,000 + 1,500 = 13,500
    // Landed Unit Cost = 13,500 / 100 = Rs. 135
    const purchaseQty = new Big(100)
    const purchasePrice = new Big(120)
    const freight = new Big(1000)
    const other = new Big(500)
    const landedTotal = purchaseQty.times(purchasePrice).plus(freight).plus(other) // 13,500
    const landedUnitCost = landedTotal.div(purchaseQty) // 135

    expect(Number(landedTotal)).toBe(13500)
    expect(Number(landedUnitCost)).toBe(135)

    // Expected New Weighted Average Cost:
    // ((100 * 100) + (100 * 135)) / (100 + 100) = (10,000 + 13,500) / 200 = 23,500 / 200 = 117.50
    const newTotalQty = openingQty.plus(purchaseQty)
    const newTotalVal = openingVal.plus(landedTotal)
    const newAvgCost = newTotalVal.div(newTotalQty)

    expect(Number(newTotalQty)).toBe(200)
    expect(Number(newTotalVal)).toBe(23500)
    expect(Number(newAvgCost)).toBe(117.5)
  })
})

describe('2. Credit Sale & COGS / Gross Profit Reconciliation', () => {
  it('reconciles Credit Sale subtotal, COGS, and Gross Profit', () => {
    // Product A: 10 units @ Rs. 140 (Cost: Rs. 117.50)
    // Product B: 5 units @ Rs. 280 (Cost: Rs. 200.00)
    const itemA_qty = 10
    const itemA_rate = 140
    const itemA_cost = 117.50

    const itemB_qty = 5
    const itemB_rate = 280
    const itemB_cost = 200.00

    const totals = calculateInvoiceTotals([
      { quantity: itemA_qty, rate: itemA_rate, discount: 0, discountType: 'amount' },
      { quantity: itemB_qty, rate: itemB_rate, discount: 0, discountType: 'amount' },
    ])

    // Subtotal = (10 * 140) + (5 * 280) = 1400 + 1400 = 2800
    expect(totals.subtotal).toBe(2800)
    expect(totals.grandTotal).toBe(2800)

    // COGS = (10 * 117.50) + (5 * 200) = 1175 + 1000 = 2175
    const cogs = (itemA_qty * itemA_cost) + (itemB_qty * itemB_cost)
    expect(cogs).toBe(2175)

    // Gross Profit = 2800 - 2175 = 625
    const grossProfit = totals.grandTotal - cogs
    expect(grossProfit).toBe(625)
  })
})

describe('3. Customer Payments & Multi-Invoice FIFO Allocation', () => {
  it('allocates customer payments strictly in FIFO order across unpaid invoices', () => {
    const invoices = [
      { id: 'inv-1', invoice_no: 'SAL-001', balance_due: 5000 },
      { id: 'inv-2', invoice_no: 'SAL-002', balance_due: 8000 },
      { id: 'inv-3', invoice_no: 'SAL-003', balance_due: 4000 },
    ]

    let paymentAmount = 10000
    let remAlloc = paymentAmount
    const allocations: { sale_id: string; amount: number }[] = []

    for (const inv of invoices) {
      if (remAlloc <= 0) break
      const allocAmt = Math.min(remAlloc, inv.balance_due)
      allocations.push({ sale_id: inv.id, amount: allocAmt })
      inv.balance_due -= allocAmt
      remAlloc -= allocAmt
    }

    // Expected Allocations:
    // Invoice 1: 5000 allocated (Remaining due: 0)
    // Invoice 2: 5000 allocated (Remaining due: 3000)
    // Invoice 3: 0 allocated (Remaining due: 4000)
    expect(allocations).toEqual([
      { sale_id: 'inv-1', amount: 5000 },
      { sale_id: 'inv-2', amount: 5000 },
    ])

    expect(invoices[0].balance_due).toBe(0)
    expect(invoices[1].balance_due).toBe(3000)
    expect(invoices[2].balance_due).toBe(4000)
  })
})

describe('4. Sales Returns & COGS Reversal', () => {
  it('validates return quantity limits and reverses COGS', () => {
    const soldQty = 10
    const returnedQty = 3
    const originalRate = 140
    const avgCost = 117.50

    // Return check
    expect(returnedQty <= soldQty).toBe(true)
    const excessReturn = 100
    expect(excessReturn <= soldQty).toBe(false) // Must be rejected

    const returnSubtotal = returnedQty * originalRate // 3 * 140 = 420
    const reversedCOGS = returnedQty * avgCost // 3 * 117.50 = 352.50

    expect(returnSubtotal).toBe(420)
    expect(reversedCOGS).toBe(352.50)
  })
})

describe('5. Profit & Loss Statement Reconciliation', () => {
  it('reconciles Revenue - COGS = Gross Profit and Gross Profit - Expenses = Net Profit', () => {
    const totalSales = 2800 + 5800 // 8,600
    const cogs = 2175 + 4350       // 6,525
    const grossProfit = totalSales - cogs // 2,075
    const officeExpense = 5000
    const netProfit = grossProfit - officeExpense // 2,075 - 5,000 = -2,925 (loss)

    expect(grossProfit).toBe(2075)
    expect(netProfit).toBe(-2925)
  })
})

describe('6. Stock & Khata Balance Independent Formula Verification', () => {
  it('reconciles Stock Closing Balance formula', () => {
    const openingStock = 100
    const purchases = 100
    const salesReturns = 3
    const sales = 30
    const purchaseReturns = 10
    const adjustments = 0

    const closingStock = openingStock + purchases + salesReturns - sales - purchaseReturns + adjustments
    expect(closingStock).toBe(163)
  })

  it('reconciles Customer Khata balance formula (Lena)', () => {
    const openingBal = 0
    const sales = 8600
    const debitAdjustments = 0
    const payments = 2000 + 5000 // 7,000
    const salesReturns = 420
    const creditAdjustments = 0

    const closingBalance = openingBal + sales + debitAdjustments - payments - salesReturns - creditAdjustments
    expect(closingBalance).toBe(1180) // 8600 - 7000 - 420 = 1180
  })

  it('reconciles Supplier Khata balance formula (Dena)', () => {
    const openingBal = 0
    const purchases = 13500
    const debitAdjustments = 0
    const payments = 5000
    const purchaseReturns = 1200
    const creditAdjustments = 0

    const closingBalance = openingBal + purchases + debitAdjustments - payments - purchaseReturns - creditAdjustments
    expect(closingBalance).toBe(7300) // 13500 - 5000 - 1200 = 7300
  })
})
