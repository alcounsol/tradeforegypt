'use client'

import { useEffect, useState } from 'react'
import { supabase, SalesActivity, Employee, Customer } from '@/lib/supabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Tooltip, Spinner } from '@nextui-org/react'
import { TrendingUp, Edit, Trash2, FileText, CheckCircle } from 'lucide-react'

const statusConfig: Record<string, { label: string; color: any }> = {
  pending: { label: 'قيد الانتظار', color: 'default' },
  interested: { label: 'مهتم', color: 'primary' },
  negotiating: { label: 'تفاوض', color: 'warning' },
  closed_won: { label: 'تم البيع', color: 'success' },
  closed_lost: { label: 'خسارة', color: 'danger' },
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
    setRecords(sales || [])
    setEmployees(emps || [])
    setCustomers(custs || [])
    // Track which sales already have invoices
    const invoiceMap: Record<number, boolean> = {}
    ;(existingInvoices || []).forEach((i: any) => { if (i.sales_activity_id) invoiceMap[i.sales_activity_id] = true })
    setInvoiceCreated(invoiceMap)
    setLoading(false)
  }

  const filtered = records.filter(r => {
    const cust = r.customer as any
    return !search || cust?.name?.includes(search) || cust?.phone?.includes(search)
  })

  function openAdd() {
    setEditItem(null)
    setFormData({ customer_id: 0, employee_id: 0, activity_type: 'call', service_offered: 'maintenance', status: 'pending', offered_amount: 0, notes: '', result: '', next_action_date: '' })
    setIsOpen(true)
  }

  function openEdit(item: SalesActivity) {
    setEditItem(item)
    setFormData({
      customer_id: item.customer_id || 0, employee_id: item.employee_id || 0,
      activity_type: item.activity_type || 'call', service_offered: (item.service_offered || 'maintenance') as any,
      status: item.status || 'pending', offered_amount: item.offered_amount || 0,
      notes: item.notes || '', result: item.result || '', next_action_date: item.next_action_date || '',
    })
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
      if (data && newStatus === 'closed_won') {
        await createInvoiceFromSale(data, payload)
      }
    }

    // If status changed to closed_won and no invoice exists yet
    if (editItem && newStatus === 'closed_won' && previousStatus !== 'closed_won' && !invoiceCreated[editItem.id]) {
      await createInvoiceFromSale(editItem, payload)
    }

    // Update customer assignment
    await supabase.from('customers').update({ assigned_sales_employee: formData.employee_id || null }).eq('id', formData.customer_id)

    setIsOpen(false)
    fetchAll()
  }

  async function createInvoiceFromSale(sale: any, formPayload?: any) {
    const saleId = sale.id
    const customerId = formPayload?.customer_id || sale.customer_id
    const amount = formPayload?.offered_amount || sale.offered_amount || 0
    const serviceType = formPayload?.service_offered || sale.service_offered || 'sales'

    if (!customerId || amount <= 0) return

    const customer = customers.find(c => c.id === customerId)
    const invoiceType = serviceType === 'maintenance' ? 'service' : serviceType === 'supply' ? 'supply' : serviceType === 'exchange' ? 'exchange' : 'sales'

    // Create invoice
    const { data: newInvoice } = await supabase.from('invoices').insert([{
      customer_id: customerId,
      invoice_type: invoiceType,
      invoice_date: new Date().toISOString().split('T')[0],
      subtotal: amount,
      discount: 0,
      tax: 0,
      total_amount: amount,
      paid_amount: 0,
      status: 'unpaid',
      payment_method: 'CASH',
      sales_activity_id: saleId,
      notes: `فاتورة تلقائية من صفقة ${serviceLabels[serviceType] || ''} - ${customer?.name || ''}`,
    }]).select().single()

    if (newInvoice) {
      // Insert invoice item
      await supabase.from('invoice_items').insert([{
        invoice_id: newInvoice.id,
        description: `${serviceLabels[serviceType] || 'بيع'} - ${customer?.name || ''}`,
        item_type: serviceType,
        quantity: 1,
        unit_price: amount,
        total_price: amount,
      }])

      // Record transaction
      await supabase.from('transactions').insert([{
        transaction_date: new Date().toISOString().split('T')[0],
        type: 'income',
        category: serviceLabels[serviceType] || 'مبيعات',
        amount: amount,
        description: `فاتورة ${newInvoice.invoice_number || '#' + newInvoice.id} - صفقة ${serviceLabels[serviceType] || ''} - ${customer?.name || ''}`,
        reference_type: 'invoice',
        reference_id: newInvoice.id,
        invoice_id: newInvoice.id,
      }])

      alert(`تم إنشاء فاتورة تلقائياً!\nرقم الفاتورة: ${newInvoice.invoice_number || '#' + newInvoice.id}\nالمبلغ: ${formatCurrency(amount)}`)
    }
  }

  async function manualCreateInvoice(sale: SalesActivity) {
    const customer = customers.find(c => c.id === sale.customer_id)
    if (!customer) { alert('لم يتم العثور على العميل'); return }
    await createInvoiceFromSale(sale)
    fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      await supabase.from('sales_activities').delete().eq('id', id)
      fetchAll()
    }
  }

  const totalWon = records.filter(r => r.status === 'closed_won').reduce((s, r) => s + (r.offered_amount || 0), 0)

  return (
    <div className="w-full">
      <PageHeader title="المبيعات" subtitle="إدارة عمليات البيع وعروض الخدمات" icon={TrendingUp} iconBg="from-purple-500 to-purple-600" buttonLabel="إضافة نشاط بيع" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث عن عميل..." />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">إجمالي الأنشطة</p>
          <p className="text-2xl font-extrabold text-purple-600">{records.length}</p>
        </CardBody></Card>
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">صفقات ناجحة</p>
          <p className="text-2xl font-extrabold text-green-600">{records.filter(r => r.status === 'closed_won').length}</p>
        </CardBody></Card>
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">قيد التفاوض</p>
          <p className="text-2xl font-extrabold text-amber-600">{records.filter(r => r.status === 'negotiating').length}</p>
        </CardBody></Card>
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">إجمالي المبيعات</p>
          <p className="text-2xl font-extrabold text-blue-600">{formatCurrency(totalWon)}</p>
        </CardBody></Card>
      </div>

      <Card className="shadow-md">
        <CardBody className="p-0">
          {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
          : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <TrendingUp className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد أنشطة بيع</p>
            </div>
          ) : (
            <Table aria-label="جدول المبيعات" removeWrapper className="min-w-full">
              <TableHeader>
                <TableColumn className="text-right font-bold">العميل</TableColumn>
                <TableColumn className="text-right font-bold">الموظف</TableColumn>
                <TableColumn className="text-right font-bold">الخدمة</TableColumn>
                <TableColumn className="text-right font-bold">المبلغ</TableColumn>
                <TableColumn className="text-right font-bold">الحالة</TableColumn>
                <TableColumn className="text-right font-bold">التاريخ</TableColumn>
                <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const cust = r.customer as any
                  const emp = r.employee as any
                  const cfg = statusConfig[r.status] || statusConfig.pending
                  return (
                    <TableRow key={r.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold">{cust?.name || '-'}</TableCell>
                      <TableCell className="text-sm font-semibold">{emp?.name || '-'}</TableCell>
                      <TableCell><Chip size="sm" variant="flat" color="secondary" className="font-semibold">{serviceLabels[r.service_offered || ''] || '-'}</Chip></TableCell>
                      <TableCell className="font-extrabold text-purple-600">{formatCurrency(r.offered_amount || 0)}</TableCell>
                      <TableCell><Chip size="sm" variant="flat" color={cfg.color} className="font-semibold">{cfg.label}</Chip></TableCell>
                      <TableCell className="text-sm text-slate-500">{r.activity_date ? formatDate(r.activity_date) : '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {r.status === 'closed_won' && (
                            invoiceCreated[r.id] ? (
                              <Tooltip content="تم إنشاء الفاتورة">
                                <Button isIconOnly size="sm" variant="flat" color="success" className="cursor-default">
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            ) : (
                              <Tooltip content="إنشاء فاتورة">
                                <Button isIconOnly size="sm" variant="flat" color="warning" onPress={() => manualCreateInvoice(r)}>
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            )
                          )}
                          <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(r)}><Edit className="h-4 w-4" /></Button></Tooltip>
                          <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <CustomModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editItem ? 'تعديل نشاط بيع' : 'إضافة نشاط بيع جديد'} footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={() => setIsOpen(false)} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'إضافة'} onClick={handleSubmit} color="from-purple-500 to-purple-600" />
        </>
      }>
        <div className="flex flex-col gap-4">
          <FormSelect label="العميل" value={String(formData.customer_id)} onChange={(v) => setFormData({...formData, customer_id: parseInt(v) || 0})} required options={[
            { value: '0', label: 'اختر العميل...' },
            ...customers.map(c => ({ value: String(c.id), label: `${c.name} ${c.phone ? `(${c.phone})` : ''}` }))
          ]} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="موظف المبيعات" value={String(formData.employee_id)} onChange={(v) => setFormData({...formData, employee_id: parseInt(v) || 0})} options={[
              { value: '0', label: 'اختر الموظف...' },
              ...employees.map(e => ({ value: String(e.id), label: e.name }))
            ]} />
            <FormSelect label="نوع النشاط" value={formData.activity_type} onChange={(v) => setFormData({...formData, activity_type: v as any})} options={[
              { value: 'call', label: 'اتصال' },
              { value: 'visit', label: 'زيارة' },
              { value: 'presentation', label: 'عرض تقديمي' },
              { value: 'offer', label: 'عرض سعر' },
            ]} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="الخدمة المعروضة" value={formData.service_offered} onChange={(v) => setFormData({...formData, service_offered: v as any})} options={[
              { value: 'maintenance', label: 'صيانة' },
              { value: 'supply', label: 'توريد' },
              { value: 'sales', label: 'بيع أجهزة' },
              { value: 'exchange', label: 'استبدال أجهزة' },
            ]} />
            <FormSelect label="الحالة" value={formData.status} onChange={(v) => setFormData({...formData, status: v as any})} options={[
              { value: 'pending', label: 'قيد الانتظار' },
              { value: 'interested', label: 'مهتم' },
              { value: 'negotiating', label: 'تفاوض' },
              { value: 'closed_won', label: 'تم البيع ✓' },
              { value: 'closed_lost', label: 'خسارة' },
            ]} />
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
