'use client'

import { useEffect, useState } from 'react'
import { supabase, Customer } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Tooltip, Spinner } from '@nextui-org/react'
import { Users, Edit, Trash2, Phone, Building, User } from 'lucide-react'

const statusLabels: Record<string, { label: string; color: any }> = {
  new: { label: 'جديد', color: 'primary' },
  contacted: { label: 'تم التواصل', color: 'warning' },
  interested: { label: 'مهتم', color: 'secondary' },
  converted: { label: 'عميل فعلي', color: 'success' },
  lost: { label: 'مفقود', color: 'danger' },
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isOpen, setIsOpen] = useState(false)
  const [editItem, setEditItem] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', address: '', customer_type: 'individual',
    company_name: '', status: 'new', source: '', notes: '',
  })

  useEffect(() => { fetchCustomers() }, [])

  async function fetchCustomers() {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
    setCustomers(data || [])
    setLoading(false)
  }

  const filtered = customers.filter(c => {
    const matchSearch = c.name.includes(search) || (c.phone && c.phone.includes(search)) || (c.company_name && c.company_name.includes(search))
    const matchType = filterType === 'all' || c.customer_type === filterType
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchType && matchStatus
  })

  function openAdd() {
    setEditItem(null)
    setFormData({ name: '', phone: '', email: '', address: '', customer_type: 'individual', company_name: '', status: 'new', source: '', notes: '' })
    setIsOpen(true)
  }

  function openEdit(item: Customer) {
    setEditItem(item)
    setFormData({
      name: item.name, phone: item.phone || '', email: item.email || '',
      address: item.address || '', customer_type: item.customer_type || 'individual',
      company_name: item.company_name || '', status: item.status || 'new',
      source: item.source || '', notes: item.notes || '',
    })
    setIsOpen(true)
  }

  async function handleSubmit() {
    if (editItem) { await supabase.from('customers').update(formData).eq('id', editItem.id) }
    else { await supabase.from('customers').insert([formData]) }
    setIsOpen(false); fetchCustomers()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
      await supabase.from('customers').delete().eq('id', id); fetchCustomers()
    }
  }

  return (
    <div className="w-full">
      <PageHeader title="العملاء" subtitle={`إجمالي ${customers.length} عميل`} icon={Users} iconBg="from-teal-500 to-teal-600" buttonLabel="إضافة عميل" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث عن عميل..." />
      </PageHeader>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button size="sm" variant={filterType === 'all' ? 'shadow' : 'flat'} color={filterType === 'all' ? 'primary' : 'default'} onPress={() => setFilterType('all')} className="font-bold">الكل</Button>
        <Button size="sm" variant={filterType === 'individual' ? 'shadow' : 'flat'} color={filterType === 'individual' ? 'primary' : 'default'} onPress={() => setFilterType('individual')} className="font-bold">أفراد</Button>
        <Button size="sm" variant={filterType === 'company' ? 'shadow' : 'flat'} color={filterType === 'company' ? 'primary' : 'default'} onPress={() => setFilterType('company')} className="font-bold">شركات</Button>
        <div className="w-px bg-slate-200 mx-2" />
        {Object.entries(statusLabels).map(([k, v]) => (
          <Button key={k} size="sm" variant={filterStatus === k ? 'shadow' : 'flat'} color={filterStatus === k ? 'secondary' : 'default'} onPress={() => setFilterStatus(filterStatus === k ? 'all' : k)} className="font-bold">{v.label}</Button>
        ))}
      </div>

      <Card className="shadow-md">
        <CardBody className="p-0">
          {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
          : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Users className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا يوجد عملاء</p>
            </div>
          ) : (
            <Table aria-label="جدول العملاء" removeWrapper className="min-w-full">
              <TableHeader>
                <TableColumn className="text-right font-bold">العميل</TableColumn>
                <TableColumn className="text-right font-bold">النوع</TableColumn>
                <TableColumn className="text-right font-bold">الهاتف</TableColumn>
                <TableColumn className="text-right font-bold">العنوان</TableColumn>
                <TableColumn className="text-right font-bold">الحالة</TableColumn>
                <TableColumn className="text-right font-bold">المصدر</TableColumn>
                <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
              </TableHeader>
              <TableBody>
                {filtered.map(c => {
                  const st = statusLabels[c.status || 'new'] || statusLabels.new
                  return (
                    <TableRow key={c.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.customer_type === 'company' ? 'bg-purple-100' : 'bg-teal-100'}`}>
                            {c.customer_type === 'company' ? <Building className="h-4 w-4 text-purple-600" /> : <User className="h-4 w-4 text-teal-600" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{c.name}</p>
                            {c.company_name && <p className="text-[10px] text-slate-400">{c.company_name}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Chip size="sm" variant="flat" color={c.customer_type === 'company' ? 'secondary' : 'primary'} className="font-semibold">{c.customer_type === 'company' ? 'شركة' : 'فرد'}</Chip></TableCell>
                      <TableCell className="text-sm">{c.phone || '-'}</TableCell>
                      <TableCell className="text-sm text-slate-500 max-w-[150px] truncate">{c.address || '-'}</TableCell>
                      <TableCell><Chip size="sm" variant="flat" color={st.color} className="font-semibold">{st.label}</Chip></TableCell>
                      <TableCell className="text-sm text-slate-500">{c.source || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(c)}><Edit className="h-4 w-4" /></Button></Tooltip>
                          <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
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

      <CustomModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editItem ? 'تعديل عميل' : 'إضافة عميل جديد'} footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={() => setIsOpen(false)} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'إضافة'} onClick={handleSubmit} color="from-teal-500 to-teal-600" />
        </>
      }>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="الاسم" value={formData.name} onChange={(v) => setFormData({...formData, name: v})} required />
            <FormInput label="رقم الهاتف" value={formData.phone} onChange={(v) => setFormData({...formData, phone: v})} type="tel" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="نوع العميل" value={formData.customer_type} onChange={(v) => setFormData({...formData, customer_type: v})} options={[
              { value: 'individual', label: 'فرد' },
              { value: 'company', label: 'شركة' },
            ]} />
            <FormSelect label="الحالة" value={formData.status} onChange={(v) => setFormData({...formData, status: v})} options={Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: v.label }))} />
          </div>
          {formData.customer_type === 'company' && (
            <FormInput label="اسم الشركة" value={formData.company_name} onChange={(v) => setFormData({...formData, company_name: v})} />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="البريد الإلكتروني" value={formData.email} onChange={(v) => setFormData({...formData, email: v})} type="email" />
            <FormInput label="المصدر" value={formData.source} onChange={(v) => setFormData({...formData, source: v})} placeholder="مكالمة / إعلان / إحالة" />
          </div>
          <FormInput label="العنوان" value={formData.address} onChange={(v) => setFormData({...formData, address: v})} />
          <FormTextarea label="ملاحظات" value={formData.notes} onChange={(v) => setFormData({...formData, notes: v})} />
        </div>
      </CustomModal>
    </div>
  )
}
