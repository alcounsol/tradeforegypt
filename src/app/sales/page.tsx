'use client'

import { useEffect, useState } from 'react'
import { supabase, SalesActivity, Employee, Customer } from '@/lib/supabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Button, Tooltip, Spinner } from '@nextui-org/react'
import { TrendingUp, Edit, Trash2, FileText, CheckCircle, Download } from 'lucide-react'
import { exportToCSV, SECTIONS } from '@/lib/export'

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'قيد الانتظار', color: 'bg-slate-50 text-slate-600 border-slate-200' },
  interested: { label: 'مهتم', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  negotiating: { label: 'تفاوض', color: 'bg-amber-50 text-amber-600 border-amber-100' },
  closed_won: { label: 'تم البيع', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  closed_lost: { label: 'خسارة', color: 'bg-red-50 text-red-600 border-red-100' },
}

const serviceLabels: Record<string, string> = {
  maintenance: 'صيانة', supply: 'توريد', sales: 'بيع أجهزة', exchange: 'استبدال أجهزة',
}

export default function SalesPage() {
  const [records, setRecords] = useState<SalesActivity[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editItem, setEditItem] = useState<SalesActivity | null>(null)
  const [formData, setFormData] = useState({
    customer_id: 0, employee_id: 0, activity_type: 'call' as string,
    service_offered: 'maintenance' as string, status: 'pending' as string,
    offered_amount: 0, notes: '', result: '', next_action_date: '',
  })
  const [invoiceCreated, setInvoiceCreated] = useState<Record<number, boolean>>({})

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: sales }, { data: emps }, { data: custs }, { data: existingInvoices }] = await Promise.all([
      supabase.from('sales_activities').select('*, employee:employees(id,name), customer:customers(id,name,phone)').order('activity_date', { ascending: false }),
      supabase.from('employees').select('*').eq('department', 'sales').eq('is_active', true),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('invoices').select('id, sales_activity_id').not('sales_activity_id', 'is', null),
    ])
    setRecords(sales || []); setEmployees(emps || []); setCustomers(custs || [])
    const invoiceMap: Record<number, boolean> = {}
    ;(existingInvoices || []).forEach((i: any) => { if (i.sales_activity_id) invoiceMap[i.sales_activity_id] = true })
    setInvoiceCreated(invoiceMap)
    setLoading(false)
  }

  const filtered = records.filter(r => {
    const cust = r.customer as any
    return !search || cust?.name?.includes(search) || cust?.phone?.includes(search)
  })

  function openAdd() { setEditItem(null); setFormData({ customer_id: 0, employee_id: 0, activity_type: 'call', service_offered: 'maintenance', status: 'pending', offered_amount: 0, notes: '', result: '', next_action_date: '' }); setIsOpen(true) }

  function openEdit(item: SalesActivity) {
    setEditItem(item)
    setFormData({ customer_id: item.customer_id || 0, employee_id: item.employee_id || 0, activity_type: item.activity_type || 'call', service_offered: (item.service_offered || 'maintenance') as any, status: item.status || 'pending', offered_amount: item.offered_amount || 0, notes: item.notes || '', result: item.result || '', next_action_date: item.next_action_date || '' })
    setIsOpen(true)
  }

  async function handleSubmit() {
    const payload: any = { ...formData }
    if (!payload.customer_id) { alert('يرجى اختيار العميل'); return }
    if (!payload.employee_id) delete payload.employee_id
    const previousStatus = editItem?.status
    const newStatus = payload.status
    if (editItem) {
      await supabase.from('sales_activities').update(payload).eq('id', editItem.id)
    } else {
      const { data } = await supabase.from('sales_activities').insert([payload]).select().single()
      if (data && newStatus === 'closed_won') await createInvoiceFromSale(data, payload)
    }
    if (editItem && newStatus === 'closed_won' && previousStatus !== 'closed_won' && !invoiceCreated[editItem.id]) {
      await createInvoiceFromSale(editItem, payload)
    }
    await supabase.from('customers').update({ assigned_sales_employee: formData.employee_id || null }).eq('id', formData.customer_id)
    setIsOpen(false); fetchAll()
  }

  async function createInvoiceFromSale(sale: any, formPayload?: any) {
    const saleId = sale.id
    const customerId = formPayload?.customer_id || sale.customer_id
    const amount = formPayload?.offered_amount || sale.offered_amount || 0
    const serviceType = formPayload?.service_offered || sale.service_offered || 'sales'
    if (!customerId || amount <= 0) return
    const customer = customers.find(c => c.id === customerId)
    const invoiceType = serviceType === 'maintenance' ? 'service' : serviceType === 'supply' ? 'supply' : serviceType === 'exchange' ? 'exchange' : 'sales'
    const { data: newInvoice } = await supabase.from('invoices').insert([{
      customer_id: customerId, invoice_type: invoiceType, invoice_date: new Date().toISOString().split('T')[0],
      subtotal: amount, discount: 0, tax: 0, total_amount: amount, paid_amount: 0, status: 'unpaid',
      payment_method: 'CASH', sales_activity_id: saleId,
      notes: `فاتورة تلقائية من صفقة ${serviceLabels[serviceType] || ''} - ${customer?.name || ''}`,
    }]).select().single()
    if (newInvoice) {
      await supabase.from('invoice_items').insert([{ invoice_id: newInvoice.id, description: `${serviceLabels[serviceType] || 'بيع'} - ${customer?.name || ''}`, item_type: serviceType, quantity: 1, unit_price: amount, total_price: amount }])
      await supabase.from('transactions').insert([{ transaction_date: new Date().toISOString().split('T')[0], type: 'income', category: serviceLabels[serviceType] || 'مبيعات', amount, description: `فاتورة ${newInvoice.invoice_number || '#' + newInvoice.id} - صفقة ${serviceLabels[serviceType] || ''} - ${customer?.name || ''}`, reference_type: 'invoice', reference_id: newInvoice.id, invoice_id: newInvoice.id }])
      alert(`تم إنشاء فاتورة تلقائياً!\nرقم الفاتورة: ${newInvoice.invoice_number || '#' + newInvoice.id}\nالمبلغ: ${formatCurrency(amount)}`)
    }
  }

  async function manualCreateInvoice(sale: SalesActivity) {
    const customer = customers.find(c => c.id === sale.customer_id)
    if (!customer) { alert('لم يتم العثور على العميل'); return }
    await createInvoiceFromSale(sale); fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) { await supabase.from('sales_activities').delete().eq('id', id); fetchAll() }
  }

  function handleExport() { exportToCSV(filtered as any, SECTIONS.sales_activities.headers, 'sales') }

  const totalWon = records.filter(r => r.status === 'closed_won').reduce((s, r) => s + (r.offered_amount || 0), 0)

  return (
    <div className="w-full">
      <PageHeader title="المبيعات" subtitle="إدارة عمليات البيع وعروض الخدمات" icon={TrendingUp} iconBg="from-purple-500 to-purple-600" buttonLabel="إضافة نشاط بيع" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث عن عميل..." />
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">إجمالي الأنشطة</p>
          <p className="text-lg sm:text-xl font-black text-purple-600">{records.length}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">صفقات ناجحة</p>
          <p className="text-lg sm:text-xl font-black text-green-600">{records.filter(r => r.status === 'closed_won').length}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">قيد التفاوض</p>
          <p className="text-lg sm:text-xl font-black text-amber-600">{records.filter(r => r.status === 'negotiating').length}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">إجمالي المبيعات</p>
          <p className="text-lg sm:text-xl font-black text-blue-600">{formatCurrency(totalWon)}</p>
        </CardBody></Card>
      </div>

      {loading ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex items-center justify-center h-48"><Spinner size="lg" /></CardBody></Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          <TrendingUp className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد أنشطة بيع</p>
        </CardBody></Card>
      ) : (
        <>
        <Card className="shadow-md border border-slate-100 hidden sm:block">
          <div className="flex items-center justify-end px-4 pt-3 pb-1">
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 transition-all">
              <Download className="h-3.5 w-3.5" />تصدير CSV
            </button>
          </div>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-l from-slate-50 to-slate-100 border-b-2 border-slate-200">
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">#</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">العميل</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الموظف</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الخدمة</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">المبلغ</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الحالة</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">التاريخ</th>
                  <th className="text-center p-3 font-extrabold text-slate-600 text-xs">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const cust = r.customer as any
                  const emp = r.employee as any
                  const cfg = statusConfig[r.status] || statusConfig.pending
                  return (
                    <tr key={r.id} className="border-b border-slate-100 transition-all hover:bg-blue-50/30">
                      <td className="p-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-extrabold text-sm text-slate-800">{cust?.name || '-'}</td>
                      <td className="p-3 text-sm font-bold text-slate-700">{emp?.name || '-'}</td>
                      <td className="p-3">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 text-xs font-bold border border-purple-100">{serviceLabels[r.service_offered || ''] || '-'}</span>
                      </td>
                      <td className="p-3 font-extrabold text-purple-600 text-sm">{formatCurrency(r.offered_amount || 0)}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="p-3 text-sm text-slate-500">{r.activity_date ? formatDate(r.activity_date) : '-'}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-0.5">
                          {r.status === 'closed_won' && (
                            invoiceCreated[r.id] ? (
                              <Tooltip content="تم إنشاء الفاتورة"><Button isIconOnly size="sm" variant="flat" color="success" className="cursor-default"><CheckCircle className="h-4 w-4" /></Button></Tooltip>
                            ) : (
                              <Tooltip content="إنشاء فاتورة"><Button isIconOnly size="sm" variant="flat" color="warning" onPress={() => manualCreateInvoice(r)}><FileText className="h-4 w-4" /></Button></Tooltip>
                            )
                          )}
                          <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(r)}><Edit className="h-4 w-4" /></Button></Tooltip>
                          <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-l from-purple-50 to-purple-100 border-t-2 border-purple-200">
                  <td colSpan={4} className="p-3 text-sm font-extrabold text-purple-800">الإجمالي ({filtered.length} نشاط)</td>
                  <td className="p-3 text-sm font-black text-purple-800">{formatCurrency(filtered.reduce((s, r) => s + (r.offered_amount || 0), 0))}</td>
                  <td colSpan={3} className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </CardBody>
        </Card>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">{filtered.length} نشاط</span>
              <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-emerald-50 text-emerald-600 border-emerald-200">
                <Download className="h-3 w-3" />تصدير
              </button>
            </div>
            {filtered.map((r) => {
              const cust = r.customer as any
              const emp = r.employee as any
              const cfg = statusConfig[r.status] || statusConfig.pending
              return (
                <div key={r.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-sm text-slate-800">{cust?.name || '-'}</p>
                      {emp?.name && <p className="text-[10px] text-slate-400">{emp.name}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {r.status === 'closed_won' && (
                        invoiceCreated[r.id] ? (
                          <span className="h-7 w-7 flex items-center justify-center rounded-lg bg-green-50 text-green-600"><CheckCircle className="h-3.5 w-3.5" /></span>
                        ) : (
                          <button onClick={() => manualCreateInvoice(r)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600"><FileText className="h-3.5 w-3.5" /></button>
                        )
                      )}
                      <button onClick={() => openEdit(r)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Edit className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(r.id)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-extrabold text-purple-600">{formatCurrency(r.offered_amount || 0)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${cfg.color}`}>{cfg.label}</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 text-[10px] font-bold">{serviceLabels[r.service_offered || ''] || '-'}</span>
                    <span className="text-slate-400">{r.activity_date ? formatDate(r.activity_date) : ''}</span>
                  </div>
                </div>
              )
            })}
            <div className="bg-purple-50 rounded-xl p-2.5 text-center">
              <span className="text-xs font-extrabold text-purple-800">الإجمالي: {formatCurrency(filtered.reduce((s, r) => s + (r.offered_amount || 0), 0))}</span>
            </div>
          </div>
        </>)}

      <CustomModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editItem ? 'تعديل نشاط بيع' : 'إضافة نشاط بيع جديد'} footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={() => setIsOpen(false)} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'إضافة'} onClick={handleSubmit} color="from-purple-500 to-purple-600" />
        </>
      }>
        <div className="flex flex-col gap-4">
          <FormSelect label="العميل" value={String(formData.customer_id)} onChange={(v) => setFormData({...formData, customer_id: parseInt(v) || 0})} required options={[{ value: '0', label: 'اختر العميل...' }, ...customers.map(c => ({ value: String(c.id), label: `${c.name} ${c.phone ? `(${c.phone})` : ''}` }))]} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormSelect label="موظف المبيعات" value={String(formData.employee_id)} onChange={(v) => setFormData({...formData, employee_id: parseInt(v) || 0})} options={[{ value: '0', label: 'اختر الموظف...' }, ...employees.map(e => ({ value: String(e.id), label: e.name }))]} />
            <FormSelect label="نوع النشاط" value={formData.activity_type} onChange={(v) => setFormData({...formData, activity_type: v as any})} options={[{ value: 'call', label: 'اتصال' }, { value: 'visit', label: 'زيارة' }, { value: 'presentation', label: 'عرض تقديمي' }, { value: 'offer', label: 'عرض سعر' }]} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormSelect label="الخدمة المعروضة" value={formData.service_offered} onChange={(v) => setFormData({...formData, service_offered: v as any})} options={[{ value: 'maintenance', label: 'صيانة' }, { value: 'supply', label: 'توريد' }, { value: 'sales', label: 'بيع أجهزة' }, { value: 'exchange', label: 'استبدال أجهزة' }]} />
            <FormSelect label="الحالة" value={formData.status} onChange={(v) => setFormData({...formData, status: v as any})} options={[{ value: 'pending', label: 'قيد الانتظار' }, { value: 'interested', label: 'مهتم' }, { value: 'negotiating', label: 'تفاوض' }, { value: 'closed_won', label: 'تم البيع' }, { value: 'closed_lost', label: 'خسارة' }]} />
          </div>
          {formData.status === 'closed_won' && !editItem && (
            <div className="p-3 bg-green-50 rounded-xl border border-green-200">
              <p className="text-xs font-bold text-green-700">سيتم إنشاء فاتورة تلقائياً عند حفظ الصفقة بحالة &quot;تم البيع&quot;</p>
            </div>
          )}
          <FormInput label="المبلغ المعروض" type="number" value={formData.offered_amount} onChange={(v) => setFormData({...formData, offered_amount: parseFloat(v) || 0})} />
          <FormTextarea label="ملاحظات" value={formData.notes} onChange={(v) => setFormData({...formData, notes: v})} />
          <FormInput label="النتيجة" value={formData.result} onChange={(v) => setFormData({...formData, result: v})} />
          <FormInput label="تاريخ الإجراء القادم" type="date" value={formData.next_action_date} onChange={(v) => setFormData({...formData, next_action_date: v})} />
        </div>
      </CustomModal>
    </div>
  )
}
