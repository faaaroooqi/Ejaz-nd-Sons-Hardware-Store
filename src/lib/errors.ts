export interface AppError {
  code: string
  message: string
  detail?: Record<string, unknown>
}

const ERROR_MESSAGES: Record<string, string> = {
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  INSUFFICIENT_STOCK: 'Insufficient stock available for one or more items.',
  CREDIT_LIMIT_EXCEEDED: 'Customer credit limit would be exceeded by this transaction.',
  PERIOD_LOCKED: 'The financial books for this date range are locked.',
  BACKDATE_NOT_ALLOWED: 'Posting date is older than the allowed backdate limit.',
  FUTURE_DATE: 'Transaction date cannot be in the future.',
  LAST_ADMIN: 'Cannot deactivate or change role of the last active administrator.',
  CANNOT_DEACTIVATE_SELF: 'You cannot deactivate your own account.',
  DOCUMENT_HAS_RETURNS: 'Cannot cancel document because active returns exist against it.',
  IMMUTABLE_RECORD: 'Financial and audit records cannot be deleted or directly modified.',
  INVALID_PAYLOAD: 'Invalid request data provided.',
  EMAIL_TAKEN: 'An account with this email address already exists.',
  USER_NOT_FOUND: 'The requested user was not found.',
  INVALID_TIMEZONE: 'Invalid timezone specified.',
  WALKIN_MUST_BE_FULLY_PAID: 'Walk-in cash customer must pay full invoice amount at the time of sale.',
  INVALID_LINE_ITEM: 'One or more line items have invalid quantity or price.',
  CUSTOMER_NOT_FOUND: 'Selected customer was not found or is inactive.',
  SUPPLIER_NOT_FOUND: 'Selected supplier was not found or is inactive.',
  SUPPLIER_REQUIRED: 'Please select a supplier for this purchase.',
  INVALID_AMOUNT: 'Transaction amount must be greater than zero.',
  SALE_NOT_FOUND: 'Sales invoice not found.',
  PURCHASE_NOT_FOUND: 'Purchase bill not found.',
}

export function parseAppError(error: unknown): AppError {
  if (!error) {
    return { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred.' }
  }

  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>

    // Supabase PostgREST error with details JSON string in message/details
    if (typeof e.message === 'string') {
      const code = e.message
      if (ERROR_MESSAGES[code]) {
        let detail: Record<string, unknown> | undefined
        if (typeof e.details === 'string') {
          try {
            detail = JSON.parse(e.details)
          } catch {
            // ignore JSON parse error
          }
        }
        return { code, message: ERROR_MESSAGES[code], detail }
      }
      return { code: 'ERROR', message: e.message }
    }
  }

  return { code: 'UNKNOWN_ERROR', message: String(error) }
}
