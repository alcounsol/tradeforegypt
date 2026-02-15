'use client'

import { useEffect, useState } from 'react'
import { supabase, Employee } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import Sidebar from '@/components/Sidebar'
import PageHeader from '@/components/PageHeader'
import {
  Card, CardBody, Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, Chip, Tooltip, Spinner, Switch
} from '@nextui-org/react'
import { Users, Edit, Trash2, Phone, Briefcase } from 'lucide-react'

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [editItem, setEditItem] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({ name: '', job_title: '', phone: '', base_salary: 0, is_active: true })

  useEffect(() => { fetchEmployees() }, [])

  async function fetchEmployees() {
    setLoading(true)
    const { data } = await supabase.from('employees').select('*').order('created_at', { ascending: false })
    setEmployees(data || [])
    setLoading(false)
  }

  function openAdd() { setEditItem(null); setFormData({ name: '', job_title: '', phone: '', base_salary: 0, is_active: true }); onOpen() }
  function openEdit(item: Employee) { setEditItem(item); setFormData({ name: item.name, job_title: item.job_title || '', phone: item.phone || '', base_salary: item.base_salary || 0, is_active: item.is_active }); onOpen() }

  async function handleSubmit() {
    if (editItem) { await supabase.from('employees').update(formData).eq('id', editItem.id) }
    else { await supabase.from('employees').insert([formData]) }
    onClose(); fetchEmployees()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا الموظف؟')) { await supabase.from('employees').delete().eq('id', id); fetchEmployees() }
  }

  return (
    <div className="flex min-h-screen" dir="rtl">
      <Sidebar />
      <main className="flex-1 mr-[260px] p-8">
        <PageHeader title="الموظفين" subtitle="إدارة بيانات الموظفين" icon={Users} iconColor="text-violet-500" buttonLabel="إضافة موظف" onButtonClick={openAdd} />

        {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
        : employees.length === 0 ? (
          <Card className="shadow-md"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Users className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا يوجد موظفين</p>
          </CardBody></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {employees.map(emp => (
              <Card key={emp.id} className={`shadow-md hover:shadow-xl transition-all ${!emp.is_active ? 'opacity-60' : ''}`}>
                <CardBody className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <Chip size="sm" variant="flat" color={emp.is_active ? 'success' : 'danger'} className="font-bold">{emp.is_active ? 'نشط' : 'غير نشط'}</Chip>
                    <div className="flex gap-1">
                      <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(emp)}><Edit className="h-4 w-4" /></Button></Tooltip>
                      <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(emp.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                      <span className="text-white font-extrabold text-lg">{emp.name.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg text-slate-900">{emp.name}</h3>
                      <div className="flex items-center gap-1 text-slate-500 text-sm"><Briefcase className="h-3 w-3" /><span>{emp.job_title || 'غير محدد'}</span></div>
                    </div>
                  </div>
                  {emp.phone && <div className="flex items-center gap-2 text-slate-500 text-sm mb-3"><Phone className="h-3.5 w-3.5" /><span>{emp.phone}</span></div>}
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-1">الراتب الأساسي</p>
                    <p className="text-xl font-extrabold text-violet-600">{formatCurrency(emp.base_salary || 0)}</p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        <Modal isOpen={isOpen} onClose={onClose} size="xl" backdrop="blur" placement="center">
          <ModalContent>
            <ModalHeader className="font-extrabold">{editItem ? 'تعديل موظف' : 'إضافة موظف جديد'}</ModalHeader>
            <ModalBody className="gap-4">
              <Input label="الاسم" isRequired value={formData.name} onValueChange={(v) => setFormData({...formData, name: v})} variant="bordered" />
              <Input label="الوظيفة" value={formData.job_title} onValueChange={(v) => setFormData({...formData, job_title: v})} variant="bordered" />
              <Input label="رقم الهاتف" value={formData.phone} onValueChange={(v) => setFormData({...formData, phone: v})} variant="bordered" />
              <Input label="الراتب الأساسي" type="number" value={String(formData.base_salary)} onValueChange={(v) => setFormData({...formData, base_salary: parseFloat(v) || 0})} variant="bordered" />
              <Switch isSelected={formData.is_active} onValueChange={(v) => setFormData({...formData, is_active: v})} className="font-semibold">موظف نشط</Switch>
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
