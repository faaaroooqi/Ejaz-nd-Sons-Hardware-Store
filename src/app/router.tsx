import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from './layout/AppShell'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'

import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { ProductsPage } from '@/features/catalog/pages/ProductsPage'
import { InventoryPage } from '@/features/inventory/pages/InventoryPage'
import { CustomersPage } from '@/features/customers/pages/CustomersPage'
import { SuppliersPage } from '@/features/suppliers/pages/SuppliersPage'
import { SalesPage } from '@/features/sales/pages/SalesPage'
import { NewSalePage } from '@/features/sales/pages/NewSalePage'
import { PurchasesPage } from '@/features/purchases/pages/PurchasesPage'
import { NewPurchasePage } from '@/features/purchases/pages/NewPurchasePage'
import { SalesReturnsPage } from '@/features/returns/pages/SalesReturnsPage'
import { PurchaseReturnsPage } from '@/features/returns/pages/PurchaseReturnsPage'
import { CustomerPaymentsPage } from '@/features/payments/pages/CustomerPaymentsPage'
import { SupplierPaymentsPage } from '@/features/payments/pages/SupplierPaymentsPage'
import { ExpensesPage } from '@/features/expenses/pages/ExpensesPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { UsersPage } from '@/features/users/pages/UsersPage'
import { AuditLogsPage } from '@/features/audit/pages/AuditLogsPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { KhataImportPage } from '@/features/khata-import/pages/KhataImportPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'products', element: <ProductsPage /> },
          { path: 'inventory', element: <InventoryPage /> },
          { path: 'customers', element: <CustomersPage /> },
          { path: 'suppliers', element: <SuppliersPage /> },
          { path: 'sales', element: <SalesPage /> },
          { path: 'sales/new', element: <NewSalePage /> },
          { path: 'purchases', element: <PurchasesPage /> },
          { path: 'purchases/new', element: <NewPurchasePage /> },
          { path: 'sales-returns', element: <SalesReturnsPage /> },
          { path: 'purchase-returns', element: <PurchaseReturnsPage /> },
          { path: 'customer-payments', element: <CustomerPaymentsPage /> },
          { path: 'supplier-payments', element: <SupplierPaymentsPage /> },
          { path: 'expenses', element: <ExpensesPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'audit-logs', element: <AuditLogsPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'khata-import', element: <KhataImportPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])

