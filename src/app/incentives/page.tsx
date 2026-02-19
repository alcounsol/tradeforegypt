'use client'

import { useEffect, useState } from 'react'
import { supabase, Incentive, Employee } from '@/lib/supabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea, FormCheckbox } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Button, Tooltip, Spinner } from '@nextui-org/react'
import { Gift, Edit, Trash2, Download } from 'lucide-react'
import { exportToCSV, SECTIONS } from '@/lib/export'

const typeLabels: Record<string, { label: string; color: string }> = {
  customer_visit: { label: 'حافز زيارة عميل', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  data_entry: { label: 'حافز إدخال بيانات', color: 'bg-purple-50 text-purple-600 border-purple-100' },
  device_pickup: { label: 'حافز إحضار جهاز', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  sales_commission: { label: 'عمولة مبيعات', color: 'bg-amber-50 text-amber-600 border-amber-100' },
  bonus: { label: 'مكافأة', color: 'bg-red-50 text-red-600 border-red-100' },
}

export default function IncentivesPage() {
  const [records, setRecords] = useState<Incentive[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editItem, setEditItem] = useState<Incentive | null>(null)
  const [formData, setFormData] = useState({ employee_id: 0, incentive_type: 'bonus' as string, amount: 0, description: '', is_paid: false })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: incs }, { data: emps }] = await Promise.all([
      supabase.from('incentives').select('*, employee:employees(id,name,department)').order('created_at', { ascending: false }),
      supabase.from('employees').select('*').eq('is_active', true).order('name'),
    ])
    setRecords(incs || []); setEmployees(emps || []); setLoading(false)
  }

  const filtered = records.filter(r => {
    const emp = r.employee as any
    return !search || emp?.name?.includes(search) || r.description?.includes(search)
  })

  function openAdd() { setEditItem(null); setFormData({ employee_id: 0, incentive_type: 'bonus', amount: 0, description: '', is_paid: false }); setIsOpen(true) }

  function openEdit(item: Incentive) {
    setEditItem(item)
    setFormData({ employee_id: item.employee_id || 0, incentive_type: item.incentive_type as any, amount: item.amount, description: item.description || '', is_paid: item.is_paid })
    setIsOpen(true)
  }

  async function handleSubmit() {
    const payload: any = { ...formData, period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear() }
    if (!payload.employee_id) { alert('يرجى اختيار الموظف'); return }
    if (editItem) { await supabase.from('incentives').update(payload).eq('id', editItem.id) }
    else { await supabase.from('incentives').insert([payload]) }
    setIsOpen(false); fetchAll()
  }

  async function handleDelete(id: number) { if (confirm('هل أنت متأكد من حذف هذا الحافز؟')) { await supabase.from('incentives').delete().eq('id', id); fetchAll() } }

  async function togglePaid(item: Incentive) { await supabase.from('incentives').update({ is_paid: !item.is_paid }).eq('id', item.id); fetchAll() }

  const totalUnpaid = records.filter(r => !r.is_paid).reduce((s, r) => s + r.amount, 0)
  const totalPaid = records.filter(r => r.is_paid).reduce((s, r) => s + r.amount, 0)

  const empTotals = records.reduce((acc, r) => {
    const emp = r.employee as any
    const name = emp?.name || 'غير محدد'
    if (!acc[name]) acc[name] = { total: 0, unpaid: 0 }
    acc[name].total += r.amount
    if (!r.is_paid) acc[name].unpaid += r.amount
    return acc
  }, {} as Record<string, { total: number; unpaid: number }>)

  function handleExport() { exportToCSV(filtered as any, SECTIONS.incentives.headers, 'incentives') }

  return (
    <div className="w-full">
      <PageHeader title="الحوافز" subtitle="إدارة حوافز ومكافآت الموظفين" icon={Gift} iconBg="from-yellow-500 to-yellow-600" buttonLabel="إضافة حافز" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث عن موظف..." />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
          <p className="text-[10px] font-bold text-slate-400 mb-0.5">إجمالي الحوافز</p>
          <p className="text-xl font-black text-yellow-600">{formatCurrency(totalPaid + totalUnpaid)}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
          <p className="text-[10px] font-bold text-slate-400 mb-0.5">تم الصرف</p>
          <p className="text-xl font-black text-green-600">{formatCurrency(totalPaid)}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
          <p className="text-[10px] font-bold text-slate-400 mb-0.5">لم يتم الصرف</p>
          <p className="text-xl font-black text-red-600">{formatCurrency(totalUnpaid)}</p>
        </CardBody></Card>
      </div>

      {Object.keys(empTotals).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {Object.entries(empTotals).map(([name, data]) => (
            <Card key={name} className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
              <p className="text-[10px] font-bold text-slate-500 truncate">{name}</p>
              <p className="text-sm font-extrabold text-slate-800">{formatCurrency(data.total)}</p>
              {data.unpaid > 0 && <p className="text-[10px] text-red-500 font-semibold">غير مصروف: {formatCurrency(data.unpaid)}</p>}
            </CardBody></Card>
          ))}
        </div>
      )}

      {loading ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex items-center justify-center h-48"><Spinner size="lg" /></CardBody></Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Gift className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد حوافز</p>
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
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الموظف</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">النوع</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">المبلغ</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الوصف</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الحالة</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">التاريخ</th>
                  <th className="text-center p-3 font-extrabold text-slate-600 text-xs">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const emp = r.employee as any
                  const cfg = typeLabels[r.incentive_type] || typeLabels.bonus
                  return (
                    <tr key={r.id} className="border-b border-slate-100 transition-all hover:bg-blue-50/30">
                      <td className="p-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-extrabold text-sm text-slate-800">{emp?.name || '-'}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="p-3 font-extrabold text-yellow-600 text-sm">{formatCurrency(r.amount)}</td>
                      <td className="p-3 text-sm text-slate-600 max-w-[200px] truncate">{r.description || '-'}</td>
                      <td className="p-3">
                        <button onClick={() => togglePaid(r)} className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all duration-200 ${r.is_paid ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100' : 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'}`}>
                          {r.is_paid ? 'تم الصرف' : 'لم يُصرف'}
                        </button>
                      </td>
                      <td className="p-3 text-sm text-slate-500">{r.incentive_date ? formatDate(r.incentive_date) : '-'}</td>
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
              <tfoot>
                <tr className="bg-gradient-to-l from-yellow-50 to-yellow-100 border-t-2 border-yellow-200">
                  <td colSpan={3} className="p-3 text-sm font-extrabold text-yellow-800">الإجمالي ({filtered.length} حافز)</td>
                  <td className="p-3 text-sm font-black text-yellow-800">{formatCurrency(filtered.reduce((s, r) => s + r.amount, 0))}</td>
                  <td colSpan={4} className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </CardBody>
        </Card>
      )}

      <CustomModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editItem ? 'تعديل حافز' : 'إضافة حافز جديد'} footer={
        <><ModalCancelButton label="إلغاء" onClick={() => setIsOpen(false)} /><ModalSubmitButton label={editItem ? 'تحديث' : 'إضافة'} onClick={handleSubmit} color="from-yellow-500 to-yellow-600" /></>
      }>
        <div className="flex flex-col gap-4">
          <FormSelect label="الموظف" value={String(formData.employee_id)} onChange={(v) => setFormData({...formData, employee_id: parseInt(v) || 0})} required options={[{ value: '0', label: 'اختر الموظف...' }, ...employees.map(e => ({ value: String(e.id), label: e.name }))]} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="نوع الحافز" value={formData.incentive_type} onChange={(v) => setFormData({...formData, incentive_type: v as any})} options={Object.entries(typeLabels).map(([k, v]) => ({ value: k, label: v.label }))} />
            <FormInput label="المبلغ" type="number" value={formData.amount} onChange={(v) => setFormData({...formData, amount: parseFloat(v) || 0})} required />
          </div>
          <FormTextarea label="الوصف" value={formData.description} onChange={(v) => setFormData({...formData, description: v})} />
          <FormCheckbox label="تم الصرف" checked={formData.is_paid} onChange={(v) => setFormData({...formData, is_paid: v})} />
        </div>
      </CustomModal>
    </div>
  )
}
