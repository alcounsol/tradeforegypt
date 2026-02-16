'use client'

import { useEffect, useState } from 'react'
import { supabase, Supplier } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import { Card, CardBody, Button, Input, Tooltip, Spinner } from '@nextui-org/react'
import { Truck, Search, Edit, Trash2, Phone, Mail, MapPin, User } from 'lucide-react'

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

  const filtered = suppliers.filter(s => s.name.includes(search) || (s.phone || '').includes(search))

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
          <Input placeholder="بحث..." value={search} onValueChange={setSearch} startContent={<Search className="h-4 w-4 text-slate-400" />} className="w-64" variant="bordered" size="sm" />
        </PageHeader>

        {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
        : filtered.length === 0 ? (
          <Card className="shadow-md"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Truck className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا يوجد موردين</p>
          </CardBody></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(s => (
              <Card key={s.id} className="shadow-md hover:shadow-xl transition-all">
                <CardBody className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                        <Truck className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-extrabold text-lg text-slate-900">{s.name}</h3>
                    </div>
                    <div className="flex gap-1">
                      <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(s)}><Edit className="h-4 w-4" /></Button></Tooltip>
                      <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(s.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-500">
                    {s.contact_person && <div className="flex items-center gap-2"><User className="h-3.5 w-3.5" /><span>{s.contact_person}</span></div>}
                    {s.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /><span>{s.phone}</span></div>}
                    {s.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span>{s.email}</span></div>}
                    {s.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /><span>{s.address}</span></div>}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        <CustomModal isOpen={isOpen} onClose={onClose} title={editItem ? 'تعديل مورد' : 'إضافة مورد جديد'} footer={
            <>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">إلغاء</button>
              <button onClick={handleSubmit} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors">{editItem ? 'تحديث' : 'إضافة'}</button>
            </>
          }>
                        <Input label="اسم الشركة/المورد" isRequired value={formData.name} onValueChange={(v) => setFormData({...formData, name: v})} variant="bordered" />
              <Input label="الشخص المسؤول" value={formData.contact_person} onValueChange={(v) => setFormData({...formData, contact_person: v})} variant="bordered" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="رقم الهاتف" value={formData.phone} onValueChange={(v) => setFormData({...formData, phone: v})} variant="bordered" />
                <Input label="البريد الإلكتروني" value={formData.email} onValueChange={(v) => setFormData({...formData, email: v})} variant="bordered" />
              </div>
              <Input label="العنوان" value={formData.address} onValueChange={(v) => setFormData({...formData, address: v})} variant="bordered" />
          </CustomModal>
    </div>
  )
}
