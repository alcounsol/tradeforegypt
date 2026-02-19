'use client'

import { useEffect, useState } from 'react'
import { supabase, Supplier } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Button, Tooltip, Spinner } from '@nextui-org/react'
import { Truck, Edit, Trash2, Phone, Mail, Download } from 'lucide-react'
import { exportToCSV, SECTIONS } from '@/lib/export'

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

  function handleExport() {
    exportToCSV(filtered as any, SECTIONS.suppliers.headers, 'suppliers')
  }

  return (
    <div className="w-full">
      <PageHeader title="الموردين" subtitle="إدارة بيانات الموردين" icon={Truck} iconBg="from-orange-500 to-orange-600" buttonLabel="إضافة مورد" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث عن مورد..." />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
          <p className="text-[10px] font-bold text-slate-400 mb-0.5">إجمالي الموردين</p>
          <p className="text-xl font-black text-orange-600">{suppliers.length}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
          <p className="text-[10px] font-bold text-slate-400 mb-0.5">نتائج البحث</p>
          <p className="text-xl font-black text-blue-600">{filtered.length}</p>
        </CardBody></Card>
      </div>

      {loading ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex items-center justify-center h-48"><Spinner size="lg" /></CardBody></Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Truck className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا يوجد موردين</p>
        </CardBody></Card>
      ) : (
        <Card className="shadow-md border border-slate-100">
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
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">المورد</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">جهة الاتصال</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الهاتف</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">البريد</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">العنوان</th>
                  <th className="text-center p-3 font-extrabold text-slate-600 text-xs">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr key={s.id} className="border-b border-slate-100 transition-all hover:bg-blue-50/30">
                    <td className="p-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-extrabold text-sm text-slate-800">{s.name}</td>
                    <td className="p-3 text-sm text-slate-600">{s.contact_person || '-'}</td>
                    <td className="p-3">
                      {s.phone ? (
                        <div className="flex items-center gap-1 text-sm text-slate-600"><Phone className="h-3 w-3 text-slate-400" />{s.phone}</div>
                      ) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="p-3">
                      {s.email ? (
                        <div className="flex items-center gap-1 text-sm text-slate-600"><Mail className="h-3 w-3 text-slate-400" />{s.email}</div>
                      ) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="p-3 text-sm text-slate-500 max-w-[150px] truncate">{s.address || '-'}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-0.5">
                        <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(s)}><Edit className="h-4 w-4" /></Button></Tooltip>
                        <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(s.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      <CustomModal isOpen={isOpen} onClose={onClose} title={editItem ? 'تعديل مورد' : 'إضافة مورد جديد'} footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={onClose} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'إضافة'} onClick={handleSubmit} color="from-orange-500 to-orange-600" />
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
