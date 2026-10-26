import Big from 'big.js'

export type NumberGrouping = 'international' | 'lakh'

/**
 * Format a number as Pakistani Rupee / PKR currency string.
 * Example (international): 1250000 -> "Rs. 1,250,000.00"
 * Example (lakh): 1250000 -> "Rs. 12,50,000.00"
 */
export function formatCurrency(
  amount: number | string | Big | null | undefined,
  grouping: NumberGrouping = 'international',
  symbol: string = 'Rs.'
): string {
  if (amount === null || amount === undefined || amount === '') return `${symbol} 0.00`
  
  let b: Big
  try {
    b = new Big(amount)
  } catch {
    return `${symbol} 0.00`
  }

  const isNegative = b.lt(0)
  const absStr = b.abs().toFixed(2)
  const [intPart, decPart] = absStr.split('.')

  let formattedInt = ''
  if (grouping === 'lakh') {
    // Pakistani Lakh / Crore notation: last 3 digits, then groups of 2
    if (intPart.length <= 3) {
      formattedInt = intPart
    } else {
      const last3 = intPart.slice(-3)
      const rest = intPart.slice(0, -3)
      const groups = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
      formattedInt = `${groups},${last3}`
    }
  } else {
    // Standard international notation: groups of 3
    formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const result = `${symbol} ${formattedInt}.${decPart}`
  return isNegative ? `-${result}` : result
}

export const formatPKR = formatCurrency


/**
 * Format a raw quantity with appropriate decimals.
 */
export function formatQuantity(
  qty: number | string | Big | null | undefined,
  allowDecimal: boolean = false
): string {
  if (qty === null || qty === undefined || qty === '') return '0'
  try {
    const b = new Big(qty)
    return allowDecimal ? b.toFixed(2).replace(/\.?0+$/, '') : b.toFixed(0)
  } catch {
    return '0'
  }
}

/**
 * Formats an ISO date string into DD/MM/YYYY or specified format.
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-'
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(d.getTime())) return '-'
  
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  
  return `${day}/${month}/${year}`
}

/**
 * Formats a timestamp string into DD/MM/YYYY HH:mm AM/PM.
 */
export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-'
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(d.getTime())) return '-'

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  
  let hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12 // hour 0 becomes 12
  const formattedHours = String(hours).padStart(2, '0')

  return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`
}
