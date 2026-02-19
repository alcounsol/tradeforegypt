'use client'

import { useEffect, useState } from 'react'
import { supabase, ServiceRecord, InventoryItem, Customer } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Button, Tooltip, Spinner } from '@nextui-org/react'
import { Wrench, Edit, Trash2, Plus, X, FileText, CheckCircle, Download } from 'lucide-react'
import { exportToCSV, SECTIONS } from '@/lib/export'

type PartEntry = { inventory_item_id: number; quantity: number; item_name?: string; unit_cost?: number }

export default function Services() {
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [deviceReceipts, setDeviceReceipts] = useState<any[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editItem, setEditItem] = useState<ServiceRecord | null>(null)
  const [formData, setFormData] = useState({
    customer_name: '', customer_phone: '', device_type: '', device_brand: '', device_model: '',
    service_type: 'INSPECTION' as 'INSPECTION' | 'REPAIR', amount: 0, payment_method: 'CASH',
    notes: '', service_date: new Date().toISOString().split('T')[0]
  })
  const [parts, setParts] = useState<PartEntry[]>([])
  const [invoiceCreated, setInvoiceCreated] = useState<Record<number, boolean>>({})

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: svc }, { data: inv }, { data: dev }, { data: custs }, { data: existingInvoices }] = await Promise.all([
      supabase.from('service_records').select('*').order('service_date', { ascending: false }),
      supabase.from('inventory_items').select('*').gt('current_stock', 0).order('name'),
      supabase.from('device_receipts').select('*, customer:customers(id,name,phone)').in('status', ['received', 'in_diagnosis', 'in_repair']).order('receipt_date', { ascending: false }),
      supabase.from('customers').select('*').order('name'),
      supabase.from('invoices').select('id, service_record_id').not('service_record_id', 'is', null),
    ])
    setServices(svc || [])
    setInventoryItems(inv || [])
    setDeviceReceipts(dev || [])
    setCustomers(custs || [])
    const invoiceMap: Record<number, boolean> = {}
    ;(existingInvoices || []).forEach((i: any) => { if (i.service_record_id) invoiceMap[i.service_record_id] = true })
    setInvoiceCreated(invoiceMap)
    setLoading(false)
  }

  const filtered = services.filter(r =>
    (r.customer_name && r.customer_name.includes(search)) ||
    (r.device_brand && r.device_brand.includes(search)) ||
    (r.device_type && r.device_type.includes(search))
  )

  function openAdd() {
    setEditItem(null)
    setFormData({ customer_name: '', customer_phone: '', device_type: '', device_brand: '', device_model: '', service_type: 'INSPECTION', amount: 0, payment_method: 'CASH', notes: '', service_date: new Date().toISOString().split('T')[0] })
    setParts([])
    setIsOpen(true)
  }

  function openEdit(item: ServiceRecord) {
    setEditItem(item)
    setFormData({
      customer_name: item.customer_name || '', customer_phone: item.customer_phone || '',
      device_type: item.device_type || '', device_brand: item.device_brand || '', device_model: item.device_model || '',
      service_type: item.service_type, amount: item.amount, payment_method: item.payment_method || 'CASH',
      notes: item.notes || '', service_date: item.service_date || ''
    })
    setParts([])
    setIsOpen(true)
  }

  function fillFromDevice(deviceId: string) {
    const dev = deviceReceipts.find((d: any) => d.id === parseInt(deviceId))
    if (dev) {
      const cust = dev.customer as any
      setFormData({
        ...formData,
        customer_name: cust?.name || '',
        customer_phone: cust?.phone || '',
        device_brand: dev.device_brand || '',
        device_type: dev.device_type || '',
        device_model: dev.device_model || '',
      })
    }
  }

  function addPart() { setParts([...parts, { inventory_item_id: 0, quantity: 1 }]) }
  function removePart(idx: number) { setParts(parts.filter((_, i) => i !== idx)) }
  function updatePart(idx: number, field: string, value: any) {
    const updated = [...parts]
    updated[idx] = { ...updated[idx], [field]: value }
    if (field === 'inventory_item_id') {
      const item = inventoryItems.find(i => i.id === parseInt(value))
      if (item) {
        updated[idx].item_name = item.name
        updated[idx].unit_cost = item.cost_price || 0
      }
    }
    setParts(updated)
  }

  async function handleSubmit() {
    let serviceId: number | null = null
    if (editItem) {
      await supabase.from('service_records').update(formData).eq('id', editItem.id)
      serviceId = editItem.id
    } else {
      const { data } = await supabase.from('service_records').insert([formData]).select().single()
      serviceId = data?.id || null
    }
    if (serviceId && !editItem && formData.amount > 0) {
      await supabase.from('transactions').insert([{
        transaction_date: formData.service_date || new Date().toISOString().split('T')[0],
        type: 'income',
        category: formData.service_type === 'INSPECTION' ? 'كشف' : 'صيانة',
        amount: formData.amount,
        description: `${formData.service_type === 'INSPECTION' ? 'كشف' : 'صيانة'} - ${formData.customer_name} - ${formData.device_brand || ''} ${formData.device_model || ''}`,
        reference_type: 'service',
        reference_id: serviceId,
      }])
    }
    if (serviceId && parts.length > 0) {
      const validParts = parts.filter(p => p.inventory_item_id > 0 && p.quantity > 0)
      if (validParts.length > 0) {
        await supabase.from('service_parts').insert(
          validParts.map(p => ({
            service_record_id: serviceId,
            inventory_item_id: p.inventory_item_id,
            quantity: p.quantity,
            unit_cost: p.unit_cost || 0,
            total_cost: (p.unit_cost || 0) * p.quantity,
          }))
        )
      }
    }
    setIsOpen(false)
    fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      await supabase.from('service_records').delete().eq('id', id)
      fetchAll()
    }
  }

  async function createInvoiceFromService(service: ServiceRecord) {
    let customerId: number | null = null
    if (service.customer_phone) {
      const cust = customers.find(c => c.phone === service.customer_phone)
      if (cust) customerId = cust.id
    }
    if (!customerId && service.customer_name) {
      const cust = customers.find(c => c.name === service.customer_name)
      if (cust) customerId = cust.id
    }
    if (!customerId) {
      const { data: newCust } = await supabase.from('customers').insert([{
        name: service.customer_name || 'عميل',
        phone: service.customer_phone || null,
        customer_type: 'individual',
        request_type: 'maintenance',
        status: 'completed',
      }]).select().single()
      customerId = newCust?.id || null
    }
    if (!customerId) { alert('خطأ في إنشاء/إيجاد العميل'); return }
    const { data: serviceParts } = await supabase.from('service_parts')
      .select('*, inventory_item:inventory_items(name)')
      .eq('service_record_id', service.id)
    const invoiceItems: any[] = []
    invoiceItems.push({
      description: `${service.service_type === 'INSPECTION' ? 'كشف' : 'صيانة'} - ${service.device_brand || ''} ${service.device_model || ''} ${service.device_type || ''}`.trim(),
      item_type: 'service', quantity: 1, unit_price: service.amount, total_price: service.amount,
    })
    let partsTotal = 0
    if (serviceParts && serviceParts.length > 0) {
      serviceParts.forEach((p: any) => {
        const partName = p.inventory_item?.name || 'قطعة غيار'
        invoiceItems.push({
          description: `قطعة غيار: ${partName}`, item_type: 'part',
          quantity: p.quantity, unit_price: p.unit_cost || 0, total_price: p.total_cost || 0,
          inventory_item_id: p.inventory_item_id,
        })
        partsTotal += (p.total_cost || 0)
      })
    }
    const subtotal = service.amount + partsTotal
    const totalAmount = subtotal
    const { data: newInvoice } = await supabase.from('invoices').insert([{
      customer_id: customerId, invoice_type: 'service',
      invoice_date: service.service_date || new Date().toISOString().split('T')[0],
      subtotal, discount: 0, tax: 0, total_amount: totalAmount, paid_amount: 0, status: 'unpaid',
      payment_method: service.payment_method || 'CASH', service_record_id: service.id,
      notes: `فاتورة تلقائية من خدمة ${service.service_type === 'INSPECTION' ? 'كشف' : 'صيانة'} - ${service.customer_name || ''}`,
    }]).select().single()
    if (newInvoice) {
      await supabase.from('invoice_items').insert(invoiceItems.map(item => ({ ...item, invoice_id: newInvoice.id })))
      await supabase.from('transactions').insert([{
        transaction_date: service.service_date || new Date().toISOString().split('T')[0],
        type: 'income', category: 'فاتورة صيانة', amount: totalAmount,
        description: `فاتورة ${newInvoice.invoice_number || '#' + newInvoice.id} - ${service.customer_name || ''} - ${service.device_brand || ''} ${service.device_model || ''}`,
        reference_type: 'invoice', reference_id: newInvoice.id, invoice_id: newInvoice.id,
      }])
      alert(`تم إنشاء الفاتورة بنجاح!\nرقم الفاتورة: ${newInvoice.invoice_number || '#' + newInvoice.id}\nالمبلغ: ${totalAmount} ج.م.`)
      fetchAll()
    }
  }

  function handleExport() {
    exportToCSV(filtered as any, SECTIONS.service_records.headers, 'services')
  }

  const totalRevenue = services.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="w-full">
      <PageHeader title="الخدمات والصيانة" subtitle="إدارة عمليات الصيانة والفحص" icon={Wrench} iconBg="from-amber-500 to-amber-600" buttonLabel="إضافة خدمة" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث في الخدمات..." />
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">إجمالي الخدمات</p>
          <p className="text-lg sm:text-xl font-black text-amber-600">{services.length}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">إجمالي الإيرادات</p>
          <p className="text-lg sm:text-xl font-black text-green-600">{formatCurrency(totalRevenue)}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">صيانة</p>
          <p className="text-lg sm:text-xl font-black text-blue-600">{services.filter(r => r.service_type === 'REPAIR').length}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">فحص</p>
          <p className="text-lg sm:text-xl font-black text-purple-600">{services.filter(r => r.service_type === 'INSPECTION').length}</p>
        </CardBody></Card>
      </div>

      {loading ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex items-center justify-center h-48"><Spinner size="lg" /></CardBody></Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Wrench className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد خدمات</p>
        </CardBody></Card>
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="shadow-md border border-slate-100 hidden sm:block">
            <div className="flex items-center justify-end px-4 pt-3 pb-1">
              <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 transition-all">
                <Download className="h-3.5 w-3.5" />تصدير CSV
              </button>
            </div>
            <CardBody className="p-0 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>العميل</th>
                    <th>الجهاز</th>
                    <th>النوع</th>
                    <th>المبلغ</th>
                    <th>الدفع</th>
                    <th>التاريخ</th>
                    <th className="col-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, idx) => (
                    <tr key={s.id}>
                      <td className="text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td>
                        <div>
                          <p className="font-extrabold text-sm text-slate-800">{s.customer_name || '-'}</p>
                          {s.customer_phone && <p className="text-[10px] text-slate-400">{s.customer_phone}</p>}
                        </div>
                      </td>
                      <td className="text-sm text-slate-600">{s.device_brand ? `${s.device_brand} ${s.device_model || ''}` : '-'}</td>
                      <td>
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border ${s.service_type === 'INSPECTION' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                          {s.service_type === 'INSPECTION' ? 'كشف' : 'صيانة'}
                        </span>
                      </td>
                      <td className="font-extrabold text-amber-600">{formatCurrency(s.amount)}</td>
                      <td>
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 text-xs font-bold border border-slate-100">
                          {s.payment_method === 'CASH' ? 'نقدي' : s.payment_method === 'CARD' ? 'بطاقة' : 'تحويل'}
                        </span>
                      </td>
                      <td className="text-sm text-slate-500">{s.service_date || '-'}</td>
                      <td className="col-center">
                        <div className="flex items-center justify-center gap-0.5">
                          {invoiceCreated[s.id] ? (
                            <Tooltip content="تم إنشاء الفاتورة"><Button isIconOnly size="sm" variant="flat" color="success" className="cursor-default"><CheckCircle className="h-4 w-4" /></Button></Tooltip>
                          ) : (
                            <Tooltip content="إنشاء فاتورة"><Button isIconOnly size="sm" variant="flat" color="warning" onPress={() => createInvoiceFromService(s)}><FileText className="h-4 w-4" /></Button></Tooltip>
                          )}
                          <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(s)}><Edit className="h-4 w-4" /></Button></Tooltip>
                          <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(s.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gradient-to-l from-amber-50 to-amber-100 border-t-2 border-amber-200">
                    <td colSpan={4} className="text-sm font-extrabold text-amber-800">الإجمالي ({filtered.length} خدمة)</td>
                    <td className="text-sm font-black text-amber-800">{formatCurrency(filtered.reduce((s, r) => s + r.amount, 0))}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </CardBody>
          </Card>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">{filtered.length} خدمة</span>
              <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-emerald-50 text-emerald-600 border-emerald-200">
                <Download className="h-3 w-3" />تصدير
              </button>
            </div>
            {filtered.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-sm text-slate-800">{s.customer_name || '-'}</p>
                    {s.customer_phone && <p className="text-[10px] text-slate-400">{s.customer_phone}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {invoiceCreated[s.id] ? (
                      <span className="h-7 w-7 flex items-center justify-center rounded-lg bg-green-50 text-green-600"><CheckCircle className="h-3.5 w-3.5" /></span>
                    ) : (
                      <button onClick={() => createInvoiceFromService(s)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600"><FileText className="h-3.5 w-3.5" /></button>
                    )}
                    <button onClick={() => openEdit(s)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Edit className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(s.id)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-extrabold text-amber-600">{formatCurrency(s.amount)}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.service_type === 'INSPECTION' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                    {s.service_type === 'INSPECTION' ? 'كشف' : 'صيانة'}
                  </span>
                  {s.device_brand && <span className="text-slate-500">{s.device_brand} {s.device_model || ''}</span>}
                  <span className="text-slate-400">{s.service_date || ''}</span>
                </div>
              </div>
            ))}
            <div className="bg-amber-50 rounded-xl p-2.5 text-center">
              <span className="text-xs font-extrabold text-amber-800">الإجمالي: {formatCurrency(filtered.reduce((s, r) => s + r.amount, 0))}</span>
            </div>
          </div>
        </>
      )}

      <CustomModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editItem ? 'تعديل خدمة' : 'إضافة خدمة جديدة'} footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={() => setIsOpen(false)} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'إضافة'} onClick={handleSubmit} color="from-amber-500 to-amber-600" />
        </>
      }>
        <div className="flex flex-col gap-4">
          {deviceReceipts.length > 0 && !editItem && (
            <div className="p-3 bg-lime-50 rounded-xl border border-lime-100">
              <p className="text-xs font-bold text-lime-700 mb-2">تعبئة من جهاز مستلم</p>
              <FormSelect label="" value="" onChange={fillFromDevice} options={[
                { value: '', label: 'اختر جهاز مستلم...' },
                ...deviceReceipts.map((d: any) => ({
                  value: String(d.id),
                  label: `${(d.customer as any)?.name || 'عميل'} - ${d.device_brand} ${d.device_name}`
                }))
              ]} />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormSelect label="نوع الخدمة" value={formData.service_type} onChange={(v) => setFormData({...formData, service_type: v as 'INSPECTION' | 'REPAIR'})} options={[{ value: 'INSPECTION', label: 'كشف' }, { value: 'REPAIR', label: 'صيانة' }]} />
            <FormSelect label="طريقة الدفع" value={formData.payment_method} onChange={(v) => setFormData({...formData, payment_method: v})} options={[{ value: 'CASH', label: 'نقدي' }, { value: 'CARD', label: 'بطاقة' }, { value: 'TRANSFER', label: 'تحويل' }]} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormInput label="اسم العميل" value={formData.customer_name} onChange={(v) => setFormData({...formData, customer_name: v})} />
            <FormInput label="هاتف العميل" value={formData.customer_phone} onChange={(v) => setFormData({...formData, customer_phone: v})} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <FormInput label="ماركة الجهاز" value={formData.device_brand} onChange={(v) => setFormData({...formData, device_brand: v})} />
            <FormInput label="نوع الجهاز" value={formData.device_type} onChange={(v) => setFormData({...formData, device_type: v})} />
            <FormInput label="موديل الجهاز" value={formData.device_model} onChange={(v) => setFormData({...formData, device_model: v})} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormInput label="المبلغ" type="number" value={formData.amount} onChange={(v) => setFormData({...formData, amount: parseFloat(v) || 0})} />
            <FormInput label="التاريخ" type="date" value={formData.service_date} onChange={(v) => setFormData({...formData, service_date: v})} />
          </div>
          <FormTextarea label="ملاحظات" value={formData.notes} onChange={(v) => setFormData({...formData, notes: v})} />
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-emerald-700">قطع الغيار من المخزون (يتم خصمها تلقائياً)</p>
              <button onClick={addPart} className="action-btn flex items-center gap-1 text-xs border-green-400 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-500"><Plus className="h-3 w-3" />إضافة قطعة</button>
            </div>
            {parts.map((part, idx) => (
              <div key={idx} className="flex items-end gap-2 mt-2">
                <div className="flex-1">
                  <FormSelect label="القطعة" value={String(part.inventory_item_id)} onChange={(v) => updatePart(idx, 'inventory_item_id', parseInt(v))} options={[
                    { value: '0', label: 'اختر...' },
                    ...inventoryItems.map(i => ({ value: String(i.id), label: `${i.name} (${i.current_stock} ${i.unit})` }))
                  ]} />
                </div>
                <div className="w-20">
                  <FormInput label="الكمية" type="number" value={part.quantity} onChange={(v) => updatePart(idx, 'quantity', parseInt(v) || 1)} />
                </div>
                <Button isIconOnly size="sm" variant="flat" color="danger" className="mb-1" onPress={() => removePart(idx)}><X className="h-3 w-3" /></Button>
              </div>
            ))}
            {parts.length > 0 && (
              <p className="text-[10px] text-emerald-600 mt-2 font-semibold">
                تكلفة القطع: {formatCurrency(parts.reduce((s, p) => s + (p.unit_cost || 0) * p.quantity, 0))}
              </p>
            )}
          </div>
        </div>
      </CustomModal>
    </div>
  )
}
