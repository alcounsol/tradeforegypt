'use client'

import { useEffect, useState } from 'react'
import { supabase, FollowUp, Employee, Customer, customerStatusLabels } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Button, Tooltip, Spinner } from '@nextui-org/react'
import { PhoneForwarded, Edit, Trash2, CheckCircle, Clock, XCircle, RotateCcw, Send, Download } from 'lucide-react'
import { exportToCSV, SECTIONS } from '@/lib/export'

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'قيد الانتظار', color: 'bg-amber-50 text-amber-600 border-amber-100', icon: Clock },
  completed: { label: 'مكتمل', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle },
  no_answer: { label: 'لا يرد', color: 'bg-red-50 text-red-600 border-red-100', icon: XCircle },
  rescheduled: { label: 'مؤجل', color: 'bg-slate-50 text-slate-600 border-slate-200', icon: RotateCcw },
  device_sent: { label: 'تم إرسال الجهاز', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: Send },
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
    setRecords(fups || []); setEmployees(emps || []); setCustomers(custs || [])
    setLoading(false)
  }

  const filtered = records.filter(r => {
    const cust = r.customer as any
    return (cust?.name?.includes(search) || cust?.phone?.includes(search) || '')
  })

  function openAdd() { setEditItem(null); setFormData({ customer_id: 0, employee_id: 0, follow_up_type: 'call', status: 'pending', notes: '', result: '', next_follow_up_date: '' }); setIsOpen(true) }

  function openEdit(item: FollowUp) {
    setEditItem(item)
    setFormData({ customer_id: item.customer_id || 0, employee_id: item.employee_id || 0, follow_up_type: item.follow_up_type || 'call', status: item.status || 'pending', notes: item.notes || '', result: item.result || '', next_follow_up_date: item.next_follow_up_date || '' })
    setIsOpen(true)
  }

  async function handleSubmit() {
    const payload: any = { ...formData }
    if (!payload.customer_id) { alert('يرجى اختيار العميل'); return }
    if (!payload.employee_id) delete payload.employee_id
    if (editItem) { await supabase.from('follow_ups').update(payload).eq('id', editItem.id) }
    else { await supabase.from('follow_ups').insert([payload]) }
    if (formData.status === 'device_sent') {
      await supabase.from('customers').update({ status: 'device_received' }).eq('id', formData.customer_id)
    } else if (formData.status === 'completed') {
      await supabase.from('customers').update({ status: 'contacted' }).eq('id', formData.customer_id)
    } else {
      await supabase.from('customers').update({ status: 'follow_up', assigned_follow_up_employee: formData.employee_id || null }).eq('id', formData.customer_id)
    }
    setIsOpen(false); fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) { await supabase.from('follow_ups').delete().eq('id', id); fetchAll() }
  }

  function handleExport() {
    exportToCSV(filtered as any, SECTIONS.follow_ups.headers, 'follow_ups')
  }

  return (
    <div className="w-full">
      <PageHeader title="المتابعة" subtitle="متابعة العملاء وحثهم على إرسال أجهزتهم" icon={PhoneForwarded} iconBg="from-sky-500 to-sky-600" buttonLabel="إضافة متابعة" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث عن عميل..." />
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <Card key={key} className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">{cfg.label}</p>
            <p className="text-lg sm:text-xl font-black text-slate-800">{records.filter(r => r.status === key).length}</p>
          </CardBody></Card>
        ))}
      </div>

      {loading ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex items-center justify-center h-48"><Spinner size="lg" /></CardBody></Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          <PhoneForwarded className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد متابعات</p>
        </CardBody></Card>
      ) : (
        <>
        <Card className="shadow-md border border-slate-100 hidden sm:block">
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
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">العميل</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الهاتف</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الجهاز</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الموظف</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الحالة</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">النتيجة</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">التاريخ</th>
                  <th className="text-center p-3 font-extrabold text-slate-600 text-xs">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const cust = r.customer as any
                  const emp = r.employee as any
                  const cfg = statusConfig[r.status] || statusConfig.pending
                  const StatusIcon = cfg.icon
                  return (
                    <tr key={r.id} className="border-b border-slate-100 transition-all hover:bg-blue-50/30">
                      <td className="p-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-extrabold text-sm text-slate-800">{cust?.name || '-'}</td>
                      <td className="p-3 text-sm text-slate-600">{cust?.phone || '-'}</td>
                      <td className="p-3 text-sm text-slate-600">{cust?.device_brand ? `${cust.device_brand} - ${cust.device_name || ''}` : '-'}</td>
                      <td className="p-3 text-sm font-bold text-slate-700">{emp?.name || '-'}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />{cfg.label}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-slate-600 max-w-[150px] truncate">{r.result || '-'}</td>
                      <td className="p-3 text-sm text-slate-500">{r.follow_up_date ? formatDate(r.follow_up_date) : '-'}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-0.5">
                          <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(r)}><Edit className="h-4 w-4" /></Button></Tooltip>
                          <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">{filtered.length} متابعة</span>
              <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-emerald-50 text-emerald-600 border-emerald-200">
                <Download className="h-3 w-3" />تصدير
              </button>
            </div>
            {filtered.map((r) => {
              const cust = r.customer as any
              const emp = r.employee as any
              const cfg = statusConfig[r.status] || statusConfig.pending
              return (
                <div key={r.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-sm text-slate-800">{cust?.name || '-'}</p>
                      {cust?.phone && <p className="text-[10px] text-slate-400">{cust.phone}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(r)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Edit className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(r.id)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${cfg.color}`}>{cfg.label}</span>
                    {emp?.name && <span className="text-slate-500">{emp.name}</span>}
                    <span className="text-slate-400">{r.follow_up_date ? formatDate(r.follow_up_date) : ''}</span>
                  </div>
                  {r.result && <p className="mt-1 text-[11px] text-slate-500 truncate">{r.result}</p>}
                </div>
              )
            })}
          </div>
        </>)}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormSelect label="موظف المتابعة" value={String(formData.employee_id)} onChange={(v) => setFormData({...formData, employee_id: parseInt(v) || 0})} options={[{ value: '0', label: 'اختر الموظف...' }, ...employees.map(e => ({ value: String(e.id), label: e.name }))]} />
            <FormSelect label="نوع المتابعة" value={formData.follow_up_type} onChange={(v) => setFormData({...formData, follow_up_type: v as any})} options={[{ value: 'call', label: 'اتصال هاتفي' }, { value: 'visit', label: 'زيارة' }, { value: 'message', label: 'رسالة' }]} />
          </div>
          <FormSelect label="الحالة" value={formData.status} onChange={(v) => setFormData({...formData, status: v as any})} options={[
            { value: 'pending', label: 'قيد الانتظار' }, { value: 'completed', label: 'مكتمل' }, { value: 'no_answer', label: 'لا يرد' }, { value: 'rescheduled', label: 'مؤجل' }, { value: 'device_sent', label: 'تم إرسال الجهاز' },
          ]} />
          <FormTextarea label="ملاحظات" value={formData.notes} onChange={(v) => setFormData({...formData, notes: v})} />
          <FormInput label="النتيجة" value={formData.result} onChange={(v) => setFormData({...formData, result: v})} />
          <FormInput label="تاريخ المتابعة القادمة" type="date" value={formData.next_follow_up_date} onChange={(v) => setFormData({...formData, next_follow_up_date: v})} />
        </div>
      </CustomModal>
    </div>
  )
}
