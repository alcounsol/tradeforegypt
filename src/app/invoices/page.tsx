'use client'

import { useEffect, useState } from 'react'
import { supabase, Invoice, Customer } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Tooltip, Spinner } from '@nextui-org/react'
import { FileText, Edit, Trash2, Plus, X, Printer, CreditCard, Eye } from 'lucide-react'

type InvoiceItemForm = { description: string; item_type: string; quantity: number; unit_price: number; total_price: number; inventory_item_id: number | null }

const statusConfig: Record<string, { label: string; color: any; bg: string }> = {
  unpaid: { label: 'غير مدفوعة', color: 'danger', bg: 'bg-red-50 text-red-700 border-red-200' },
  partial: { label: 'مدفوعة جزئياً', color: 'warning', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  paid: { label: 'مدفوعة', color: 'success', bg: 'bg-green-50 text-green-700 border-green-200' },
  cancelled: { label: 'ملغاة', color: 'default', bg: 'bg-gray-50 text-gray-500 border-gray-200' },
}

const typeLabels: Record<string, string> = {
  service: 'صيانة', sales: 'بيع', supply: 'توريد', exchange: 'استبدال', other: 'أخرى',
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [isOpen, setIsOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isPayOpen, setIsPayOpen] = useState(false)
  const [editItem, setEditItem] = useState<Invoice | null>(null)
  const [viewItem, setViewItem] = useState<Invoice | null>(null)
  const [viewItems, setViewItems] = useState<any[]>([])
  const [payAmount, setPayAmount] = useState(0)
  const [payMethod, setPayMethod] = useState('CASH')
  const [formData, setFormData] = useState({
    customer_id: 0, invoice_type: 'service', invoice_date: new Date().toISOString().split('T')[0],
    due_date: '', discount: 0, tax: 0, payment_method: 'CASH', notes: '',
  })
  const [items, setItems] = useState<InvoiceItemForm[]>([])

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: inv }, { data: custs }] = await Promise.all([
      supabase.from('invoices').select('*, customer:customers(id,name,phone,company_name)').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('name'),
    ])
    setInvoices(inv || [])
    setCustomers(custs || [])
    setLoading(false)
  }

  const filtered = invoices.filter(inv => {
    const cust = inv.customer as any
    const matchSearch = !search || (cust?.name?.includes(search)) || (cust?.phone?.includes(search)) || (inv.invoice_number?.includes(search))
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus
    const matchType = filterType === 'all' || inv.invoice_type === filterType
    return matchSearch && matchStatus && matchType
  })

  const totalAmount = filtered.reduce((s, i) => s + i.total_amount, 0)
  const totalPaid = filtered.reduce((s, i) => s + i.paid_amount, 0)
  const totalUnpaid = totalAmount - totalPaid

  function openAdd() {
    setEditItem(null)
    setFormData({ customer_id: 0, invoice_type: 'service', invoice_date: new Date().toISOString().split('T')[0], due_date: '', discount: 0, tax: 0, payment_method: 'CASH', notes: '' })
    setItems([{ description: '', item_type: 'service', quantity: 1, unit_price: 0, total_price: 0, inventory_item_id: null }])
    setIsOpen(true)
  }

  function addItem() { setItems([...items, { description: '', item_type: 'service', quantity: 1, unit_price: 0, total_price: 0, inventory_item_id: null }]) }
  function removeItem(idx: number) { setItems(items.filter((_, i) => i !== idx)) }
  function updateItem(idx: number, field: string, value: any) {
    const updated = [...items]
    updated[idx] = { ...updated[idx], [field]: value }
    if (field === 'quantity' || field === 'unit_price') {
      updated[idx].total_price = (updated[idx].quantity || 0) * (updated[idx].unit_price || 0)
    }
    setItems(updated)
  }

  const subtotal = items.reduce((s, i) => s + i.total_price, 0)
  const totalCalc = subtotal - (formData.discount || 0) + (formData.tax || 0)

  async function handleSubmit() {
    if (!formData.customer_id) { alert('يرجى اختيار العميل'); return }
    if (items.length === 0 || !items[0].description) { alert('يرجى إضافة بند واحد على الأقل'); return }

    const invoicePayload = {
      customer_id: formData.customer_id,
      invoice_type: formData.invoice_type,
      invoice_date: formData.invoice_date,
      due_date: formData.due_date || null,
      subtotal: subtotal,
      discount: formData.discount || 0,
      tax: formData.tax || 0,
      total_amount: totalCalc,
      paid_amount: 0,
      status: 'unpaid',
      payment_method: formData.payment_method,
      notes: formData.notes || null,
    }

    if (editItem) {
      await supabase.from('invoices').update(invoicePayload).eq('id', editItem.id)
      await supabase.from('invoice_items').delete().eq('invoice_id', editItem.id)
      await supabase.from('invoice_items').insert(items.filter(i => i.description).map(i => ({
        invoice_id: editItem.id, description: i.description, item_type: i.item_type,
        quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price,
      })))
    } else {
      const { data: newInv } = await supabase.from('invoices').insert([invoicePayload]).select().single()
      if (newInv) {
        await supabase.from('invoice_items').insert(items.filter(i => i.description).map(i => ({
          invoice_id: newInv.id, description: i.description, item_type: i.item_type,
          quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price,
        })))
        // Record transaction
        await supabase.from('transactions').insert([{
          transaction_date: formData.invoice_date,
          type: 'income',
          category: formData.invoice_type === 'service' ? 'صيانة' : formData.invoice_type === 'sales' ? 'مبيعات' : formData.invoice_type === 'supply' ? 'توريد' : 'أخرى',
          amount: totalCalc,
          description: `فاتورة ${typeLabels[formData.invoice_type] || ''} - ${customers.find(c => c.id === formData.customer_id)?.name || ''}`,
          reference_type: 'invoice',
          reference_id: newInv.id,
          invoice_id: newInv.id,
        }])
      }
    }

    setIsOpen(false)
    fetchAll()
  }

  async function viewInvoice(inv: Invoice) {
    setViewItem(inv)
    const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id)
    setViewItems(data || [])
    setIsViewOpen(true)
  }

  function openPay(inv: Invoice) {
    setViewItem(inv)
    setPayAmount(inv.total_amount - inv.paid_amount)
    setPayMethod('CASH')
    setIsPayOpen(true)
  }

  async function handlePay() {
    if (!viewItem || payAmount <= 0) return
    const newPaid = Math.min(viewItem.paid_amount + payAmount, viewItem.total_amount)
    const newStatus = newPaid >= viewItem.total_amount ? 'paid' : 'partial'

    await supabase.from('payments').insert([{
      invoice_id: viewItem.id, amount: payAmount, payment_method: payMethod, payment_date: new Date().toISOString().split('T')[0],
    }])
    await supabase.from('invoices').update({ paid_amount: newPaid, status: newStatus }).eq('id', viewItem.id)

    setIsPayOpen(false)
    fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
      await supabase.from('transactions').delete().eq('invoice_id', id)
      await supabase.from('invoice_items').delete().eq('invoice_id', id)
      await supabase.from('invoices').delete().eq('id', id)
      fetchAll()
    }
  }

  function printInvoice(inv: Invoice) {
    viewInvoice(inv).then(() => {
      setTimeout(() => window.print(), 500)
    })
  }

  return (
    <div className="w-full">
      <PageHeader title="الفواتير" subtitle="إدارة الفواتير الصادرة للعملاء" icon={FileText} iconBg="from-indigo-500 to-indigo-600" buttonLabel="إنشاء فاتورة" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم الفاتورة أو اسم العميل..." />
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">إجمالي الفواتير</p>
          <p className="text-2xl font-extrabold text-indigo-600">{filtered.length}</p>
        </CardBody></Card>
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">إجمالي المبالغ</p>
          <p className="text-2xl font-extrabold text-blue-600">{formatCurrency(totalAmount)}</p>
        </CardBody></Card>
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">المحصّل</p>
          <p className="text-2xl font-extrabold text-green-600">{formatCurrency(totalPaid)}</p>
        </CardBody></Card>
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">المستحق</p>
          <p className="text-2xl font-extrabold text-red-600">{formatCurrency(totalUnpaid)}</p>
        </CardBody></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {[{ key: 'all', label: 'الكل' }, { key: 'unpaid', label: 'غير مدفوعة' }, { key: 'partial', label: 'جزئية' }, { key: 'paid', label: 'مدفوعة' }, { key: 'cancelled', label: 'ملغاة' }].map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)}
              className={`filter-btn ${filterStatus === f.key ? 'filter-btn-active' : ''}`}>{f.label}</button>
          ))}
        </div>
        <div className="w-px bg-gray-200 mx-2 hidden md:block" />
        <div className="flex flex-wrap gap-1.5">
          {[{ key: 'all', label: 'كل الأنواع' }, { key: 'service', label: 'صيانة' }, { key: 'sales', label: 'بيع' }, { key: 'supply', label: 'توريد' }, { key: 'exchange', label: 'استبدال' }].map(f => (
            <button key={f.key} onClick={() => setFilterType(f.key)}
              className={`filter-btn ${filterType === f.key ? 'filter-btn-active' : ''}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-md">
        <CardBody className="p-0">
          {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
          : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FileText className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد فواتير</p>
            </div>
          ) : (
            <Table aria-label="جدول الفواتير" removeWrapper className="min-w-full">
              <TableHeader>
                <TableColumn className="text-right font-bold">رقم الفاتورة</TableColumn>
                <TableColumn className="text-right font-bold">العميل</TableColumn>
                <TableColumn className="text-right font-bold">النوع</TableColumn>
                <TableColumn className="text-right font-bold">المبلغ</TableColumn>
                <TableColumn className="text-right font-bold">المدفوع</TableColumn>
                <TableColumn className="text-right font-bold">الحالة</TableColumn>
                <TableColumn className="text-right font-bold">التاريخ</TableColumn>
                <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
              </TableHeader>
              <TableBody>
                {filtered.map(inv => {
                  const cust = inv.customer as any
                  const cfg = statusConfig[inv.status] || statusConfig.unpaid
                  return (
                    <TableRow key={inv.id} className="hover:bg-slate-50/50">
                      <TableCell><span className="font-mono font-bold text-indigo-600">{inv.invoice_number || `#${inv.id}`}</span></TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold">{cust?.name || '-'}</p>
                          {cust?.phone && <p className="text-[10px] text-slate-400">{cust.phone}</p>}
                        </div>
                      </TableCell>
                      <TableCell><Chip size="sm" variant="flat" color="secondary" className="font-semibold">{typeLabels[inv.invoice_type] || inv.invoice_type}</Chip></TableCell>
                      <TableCell className="font-extrabold text-blue-600">{formatCurrency(inv.total_amount)}</TableCell>
                      <TableCell className="font-extrabold text-green-600">{formatCurrency(inv.paid_amount)}</TableCell>
                      <TableCell><Chip size="sm" variant="flat" color={cfg.color} className="font-semibold">{cfg.label}</Chip></TableCell>
                      <TableCell className="text-sm text-slate-500">{inv.invoice_date || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip content="عرض"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => viewInvoice(inv)}><Eye className="h-4 w-4" /></Button></Tooltip>
                          {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                            <Tooltip content="تسجيل دفعة"><Button isIconOnly size="sm" variant="light" color="success" onPress={() => openPay(inv)}><CreditCard className="h-4 w-4" /></Button></Tooltip>
                          )}
                          <Tooltip content="طباعة"><Button isIconOnly size="sm" variant="light" color="default" onPress={() => printInvoice(inv)}><Printer className="h-4 w-4" /></Button></Tooltip>
                          <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(inv.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
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

      {/* Create/Edit Invoice Modal */}
      <CustomModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editItem ? 'تعديل فاتورة' : 'إنشاء فاتورة جديدة'} size="lg" footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={() => setIsOpen(false)} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'إنشاء الفاتورة'} onClick={handleSubmit} color="from-indigo-500 to-indigo-600" />
        </>
      }>
        <div className="flex flex-col gap-4">
          <FormSelect label="العميل" value={String(formData.customer_id)} onChange={(v) => setFormData({...formData, customer_id: parseInt(v) || 0})} required options={[
            { value: '0', label: 'اختر العميل...' },
            ...customers.map(c => ({ value: String(c.id), label: `${c.name} ${c.phone ? `(${c.phone})` : ''} ${c.company_name ? `- ${c.company_name}` : ''}` }))
          ]} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormSelect label="نوع الفاتورة" value={formData.invoice_type} onChange={(v) => setFormData({...formData, invoice_type: v})} options={[
              { value: 'service', label: 'صيانة' }, { value: 'sales', label: 'بيع' },
              { value: 'supply', label: 'توريد' }, { value: 'exchange', label: 'استبدال' }, { value: 'other', label: 'أخرى' },
            ]} />
            <FormInput label="تاريخ الفاتورة" type="date" value={formData.invoice_date} onChange={(v) => setFormData({...formData, invoice_date: v})} />
            <FormInput label="تاريخ الاستحقاق" type="date" value={formData.due_date} onChange={(v) => setFormData({...formData, due_date: v})} />
          </div>

          {/* Invoice Items */}
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-indigo-700">بنود الفاتورة</p>
              <button onClick={addItem} className="action-btn flex items-center gap-1 text-xs border-indigo-400 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"><Plus className="h-3 w-3" />إضافة بند</button>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="flex items-end gap-2 mt-2 p-2 bg-white rounded-lg border border-indigo-100">
                <div className="flex-1">
                  <FormInput label="الوصف" value={item.description} onChange={(v) => updateItem(idx, 'description', v)} placeholder="مثال: صيانة جهاز لابتوب" />
                </div>
                <div className="w-20">
                  <FormInput label="الكمية" type="number" value={item.quantity} onChange={(v) => updateItem(idx, 'quantity', parseFloat(v) || 1)} />
                </div>
                <div className="w-28">
                  <FormInput label="سعر الوحدة" type="number" value={item.unit_price} onChange={(v) => updateItem(idx, 'unit_price', parseFloat(v) || 0)} />
                </div>
                <div className="w-28">
                  <p className="text-xs text-slate-500 mb-1">الإجمالي</p>
                  <p className="font-bold text-indigo-700 py-2">{formatCurrency(item.total_price)}</p>
                </div>
                {items.length > 1 && (
                  <Button isIconOnly size="sm" variant="flat" color="danger" className="mb-1" onPress={() => removeItem(idx)}><X className="h-3 w-3" /></Button>
                )}
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-indigo-200 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-slate-500">المجموع الفرعي:</span><span className="font-bold">{formatCurrency(subtotal)}</span></div>
              <div className="flex items-center justify-between gap-4">
                <div className="w-32"><FormInput label="خصم" type="number" value={formData.discount} onChange={(v) => setFormData({...formData, discount: parseFloat(v) || 0})} /></div>
                <div className="w-32"><FormInput label="ضريبة" type="number" value={formData.tax} onChange={(v) => setFormData({...formData, tax: parseFloat(v) || 0})} /></div>
              </div>
              <div className="flex justify-between text-lg pt-2 border-t border-indigo-200"><span className="font-bold text-indigo-700">الإجمالي:</span><span className="font-extrabold text-indigo-700">{formatCurrency(totalCalc)}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="طريقة الدفع" value={formData.payment_method} onChange={(v) => setFormData({...formData, payment_method: v})} options={[
              { value: 'CASH', label: 'نقدي' }, { value: 'CARD', label: 'بطاقة' }, { value: 'TRANSFER', label: 'تحويل بنكي' },
            ]} />
          </div>
          <FormTextarea label="ملاحظات" value={formData.notes} onChange={(v) => setFormData({...formData, notes: v})} />
        </div>
      </CustomModal>

      {/* View Invoice Modal */}
      <CustomModal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`فاتورة ${viewItem?.invoice_number || ''}`} size="lg" footer={
        <ModalCancelButton label="إغلاق" onClick={() => setIsViewOpen(false)} />
      }>
        {viewItem && (
          <div className="space-y-4 print-area" id="invoice-print">
            <div className="text-center border-b pb-4">
              <h2 className="text-2xl font-extrabold text-indigo-700">TRADE FOR EGYPT</h2>
              <p className="text-sm text-slate-500">فاتورة {typeLabels[viewItem.invoice_type] || ''}</p>
              <p className="font-mono text-lg font-bold mt-2">{viewItem.invoice_number}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">العميل:</p>
                <p className="font-bold">{(viewItem.customer as any)?.name}</p>
                <p className="text-slate-400">{(viewItem.customer as any)?.phone}</p>
              </div>
              <div className="text-left">
                <p className="text-slate-500">التاريخ:</p>
                <p className="font-bold">{viewItem.invoice_date}</p>
                {viewItem.due_date && <p className="text-slate-400">الاستحقاق: {viewItem.due_date}</p>}
              </div>
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-indigo-50">
                  <th className="text-right p-2 border font-bold">البند</th>
                  <th className="text-center p-2 border font-bold">الكمية</th>
                  <th className="text-center p-2 border font-bold">سعر الوحدة</th>
                  <th className="text-center p-2 border font-bold">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {viewItems.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="p-2 border">{item.description}</td>
                    <td className="p-2 border text-center">{item.quantity}</td>
                    <td className="p-2 border text-center">{formatCurrency(item.unit_price)}</td>
                    <td className="p-2 border text-center font-bold">{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 text-sm border-t pt-3">
              <div className="flex justify-between"><span>المجموع الفرعي:</span><span className="font-bold">{formatCurrency(viewItem.subtotal)}</span></div>
              {viewItem.discount > 0 && <div className="flex justify-between text-red-600"><span>الخصم:</span><span>-{formatCurrency(viewItem.discount)}</span></div>}
              {viewItem.tax > 0 && <div className="flex justify-between"><span>الضريبة:</span><span>{formatCurrency(viewItem.tax)}</span></div>}
              <div className="flex justify-between text-lg font-extrabold border-t pt-2"><span>الإجمالي:</span><span className="text-indigo-700">{formatCurrency(viewItem.total_amount)}</span></div>
              <div className="flex justify-between text-green-600"><span>المدفوع:</span><span className="font-bold">{formatCurrency(viewItem.paid_amount)}</span></div>
              {viewItem.total_amount - viewItem.paid_amount > 0 && (
                <div className="flex justify-between text-red-600"><span>المتبقي:</span><span className="font-bold">{formatCurrency(viewItem.total_amount - viewItem.paid_amount)}</span></div>
              )}
            </div>
            <div className="text-center pt-4 border-t">
              <Chip size="lg" variant="flat" color={statusConfig[viewItem.status]?.color || 'default'} className="font-bold">
                {statusConfig[viewItem.status]?.label || viewItem.status}
              </Chip>
            </div>
          </div>
        )}
      </CustomModal>

      {/* Payment Modal */}
      <CustomModal isOpen={isPayOpen} onClose={() => setIsPayOpen(false)} title="تسجيل دفعة" footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={() => setIsPayOpen(false)} />
          <ModalSubmitButton label="تسجيل الدفعة" onClick={handlePay} color="from-green-500 to-green-600" />
        </>
      }>
        {viewItem && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-sm">
              <div className="flex justify-between"><span>إجمالي الفاتورة:</span><span className="font-bold">{formatCurrency(viewItem.total_amount)}</span></div>
              <div className="flex justify-between text-green-600"><span>المدفوع:</span><span className="font-bold">{formatCurrency(viewItem.paid_amount)}</span></div>
              <div className="flex justify-between text-red-600 font-bold"><span>المتبقي:</span><span>{formatCurrency(viewItem.total_amount - viewItem.paid_amount)}</span></div>
            </div>
            <FormInput label="مبلغ الدفعة" type="number" value={payAmount} onChange={(v) => setPayAmount(parseFloat(v) || 0)} />
            <FormSelect label="طريقة الدفع" value={payMethod} onChange={setPayMethod} options={[
              { value: 'CASH', label: 'نقدي' }, { value: 'CARD', label: 'بطاقة' }, { value: 'TRANSFER', label: 'تحويل بنكي' },
            ]} />
          </div>
        )}
      </CustomModal>
    </div>
  )
}
