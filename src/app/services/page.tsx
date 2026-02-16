'use client'

import { useEffect, useState } from 'react'
import { supabase, ServiceRecord, Customer } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button,  Chip, Tooltip, Spinner } from '@nextui-org/react'
import { Wrench, Search, Edit, Trash2 } from 'lucide-react'

export default function Services() {
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const onOpen = () => setIsOpen(true)
  const onClose = () => setIsOpen(false)
  const [editItem, setEditItem] = useState<ServiceRecord | null>(null)
  const [formData, setFormData] = useState({
    customer_name: '', customer_phone: '', device_type: '', device_brand: '', device_model: '',
    service_type: 'INSPECTION' as 'INSPECTION' | 'REPAIR', amount: 0, payment_method: 'CASH',
    notes: '', service_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from('service_records').select('*').order('service_date', { ascending: false }),
      supabase.from('customers').select('*'),
    ])
    setServices(s || []); setCustomers(c || [])
    setLoading(false)
  }

  function openAdd() {
    setEditItem(null)
    setFormData({
      customer_name: '', customer_phone: '', device_type: '', device_brand: '', device_model: '',
      service_type: 'INSPECTION', amount: 0, payment_method: 'CASH',
      notes: '', service_date: new Date().toISOString().split('T')[0]
    })
    onOpen()
  }

  function openEdit(item: ServiceRecord) {
    setEditItem(item)
    setFormData({
      customer_name: item.customer_name || '', customer_phone: item.customer_phone || '',
      device_type: item.device_type || '', device_brand: item.device_brand || '', device_model: item.device_model || '',
      service_type: item.service_type, amount: item.amount, payment_method: item.payment_method || 'CASH',
      notes: item.notes || '', service_date: item.service_date || ''
    })
    onOpen()
  }

  async function handleSubmit() {
    if (editItem) { await supabase.from('service_records').update(formData).eq('id', editItem.id) }
    else { await supabase.from('service_records').insert([formData]) }
    onClose(); fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) { await supabase.from('service_records').delete().eq('id', id); fetchAll() }
  }

  return (
    <div className="w-full">
        <PageHeader title="الخدمات" subtitle="إدارة سجلات الصيانة والكشف" icon={Wrench} iconBg="from-amber-500 to-amber-600" buttonLabel="إضافة خدمة" onButtonClick={openAdd}>
          <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="بحث..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-56 pr-9 pl-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
        </PageHeader>

        <Card className="shadow-md">
          <CardBody className="p-0">
            {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
            : services.length === 0 ? (
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
                  <TableColumn className="text-right font-bold">التاريخ</TableColumn>
                  <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
                </TableHeader>
                <TableBody>
                  {services.map((s) => (
                    <TableRow key={s.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold">{s.customer_name || '-'}</TableCell>
                      <TableCell className="text-sm">{s.device_type} {s.device_brand} {s.device_model}</TableCell>
                      <TableCell><Chip size="sm" variant="flat" color={s.service_type === 'INSPECTION' ? 'primary' : 'secondary'} className="font-semibold">{s.service_type === 'INSPECTION' ? 'كشف' : 'صيانة'}</Chip></TableCell>
                      <TableCell className="font-extrabold text-amber-600">{formatCurrency(s.amount)}</TableCell>
                      <TableCell className="text-sm text-slate-500">{s.service_date}</TableCell>
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

        <CustomModal isOpen={isOpen} onClose={onClose} title={editItem ? 'تعديل خدمة' : 'إضافة خدمة جديدة'} footer={
            <>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">إلغاء</button>
              <button onClick={handleSubmit} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors">{editItem ? 'تحديث' : 'إضافة'}</button>
            </>
          }>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput label="اسم العميل" value={formData.customer_name} onChange={(v) => setFormData({...formData, customer_name: v})} />
                <FormInput label="هاتف العميل" value={formData.customer_phone} onChange={(v) => setFormData({...formData, customer_phone: v})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormInput label="نوع الجهاز" value={formData.device_type} onChange={(v) => setFormData({...formData, device_type: v})} />
                <FormInput label="ماركة الجهاز" value={formData.device_brand} onChange={(v) => setFormData({...formData, device_brand: v})} />
                <FormInput label="موديل الجهاز" value={formData.device_model} onChange={(v) => setFormData({...formData, device_model: v})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormSelect label="نوع الخدمة" value={formData.service_type} onChange={(v) => setFormData({...formData, service_type: v as 'INSPECTION' | 'REPAIR'})} options={[{ value: 'INSPECTION', label: 'كشف' }, { value: 'REPAIR', label: 'صيانة' }]} />
                <FormInput label="المبلغ" type="number" value={formData.amount} onChange={(v) => setFormData({...formData, amount: parseFloat(v) || 0})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormSelect label="طريقة الدفع" value={formData.payment_method} onChange={(v) => setFormData({...formData, payment_method: v})} options={[{ value: 'CASH', label: 'نقدي' }, { value: 'CARD', label: 'بطاقة' }, { value: 'TRANSFER', label: 'تحويل' }]} />
                <FormInput label="التاريخ" type="date" value={formData.service_date} onChange={(v) => setFormData({...formData, service_date: v})} />
              </div>
              <FormInput label="ملاحظات" value={formData.notes} onChange={(v) => setFormData({...formData, notes: v})} />
            </div>
          </CustomModal>
    </div>
  )
}
