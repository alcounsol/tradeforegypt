import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

export type InventoryItem = {
  id: number
  sku: string | null
  name: string
  description: string | null
  category: string | null
  brand: string | null
  unit: string
  current_stock: number
  min_stock_level: number
  cost_price: number | null
  sell_price: number | null
  created_at: string
}

export type Expense = {
  id: number
  expense_type: 'BILL' | 'PETTY'
  category: string
  amount: number
  description: string | null
  expense_date: string
  created_at: string
}

export type ServiceRecord = {
  id: number
  service_type: 'INSPECTION' | 'REPAIR'
  customer_name: string | null
  customer_phone: string | null
  device_type: string | null
  device_brand: string | null
  device_model: string | null
  amount: number
  payment_method: string
  notes: string | null
  service_date: string
  created_at: string
}

export type Employee = {
  id: number
  name: string
  job_title: string | null
  phone: string | null
  base_salary: number | null
  is_active: boolean
  created_at: string
}

export type PayrollRecord = {
  id: number
  employee_id: number
  period_month: number
  period_year: number
  base_salary: number
  bonus: number
  deductions: number
  net_paid: number
  paid_date: string | null
  created_at: string
}

export type Customer = {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export type Supplier = {
  id: number
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export type Purchase = {
  id: number
  item_id: number
  supplier_id: number | null
  quantity: number
  unit_cost: number
  total_cost: number
  purchase_date: string
  invoice_number: string | null
  notes: string | null
  created_at: string
}
