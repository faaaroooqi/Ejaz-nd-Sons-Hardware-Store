import { describe, it, expect } from 'vitest'
import { calculateInvoiceTotals } from './index'
import { formatCurrency, formatQuantity } from '../format'

describe('Financial Calculation Core (Big.js)', () => {
  it('calculates single line total correctly without floating point errors', () => {
    const res = calculateInvoiceTotals([
      { quantity: 3, rate: 100.5, discount: 0, discountType: 'amount' },
    ])
    expect(res.subtotal).toBe(301.5)
    expect(res.grandTotal).toBe(301.5)
    expect(res.lineTotals).toEqual([301.5])
  })

  it('handles percentage line discounts and invoice level discounts', () => {
    const res = calculateInvoiceTotals(
      [
        { quantity: 10, rate: 200, discount: 10, discountType: 'percent' }, // 2000 - 10% (200) = 1800
        { quantity: 5, rate: 100, discount: 50, discountType: 'amount' },   // 500 - 50 = 450
      ],
      10, // invoice discount 10%
      'percent',
      100 // freight
    )

    // Subtotal: 1800 + 450 = 2250
    expect(res.subtotal).toBe(2250)
    // Inv discount: 10% of 2250 = 225
    expect(res.invoiceDiscountAmount).toBe(225)
    // Freight: 100
    // Grand Total: 2250 - 225 + 100 = 2125
    expect(res.grandTotal).toBe(2125)
  })

  it('prevents negative grand total when discounts exceed subtotal', () => {
    const res = calculateInvoiceTotals(
      [{ quantity: 1, rate: 100, discount: 0, discountType: 'amount' }],
      500,
      'amount'
    )
    expect(res.subtotal).toBe(100)
    expect(res.grandTotal).toBe(0)
  })
})

describe('Currency & Quantity Formatting', () => {
  it('formats PKR international currency string correctly', () => {
    expect(formatCurrency(1250000, 'international')).toBe('Rs. 1,250,000.00')
    expect(formatCurrency(500, 'international')).toBe('Rs. 500.00')
    expect(formatCurrency(0, 'international')).toBe('Rs. 0.00')
    expect(formatCurrency(null, 'international')).toBe('Rs. 0.00')
  })

  it('formats PKR Lakh/Crore currency string correctly', () => {
    expect(formatCurrency(1250000, 'lakh')).toBe('Rs. 12,50,000.00')
    expect(formatCurrency(100000, 'lakh')).toBe('Rs. 1,00,000.00')
  })

  it('formats quantities safely with or without decimals', () => {
    expect(formatQuantity(12.5, true)).toBe('12.5')
    expect(formatQuantity(12.5, false)).toBe('13')
    expect(formatQuantity(0)).toBe('0')
    expect(formatQuantity(null)).toBe('0')
  })
})
