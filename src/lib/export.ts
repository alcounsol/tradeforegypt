// Export utilities for all sections

export function exportToCSV(data: Record<string, unknown>[], headers: readonly { key: string; label: string }[], filename: string) {
  const headerRow = headers.map(h => h.label).join(',')
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h.key]
      if (val === null || val === undefined) return ''
      const str = String(val)
      // Escape commas and quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  )
  const csvContent = '\uFEFF' + [headerRow, ...rows].join('\n')
  downloadFile(csvContent, `${filename}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;')
}

export function exportToJSON(data: unknown[], filename: string) {
  const jsonContent = JSON.stringify(data, null, 2)
  downloadFile(jsonContent, `${filename}_${new Date().toISOString().split('T')[0]}.json`, 'application/json')
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Parse CSV content to array of objects
export function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  
  // Remove BOM if present
  let headerLine = lines[0]
  if (headerLine.charCodeAt(0) === 0xFEFF) headerLine = headerLine.slice(1)
  
  const headers = parseCSVLine(headerLine)
  const results: Record<string, string>[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || ''
    })
    results.push(obj)
  }
  return results
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }
  result.push(current.trim())
  return result
}

// Parse JSON content
export function parseJSON(content: string): Record<string, unknown>[] {
  try {
    const data = JSON.parse(content)
    if (Array.isArray(data)) return data
    return [data]
  } catch {
    return []
  }
}

// Section definitions for backup/restore
export const SECTIONS = {
  employees: { label: 'الموظفين', table: 'employees', headers: [
    { key: 'name', label: 'الاسم' }, { key: 'job_title', label: 'المسمى الوظيفي' }, { key: 'department', label: 'القسم' },
    { key: 'phone', label: 'الهاتف' }, { key: 'base_salary', label: 'الراتب الأساسي' }, { key: 'is_active', label: 'نشط' }, { key: 'notes', label: 'ملاحظات' }
  ]},
  customers: { label: 'العملاء', table: 'customers', headers: [
    { key: 'name', label: 'الاسم' }, { key: 'phone', label: 'الهاتف' }, { key: 'email', label: 'البريد' }, { key: 'address', label: 'العنوان' },
    { key: 'customer_type', label: 'نوع العميل' }, { key: 'request_type', label: 'نوع الطلب' }, { key: 'company_name', label: 'اسم الشركة' },
    { key: 'device_brand', label: 'ماركة الجهاز' }, { key: 'device_name', label: 'اسم الجهاز' }, { key: 'status', label: 'الحالة' }, { key: 'notes', label: 'ملاحظات' }
  ]},
  inventory_items: { label: 'المخزون', table: 'inventory_items', headers: [
    { key: 'name', label: 'الاسم' }, { key: 'sku', label: 'رمز SKU' }, { key: 'category', label: 'الفئة' }, { key: 'brand', label: 'الماركة' },
    { key: 'unit', label: 'الوحدة' }, { key: 'current_stock', label: 'المخزون الحالي' }, { key: 'min_stock_level', label: 'الحد الأدنى' },
    { key: 'cost_price', label: 'سعر التكلفة' }, { key: 'sell_price', label: 'سعر البيع' }
  ]},
  suppliers: { label: 'الموردين', table: 'suppliers', headers: [
    { key: 'name', label: 'الاسم' }, { key: 'contact_person', label: 'جهة الاتصال' }, { key: 'phone', label: 'الهاتف' },
    { key: 'email', label: 'البريد' }, { key: 'address', label: 'العنوان' }, { key: 'notes', label: 'ملاحظات' }
  ]},
  purchases: { label: 'المشتريات', table: 'purchases', headers: [
    { key: 'item_id', label: 'رقم الصنف' }, { key: 'supplier_id', label: 'رقم المورد' }, { key: 'quantity', label: 'الكمية' },
    { key: 'unit_cost', label: 'سعر الوحدة' }, { key: 'total_cost', label: 'الإجمالي' }, { key: 'purchase_date', label: 'تاريخ الشراء' },
    { key: 'invoice_number', label: 'رقم الفاتورة' }, { key: 'notes', label: 'ملاحظات' }
  ]},
  expenses: { label: 'المصروفات', table: 'expenses', headers: [
    { key: 'expense_type', label: 'النوع' }, { key: 'category', label: 'الفئة' }, { key: 'amount', label: 'المبلغ' },
    { key: 'description', label: 'الوصف' }, { key: 'expense_date', label: 'التاريخ' }
  ]},
  service_records: { label: 'الخدمات', table: 'service_records', headers: [
    { key: 'service_type', label: 'نوع الخدمة' }, { key: 'customer_name', label: 'اسم العميل' }, { key: 'customer_phone', label: 'هاتف العميل' },
    { key: 'device_type', label: 'نوع الجهاز' }, { key: 'device_brand', label: 'ماركة الجهاز' }, { key: 'device_model', label: 'موديل الجهاز' },
    { key: 'amount', label: 'المبلغ' }, { key: 'payment_method', label: 'طريقة الدفع' }, { key: 'service_date', label: 'التاريخ' }, { key: 'notes', label: 'ملاحظات' }
  ]},
  call_records: { label: 'سجلات المكالمات', table: 'call_records', headers: [
    { key: 'customer_name', label: 'اسم العميل' }, { key: 'customer_phone', label: 'الهاتف' }, { key: 'customer_address', label: 'العنوان' },
    { key: 'customer_type', label: 'نوع العميل' }, { key: 'request_type', label: 'نوع الطلب' }, { key: 'device_brand', label: 'ماركة الجهاز' },
    { key: 'device_name', label: 'اسم الجهاز' }, { key: 'call_outcome', label: 'نتيجة المكالمة' }, { key: 'call_date', label: 'التاريخ' }, { key: 'notes', label: 'ملاحظات' }
  ]},
  follow_ups: { label: 'المتابعات', table: 'follow_ups', headers: [
    { key: 'customer_id', label: 'رقم العميل' }, { key: 'employee_id', label: 'رقم الموظف' }, { key: 'follow_up_type', label: 'نوع المتابعة' },
    { key: 'status', label: 'الحالة' }, { key: 'result', label: 'النتيجة' }, { key: 'follow_up_date', label: 'التاريخ' }, { key: 'notes', label: 'ملاحظات' }
  ]},
  sales_activities: { label: 'المبيعات', table: 'sales_activities', headers: [
    { key: 'customer_id', label: 'رقم العميل' }, { key: 'employee_id', label: 'رقم الموظف' }, { key: 'activity_type', label: 'نوع النشاط' },
    { key: 'service_offered', label: 'الخدمة المقدمة' }, { key: 'status', label: 'الحالة' }, { key: 'offered_amount', label: 'المبلغ' },
    { key: 'activity_date', label: 'التاريخ' }, { key: 'notes', label: 'ملاحظات' }
  ]},
  device_receipts: { label: 'استلام الأجهزة', table: 'device_receipts', headers: [
    { key: 'customer_id', label: 'رقم العميل' }, { key: 'device_brand', label: 'ماركة الجهاز' }, { key: 'device_name', label: 'اسم الجهاز' },
    { key: 'device_type', label: 'نوع الجهاز' }, { key: 'device_model', label: 'الموديل' }, { key: 'serial_number', label: 'الرقم التسلسلي' },
    { key: 'condition_notes', label: 'حالة الجهاز' }, { key: 'fault_description', label: 'وصف العطل' }, { key: 'status', label: 'الحالة' }, { key: 'receipt_date', label: 'تاريخ الاستلام' }
  ]},
  incentives: { label: 'الحوافز', table: 'incentives', headers: [
    { key: 'employee_id', label: 'رقم الموظف' }, { key: 'incentive_type', label: 'نوع الحافز' }, { key: 'amount', label: 'المبلغ' },
    { key: 'description', label: 'الوصف' }, { key: 'incentive_date', label: 'التاريخ' }, { key: 'is_paid', label: 'تم الصرف' }
  ]},
  payroll_records: { label: 'الرواتب', table: 'payroll_records', headers: [
    { key: 'employee_id', label: 'رقم الموظف' }, { key: 'period_month', label: 'الشهر' }, { key: 'period_year', label: 'السنة' },
    { key: 'base_salary', label: 'الراتب الأساسي' }, { key: 'bonus', label: 'البونص' }, { key: 'deductions', label: 'الخصومات' },
    { key: 'net_paid', label: 'صافي المدفوع' }, { key: 'is_paid', label: 'تم الصرف' }
  ]},
  invoices: { label: 'الفواتير', table: 'invoices', headers: [
    { key: 'invoice_number', label: 'رقم الفاتورة' }, { key: 'customer_id', label: 'رقم العميل' }, { key: 'invoice_type', label: 'النوع' },
    { key: 'invoice_date', label: 'التاريخ' }, { key: 'subtotal', label: 'المبلغ الفرعي' }, { key: 'discount', label: 'الخصم' },
    { key: 'tax', label: 'الضريبة' }, { key: 'total_amount', label: 'الإجمالي' }, { key: 'paid_amount', label: 'المدفوع' }, { key: 'status', label: 'الحالة' }
  ]},
  transactions: { label: 'الحركات المالية', table: 'transactions', headers: [
    { key: 'transaction_date', label: 'التاريخ' }, { key: 'type', label: 'النوع' }, { key: 'category', label: 'الفئة' },
    { key: 'amount', label: 'المبلغ' }, { key: 'description', label: 'الوصف' }, { key: 'reference_type', label: 'نوع المرجع' }
  ]},
} as const satisfies Record<string, { label: string; table: string; headers: readonly { key: string; label: string }[] }>
