'use client'

import { useEffect, useState } from 'react'
import { supabase, FollowUp, Employee, Customer, customerStatusLabels } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Tooltip, Spinner } from '@nextui-org/react'
import { PhoneForwarded, Edit, Trash2, CheckCircle, Clock, XCircle, RotateCcw, Send } from 'lucide-react'

const statusConfig: Record<string, { label: string; color: any; icon: any }> = {
  pending: { label: 'قيد الانتظار', color: 'warning', icon: Clock },
  completed: { label: 'مكتمل', color: 'success', icon: CheckCircle },
  no_answer: { label: 'لا يرد', color: 'danger', icon: XCircle },
  rescheduled: { label: 'مؤجل', color: 'default', icon: RotateCcw },
  device_sent: { label: 'تم إرسال الجهاز', color: 'primary', icon: Send },
}

export default function FollowUpPage() {
  const [records, setRecords] = useState<FollowUp[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editItem, setEditItem] = useState<FollowUp | null>(null)
  const [formData, setFormData] = useState({
    customer_id: 0, employee_id: 0, follow_up_type: 'call' as string,
    status: 'pending' as string, notes: '', result: '', next_follow_up_date: '',
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: fups }, { data: emps }, { data: custs }] = await Promise.all([
      supabase.from('follow_ups').select('*, employee:employees(id,name), customer:customers(id,name,phone,status,device_brand,device_name)').order('follow_up_date', { ascending: false }),
      supabase.from('employees').select('*').eq('department', 'follow_up').eq('is_active', true),
      supabase.from('customers').select('*').in('status', ['new', 'contacted', 'follow_up']).order('created_at', { ascending: false }),
    ])
    setRecords(fups || [])
    setEmployees(emps || [])
    setCustomers(custs || [])
    setLoading(false)
  }

  const filtered = records.filter(r => {
    const cust = r.customer as any
    return (cust?.name?.includes(search) || cust?.phone?.includes(search) || '')
  })

  function openAdd() {
    setEditItem(null)
    setFormData({ customer_id: 0, employee_id: 0, follow_up_type: 'call', status: 'pending', notes: '', result: '', next_follow_up_date: '' })
    setIsOpen(true)
  }

  function openEdit(item: FollowUp) {
    setEditItem(item)
    setFormData({
      customer_id: item.customer_id || 0, employee_id: item.employee_id || 0,
      follow_up_type: item.follow_up_type || 'call', status: item.status || 'pending',
      notes: item.notes || '', result: item.result || '',
      next_follow_up_date: item.next_follow_up_date || '',
    })
    setIsOpen(true)
  }

  async function handleSubmit() {
    const payload: any = { ...formData }
    if (!payload.customer_id) { alert('يرجى اختيار العميل'); return }
    if (!payload.employee_id) delete payload.employee_id

    if (editItem) {
      await supabase.from('follow_ups').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('follow_ups').insert([payload])
    }

    // Update customer status
    if (formData.status === 'device_sent') {
      await supabase.from('customers').update({ status: 'device_received' }).eq('id', formData.customer_id)
    } else if (formData.status === 'completed') {
      await supabase.from('customers').update({ status: 'contacted' }).eq('id', formData.customer_id)
    } else {
      await supabase.from('customers').update({ status: 'follow_up', assigned_follow_up_employee: formData.employee_id || null }).eq('id', formData.customer_id)
    }

    setIsOpen(false)
    fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      await supabase.from('follow_ups').delete().eq('id', id)
      fetchAll()
    }
  }

  return (
    <div className="w-full">
      <PageHeader title="المتابعة" subtitle="متابعة العملاء وحثهم على إرسال أجهزتهم" icon={PhoneForwarded} iconBg="from-sky-500 to-sky-600" buttonLabel="إضافة متابعة" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث عن عميل..." />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <Card key={key} className="shadow-sm"><CardBody className="p-3 text-center">
            <p className="text-xs font-semibold text-slate-500">{cfg.label}</p>
            <p className="text-xl font-extrabold text-slate-800">{records.filter(r => r.status === key).length}</p>
          </CardBody></Card>
        ))}
      </div>

      <Card className="shadow-md">
        <CardBody className="p-0">
          {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
          : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <PhoneForwarded className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد متابعات</p>
            </div>
          ) : (
            <Table aria-label="جدول المتابعات" removeWrapper className="min-w-full">
              <TableHeader>
                <TableColumn className="text-right font-bold">العميل</TableColumn>
                <TableColumn className="text-right font-bold">الهاتف</TableColumn>
                <TableColumn className="text-right font-bold">الجهاز</TableColumn>
                <TableColumn className="text-right font-bold">الموظف</TableColumn>
                <TableColumn className="text-right font-bold">الحالة</TableColumn>
                <TableColumn className="text-right font-bold">النتيجة</TableColumn>
                <TableColumn className="text-right font-bold">التاريخ</TableColumn>
                <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const cust = r.customer as any
                  const emp = r.employee as any
                  const cfg = statusConfig[r.status] || statusConfig.pending
                  return (
                    <TableRow key={r.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold">{cust?.name || '-'}</TableCell>
                      <TableCell className="text-sm">{cust?.phone || '-'}</TableCell>
                      <TableCell className="text-sm">{cust?.device_brand ? `${cust.device_brand} - ${cust.device_name || ''}` : '-'}</TableCell>
                      <TableCell className="text-sm font-semibold">{emp?.name || '-'}</TableCell>
                      <TableCell><Chip size="sm" variant="flat" color={cfg.color} className="font-semibold">{cfg.label}</Chip></TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-[150px] truncate">{r.result || '-'}</TableCell>
                      <TableCell className="text-sm text-slate-500">{r.follow_up_date ? formatDate(r.follow_up_date) : '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(r)}><Edit className="h-4 w-4" /></Button></Tooltip>
                          <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
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

      <CustomModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editItem ? 'تعديل متابعة' : 'إضافة متابعة جديدة'} footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={() => setIsOpen(false)} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'إضافة'} onClick={handleSubmit} color="from-sky-500 to-sky-600" />
        </>
      }>
        <div className="flex flex-col gap-4">
          <FormSelect label="العميل" value={String(formData.customer_id)} onChange={(v) => setFormData({...formData, customer_id: parseInt(v) || 0})} required options={[
            { value: '0', label: 'اختر العميل...' },
            ...customers.map(c => ({ value: String(c.id), label: `${c.name} ${c.phone ? `(${c.phone})` : ''} ${c.device_brand ? `- ${c.device_brand}` : ''}` }))
          ]} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="موظف المتابعة" value={String(formData.employee_id)} onChange={(v) => setFormData({...formData, employee_id: parseInt(v) || 0})} options={[
              { value: '0', label: 'اختر الموظف...' },
              ...employees.map(e => ({ value: String(e.id), label: e.name }))
            ]} />
            <FormSelect label="نوع المتابعة" value={formData.follow_up_type} onChange={(v) => setFormData({...formData, follow_up_type: v as any})} options={[
              { value: 'call', label: 'اتصال هاتفي' },
              { value: 'visit', label: 'زيارة' },
              { value: 'message', label: 'رسالة' },
            ]} />
          </div>
          <FormSelect label="الحالة" value={formData.status} onChange={(v) => setFormData({...formData, status: v as any})} options={[
            { value: 'pending', label: 'قيد الانتظار' },
            { value: 'completed', label: 'مكتمل' },
            { value: 'no_answer', label: 'لا يرد' },
            { value: 'rescheduled', label: 'مؤجل' },
            { value: 'device_sent', label: 'تم إرسال الجهاز' },
          ]} />
          <FormTextarea label="ملاحظات" value={formData.notes} onChange={(v) => setFormData({...formData, notes: v})} />
          <FormInput label="النتيجة" value={formData.result} onChange={(v) => setFormData({...formData, result: v})} />
          <FormInput label="تاريخ المتابعة القادمة" type="date" value={formData.next_follow_up_date} onChange={(v) => setFormData({...formData, next_follow_up_date: v})} />
        </div>
      </CustomModal>
    </div>
  )
}
