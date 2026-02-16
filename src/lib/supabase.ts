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
  department: string | null
  notes: string | null
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
  is_paid: boolean
  notes: string | null
  created_at: string
  employee?: Employee
}

export type Customer = {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  company_name: string | null
  customer_type: string
  request_type: string
  device_brand: string | null
  device_name: string | null
  device_type: string | null
  fault_description: string | null
  supply_details: string | null
  status: string
  assigned_call_center_employee: number | null
  assigned_follow_up_employee: number | null
  assigned_sales_employee: number | null
  source: string | null
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
  inventory_item?: InventoryItem
  supplier?: Supplier
}

export type CallRecord = {
  id: number
  customer_id: number | null
  employee_id: number | null
  call_type: string
  call_purpose: string
  customer_name: string
  customer_phone: string | null
  customer_address: string | null
  customer_type: string
  request_type: string
  device_brand: string | null
  device_name: string | null
  device_type: string | null
  fault_description: string | null
  supply_details: string | null
  notes: string | null
  call_outcome: string | null
  call_date: string
  created_at: string
  employee?: Employee
  customer?: Customer
}

export type FollowUp = {
  id: number
  customer_id: number | null
  employee_id: number | null
  follow_up_type: string
  status: string
  notes: string | null
  result: string | null
  next_follow_up_date: string | null
  follow_up_date: string
  created_at: string
  employee?: Employee
  customer?: Customer
}

export type SalesActivity = {
  id: number
  customer_id: number | null
  employee_id: number | null
  activity_type: string
  service_offered: string | null
  status: string
  offered_amount: number
  notes: string | null
  result: string | null
  next_action_date: string | null
  activity_date: string
  created_at: string
  employee?: Employee
  customer?: Customer
}

export type Incentive = {
  id: number
  employee_id: number | null
  incentive_type: string
  amount: number
  reference_id: number | null
  reference_type: string | null
  description: string | null
  incentive_date: string
  period_month: number | null
  period_year: number | null
  is_paid: boolean
  created_at: string
  employee?: Employee
}

export type DeviceReceipt = {
  id: number
  customer_id: number | null
  received_by: number | null
  delivered_by: number | null
  device_brand: string
  device_name: string
  device_type: string | null
  device_model: string | null
  serial_number: string | null
  condition_notes: string | null
  fault_description: string | null
  status: string
  receipt_date: string
  delivery_date: string | null
  created_at: string
  customer?: Customer
  receiver?: Employee
  deliverer?: Employee
}

export type ServicePart = {
  id: number
  service_record_id: number | null
  device_receipt_id: number | null
  inventory_item_id: number | null
  quantity: number
  unit_cost: number | null
  total_cost: number | null
  notes: string | null
  created_at: string
  inventory_item?: InventoryItem
}

// Department labels
export const departmentLabels: Record<string, string> = {
  maintenance: 'الصيانة',
  hr: 'الموارد البشرية',
  call_center: 'الكول سنتر',
  follow_up: 'المتابعة',
  sales: 'المبيعات',
  delivery: 'التوصيل',
  reception: 'الاستقبال',
  general: 'عام',
}

export const customerStatusLabels: Record<string, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  follow_up: 'متابعة',
  device_received: 'تم استلام الجهاز',
  in_repair: 'قيد الصيانة',
  completed: 'مكتمل',
  delivered: 'تم التسليم',
}

export const customerStatusColors: Record<string, string> = {
  new: 'primary',
  contacted: 'secondary',
  follow_up: 'warning',
  device_received: 'default',
  in_repair: 'warning',
  completed: 'success',
  delivered: 'success',
}
