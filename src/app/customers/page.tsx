'use client'

import { useEffect, useState } from 'react'
import { supabase, Customer } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput from '@/components/FormInput'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Input, Chip, Tooltip, Spinner } from '@nextui-org/react'
import { UserCircle, Search, Edit, Trash2, Phone, Mail } from 'lucide-react'

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const onOpen = () => setIsOpen(true)
  const onClose = () => setIsOpen(false)
  const [editItem, setEditItem] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', notes: '' })

  useEffect(() => { fetchCustomers() }, [])

  async function fetchCustomers() {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
    setCustomers(data || [])
    setLoading(false)
  }

  const filtered = customers.filter(c => c.name.includes(search) || (c.phone && c.phone.includes(search)))

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
    <div className="w-full">
        <PageHeader title="العملاء" subtitle="إدارة بيانات العملاء" icon={UserCircle} iconBg="from-teal-500 to-teal-600" buttonLabel="إضافة عميل" onButtonClick={openAdd}>
          <Input placeholder="بحث عن عميل..." value={search} onValueChange={setSearch} startContent={<Search className="h-4 w-4 text-slate-400" />} className="w-64" variant="bordered" size="sm" />
        </PageHeader>

        <Card className="shadow-md">
          <CardBody className="p-0">
            {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
            : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <UserCircle className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا يوجد عملاء</p>
              </div>
            ) : (
              <Table aria-label="جدول العملاء" removeWrapper className="min-w-full">
                <TableHeader>
                  <TableColumn className="text-right font-bold">العميل</TableColumn>
                  <TableColumn className="text-right font-bold">الهاتف</TableColumn>
                  <TableColumn className="text-right font-bold">البريد</TableColumn>
                  <TableColumn className="text-right font-bold">العنوان</TableColumn>
                  <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => (
                    <TableRow key={c.id} className="hover:bg-slate-50/50">
                      <TableCell><p className="font-bold text-slate-900">{c.name}</p></TableCell>
                      <TableCell>{c.phone && <div className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{c.phone}</div>}</TableCell>
                      <TableCell>{c.email && <div className="flex items-center gap-1 text-sm"><Mail className="h-3 w-3" />{c.email}</div>}</TableCell>
                      <TableCell className="text-sm text-slate-500">{c.address || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(c)}><Edit className="h-4 w-4" /></Button></Tooltip>
                          <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <CustomModal isOpen={isOpen} onClose={onClose} title={editItem ? 'تعديل عميل' : 'إضافة عميل جديد'} footer={
            <>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">إلغاء</button>
              <button onClick={handleSubmit} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors">{editItem ? 'تحديث' : 'إضافة'}</button>
            </>
          }>
            <div className="flex flex-col gap-4">
              <FormInput label="الاسم" value={formData.name} onChange={(v) => setFormData({...formData, name: v})} required />
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
