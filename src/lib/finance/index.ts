import Big from 'big.js'

export interface InvoiceLineInput {
  quantity: number | string
  rate: number | string
  discount: number | string
  discountType: 'amount' | 'percent'
}

export interface InvoiceCalculationResult {
  lineTotals: number[]
  subtotal: number
  invoiceDiscountAmount: number
  additionalCharges: number
  grandTotal: number
}

/**
 * Calculates line totals and invoice grand totals.
 * Uses exact Big.js arithmetic to avoid JavaScript floating point errors.
 */
export function calculateInvoiceTotals(
  lines: InvoiceLineInput[],
  invoiceDiscount: number | string = 0,
  invoiceDiscountType: 'amount' | 'percent' = 'amount',
  additionalCharges: number | string = 0
): InvoiceCalculationResult {
  let subtotal = new Big(0)
  const lineTotals: number[] = []

  for (const line of lines) {
    const qty = new Big(line.quantity || 0)
    const rate = new Big(line.rate || 0)
    const gross = qty.times(rate)

    let lineDiscount = new Big(0)
    const rawDisc = new Big(line.discount || 0)
    if (line.discountType === 'percent') {
      lineDiscount = gross.times(rawDisc).div(100)
    } else {
      lineDiscount = rawDisc
    }

    let lineNet = gross.minus(lineDiscount)
    if (lineNet.lt(0)) lineNet = new Big(0)

    const roundedLineNet = lineNet.round(2, Big.roundHalfUp)
    lineTotals.push(Number(roundedLineNet.toFixed(2)))
    subtotal = subtotal.plus(roundedLineNet)
  }

  let totalDiscount = new Big(0)
  const rawInvDisc = new Big(invoiceDiscount || 0)
  if (invoiceDiscountType === 'percent') {
    totalDiscount = subtotal.times(rawInvDisc).div(100)
  } else {
    totalDiscount = rawInvDisc
  }

  const roundedInvDiscount = totalDiscount.round(2, Big.roundHalfUp)
  const addCharges = new Big(additionalCharges || 0).round(2, Big.roundHalfUp)

  let grandTotal = subtotal.minus(roundedInvDiscount).plus(addCharges)
  if (grandTotal.lt(0)) grandTotal = new Big(0)

  return {
    lineTotals,
    subtotal: Number(subtotal.toFixed(2)),
    invoiceDiscountAmount: Number(roundedInvDiscount.toFixed(2)),
    additionalCharges: Number(addCharges.toFixed(2)),
    grandTotal: Number(grandTotal.round(2, Big.roundHalfUp).toFixed(2)),
  }
}
