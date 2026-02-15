'use client'

import { useEffect, useState } from 'react'
import { supabase, Customer } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import PageHeader from '@/components/PageHeader'
import {
  Card, CardBody, Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, Tooltip, Spinner, Textarea
} from '@nextui-org/react'
import { UserCircle, Search, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react'

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [editItem, setEditItem] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', notes: '' })

  useEffect(() => { fetchCustomers() }, [])

  async function fetchCustomers() {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
    setCustomers(data || [])
    setLoading(false)
  }

  const filtered = customers.filter(c => c.name.includes(search) || (c.phone || '').includes(search))

  function openAdd() { setEditItem(null); setFormData({ name: '', phone: '', email: '', address: '', notes: '' }); onOpen() }
  function openEdit(item: Customer) { setEditItem(item); setFormData({ name: item.name, phone: item.phone || '', email: item.email || '', address: item.address || '', notes: item.notes || '' }); onOpen() }

  async function handleSubmit() {
    if (editItem) { await supabase.from('customers').update(formData).eq('id', editItem.id) }
    else { await supabase.from('customers').insert([formData]) }
    onClose(); fetchCustomers()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا العميل؟')) { await supabase.from('customers').delete().eq('id', id); fetchCustomers() }
  }

  return (
    <div className="flex min-h-screen" dir="rtl">
      <Sidebar />
      <main className="flex-1 mr-[260px] p-8">
        <PageHeader title="العملاء" subtitle="إدارة بيانات العملاء" icon={UserCircle} iconColor="text-teal-500" buttonLabel="إضافة عميل" onButtonClick={openAdd}>
          <Input placeholder="بحث..." value={search} onValueChange={setSearch} startContent={<Search className="h-4 w-4 text-slate-400" />} className="w-64" variant="bordered" size="sm" />
        </PageHeader>

        {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
        : filtered.length === 0 ? (
          <Card className="shadow-md"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
            <UserCircle className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا يوجد عملاء</p>
          </CardBody></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(c => (
              <Card key={c.id} className="shadow-md hover:shadow-xl transition-all">
                <CardBody className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg">
                        <span className="text-white font-extrabold">{c.name.charAt(0)}</span>
                      </div>
                      <h3 className="font-extrabold text-lg text-slate-900">{c.name}</h3>
                    </div>
                    <div className="flex gap-1">
                      <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(c)}><Edit className="h-4 w-4" /></Button></Tooltip>
                      <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-500">
                    {c.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /><span>{c.phone}</span></div>}
                    {c.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span>{c.email}</span></div>}
                    {c.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /><span>{c.address}</span></div>}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        <Modal isOpen={isOpen} onClose={onClose} size="xl" backdrop="blur" placement="center">
          <ModalContent>
            <ModalHeader className="font-extrabold">{editItem ? 'تعديل عميل' : 'إضافة عميل جديد'}</ModalHeader>
            <ModalBody className="gap-4">
              <Input label="الاسم" isRequired value={formData.name} onValueChange={(v) => setFormData({...formData, name: v})} variant="bordered" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="رقم الهاتف" value={formData.phone} onValueChange={(v) => setFormData({...formData, phone: v})} variant="bordered" />
                <Input label="البريد الإلكتروني" value={formData.email} onValueChange={(v) => setFormData({...formData, email: v})} variant="bordered" />
              </div>
              <Input label="العنوان" value={formData.address} onValueChange={(v) => setFormData({...formData, address: v})} variant="bordered" />
              <Textarea label="ملاحظات" value={formData.notes} onValueChange={(v) => setFormData({...formData, notes: v})} variant="bordered" />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose} className="font-bold">إلغاء</Button>
              <Button color="primary" variant="shadow" onPress={handleSubmit} className="font-bold">{editItem ? 'تحديث' : 'إضافة'}</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </main>
    </div>
  )
}
