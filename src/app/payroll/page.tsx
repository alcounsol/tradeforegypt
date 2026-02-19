'use client'

import { useEffect, useState } from 'react'
import { supabase, PayrollRecord, Employee } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, StyledSelect } from '@/components/ActionButtons'
import { Card, CardBody, Button, Tooltip, Spinner } from '@nextui-org/react'
import { Banknote, Edit, Trash2, Calculator, Download } from 'lucide-react'
import { exportToCSV } from '@/lib/export'

export default function Payroll() {
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [isOpen, setIsOpen] = useState(false)
  const [editItem, setEditItem] = useState<PayrollRecord | null>(null)
  const [formData, setFormData] = useState({ employee_id: 0, period_month: month, period_year: year, base_salary: 0, bonus: 0, deductions: 0, net_paid: 0, notes: '', is_paid: false })

  useEffect(() => { fetchAll() }, [month, year])

  async function fetchAll() {
    setLoading(true)
    const [{ data: pr }, { data: emps }] = await Promise.all([
      supabase.from('payroll_records').select('*, employee:employees(id,name,department,base_salary)').eq('period_month', month).eq('period_year', year).order('created_at', { ascending: false }),
      supabase.from('employees').select('*').eq('is_active', true).order('name'),
    ])
    setRecords(pr || []); setEmployees(emps || []); setLoading(false)
  }

  function openAdd() { setEditItem(null); setFormData({ employee_id: 0, period_month: month, period_year: year, base_salary: 0, bonus: 0, deductions: 0, net_paid: 0, notes: '', is_paid: false }); setIsOpen(true) }

  function openEdit(item: PayrollRecord) {
    setEditItem(item)
    setFormData({ employee_id: item.employee_id, period_month: item.period_month, period_year: item.period_year, base_salary: item.base_salary, bonus: item.bonus, deductions: item.deductions, net_paid: item.net_paid, notes: item.notes || '', is_paid: item.is_paid })
    setIsOpen(true)
  }

  function selectEmployee(empId: string) {
    const emp = employees.find(e => e.id === parseInt(empId))
    if (emp) { const base = emp.base_salary || 0; setFormData(prev => ({ ...prev, employee_id: emp.id, base_salary: base, net_paid: base + prev.bonus - prev.deductions })) }
  }

  async function handleSubmit() {
    const payload = { ...formData, net_paid: formData.base_salary + formData.bonus - formData.deductions }
    if (!payload.employee_id) { alert('يرجى اختيار الموظف'); return }
    if (editItem) { await supabase.from('payroll_records').update(payload).eq('id', editItem.id) }
    else { await supabase.from('payroll_records').insert([payload]) }
    setIsOpen(false); fetchAll()
  }

  async function handleDelete(id: number) { if (confirm('هل أنت متأكد من حذف هذا السجل؟')) { await supabase.from('payroll_records').delete().eq('id', id); fetchAll() } }

  async function generateAll() {
    if (!confirm('سيتم إنشاء سجلات رواتب لجميع الموظفين النشطين مع إضافة الحوافز تلقائياً. متأكد؟')) return
    const existing = records.map(r => r.employee_id)
    const { data: incentives } = await supabase.from('incentives').select('*').eq('period_month', month).eq('period_year', year)
    const incentivesByEmployee: Record<number, number> = {}
    if (incentives) { incentives.forEach(inc => { incentivesByEmployee[inc.employee_id] = (incentivesByEmployee[inc.employee_id] || 0) + inc.total_amount }) }
    const newRecords = employees.filter(e => !existing.includes(e.id)).map(e => {
      const empIncentives = incentivesByEmployee[e.id] || 0
      const baseSalary = e.base_salary || 0
      return { employee_id: e.id, period_month: month, period_year: year, base_salary: baseSalary, bonus: empIncentives, deductions: 0, net_paid: baseSalary + empIncentives, is_paid: false }
    })
    if (newRecords.length > 0) { await supabase.from('payroll_records').insert(newRecords); fetchAll() }
    else { alert('جميع الموظفين لديهم سجلات بالفعل') }
  }

  async function togglePaid(item: PayrollRecord) {
    const newPaid = !item.is_paid
    await supabase.from('payroll_records').update({ is_paid: newPaid }).eq('id', item.id)
    if (newPaid) {
      const emp = item.employee as any
      await supabase.from('transactions').insert([{ transaction_date: new Date().toISOString().split('T')[0], type: 'expense', category: 'رواتب', amount: item.net_paid, description: `راتب ${emp?.name || ''} - شهر ${item.period_month}/${item.period_year}`, reference_type: 'payroll', reference_id: item.id, payroll_id: item.id }])
    } else { await supabase.from('transactions').delete().eq('reference_type', 'payroll').eq('reference_id', item.id) }
    fetchAll()
  }

  const totalNet = records.reduce((s, r) => s + r.net_paid, 0)
  const totalPaid = records.filter(r => r.is_paid).reduce((s, r) => s + r.net_paid, 0)
  const totalUnpaid = records.filter(r => !r.is_paid).reduce((s, r) => s + r.net_paid, 0)

  const monthOptions = [1,2,3,4,5,6,7,8,9,10,11,12].map(m => ({ value: m, label: `شهر ${m}` }))
  const yearOptions = [2024,2025,2026].map(y => ({ value: y, label: String(y) }))

  function handleExport() {
    const exportData = records.map(r => { const emp = r.employee as any; return { employee: emp?.name || '-', base_salary: r.base_salary, bonus: r.bonus, deductions: r.deductions, net_paid: r.net_paid, status: r.is_paid ? 'تم الصرف' : 'لم يصرف' } })
    exportToCSV(exportData as any, [{key:'employee',label:'الموظف'},{key:'base_salary',label:'الراتب الأساسي'},{key:'bonus',label:'المكافآت'},{key:'deductions',label:'الخصومات'},{key:'net_paid',label:'الصافي'},{key:'status',label:'الحالة'}], `payroll_${month}_${year}`)
  }

  return (
    <div className="w-full">
      <PageHeader title="الرواتب" subtitle={`كشف رواتب شهر ${month}/${year}`} icon={Banknote} iconBg="from-rose-500 to-rose-600" buttonLabel="إضافة سجل" onButtonClick={openAdd}>
        <StyledSelect value={month} onChange={(v) => setMonth(Number(v))} options={monthOptions} minWidth="110px" />
        <StyledSelect value={year} onChange={(v) => setYear(Number(v))} options={yearOptions} minWidth="90px" />
        <button onClick={generateAll} className="action-btn flex items-center gap-2 text-xs"><Calculator className="h-3 w-3" />إنشاء للكل</button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
          <p className="text-[10px] font-bold text-slate-400 mb-0.5">إجمالي الرواتب</p>
          <p className="text-xl font-black text-rose-600">{formatCurrency(totalNet)}</p>
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

      {loading ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex items-center justify-center h-48"><Spinner size="lg" /></CardBody></Card>
      ) : records.length === 0 ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Banknote className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد سجلات رواتب</p>
          <button onClick={generateAll} className="action-btn mt-3">إنشاء رواتب لجميع الموظفين</button>
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
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الراتب الأساسي</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">المكافآت</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الخصومات</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الصافي</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الحالة</th>
                  <th className="text-center p-3 font-extrabold text-slate-600 text-xs">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, idx) => {
                  const emp = r.employee as any
                  return (
                    <tr key={r.id} className="border-b border-slate-100 transition-all hover:bg-blue-50/30">
                      <td className="p-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-extrabold text-sm text-slate-800">{emp?.name || '-'}</td>
                      <td className="p-3 text-sm text-slate-600">{formatCurrency(r.base_salary)}</td>
                      <td className="p-3 text-sm font-bold text-green-600">{r.bonus > 0 ? `+${formatCurrency(r.bonus)}` : '-'}</td>
                      <td className="p-3 text-sm font-bold text-red-600">{r.deductions > 0 ? `-${formatCurrency(r.deductions)}` : '-'}</td>
                      <td className="p-3 font-extrabold text-rose-600 text-sm">{formatCurrency(r.net_paid)}</td>
                      <td className="p-3">
                        <button onClick={() => togglePaid(r)} className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all duration-200 ${r.is_paid ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100' : 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'}`}>
                          {r.is_paid ? 'تم الصرف' : 'لم يُصرف'}
                        </button>
                      </td>
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
                <tr className="bg-gradient-to-l from-rose-50 to-rose-100 border-t-2 border-rose-200">
                  <td colSpan={2} className="p-3 text-sm font-extrabold text-rose-800">الإجمالي ({records.length} موظف)</td>
                  <td className="p-3 text-sm font-black text-slate-800">{formatCurrency(records.reduce((s, r) => s + r.base_salary, 0))}</td>
                  <td className="p-3 text-sm font-black text-green-800">{formatCurrency(records.reduce((s, r) => s + r.bonus, 0))}</td>
                  <td className="p-3 text-sm font-black text-red-800">{formatCurrency(records.reduce((s, r) => s + r.deductions, 0))}</td>
                  <td className="p-3 text-sm font-black text-rose-800">{formatCurrency(totalNet)}</td>
                  <td colSpan={2} className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </CardBody>
        </Card>
      )}

      <CustomModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editItem ? 'تعديل سجل راتب' : 'إضافة سجل راتب'} footer={
        <><ModalCancelButton label="إلغاء" onClick={() => setIsOpen(false)} /><ModalSubmitButton label={editItem ? 'تحديث' : 'إضافة'} onClick={handleSubmit} color="from-rose-500 to-rose-600" /></>
      }>
        <div className="flex flex-col gap-4">
          <FormSelect label="الموظف" value={String(formData.employee_id)} onChange={selectEmployee} required options={[{ value: '0', label: 'اختر الموظف...' }, ...employees.map(e => ({ value: String(e.id), label: `${e.name} (${formatCurrency(e.base_salary || 0)})` }))]} />
          <div className="grid grid-cols-3 gap-4">
            <FormInput label="الراتب الأساسي" type="number" value={formData.base_salary} onChange={(v) => setFormData(p => ({ ...p, base_salary: parseFloat(v) || 0 }))} />
            <FormInput label="المكافآت" type="number" value={formData.bonus} onChange={(v) => setFormData(p => ({ ...p, bonus: parseFloat(v) || 0 }))} />
            <FormInput label="الخصومات" type="number" value={formData.deductions} onChange={(v) => setFormData(p => ({ ...p, deductions: parseFloat(v) || 0 }))} />
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-center">
            <p className="text-xs text-slate-500">الصافي المستحق</p>
            <p className="text-2xl font-extrabold text-rose-600">{formatCurrency(formData.base_salary + formData.bonus - formData.deductions)}</p>
          </div>
          <FormInput label="ملاحظات" value={formData.notes} onChange={(v) => setFormData({...formData, notes: v})} />
        </div>
      </CustomModal>
    </div>
  )
}
