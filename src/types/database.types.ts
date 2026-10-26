export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DocStatus = 'posted' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid'
export type PaymentMethod = 'cash' | 'bank' | 'online' | 'cheque' | 'other'
export type PaymentDirection = 'in' | 'out'
export type ChequeStatus = 'pending' | 'cleared' | 'bounced'

export type MovementType =
  | 'opening_stock'
  | 'purchase'
  | 'purchase_return'
  | 'sale'
  | 'sales_return'
  | 'adjustment'

export type AdjustmentReason =
  | 'count_correction'
  | 'damage'
  | 'loss_theft'
  | 'found'
  | 'internal_use'
  | 'other'

export type LedgerEntryType =
  | 'opening_balance'
  | 'sale'
  | 'purchase'
  | 'payment'
  | 'refund'
  | 'sales_return'
  | 'purchase_return'
  | 'adjustment'
  | 'reversal'

export type PriceTier = 'default' | 'wholesale' | 'retail'
export type DiscountType = 'amount' | 'percent'
export type AccountType = 'cash' | 'bank' | 'wallet'
export type CreditLimitMode = 'off' | 'warn' | 'block'

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          is_system: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['roles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['roles']['Insert']>
      }
      permissions: {
        Row: {
          code: string
          module: string
          description: string
          sort_order: number
        }
        Insert: Database['public']['Tables']['permissions']['Row']
        Update: Partial<Database['public']['Tables']['permissions']['Row']>
      }
      role_permissions: {
        Row: {
          role_id: string
          permission_code: string
          granted_at: string
        }
        Insert: Omit<Database['public']['Tables']['role_permissions']['Row'], 'granted_at'>
        Update: Partial<Database['public']['Tables']['role_permissions']['Row']>
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string | null
          phone: string | null
          role_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      settings: {
        Row: {
          id: number
          business_name: string
          business_tagline: string | null
          business_address: string | null
          business_city: string | null
          business_phone: string | null
          business_phone_alt: string | null
          business_email: string | null
          business_ntn: string | null
          logo_path: string | null
          currency_code: string
          currency_symbol: string
          number_grouping: 'international' | 'lakh'
          date_format: string
          timezone: string
          fiscal_year_start_month: number
          allow_negative_stock: boolean
          credit_limit_mode: CreditLimitMode
          books_locked_until: string | null
          backdate_limit_days: number
          invoice_terms: string | null
          invoice_footer: string | null
          default_print_format: 'a4' | 'thermal80'
          show_previous_balance_on_invoice: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: Partial<Database['public']['Tables']['settings']['Row']>
        Update: Partial<Database['public']['Tables']['settings']['Row']>
      }
      activity_logs: {
        Row: {
          id: string
          occurred_at: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          summary: string | null
          old_data: Json | null
          new_data: Json | null
          metadata: Json
        }
        Insert: Omit<Database['public']['Tables']['activity_logs']['Row'], 'id' | 'occurred_at'>
        Update: never
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at' | 'updated_at' | 'sort_order' | 'is_active'> & {
          sort_order?: number
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      subcategories: {
        Row: {
          id: string
          category_id: string
          name: string
          description: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['subcategories']['Row'], 'id' | 'created_at' | 'updated_at' | 'sort_order' | 'is_active'> & {
          sort_order?: number
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['subcategories']['Insert']>
      }
      brands: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['brands']['Row'], 'id' | 'created_at' | 'updated_at' | 'is_active'> & {
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['brands']['Insert']>
      }
      units: {
        Row: {
          id: string
          code: string
          name: string
          allow_decimal: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['units']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['units']['Insert']>
      }
      products: {
        Row: {
          id: string
          name: string
          category_id: string
          subcategory_id: string | null
          brand_id: string | null
          unit_id: string
          model: string | null
          description: string | null
          image_path: string | null
          has_variants: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at' | 'has_variants' | 'is_active'> & {
          has_variants?: boolean
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          sku: string
          barcode: string | null
          variant_name: string
          size: string | null
          material: string | null
          color: string | null
          grade: string | null
          default_rate: number
          wholesale_rate: number
          retail_rate: number
          min_stock_level: number
          is_default: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['product_variants']['Row'], 'id' | 'created_at' | 'updated_at' | 'is_default' | 'is_active'> & {
          is_default?: boolean
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['product_variants']['Insert']>
      }
      variant_costs: {
        Row: {
          variant_id: string
          default_purchase_rate: number
          last_purchase_rate: number
          average_cost: number
          updated_at: string
        }
        Insert: Database['public']['Tables']['variant_costs']['Row']
        Update: Partial<Database['public']['Tables']['variant_costs']['Row']>
      }
      product_price_history: {
        Row: {
          id: string
          variant_id: string
          field_name: string
          old_rate: number
          new_rate: number
          changed_by: string | null
          changed_at: string
        }
        Insert: Omit<Database['public']['Tables']['product_price_history']['Row'], 'id' | 'changed_at'>
        Update: never
      }
      customers: {
        Row: {
          id: string
          code: string
          name: string
          business_name: string | null
          phone: string
          alt_phone: string | null
          cnic: string | null
          address: string | null
          city: string
          area: string | null
          price_tier: PriceTier
          credit_limit: number
          is_walk_in: boolean
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at' | 'is_walk_in' | 'is_active' | 'price_tier' | 'credit_limit' | 'city'> & {
          is_walk_in?: boolean
          is_active?: boolean
          price_tier?: PriceTier
          credit_limit?: number
          city?: string
        }
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
      }
      suppliers: {
        Row: {
          id: string
          code: string
          name: string
          company_name: string | null
          phone: string
          alt_phone: string | null
          ntn: string | null
          address: string | null
          city: string
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'id' | 'created_at' | 'updated_at' | 'is_active' | 'city'> & {
          is_active?: boolean
          city?: string
        }
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>
      }
      customer_balances: {
        Row: {
          customer_id: string
          current_balance: number
          last_entry_date: string | null
          updated_at: string
        }
        Insert: Database['public']['Tables']['customer_balances']['Row']
        Update: Partial<Database['public']['Tables']['customer_balances']['Row']>
      }
      supplier_balances: {
        Row: {
          supplier_id: string
          current_balance: number
          last_entry_date: string | null
          updated_at: string
        }
        Insert: Database['public']['Tables']['supplier_balances']['Row']
        Update: Partial<Database['public']['Tables']['supplier_balances']['Row']>
      }
      customer_ledger_entries: {
        Row: {
          id: string
          customer_id: string
          entry_date: string
          entry_type: LedgerEntryType
          description: string
          reference_no: string | null
          debit: number
          credit: number
          source_type: string
          source_id: string | null
          reversal_of: string | null
          created_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['customer_ledger_entries']['Row'], 'id' | 'created_at'>
        Update: never
      }
      supplier_ledger_entries: {
        Row: {
          id: string
          supplier_id: string
          entry_date: string
          entry_type: LedgerEntryType
          description: string
          reference_no: string | null
          debit: number
          credit: number
          source_type: string
          source_id: string | null
          reversal_of: string | null
          created_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['supplier_ledger_entries']['Row'], 'id' | 'created_at'>
        Update: never
      }
      payment_accounts: {
        Row: {
          id: string
          name: string
          account_type: AccountType
          bank_name: string | null
          account_no: string | null
          opening_balance: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['payment_accounts']['Row'], 'id' | 'created_at' | 'updated_at' | 'is_active'> & {
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['payment_accounts']['Insert']>
      }
      expense_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['expense_categories']['Row'], 'id' | 'created_at' | 'is_active'> & {
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['expense_categories']['Insert']>
      }
      expenses: {
        Row: {
          id: string
          expense_no: string
          expense_date: string
          category_id: string
          amount: number
          payment_method: PaymentMethod
          payment_account_id: string
          paid_to: string | null
          description: string
          attachment_path: string | null
          status: DocStatus
          voided_at: string | null
          voided_by: string | null
          void_reason: string | null
          created_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'created_at' | 'status'> & {
          status?: DocStatus
        }
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>
      }
      stock_levels: {
        Row: {
          variant_id: string
          quantity_on_hand: number
          last_movement_at: string
        }
        Insert: Database['public']['Tables']['stock_levels']['Row']
        Update: Partial<Database['public']['Tables']['stock_levels']['Row']>
      }
      stock_movements: {
        Row: {
          id: string
          variant_id: string
          movement_date: string
          movement_type: MovementType
          quantity: number
          unit_cost: number
          balance_after: number
          source_type: string
          source_id: string | null
          source_line_id: string | null
          reversal_of: string | null
          created_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['stock_movements']['Row'], 'id' | 'created_at'>
        Update: never
      }
      sales: {
        Row: {
          id: string
          invoice_no: string
          /** System-generated 1,2,3… (never user-entered, never reused). */
          bill_number: number
          /** Transport / delivery bilty reference entered by the user. */
          bilty_number: string | null
          /** Laborer / worker associated with the delivery. */
          laborer_name: string | null
          sale_date: string
          customer_id: string | null
          customer_name_snapshot: string
          customer_phone_snapshot: string | null
          price_tier_snapshot: PriceTier
          subtotal: number
          discount_amount: number
          additional_charges: number
          grand_total: number
          amount_paid: number
          amount_returned: number
          balance_due: number
          payment_status: PaymentStatus
          status: DocStatus
          notes: string | null
          replaces_id: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancel_reason: string | null
          client_request_id: string | null
          created_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['sales']['Row'], 'id' | 'created_at' | 'status' | 'amount_returned' | 'bill_number'> & {
          status?: DocStatus
          amount_returned?: number
          bill_number?: number
        }
        Update: Partial<Database['public']['Tables']['sales']['Insert']>
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          line_no: number
          variant_id: string
          sku_snapshot: string
          product_name_snapshot: string
          unit_code_snapshot: string
          brand_name_snapshot: string | null
          quantity: number
          default_rate: number
          rate: number
          discount_amount: number
          line_total: number
          net_unit_price: number
          returned_quantity: number
        }
        Insert: Omit<Database['public']['Tables']['sale_items']['Row'], 'id' | 'returned_quantity'> & {
          returned_quantity?: number
        }
        Update: Partial<Database['public']['Tables']['sale_items']['Insert']>
      }
      customer_payments: {
        Row: {
          id: string
          receipt_no: string
          payment_date: string
          customer_id: string
          direction: PaymentDirection
          amount: number
          payment_method: PaymentMethod
          payment_account_id: string
          cheque_no: string | null
          cheque_date: string | null
          bank_name: string | null
          cheque_status: ChequeStatus | null
          sale_id: string | null
          notes: string | null
          status: DocStatus
          created_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['customer_payments']['Row'], 'id' | 'created_at' | 'status'> & {
          status?: DocStatus
        }
        Update: Partial<Database['public']['Tables']['customer_payments']['Insert']>
      }
      customer_payment_allocations: {
        Row: {
          id: string
          payment_id: string
          sale_id: string
          amount: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['customer_payment_allocations']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['customer_payment_allocations']['Row']>
      }
      purchases: {
        Row: {
          id: string
          bill_no: string
          purchase_date: string
          supplier_id: string
          supplier_name_snapshot: string
          supplier_invoice_no: string | null
          subtotal: number
          discount_amount: number
          freight_charges: number
          other_charges: number
          grand_total: number
          amount_paid: number
          amount_returned: number
          balance_due: number
          payment_status: PaymentStatus
          status: DocStatus
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['purchases']['Row'], 'id' | 'created_at' | 'status' | 'amount_returned'> & {
          status?: DocStatus
          amount_returned?: number
        }
        Update: Partial<Database['public']['Tables']['purchases']['Insert']>
      }
      purchase_items: {
        Row: {
          id: string
          purchase_id: string
          line_no: number
          variant_id: string
          sku_snapshot: string
          product_name_snapshot: string
          unit_code_snapshot: string
          brand_name_snapshot: string | null
          quantity: number
          unit_cost: number
          discount_amount: number
          landed_cost_per_unit: number
          line_total: number
          returned_quantity: number
        }
        Insert: Omit<Database['public']['Tables']['purchase_items']['Row'], 'id' | 'returned_quantity'> & {
          returned_quantity?: number
        }
        Update: Partial<Database['public']['Tables']['purchase_items']['Insert']>
      }
      supplier_payments: {
        Row: {
          id: string
          voucher_no: string
          payment_date: string
          supplier_id: string
          direction: PaymentDirection
          amount: number
          payment_method: PaymentMethod
          payment_account_id: string
          cheque_no: string | null
          cheque_date: string | null
          bank_name: string | null
          cheque_status: ChequeStatus | null
          purchase_id: string | null
          notes: string | null
          status: DocStatus
          created_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['supplier_payments']['Row'], 'id' | 'created_at' | 'status'> & {
          status?: DocStatus
        }
        Update: Partial<Database['public']['Tables']['supplier_payments']['Insert']>
      }
      supplier_payment_allocations: {
        Row: {
          id: string
          payment_id: string
          purchase_id: string
          amount: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['supplier_payment_allocations']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['supplier_payment_allocations']['Row']>
      }
      sales_returns: {
        Row: {
          id: string
          return_no: string
          return_date: string
          sale_id: string | null
          customer_id: string
          customer_name_snapshot: string
          subtotal: number
          refund_amount: number
          payment_account_id: string | null
          status: DocStatus
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['sales_returns']['Row'], 'id' | 'created_at' | 'status'> & {
          status?: DocStatus
        }
        Update: Partial<Database['public']['Tables']['sales_returns']['Insert']>
      }
      sale_return_items: {
        Row: {
          id: string
          return_id: string
          sale_item_id: string | null
          variant_id: string
          quantity: number
          rate: number
          line_total: number
        }
        Insert: Omit<Database['public']['Tables']['sale_return_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['sale_return_items']['Insert']>
      }
      purchase_returns: {
        Row: {
          id: string
          return_no: string
          return_date: string
          purchase_id: string | null
          supplier_id: string
          supplier_name_snapshot: string
          subtotal: number
          refund_amount: number
          payment_account_id: string | null
          status: DocStatus
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['purchase_returns']['Row'], 'id' | 'created_at' | 'status'> & {
          status?: DocStatus
        }
        Update: Partial<Database['public']['Tables']['purchase_returns']['Insert']>
      }
      purchase_return_items: {
        Row: {
          id: string
          return_id: string
          purchase_item_id: string | null
          variant_id: string
          quantity: number
          unit_cost: number
          line_total: number
        }
        Insert: Omit<Database['public']['Tables']['purchase_return_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['purchase_return_items']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_access: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          full_name: string
          email: string | null
          phone: string | null
          is_active: boolean
          role_code: string
          role_name: string
          permissions: string[]
        }
      }
      has_permission: {
        Args: { p_permission: string }
        Returns: boolean
      }
      admin_update_settings: {
        Args: { p_changes: Json }
        Returns: Database['public']['Tables']['settings']['Row']
      }
      admin_list_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          full_name: string
          email: string | null
          phone: string | null
          role_id: string
          role_code: string
          role_name: string
          is_active: boolean
          last_sign_in_at: string | null
          created_at: string
        }[]
      }
      admin_update_user: {
        Args: {
          p_user_id: string
          p_full_name?: string | null
          p_phone?: string | null
          p_role_code?: string | null
          p_is_active?: boolean | null
        }
        Returns: Database['public']['Tables']['profiles']['Row']
      }
      post_sale: {
        Args: { p_payload: Json }
        Returns: {
          id: string
          invoice_no: string
          grand_total: number
          balance_due: number
          payment_status: string
        }
      }
      post_purchase: {
        Args: { p_payload: Json }
        Returns: {
          id: string
          bill_no: string
          grand_total: number
          balance_due: number
          payment_status: string
        }
      }
      post_customer_payment: {
        Args: { p_payload: Json }
        Returns: {
          id: string
          receipt_no: string
          amount: number
        }
      }
      post_supplier_payment: {
        Args: { p_payload: Json }
        Returns: {
          id: string
          voucher_no: string
          amount: number
        }
      }
      post_expense: {
        Args: { p_payload: Json }
        Returns: {
          id: string
          expense_no: string
          amount: number
        }
      }
      post_sales_return: {
        Args: { p_payload: Json }
        Returns: {
          id: string
          return_no: string
          subtotal: number
        }
      }
      post_purchase_return: {
        Args: { p_payload: Json }
        Returns: {
          id: string
          return_no: string
          subtotal: number
        }
      }
      get_financial_summary: {
        Args: { p_start_date?: string | null; p_end_date?: string | null }
        Returns: Json
      }
    }
    Enums: {
      doc_status: DocStatus
      payment_status: PaymentStatus
      payment_method: PaymentMethod
      payment_direction: PaymentDirection
      cheque_status: ChequeStatus
      movement_type: MovementType
      adjustment_reason: AdjustmentReason
      ledger_entry_type: LedgerEntryType
      price_tier: PriceTier
      discount_type: DiscountType
      account_type: AccountType
      credit_limit_mode: CreditLimitMode
    }
  }
}

export type AccessProfile = {
  user_id: string
  full_name: string
  email: string | null
  phone: string | null
  is_active: boolean
  role_code: string
  role_name: string
  permissions: string[]
}
