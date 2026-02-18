'use client'

import { useEffect, useState } from 'react'
import { supabase, ServiceRecord, InventoryItem } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Tooltip, Spinner } from '@nextui-org/react'
import { Wrench, Edit, Trash2, Plus, X } from 'lucide-react'

type PartEntry = { inventory_item_id: number; quantity: number; item_name?: string; unit_cost?: number }

export default function Services() {
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [deviceReceipts, setDeviceReceipts] = useState<any[]>([])
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

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: svc }, { data: inv }, { data: dev }] = await Promise.all([
      supabase.from('service_records').select('*').order('service_date', { ascending: false }),
      supabase.from('inventory_items').select('*').gt('current_stock', 0).order('name'),
      supabase.from('device_receipts').select('*, customer:customers(id,name,phone)').in('status', ['received', 'in_diagnosis', 'in_repair']).order('receipt_date', { ascending: false }),
    ])
    setServices(svc || [])
    setInventoryItems(inv || [])
    setDeviceReceipts(dev || [])
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

    // Add parts (deducts from inventory via trigger)
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

  const totalRevenue = services.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="w-full">
      <PageHeader title="الخدمات والصيانة" subtitle="إدارة عمليات الصيانة والفحص" icon={Wrench} iconBg="from-amber-500 to-amber-600" buttonLabel="إضافة خدمة" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث في الخدمات..." />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">إجمالي الخدمات</p>
          <p className="text-2xl font-extrabold text-amber-600">{services.length}</p>
        </CardBody></Card>
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">إجمالي الإيرادات</p>
          <p className="text-2xl font-extrabold text-green-600">{formatCurrency(totalRevenue)}</p>
        </CardBody></Card>
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">صيانة</p>
          <p className="text-2xl font-extrabold text-blue-600">{services.filter(r => r.service_type === 'REPAIR').length}</p>
        </CardBody></Card>
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">فحص</p>
          <p className="text-2xl font-extrabold text-purple-600">{services.filter(r => r.service_type === 'INSPECTION').length}</p>
        </CardBody></Card>
      </div>

      <Card className="shadow-md">
        <CardBody className="p-0">
          {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
          : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Wrench className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد خدمات</p>
            </div>
          ) : (
            <Table aria-label="جدول الخدمات" removeWrapper className="min-w-full">
              <TableHeader>
                <TableColumn className="text-right font-bold">العميل</TableColumn>
                <TableColumn className="text-right font-bold">الجهاز</TableColumn>
                <TableColumn className="text-right font-bold">النوع</TableColumn>
                <TableColumn className="text-right font-bold">المبلغ</TableColumn>
                <TableColumn className="text-right font-bold">الدفع</TableColumn>
                <TableColumn className="text-right font-bold">التاريخ</TableColumn>
                <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div>
                        <p className="font-bold">{s.customer_name || '-'}</p>
                        {s.customer_phone && <p className="text-[10px] text-slate-400">{s.customer_phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{s.device_brand ? `${s.device_brand} ${s.device_model || ''}` : '-'}</TableCell>
                    <TableCell><Chip size="sm" variant="flat" color={s.service_type === 'INSPECTION' ? 'primary' : 'secondary'} className="font-semibold">{s.service_type === 'INSPECTION' ? 'كشف' : 'صيانة'}</Chip></TableCell>
                    <TableCell className="font-extrabold text-amber-600">{formatCurrency(s.amount)}</TableCell>
                    <TableCell><Chip size="sm" variant="flat" className="font-semibold">{s.payment_method === 'CASH' ? 'نقدي' : s.payment_method === 'CARD' ? 'بطاقة' : 'تحويل'}</Chip></TableCell>
                    <TableCell className="text-sm text-slate-500">{s.service_date || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(s)}><Edit className="h-4 w-4" /></Button></Tooltip>
                        <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(s.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="نوع الخدمة" value={formData.service_type} onChange={(v) => setFormData({...formData, service_type: v as 'INSPECTION' | 'REPAIR'})} options={[{ value: 'INSPECTION', label: 'كشف' }, { value: 'REPAIR', label: 'صيانة' }]} />
            <FormSelect label="طريقة الدفع" value={formData.payment_method} onChange={(v) => setFormData({...formData, payment_method: v})} options={[{ value: 'CASH', label: 'نقدي' }, { value: 'CARD', label: 'بطاقة' }, { value: 'TRANSFER', label: 'تحويل' }]} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="اسم العميل" value={formData.customer_name} onChange={(v) => setFormData({...formData, customer_name: v})} />
            <FormInput label="هاتف العميل" value={formData.customer_phone} onChange={(v) => setFormData({...formData, customer_phone: v})} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput label="ماركة الجهاز" value={formData.device_brand} onChange={(v) => setFormData({...formData, device_brand: v})} />
            <FormInput label="نوع الجهاز" value={formData.device_type} onChange={(v) => setFormData({...formData, device_type: v})} />
            <FormInput label="موديل الجهاز" value={formData.device_model} onChange={(v) => setFormData({...formData, device_model: v})} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="المبلغ" type="number" value={formData.amount} onChange={(v) => setFormData({...formData, amount: parseFloat(v) || 0})} />
            <FormInput label="التاريخ" type="date" value={formData.service_date} onChange={(v) => setFormData({...formData, service_date: v})} />
          </div>
          <FormTextarea label="ملاحظات" value={formData.notes} onChange={(v) => setFormData({...formData, notes: v})} />

          {/* Parts from inventory */}
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
