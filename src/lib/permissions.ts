export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  DASHBOARD_FINANCIALS: 'dashboard.financials',

  CATALOG_VIEW: 'catalog.view',
  CATALOG_MANAGE: 'catalog.manage',
  CATALOG_MANAGE_PRICES: 'catalog.manage_prices',
  CATALOG_VIEW_COST: 'catalog.view_cost',

  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_VIEW_MOVEMENTS: 'inventory.view_movements',
  INVENTORY_ADJUST: 'inventory.adjust',

  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_MANAGE: 'customers.manage',
  CUSTOMERS_LEDGER: 'customers.ledger',
  CUSTOMERS_CREDIT_LIMIT: 'customers.credit_limit',

  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_MANAGE: 'suppliers.manage',
  SUPPLIERS_LEDGER: 'suppliers.ledger',

  SALES_VIEW: 'sales.view',
  SALES_CREATE: 'sales.create',
  SALES_EDIT_RATE: 'sales.edit_rate',
  SALES_CANCEL: 'sales.cancel',
  SALES_BACKDATE: 'sales.backdate',

  SALES_RETURNS_VIEW: 'sales_returns.view',
  SALES_RETURNS_CREATE: 'sales_returns.create',
  SALES_RETURNS_CANCEL: 'sales_returns.cancel',
  SALES_RETURNS_UNLINKED: 'sales_returns.unlinked',

  CUSTOMER_PAYMENTS_VIEW: 'customer_payments.view',
  CUSTOMER_PAYMENTS_CREATE: 'customer_payments.create',
  CUSTOMER_PAYMENTS_VOID: 'customer_payments.void',

  PURCHASES_VIEW: 'purchases.view',
  PURCHASES_CREATE: 'purchases.create',
  PURCHASES_CANCEL: 'purchases.cancel',
  PURCHASES_BACKDATE: 'purchases.backdate',

  PURCHASE_RETURNS_VIEW: 'purchase_returns.view',
  PURCHASE_RETURNS_CREATE: 'purchase_returns.create',
  PURCHASE_RETURNS_CANCEL: 'purchase_returns.cancel',

  SUPPLIER_PAYMENTS_VIEW: 'supplier_payments.view',
  SUPPLIER_PAYMENTS_CREATE: 'supplier_payments.create',
  SUPPLIER_PAYMENTS_VOID: 'supplier_payments.void',

  EXPENSES_VIEW: 'expenses.view',
  EXPENSES_CREATE: 'expenses.create',
  EXPENSES_VOID: 'expenses.void',

  ACCOUNTS_VIEW: 'accounts.view',
  ACCOUNTS_MANAGE: 'accounts.manage',

  REPORTS_SALES: 'reports.sales',
  REPORTS_PURCHASES: 'reports.purchases',
  REPORTS_INVENTORY: 'reports.inventory',
  REPORTS_FINANCIAL: 'reports.financial',
  REPORTS_PROFIT: 'reports.profit',

  USERS_MANAGE: 'users.manage',
  SETTINGS_MANAGE: 'settings.manage',
  AUDIT_VIEW: 'audit.view',
  DATA_IMPORT: 'data.import',
  DATA_EXPORT: 'data.export',
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export function hasPermission(
  userPermissions: string[] | undefined,
  roleCode: string | undefined,
  permission: string
): boolean {
  if (roleCode === 'admin') return true
  if (!userPermissions) return false
  return userPermissions.includes(permission)
}
