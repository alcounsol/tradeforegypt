'use client'

import { useEffect, useState } from 'react'
import { supabase, Supplier } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput from '@/components/FormInput'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Input, Tooltip, Spinner } from '@nextui-org/react'
import { Truck, Search, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react'

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const onOpen = () => setIsOpen(true)
  const onClose = () => setIsOpen(false)
  const [editItem, setEditItem] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' })

  useEffect(() => { fetchSuppliers() }, [])

  async function fetchSuppliers() {
    setLoading(true)
    const { data } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false })
    setSuppliers(data || [])
    setLoading(false)
  }

  const filtered = suppliers.filter(s => s.name.includes(search) || (s.contact_person && s.contact_person.includes(search)))

  function openAdd() { setEditItem(null); setFormData({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' }); onOpen() }
  function openEdit(item: Supplier) { setEditItem(item); setFormData({ name: item.name, contact_person: item.contact_person || '', phone: item.phone || '', email: item.email || '', address: item.address || '', notes: item.notes || '' }); onOpen() }

  async function handleSubmit() {
    if (editItem) { await supabase.from('suppliers').update(formData).eq('id', editItem.id) }
    else { await supabase.from('suppliers').insert([formData]) }
    onClose(); fetchSuppliers()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا المورد؟')) { await supabase.from('suppliers').delete().eq('id', id); fetchSuppliers() }
  }

  return (
    <div className="w-full">
        <PageHeader title="الموردين" subtitle="إدارة بيانات الموردين" icon={Truck} iconBg="from-orange-500 to-orange-600" buttonLabel="إضافة مورد" onButtonClick={openAdd}>
          <Input placeholder="بحث عن مورد..." value={search} onValueChange={setSearch} startContent={<Search className="h-4 w-4 text-slate-400" />} className="w-64" variant="bordered" size="sm" />
        </PageHeader>

        <Card className="shadow-md">
          <CardBody className="p-0">
            {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
            : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Truck className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا يوجد موردين</p>
              </div>
            ) : (
              <Table aria-label="جدول الموردين" removeWrapper className="min-w-full">
                <TableHeader>
                  <TableColumn className="text-right font-bold">المورد</TableColumn>
                  <TableColumn className="text-right font-bold">جهة الاتصال</TableColumn>
                  <TableColumn className="text-right font-bold">الهاتف</TableColumn>
                  <TableColumn className="text-right font-bold">البريد</TableColumn>
                  <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => (
                    <TableRow key={s.id} className="hover:bg-slate-50/50">
                      <TableCell><p className="font-bold text-slate-900">{s.name}</p></TableCell>
                      <TableCell className="text-sm">{s.contact_person || '-'}</TableCell>
                      <TableCell>{s.phone && <div className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{s.phone}</div>}</TableCell>
                      <TableCell>{s.email && <div className="flex items-center gap-1 text-sm"><Mail className="h-3 w-3" />{s.email}</div>}</TableCell>
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

        <CustomModal isOpen={isOpen} onClose={onClose} title={editItem ? 'تعديل مورد' : 'إضافة مورد جديد'} footer={
            <>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">إلغاء</button>
              <button onClick={handleSubmit} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors">{editItem ? 'تحديث' : 'إضافة'}</button>
            </>
          }>
            <div className="flex flex-col gap-4">
              <FormInput label="اسم المورد" value={formData.name} onChange={(v) => setFormData({...formData, name: v})} required />
              <FormInput label="جهة الاتصال" value={formData.contact_person} onChange={(v) => setFormData({...formData, contact_person: v})} />
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="رقم الهاتف" value={formData.phone} onChange={(v) => setFormData({...formData, phone: v})} type="tel" />
                <FormInput label="البريد الإلكتروني" value={formData.email} onChange={(v) => setFormData({...formData, email: v})} type="email" />
              </div>
              <FormInput label="العنوان" value={formData.address} onChange={(v) => setFormData({...formData, address: v})} />
              <FormInput label="ملاحظات" value={formData.notes} onChange={(v) => setFormData({...formData, notes: v})} />
            </div>
          </CustomModal>
    </div>
  )
}
