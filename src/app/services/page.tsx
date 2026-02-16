'use client'

import { useEffect, useState } from 'react'
import { supabase, ServiceRecord } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import Sidebar from '@/components/Sidebar'
import PageHeader from '@/components/PageHeader'
import {
  Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, Chip, Tooltip, Spinner, Select, SelectItem, Textarea
} from '@nextui-org/react'
import { Wrench, Search, Edit, Trash2 } from 'lucide-react'

export default function Services() {
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [editItem, setEditItem] = useState<ServiceRecord | null>(null)
  const [formData, setFormData] = useState({ service_type: 'INSPECTION' as 'INSPECTION' | 'REPAIR', customer_name: '', customer_phone: '', device_type: '', device_brand: '', device_model: '', amount: 0, payment_method: 'CASH', notes: '', service_date: new Date().toISOString().split('T')[0] })

  useEffect(() => { fetchServices() }, [])

  async function fetchServices() {
    setLoading(true)
    const { data } = await supabase.from('service_records').select('*').order('service_date', { ascending: false })
    setServices(data || [])
    setLoading(false)
  }

  const filtered = services.filter(s => (s.customer_name || '').includes(search) || (s.device_type || '').includes(search) || (s.customer_phone || '').includes(search))

  function openAdd() { setEditItem(null); setFormData({ service_type: 'INSPECTION', customer_name: '', customer_phone: '', device_type: '', device_brand: '', device_model: '', amount: 0, payment_method: 'CASH', notes: '', service_date: new Date().toISOString().split('T')[0] }); onOpen() }
  function openEdit(item: ServiceRecord) { setEditItem(item); setFormData({ service_type: item.service_type, customer_name: item.customer_name || '', customer_phone: item.customer_phone || '', device_type: item.device_type || '', device_brand: item.device_brand || '', device_model: item.device_model || '', amount: item.amount, payment_method: item.payment_method, notes: item.notes || '', service_date: item.service_date }); onOpen() }

  async function handleSubmit() {
    if (editItem) { await supabase.from('service_records').update(formData).eq('id', editItem.id) }
    else { await supabase.from('service_records').insert([formData]) }
    onClose(); fetchServices()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذه الخدمة؟')) { await supabase.from('service_records').delete().eq('id', id); fetchServices() }
  }

  return (
    <div className="flex min-h-screen" dir="rtl">
      <Sidebar />
      <main className="flex-1 mr-[250px] p-8">
        <PageHeader title="الخدمات" subtitle="إدارة خدمات الكشف والصيانة" icon={Wrench} iconBg="from-amber-500 to-amber-600" buttonLabel="تسجيل خدمة" onButtonClick={openAdd}>
          <Input placeholder="بحث..." value={search} onValueChange={setSearch} startContent={<Search className="h-4 w-4 text-slate-400" />} className="w-64" variant="bordered" size="sm" />
        </PageHeader>

        <Card className="shadow-md">
          <CardBody className="p-0">
            {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
            : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Wrench className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد خدمات مسجلة</p>
              </div>
            ) : (
              <Table aria-label="جدول الخدمات" removeWrapper>
                <TableHeader>
                  <TableColumn className="text-right font-bold">النوع</TableColumn>
                  <TableColumn className="text-right font-bold">العميل</TableColumn>
                  <TableColumn className="text-right font-bold">الجهاز</TableColumn>
                  <TableColumn className="text-right font-bold">المبلغ</TableColumn>
                  <TableColumn className="text-right font-bold">الدفع</TableColumn>
                  <TableColumn className="text-right font-bold">التاريخ</TableColumn>
                  <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => (
                    <TableRow key={s.id} className="hover:bg-slate-50/50">
                      <TableCell><Chip size="sm" variant="flat" color={s.service_type === 'INSPECTION' ? 'primary' : 'success'} className="font-bold">{s.service_type === 'INSPECTION' ? 'كشف' : 'صيانة'}</Chip></TableCell>
                      <TableCell><div><p className="font-bold">{s.customer_name || '-'}</p><p className="text-xs text-slate-400">{s.customer_phone}</p></div></TableCell>
                      <TableCell><div><p className="font-semibold">{s.device_type || '-'}</p><p className="text-xs text-slate-400">{s.device_brand} {s.device_model}</p></div></TableCell>
                      <TableCell className="font-bold text-emerald-600">{formatCurrency(s.amount)}</TableCell>
                      <TableCell><Chip size="sm" variant="flat" color="default" className="font-semibold">{s.payment_method === 'CASH' ? 'نقداً' : s.payment_method === 'CARD' ? 'بطاقة' : 'تحويل'}</Chip></TableCell>
                      <TableCell className="text-sm text-slate-500">{formatDate(s.service_date)}</TableCell>
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

        <Modal isOpen={isOpen} onClose={onClose} size="3xl" backdrop="blur" placement="auto">
          <ModalContent>
            <ModalHeader className="font-extrabold">{editItem ? 'تعديل خدمة' : 'تسجيل خدمة جديدة'}</ModalHeader>
            <ModalBody className="gap-4">
              <div className="flex gap-4">
                <Button variant={formData.service_type === 'INSPECTION' ? 'shadow' : 'flat'} color={formData.service_type === 'INSPECTION' ? 'primary' : 'default'} onPress={() => setFormData({...formData, service_type: 'INSPECTION'})} className="flex-1 font-bold">كشف</Button>
                <Button variant={formData.service_type === 'REPAIR' ? 'shadow' : 'flat'} color={formData.service_type === 'REPAIR' ? 'success' : 'default'} onPress={() => setFormData({...formData, service_type: 'REPAIR'})} className="flex-1 font-bold">صيانة</Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="اسم العميل" value={formData.customer_name} onValueChange={(v) => setFormData({...formData, customer_name: v})} variant="bordered" />
                <Input label="رقم الهاتف" value={formData.customer_phone} onValueChange={(v) => setFormData({...formData, customer_phone: v})} variant="bordered" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input label="نوع الجهاز" value={formData.device_type} onValueChange={(v) => setFormData({...formData, device_type: v})} variant="bordered" />
                <Input label="الماركة" value={formData.device_brand} onValueChange={(v) => setFormData({...formData, device_brand: v})} variant="bordered" />
                <Input label="الموديل" value={formData.device_model} onValueChange={(v) => setFormData({...formData, device_model: v})} variant="bordered" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input label="المبلغ" type="number" isRequired value={String(formData.amount)} onValueChange={(v) => setFormData({...formData, amount: parseFloat(v) || 0})} variant="bordered" />
                <Select label="طريقة الدفع" selectedKeys={[formData.payment_method]} onSelectionChange={(keys) => setFormData({...formData, payment_method: Array.from(keys)[0] as string})} variant="bordered">
                  <SelectItem key="CASH">نقداً</SelectItem>
                  <SelectItem key="CARD">بطاقة</SelectItem>
                  <SelectItem key="TRANSFER">تحويل</SelectItem>
                </Select>
                <Input label="التاريخ" type="date" value={formData.service_date} onValueChange={(v) => setFormData({...formData, service_date: v})} variant="bordered" />
              </div>
              <Textarea label="ملاحظات" value={formData.notes} onValueChange={(v) => setFormData({...formData, notes: v})} variant="bordered" />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose} className="font-bold">إلغاء</Button>
              <Button color="primary" variant="shadow" onPress={handleSubmit} className="font-bold">{editItem ? 'تحديث' : 'تسجيل'}</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </main>
    </div>
  )
}
