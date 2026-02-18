'use client'

import { useEffect, useState } from 'react'
import { supabase, Employee, departmentLabels } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormCheckbox } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Button, Chip, Tooltip, Spinner } from '@nextui-org/react'
import { Users, Edit, Trash2, Phone, Briefcase, Building } from 'lucide-react'

const departmentColors: Record<string, string> = {
  maintenance: 'bg-amber-500',
  hr: 'bg-blue-500',
  call_center: 'bg-green-500',
  follow_up: 'bg-sky-500',
  sales: 'bg-purple-500',
  delivery: 'bg-orange-500',
  reception: 'bg-pink-500',
  general: 'bg-gray-500',
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [isOpen, setIsOpen] = useState(false)
  const onOpen = () => setIsOpen(true)
  const onClose = () => setIsOpen(false)
  const [editItem, setEditItem] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({ name: '', job_title: '', phone: '', base_salary: 0, is_active: true, department: 'general', notes: '' })

  useEffect(() => { fetchEmployees() }, [])

  async function fetchEmployees() {
    setLoading(true)
    const { data } = await supabase.from('employees').select('*').order('department').order('name')
    setEmployees(data || [])
    setLoading(false)
  }

  const filtered = employees.filter(e => {
    const matchSearch = e.name.includes(search) || (e.job_title && e.job_title.includes(search))
    const matchDept = filterDept === 'all' || e.department === filterDept
    return matchSearch && matchDept
  })

  // Group by department
  const departments = [...new Set(employees.map(e => e.department || 'general'))]

  function openAdd() { setEditItem(null); setFormData({ name: '', job_title: '', phone: '', base_salary: 0, is_active: true, department: 'general', notes: '' }); onOpen() }
  function openEdit(item: Employee) { setEditItem(item); setFormData({ name: item.name, job_title: item.job_title || '', phone: item.phone || '', base_salary: item.base_salary || 0, is_active: item.is_active, department: item.department || 'general', notes: item.notes || '' }); onOpen() }

  async function handleSubmit() {
    if (editItem) { await supabase.from('employees').update(formData).eq('id', editItem.id) }
    else { await supabase.from('employees').insert([formData]) }
    onClose(); fetchEmployees()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا الموظف؟')) { await supabase.from('employees').delete().eq('id', id); fetchEmployees() }
  }

  const totalSalary = employees.filter(e => e.is_active).reduce((s, e) => s + (e.base_salary || 0), 0)

  return (
    <div className="w-full">
      <PageHeader title="الموظفين" subtitle={`إجمالي ${employees.length} موظف - إجمالي الرواتب: ${formatCurrency(totalSalary)}`} icon={Users} iconBg="from-violet-500 to-violet-600" buttonLabel="إضافة موظف" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث عن موظف..." />
      </PageHeader>

      {/* Department Filter */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={() => setFilterDept('all')} className={filterDept === 'all' ? 'filter-btn-active filter-btn-active-primary' : 'filter-btn'}>
          الكل ({employees.length})
        </button>
        {departments.map(dept => (
          <button key={dept} onClick={() => setFilterDept(dept)} className={filterDept === dept ? 'filter-btn-active filter-btn-active-primary' : 'filter-btn'}>
            {departmentLabels[dept] || dept} ({employees.filter(e => e.department === dept).length})
          </button>
        ))}
      </div>

      {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
      : filtered.length === 0 ? (
        <Card className="shadow-md"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Users className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا يوجد موظفين</p>
        </CardBody></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(emp => (
            <Card key={emp.id} className={`shadow-md hover:shadow-xl transition-all ${!emp.is_active ? 'opacity-60' : ''}`}>
              <CardBody className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex gap-2">
                    <Chip size="sm" variant="flat" color={emp.is_active ? 'success' : 'danger'} className="font-bold text-[10px]">{emp.is_active ? 'نشط' : 'غير نشط'}</Chip>
                    <Chip size="sm" variant="flat" className="font-bold text-[10px]">{departmentLabels[emp.department || 'general']}</Chip>
                  </div>
                  <div className="flex gap-0.5">
                    <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(emp)}><Edit className="h-3.5 w-3.5" /></Button></Tooltip>
                    <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(emp.id)}><Trash2 className="h-3.5 w-3.5" /></Button></Tooltip>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${departmentColors[emp.department || 'general']} shadow-lg`}>
                    <span className="text-white font-extrabold text-base">{emp.name.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm text-slate-900 truncate">{emp.name}</h3>
                    <div className="flex items-center gap-1 text-slate-500 text-xs"><Briefcase className="h-3 w-3 shrink-0" /><span className="truncate">{emp.job_title || 'غير محدد'}</span></div>
                  </div>
                </div>
                {emp.phone && <div className="flex items-center gap-2 text-slate-500 text-xs mb-2"><Phone className="h-3 w-3" /><span>{emp.phone}</span></div>}
                {emp.notes && <p className="text-[10px] text-slate-400 mb-2 line-clamp-2">{emp.notes}</p>}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-500 mb-0.5">الراتب الأساسي</p>
                  <p className="text-lg font-extrabold text-violet-600">{formatCurrency(emp.base_salary || 0)}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <CustomModal isOpen={isOpen} onClose={onClose} title={editItem ? 'تعديل موظف' : 'إضافة موظف جديد'} footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={onClose} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'إضافة'} onClick={handleSubmit} color="from-violet-500 to-violet-600" />
        </>
      }>
        <div className="flex flex-col gap-4">
          <FormInput label="الاسم" value={formData.name} onChange={(v) => setFormData({...formData, name: v})} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="الوظيفة" value={formData.job_title} onChange={(v) => setFormData({...formData, job_title: v})} />
            <FormSelect label="القسم" value={formData.department} onChange={(v) => setFormData({...formData, department: v})} options={Object.entries(departmentLabels).map(([k, v]) => ({ value: k, label: v }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="رقم الهاتف" value={formData.phone} onChange={(v) => setFormData({...formData, phone: v})} type="tel" />
            <FormInput label="الراتب الأساسي" type="number" value={formData.base_salary} onChange={(v) => setFormData({...formData, base_salary: parseFloat(v) || 0})} />
          </div>
          <FormInput label="ملاحظات" value={formData.notes} onChange={(v) => setFormData({...formData, notes: v})} />
          <FormCheckbox label="موظف نشط" checked={formData.is_active} onChange={(v) => setFormData({...formData, is_active: v})} />
        </div>
      </CustomModal>
    </div>
  )
}
