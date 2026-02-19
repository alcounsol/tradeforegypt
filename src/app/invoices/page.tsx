'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, Invoice, Customer } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Button, Chip, Tooltip, Spinner } from '@nextui-org/react'
import { FileText, Edit, Trash2, Plus, X, Printer, CreditCard, Eye, Download } from 'lucide-react'
import { exportToCSV, SECTIONS } from '@/lib/export'

type InvoiceItemForm = { description: string; item_type: string; quantity: number; unit_price: number; total_price: number; inventory_item_id: number | null }

const statusConfig: Record<string, { label: string; color: string }> = {
  unpaid: { label: 'غير مدفوعة', color: 'bg-red-50 text-red-600 border-red-100' },
  partial: { label: 'مدفوعة جزئياً', color: 'bg-amber-50 text-amber-600 border-amber-100' },
  paid: { label: 'مدفوعة', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  cancelled: { label: 'ملغاة', color: 'bg-slate-50 text-slate-500 border-slate-200' },
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
  const [formData, setFormData] = useState({ customer_id: 0, invoice_type: 'service', invoice_date: new Date().toISOString().split('T')[0], due_date: '', discount: 0, tax: 0, payment_method: 'CASH', notes: '' })
  const [items, setItems] = useState<InvoiceItemForm[]>([])
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: inv }, { data: custs }] = await Promise.all([
      supabase.from('invoices').select('*, customer:customers(id,name,phone,company_name,address)').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('name'),
    ])
    setInvoices(inv || []); setCustomers(custs || []); setLoading(false)
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
    if (field === 'quantity' || field === 'unit_price') updated[idx].total_price = (updated[idx].quantity || 0) * (updated[idx].unit_price || 0)
    setItems(updated)
  }

  const subtotal = items.reduce((s, i) => s + i.total_price, 0)
  const totalCalc = subtotal - (formData.discount || 0) + (formData.tax || 0)

  async function handleSubmit() {
    if (!formData.customer_id) { alert('يرجى اختيار العميل'); return }
    if (items.length === 0 || !items[0].description) { alert('يرجى إضافة بند واحد على الأقل'); return }
    const invoicePayload = { customer_id: formData.customer_id, invoice_type: formData.invoice_type, invoice_date: formData.invoice_date, due_date: formData.due_date || null, subtotal, discount: formData.discount || 0, tax: formData.tax || 0, total_amount: totalCalc, paid_amount: 0, status: 'unpaid', payment_method: formData.payment_method, notes: formData.notes || null }
    if (editItem) {
      await supabase.from('invoices').update(invoicePayload).eq('id', editItem.id)
      await supabase.from('invoice_items').delete().eq('invoice_id', editItem.id)
      await supabase.from('invoice_items').insert(items.filter(i => i.description).map(i => ({ invoice_id: editItem.id, description: i.description, item_type: i.item_type, quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price })))
    } else {
      const { data: newInv } = await supabase.from('invoices').insert([invoicePayload]).select().single()
      if (newInv) {
        await supabase.from('invoice_items').insert(items.filter(i => i.description).map(i => ({ invoice_id: newInv.id, description: i.description, item_type: i.item_type, quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price })))
        await supabase.from('transactions').insert([{ transaction_date: formData.invoice_date, type: 'income', category: formData.invoice_type === 'service' ? 'صيانة' : formData.invoice_type === 'sales' ? 'مبيعات' : formData.invoice_type === 'supply' ? 'توريد' : 'أخرى', amount: totalCalc, description: `فاتورة ${typeLabels[formData.invoice_type] || ''} - ${customers.find(c => c.id === formData.customer_id)?.name || ''}`, reference_type: 'invoice', reference_id: newInv.id, invoice_id: newInv.id }])
      }
    }
    setIsOpen(false); fetchAll()
  }

  async function viewInvoice(inv: Invoice) {
    setViewItem(inv)
    const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id)
    setViewItems(data || []); setIsViewOpen(true)
  }

  function openPay(inv: Invoice) { setViewItem(inv); setPayAmount(inv.total_amount - inv.paid_amount); setPayMethod('CASH'); setIsPayOpen(true) }

  async function handlePay() {
    if (!viewItem || payAmount <= 0) return
    const newPaid = Math.min(viewItem.paid_amount + payAmount, viewItem.total_amount)
    const newStatus = newPaid >= viewItem.total_amount ? 'paid' : 'partial'
    await supabase.from('payments').insert([{ invoice_id: viewItem.id, amount: payAmount, payment_method: payMethod, payment_date: new Date().toISOString().split('T')[0] }])
    await supabase.from('invoices').update({ paid_amount: newPaid, status: newStatus }).eq('id', viewItem.id)
    setIsPayOpen(false); fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
      await supabase.from('transactions').delete().eq('invoice_id', id)
      await supabase.from('invoice_items').delete().eq('invoice_id', id)
      await supabase.from('payments').delete().eq('invoice_id', id)
      await supabase.from('invoices').delete().eq('id', id)
      fetchAll()
    }
  }

  async function printInvoice(inv: Invoice) {
    const { data: invItems } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id)
    const cust = inv.customer as any
    const printItems = invItems || []
    const printWindow = window.open('', '_blank', 'width=800,height=900')
    if (!printWindow) return
    const paymentMethodLabel = inv.payment_method === 'CASH' ? 'نقدي' : inv.payment_method === 'CARD' ? 'بطاقة' : 'تحويل بنكي'
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>فاتورة ${inv.invoice_number || inv.id}</title><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Tajawal',sans-serif;direction:rtl;padding:30px;background:white;color:#1e293b}.invoice-container{max-width:750px;margin:0 auto}.header{text-align:center;padding-bottom:20px;margin-bottom:25px;border-bottom:3px solid #4f46e5;position:relative}.header::after{content:'';position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);width:100px;height:3px;background:#10b981}.company-name{font-size:32px;font-weight:900;color:#4f46e5;letter-spacing:2px;margin-bottom:4px}.company-subtitle{font-size:13px;color:#64748b;font-weight:500}.invoice-badge{display:inline-block;margin-top:12px;padding:6px 20px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;border-radius:25px;font-size:14px;font-weight:700}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:25px}.info-box{padding:15px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0}.info-box h4{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;letter-spacing:1px}.info-box p{font-size:14px;color:#334155;line-height:1.8}.info-box .highlight{font-weight:800;color:#1e293b;font-size:15px}table{width:100%;border-collapse:collapse;margin-bottom:25px}thead th{background:#4f46e5;color:white;padding:12px 15px;font-size:13px;font-weight:700;text-align:right}thead th:first-child{border-radius:0 10px 0 0}thead th:last-child{border-radius:10px 0 0 0}tbody td{padding:10px 15px;border-bottom:1px solid #e2e8f0;font-size:13px}tbody tr:nth-child(even){background:#f8fafc}tbody tr:hover{background:#eef2ff}.amount{font-weight:700;color:#4f46e5}.totals-section{display:flex;justify-content:flex-start;margin-bottom:25px}.totals-box{width:350px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;padding:15px}.total-row{display:flex;justify-content:space-between;padding:8px 0;font-size:14px}.total-row .label{color:#64748b}.total-row .value{font-weight:700;color:#334155}.total-row.grand-total{border-top:2px solid #4f46e5;margin-top:5px;padding-top:12px;font-size:18px}.total-row.grand-total .label{color:#4f46e5;font-weight:800}.total-row.grand-total .value{color:#4f46e5;font-weight:900}.total-row.discount .value{color:#ef4444}.total-row.paid .value{color:#10b981}.total-row.remaining .value{color:#ef4444;font-weight:800}.status-section{text-align:center;margin:20px 0}.status-badge{display:inline-block;padding:8px 30px;border-radius:25px;font-size:16px;font-weight:800}.status-paid{background:#d1fae5;color:#059669}.status-partial{background:#fef3c7;color:#d97706}.status-unpaid{background:#fee2e2;color:#dc2626}.notes-section{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 15px;font-size:13px;color:#92400e;margin-bottom:20px}.footer{text-align:center;padding-top:20px;border-top:2px solid #e2e8f0;color:#94a3b8;font-size:12px}.footer .thanks{font-size:16px;font-weight:700;color:#4f46e5;margin-bottom:5px}@media print{body{padding:15px}}</style></head><body><div class="invoice-container"><div class="header"><div class="company-name">TRADE FOR EGYPT</div><div class="company-subtitle">نظام إدارة متكامل للصيانة والتوريد</div><div class="invoice-badge">فاتورة ${typeLabels[inv.invoice_type] || ''}</div></div><div class="info-grid"><div class="info-box"><h4>بيانات العميل</h4><p><span class="highlight">${cust?.name || '-'}</span></p><p>هاتف: ${cust?.phone || '-'}</p>${cust?.address ? `<p>العنوان: ${cust.address}</p>` : ''}</div><div class="info-box"><h4>بيانات الفاتورة</h4><p><span class="highlight">${inv.invoice_number || '#' + inv.id}</span></p><p>التاريخ: ${inv.invoice_date || '-'}</p><p>طريقة الدفع: ${paymentMethodLabel}</p></div></div><table><thead><tr><th style="text-align:center;width:40px">#</th><th>البند</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${printItems.map((item: any, idx: number) => `<tr><td style="text-align:center;font-weight:700;color:#94a3b8">${idx + 1}</td><td>${item.description}</td><td>${item.quantity}</td><td class="amount">${Number(item.unit_price).toLocaleString('ar-EG')} ج.م.</td><td class="amount">${Number(item.total_price).toLocaleString('ar-EG')} ج.م.</td></tr>`).join('')}</tbody></table><div class="totals-section"><div class="totals-box"><div class="total-row"><span class="label">المجموع الفرعي</span><span class="value">${Number(inv.subtotal).toLocaleString('ar-EG')} ج.م.</span></div>${inv.discount > 0 ? `<div class="total-row discount"><span class="label">الخصم</span><span class="value">- ${Number(inv.discount).toLocaleString('ar-EG')} ج.م.</span></div>` : ''}${inv.tax > 0 ? `<div class="total-row"><span class="label">الضريبة</span><span class="value">${Number(inv.tax).toLocaleString('ar-EG')} ج.م.</span></div>` : ''}<div class="total-row grand-total"><span class="label">الإجمالي المستحق</span><span class="value">${Number(inv.total_amount).toLocaleString('ar-EG')} ج.م.</span></div><div class="total-row paid"><span class="label">المبلغ المدفوع</span><span class="value">${Number(inv.paid_amount).toLocaleString('ar-EG')} ج.م.</span></div>${inv.total_amount - inv.paid_amount > 0 ? `<div class="total-row remaining"><span class="label">المتبقي</span><span class="value">${Number(inv.total_amount - inv.paid_amount).toLocaleString('ar-EG')} ج.م.</span></div>` : ''}</div></div><div class="status-section"><span class="status-badge ${inv.status === 'paid' ? 'status-paid' : inv.status === 'partial' ? 'status-partial' : 'status-unpaid'}">${statusConfig[inv.status]?.label || inv.status}</span></div>${inv.notes ? `<div class="notes-section"><strong>ملاحظات:</strong> ${inv.notes}</div>` : ''}<div class="footer"><p class="thanks">شكراً لتعاملكم معنا</p><p>TRADE FOR EGYPT - نظام إدارة متكامل</p><p>هذه الفاتورة صادرة إلكترونياً ولا تحتاج إلى توقيع</p></div></div><script>window.onload=function(){window.print()}</script></body></html>`)
    printWindow.document.close()
  }

  function handleExport() { exportToCSV(filtered as any, SECTIONS.invoices.headers, 'invoices') }

  return (
    <div className="w-full">
      <PageHeader title="الفواتير" subtitle="إدارة الفواتير الصادرة للعملاء" icon={FileText} iconBg="from-indigo-500 to-indigo-600" buttonLabel="إنشاء فاتورة" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم الفاتورة أو اسم العميل..." />
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">إجمالي الفواتير</p>
          <p className="text-lg sm:text-xl font-black text-indigo-600">{filtered.length}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">إجمالي المبالغ</p>
          <p className="text-lg sm:text-xl font-black text-blue-600">{formatCurrency(totalAmount)}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">المحصّل</p>
          <p className="text-lg sm:text-xl font-black text-green-600">{formatCurrency(totalPaid)}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">المستحق</p>
          <p className="text-lg sm:text-xl font-black text-red-600">{formatCurrency(totalUnpaid)}</p>
        </CardBody></Card>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {[{ key: 'all', label: 'الكل' }, { key: 'unpaid', label: 'غير مدفوعة' }, { key: 'partial', label: 'جزئية' }, { key: 'paid', label: 'مدفوعة' }, { key: 'cancelled', label: 'ملغاة' }].map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)} className={`filter-btn ${filterStatus === f.key ? 'filter-btn-active' : ''}`}>{f.label}</button>
          ))}
        </div>
        <div className="w-px bg-gray-200 mx-2 hidden md:block" />
        <div className="flex flex-wrap gap-1.5">
          {[{ key: 'all', label: 'كل الأنواع' }, { key: 'service', label: 'صيانة' }, { key: 'sales', label: 'بيع' }, { key: 'supply', label: 'توريد' }, { key: 'exchange', label: 'استبدال' }].map(f => (
            <button key={f.key} onClick={() => setFilterType(f.key)} className={`filter-btn ${filterType === f.key ? 'filter-btn-active' : ''}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex justify-center py-16"><Spinner size="lg" /></CardBody></Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          <FileText className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد فواتير</p>
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
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">رقم الفاتورة</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">العميل</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">النوع</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">المبلغ</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">المدفوع</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الحالة</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">التاريخ</th>
                  <th className="text-center p-3 font-extrabold text-slate-600 text-xs">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, idx) => {
                  const cust = inv.customer as any
                  const cfg = statusConfig[inv.status] || statusConfig.unpaid
                  return (
                    <tr key={inv.id} className="border-b border-slate-100 transition-all hover:bg-blue-50/30">
                      <td className="p-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3"><span className="font-mono font-extrabold text-indigo-600">{inv.invoice_number || `#${inv.id}`}</span></td>
                      <td className="p-3">
                        <p className="font-extrabold text-sm text-slate-800">{cust?.name || '-'}</p>
                        {cust?.phone && <p className="text-[10px] text-slate-400">{cust.phone}</p>}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 text-xs font-bold border border-purple-100">{typeLabels[inv.invoice_type] || inv.invoice_type}</span>
                      </td>
                      <td className="p-3 font-extrabold text-blue-600 text-sm">{formatCurrency(inv.total_amount)}</td>
                      <td className="p-3 font-extrabold text-green-600 text-sm">{formatCurrency(inv.paid_amount)}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="p-3 text-sm text-slate-500">{inv.invoice_date || '-'}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-0.5">
                          <Tooltip content="عرض"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => viewInvoice(inv)}><Eye className="h-4 w-4" /></Button></Tooltip>
                          {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                            <Tooltip content="تسجيل دفعة"><Button isIconOnly size="sm" variant="light" color="success" onPress={() => openPay(inv)}><CreditCard className="h-4 w-4" /></Button></Tooltip>
                          )}
                          <Tooltip content="طباعة"><Button isIconOnly size="sm" variant="flat" color="secondary" onPress={() => printInvoice(inv)}><Printer className="h-4 w-4" /></Button></Tooltip>
                          <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(inv.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-l from-indigo-50 to-indigo-100 border-t-2 border-indigo-200">
                  <td colSpan={4} className="p-3 text-sm font-extrabold text-indigo-800">الإجمالي ({filtered.length} فاتورة)</td>
                  <td className="p-3 text-sm font-black text-blue-800">{formatCurrency(totalAmount)}</td>
                  <td className="p-3 text-sm font-black text-green-800">{formatCurrency(totalPaid)}</td>
                  <td colSpan={3} className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </CardBody>
        </Card>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">{filtered.length} فاتورة</span>
              <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-emerald-50 text-emerald-600 border-emerald-200">
                <Download className="h-3 w-3" />تصدير
              </button>
            </div>
            {filtered.map((inv) => {
              const cust = inv.customer as any
              const cfg = statusConfig[inv.status] || statusConfig.unpaid
              return (
                <div key={inv.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-indigo-600 text-xs">{inv.invoice_number || `#${inv.id}`}</span>
                      </div>
                      <p className="font-extrabold text-sm text-slate-800 mt-0.5">{cust?.name || '-'}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => viewInvoice(inv)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Eye className="h-3.5 w-3.5" /></button>
                      {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                        <button onClick={() => openPay(inv)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-green-50 text-green-600"><CreditCard className="h-3.5 w-3.5" /></button>
                      )}
                      <button onClick={() => printInvoice(inv)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-purple-50 text-purple-600"><Printer className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(inv.id)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-extrabold text-blue-600">{formatCurrency(inv.total_amount)}</span>
                    <span className="text-green-600 font-bold">مدفوع: {formatCurrency(inv.paid_amount)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${cfg.color}`}>{cfg.label}</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 text-[10px] font-bold">{typeLabels[inv.invoice_type] || inv.invoice_type}</span>
                    <span className="text-slate-400">{inv.invoice_date || ''}</span>
                  </div>
                </div>
              )
            })}
            <div className="bg-indigo-50 rounded-xl p-2.5 text-center space-y-0.5">
              <span className="text-xs font-extrabold text-blue-800 block">الإجمالي: {formatCurrency(totalAmount)}</span>
              <span className="text-xs font-extrabold text-green-800 block">المدفوع: {formatCurrency(totalPaid)}</span>
            </div>
          </div>
        </>)}

      {/* Create/Edit Invoice Modal */}
      <CustomModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editItem ? 'تعديل فاتورة' : 'إنشاء فاتورة جديدة'} size="lg" footer={
        <><ModalCancelButton label="إلغاء" onClick={() => setIsOpen(false)} /><ModalSubmitButton label={editItem ? 'تحديث' : 'إنشاء الفاتورة'} onClick={handleSubmit} color="from-indigo-500 to-indigo-600" /></>
      }>
        <div className="flex flex-col gap-4">
          <FormSelect label="العميل" value={String(formData.customer_id)} onChange={(v) => setFormData({...formData, customer_id: parseInt(v) || 0})} required options={[{ value: '0', label: 'اختر العميل...' }, ...customers.map(c => ({ value: String(c.id), label: `${c.name} ${c.phone ? `(${c.phone})` : ''} ${c.company_name ? `- ${c.company_name}` : ''}` }))]} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <FormSelect label="نوع الفاتورة" value={formData.invoice_type} onChange={(v) => setFormData({...formData, invoice_type: v})} options={[{ value: 'service', label: 'صيانة' }, { value: 'sales', label: 'بيع' }, { value: 'supply', label: 'توريد' }, { value: 'exchange', label: 'استبدال' }, { value: 'other', label: 'أخرى' }]} />
            <FormInput label="تاريخ الفاتورة" type="date" value={formData.invoice_date} onChange={(v) => setFormData({...formData, invoice_date: v})} />
            <FormInput label="تاريخ الاستحقاق" type="date" value={formData.due_date} onChange={(v) => setFormData({...formData, due_date: v})} />
          </div>
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-indigo-700">بنود الفاتورة</p>
              <button onClick={addItem} className="action-btn flex items-center gap-1 text-xs border-indigo-400 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"><Plus className="h-3 w-3" />إضافة بند</button>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="flex items-end gap-2 mt-2 p-2 bg-white rounded-lg border border-indigo-100">
                <div className="flex-1"><FormInput label="الوصف" value={item.description} onChange={(v) => updateItem(idx, 'description', v)} placeholder="مثال: صيانة جهاز لابتوب" /></div>
                <div className="w-20"><FormInput label="الكمية" type="number" value={item.quantity} onChange={(v) => updateItem(idx, 'quantity', parseFloat(v) || 1)} /></div>
                <div className="w-28"><FormInput label="سعر الوحدة" type="number" value={item.unit_price} onChange={(v) => updateItem(idx, 'unit_price', parseFloat(v) || 0)} /></div>
                <div className="w-28"><p className="text-xs text-slate-500 mb-1">الإجمالي</p><p className="font-bold text-indigo-700 py-2">{formatCurrency(item.total_price)}</p></div>
                {items.length > 1 && (<Button isIconOnly size="sm" variant="flat" color="danger" className="mb-1" onPress={() => removeItem(idx)}><X className="h-3 w-3" /></Button>)}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormSelect label="طريقة الدفع" value={formData.payment_method} onChange={(v) => setFormData({...formData, payment_method: v})} options={[{ value: 'CASH', label: 'نقدي' }, { value: 'CARD', label: 'بطاقة' }, { value: 'TRANSFER', label: 'تحويل بنكي' }]} />
          </div>
          <FormTextarea label="ملاحظات" value={formData.notes} onChange={(v) => setFormData({...formData, notes: v})} />
        </div>
      </CustomModal>

      {/* View Invoice Modal */}
      <CustomModal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`فاتورة ${viewItem?.invoice_number || ''}`} size="lg" footer={
        <div className="flex gap-2">
          {viewItem && <Button color="secondary" variant="flat" startContent={<Printer className="h-4 w-4" />} onPress={() => { setIsViewOpen(false); printInvoice(viewItem) }}>طباعة</Button>}
          <ModalCancelButton label="إغلاق" onClick={() => setIsViewOpen(false)} />
        </div>
      }>
        {viewItem && (
          <div className="space-y-4" ref={printRef}>
            <div className="text-center border-b-2 border-indigo-500 pb-4">
              <h2 className="text-2xl font-extrabold text-indigo-700">TRADE FOR EGYPT</h2>
              <p className="text-sm text-slate-500">فاتورة {typeLabels[viewItem.invoice_type] || ''}</p>
              <p className="font-mono text-lg font-bold mt-2 text-indigo-600">{viewItem.invoice_number}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 mb-1">بيانات العميل</p>
                <p className="font-bold text-slate-800">{(viewItem.customer as any)?.name}</p>
                <p className="text-slate-500">{(viewItem.customer as any)?.phone}</p>
                {(viewItem.customer as any)?.address && <p className="text-slate-400 text-xs">{(viewItem.customer as any)?.address}</p>}
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 mb-1">بيانات الفاتورة</p>
                <p className="font-bold text-slate-800">التاريخ: {viewItem.invoice_date}</p>
                {viewItem.due_date && <p className="text-slate-500">الاستحقاق: {viewItem.due_date}</p>}
                <p className="text-slate-400 text-xs">طريقة الدفع: {viewItem.payment_method === 'CASH' ? 'نقدي' : viewItem.payment_method === 'CARD' ? 'بطاقة' : 'تحويل'}</p>
              </div>
            </div>
            <table className="w-full text-sm border-collapse rounded-xl overflow-hidden">
              <thead><tr className="bg-indigo-500 text-white">
                <th className="text-right p-2.5 font-bold">البند</th><th className="text-center p-2.5 font-bold">الكمية</th><th className="text-center p-2.5 font-bold">سعر الوحدة</th><th className="text-center p-2.5 font-bold">الإجمالي</th>
              </tr></thead>
              <tbody>
                {viewItems.map((item: any, idx: number) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-2.5 border-b border-slate-100">{item.description}</td>
                    <td className="p-2.5 border-b border-slate-100 text-center">{item.quantity}</td>
                    <td className="p-2.5 border-b border-slate-100 text-center">{formatCurrency(item.unit_price)}</td>
                    <td className="p-2.5 border-b border-slate-100 text-center font-bold text-indigo-600">{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 text-sm border-t-2 border-indigo-100 pt-3">
              <div className="flex justify-between"><span className="text-slate-500">المجموع الفرعي:</span><span className="font-bold">{formatCurrency(viewItem.subtotal)}</span></div>
              {viewItem.discount > 0 && <div className="flex justify-between text-red-600"><span>الخصم:</span><span>-{formatCurrency(viewItem.discount)}</span></div>}
              {viewItem.tax > 0 && <div className="flex justify-between"><span>الضريبة:</span><span>{formatCurrency(viewItem.tax)}</span></div>}
              <div className="flex justify-between text-lg font-extrabold border-t-2 border-indigo-200 pt-2"><span>الإجمالي:</span><span className="text-indigo-700">{formatCurrency(viewItem.total_amount)}</span></div>
              <div className="flex justify-between text-green-600"><span>المدفوع:</span><span className="font-bold">{formatCurrency(viewItem.paid_amount)}</span></div>
              {viewItem.total_amount - viewItem.paid_amount > 0 && (
                <div className="flex justify-between text-red-600"><span>المتبقي:</span><span className="font-bold">{formatCurrency(viewItem.total_amount - viewItem.paid_amount)}</span></div>
              )}
            </div>
            <div className="text-center pt-4 border-t">
              <span className={`inline-flex px-4 py-1.5 rounded-full text-sm font-extrabold border ${statusConfig[viewItem.status]?.color || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {statusConfig[viewItem.status]?.label || viewItem.status}
              </span>
            </div>
            {viewItem.notes && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm">
                <strong className="text-amber-700">ملاحظات:</strong> <span className="text-slate-600">{viewItem.notes}</span>
              </div>
            )}
          </div>
        )}
      </CustomModal>

      {/* Payment Modal */}
      <CustomModal isOpen={isPayOpen} onClose={() => setIsPayOpen(false)} title="تسجيل دفعة" footer={
        <><ModalCancelButton label="إلغاء" onClick={() => setIsPayOpen(false)} /><ModalSubmitButton label="تسجيل الدفعة" onClick={handlePay} color="from-green-500 to-green-600" /></>
      }>
        {viewItem && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">إجمالي الفاتورة:</span><span className="font-bold text-blue-700">{formatCurrency(viewItem.total_amount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">المدفوع:</span><span className="font-bold text-green-600">{formatCurrency(viewItem.paid_amount)}</span></div>
              <div className="flex justify-between border-t border-blue-200 pt-2"><span className="font-bold text-red-600">المتبقي:</span><span className="font-extrabold text-red-600">{formatCurrency(viewItem.total_amount - viewItem.paid_amount)}</span></div>
            </div>
            <FormInput label="مبلغ الدفعة" type="number" value={payAmount} onChange={(v) => setPayAmount(parseFloat(v) || 0)} />
            <FormSelect label="طريقة الدفع" value={payMethod} onChange={setPayMethod} options={[{ value: 'CASH', label: 'نقدي' }, { value: 'CARD', label: 'بطاقة' }, { value: 'TRANSFER', label: 'تحويل بنكي' }]} />
          </div>
        )}
      </CustomModal>
    </div>
  )
}
