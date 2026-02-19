'use client'

import { useEffect, useState } from 'react'
import { supabase, Customer } from '@/lib/supabase'
import { exportToCSV, SECTIONS } from '@/lib/export'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Spinner, Button, Tooltip } from '@nextui-org/react'
import { Users, Edit, Trash2, Phone, Building, User, Download } from 'lucide-react'

const statusLabels: Record<string, { label: string; color: string; dotColor: string }> = {
  new: { label: 'جديد', color: 'bg-blue-100 text-blue-700 border-blue-200', dotColor: 'bg-blue-500' },
  contacted: { label: 'تم التواصل', color: 'bg-amber-100 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' },
  interested: { label: 'مهتم', color: 'bg-purple-100 text-purple-700 border-purple-200', dotColor: 'bg-purple-500' },
  follow_up: { label: 'متابعة', color: 'bg-sky-100 text-sky-700 border-sky-200', dotColor: 'bg-sky-500' },
  arrived: { label: 'وصل الشركة', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
  device_received: { label: 'تم استلام الجهاز', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', dotColor: 'bg-indigo-500' },
  in_repair: { label: 'قيد الصيانة', color: 'bg-orange-100 text-orange-700 border-orange-200', dotColor: 'bg-orange-500' },
  completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700 border-green-200', dotColor: 'bg-green-500' },
  delivered: { label: 'تم التسليم', color: 'bg-teal-100 text-teal-700 border-teal-200', dotColor: 'bg-teal-500' },
  converted: { label: 'عميل فعلي', color: 'bg-green-100 text-green-700 border-green-200', dotColor: 'bg-green-500' },
  lost: { label: 'مفقود', color: 'bg-red-100 text-red-700 border-red-200', dotColor: 'bg-red-500' },
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

  function handleExport() {
    exportToCSV(filtered as any, SECTIONS.customers.headers, 'customers')
  }

  const individuals = customers.filter(c => c.customer_type === 'individual').length
  const companies = customers.filter(c => c.customer_type === 'company').length

  return (
    <div className="w-full">
      <PageHeader title="العملاء" subtitle={`إجمالي ${customers.length} عميل`} icon={Users} iconBg="from-teal-500 to-teal-600" buttonLabel="إضافة عميل" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث عن عميل..." />
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">إجمالي العملاء</p>
          <p className="text-lg sm:text-xl font-black text-teal-600">{customers.length}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">أفراد</p>
          <p className="text-lg sm:text-xl font-black text-blue-600">{individuals}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">شركات</p>
          <p className="text-lg sm:text-xl font-black text-purple-600">{companies}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">عملاء جدد</p>
          <p className="text-lg sm:text-xl font-black text-emerald-600">{customers.filter(c => c.status === 'new').length}</p>
        </CardBody></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
        <button onClick={() => setFilterType('all')} className={filterType === 'all' ? 'filter-btn-active filter-btn-active-primary' : 'filter-btn'}>الكل</button>
        <button onClick={() => setFilterType('individual')} className={filterType === 'individual' ? 'filter-btn-active filter-btn-active-primary' : 'filter-btn'}>أفراد</button>
        <button onClick={() => setFilterType('company')} className={filterType === 'company' ? 'filter-btn-active filter-btn-active-teal' : 'filter-btn'}>شركات</button>
        <div className="hidden sm:block w-px bg-slate-300 mx-1" />
        {Object.entries(statusLabels).slice(0, 6).map(([k, v]) => (
          <button key={k} onClick={() => setFilterStatus(filterStatus === k ? 'all' : k)} className={filterStatus === k ? 'filter-btn-active filter-btn-active-secondary' : 'filter-btn'}>{v.label}</button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex items-center justify-center h-48"><Spinner size="lg" /></CardBody></Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Users className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا يوجد عملاء</p>
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
                    <th>النوع</th>
                    <th>الهاتف</th>
                    <th>العنوان</th>
                    <th>الحالة</th>
                    <th>المصدر</th>
                    <th className="col-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, idx) => {
                    const st = statusLabels[c.status || 'new'] || statusLabels.new
                    return (
                      <tr key={c.id}>
                        <td className="text-xs font-bold text-slate-400">{idx + 1}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${c.customer_type === 'company' ? 'bg-purple-100' : 'bg-teal-100'}`}>
                              {c.customer_type === 'company' ? <Building className="h-4 w-4 text-purple-600" /> : <User className="h-4 w-4 text-teal-600" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-sm text-slate-800 truncate">{c.name}</p>
                              {c.company_name && <p className="text-[10px] text-slate-400 truncate">{c.company_name}</p>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border ${c.customer_type === 'company' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-teal-50 text-teal-600 border-teal-100'}`}>
                            {c.customer_type === 'company' ? 'شركة' : 'فرد'}
                          </span>
                        </td>
                        <td className="text-sm text-slate-600">{c.phone || '-'}</td>
                        <td className="text-sm text-slate-500 max-w-[150px] truncate">{c.address || '-'}</td>
                        <td>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${st.color}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${st.dotColor}`} />
                            {st.label}
                          </span>
                        </td>
                        <td className="text-sm text-slate-500">{c.source || '-'}</td>
                        <td className="col-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(c)}><Edit className="h-4 w-4" /></Button></Tooltip>
                            <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={8} className="text-sm font-extrabold text-teal-800">
                      الإجمالي: {filtered.length} عميل
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardBody>
          </Card>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">{filtered.length} عميل</span>
              <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-emerald-50 text-emerald-600 border-emerald-200">
                <Download className="h-3 w-3" />تصدير
              </button>
            </div>
            {filtered.map((c) => {
              const st = statusLabels[c.status || 'new'] || statusLabels.new
              return (
                <div key={c.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${c.customer_type === 'company' ? 'bg-purple-100' : 'bg-teal-100'}`}>
                        {c.customer_type === 'company' ? <Building className="h-4 w-4 text-purple-600" /> : <User className="h-4 w-4 text-teal-600" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm text-slate-800 truncate">{c.name}</p>
                        {c.company_name && <p className="text-[10px] text-slate-400 truncate">{c.company_name}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(c)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Edit className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(c.id)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${st.color}`}>
                      <span className={`h-1 w-1 rounded-full ${st.dotColor}`} />{st.label}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.customer_type === 'company' ? 'bg-purple-50 text-purple-600' : 'bg-teal-50 text-teal-600'}`}>
                      {c.customer_type === 'company' ? 'شركة' : 'فرد'}
                    </span>
                  </div>
                  {c.address && <p className="mt-1 text-[11px] text-slate-400 truncate">{c.address}</p>}
                </div>
              )
            })}
          </div>
        </>
      )}

      <CustomModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editItem ? 'تعديل عميل' : 'إضافة عميل جديد'} footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={() => setIsOpen(false)} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'إضافة'} onClick={handleSubmit} color="from-teal-500 to-teal-600" />
        </>
      }>
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormInput label="الاسم" value={formData.name} onChange={(v) => setFormData({...formData, name: v})} required />
            <FormInput label="رقم الهاتف" value={formData.phone} onChange={(v) => setFormData({...formData, phone: v})} type="tel" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormSelect label="نوع العميل" value={formData.customer_type} onChange={(v) => setFormData({...formData, customer_type: v})} options={[
              { value: 'individual', label: 'فرد' },
              { value: 'company', label: 'شركة' },
            ]} />
            <FormSelect label="الحالة" value={formData.status} onChange={(v) => setFormData({...formData, status: v})} options={Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: v.label }))} />
          </div>
          {formData.customer_type === 'company' && (
            <FormInput label="اسم الشركة" value={formData.company_name} onChange={(v) => setFormData({...formData, company_name: v})} />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
