'use client'

import { useEffect, useState } from 'react'
import { supabase, PayrollRecord, Employee } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, StyledSelect } from '@/components/ActionButtons'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Tooltip, Spinner } from '@nextui-org/react'
import { Banknote, Edit, Trash2, Calculator } from 'lucide-react'

export default function Payroll() {
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [isOpen, setIsOpen] = useState(false)
  const [editItem, setEditItem] = useState<PayrollRecord | null>(null)
  const [formData, setFormData] = useState({
    employee_id: 0, period_month: month, period_year: year,
    base_salary: 0, bonus: 0, deductions: 0, net_paid: 0, notes: '', is_paid: false,
  })

  useEffect(() => { fetchAll() }, [month, year])

  async function fetchAll() {
    setLoading(true)
    const [{ data: pr }, { data: emps }] = await Promise.all([
      supabase.from('payroll_records').select('*, employee:employees(id,name,department,base_salary)').eq('period_month', month).eq('period_year', year).order('created_at', { ascending: false }),
      supabase.from('employees').select('*').eq('is_active', true).order('name'),
    ])
    setRecords(pr || [])
    setEmployees(emps || [])
    setLoading(false)
  }

  function openAdd() {
    setEditItem(null)
    setFormData({ employee_id: 0, period_month: month, period_year: year, base_salary: 0, bonus: 0, deductions: 0, net_paid: 0, notes: '', is_paid: false })
    setIsOpen(true)
  }

  function openEdit(item: PayrollRecord) {
    setEditItem(item)
    setFormData({
      employee_id: item.employee_id, period_month: item.period_month, period_year: item.period_year,
      base_salary: item.base_salary, bonus: item.bonus, deductions: item.deductions,
      net_paid: item.net_paid, notes: item.notes || '', is_paid: item.is_paid,
    })
    setIsOpen(true)
  }

  function selectEmployee(empId: string) {
    const emp = employees.find(e => e.id === parseInt(empId))
    if (emp) {
      const base = emp.base_salary || 0
      setFormData(prev => ({ ...prev, employee_id: emp.id, base_salary: base, net_paid: base + prev.bonus - prev.deductions }))
    }
  }

  async function handleSubmit() {
    const payload = { ...formData, net_paid: formData.base_salary + formData.bonus - formData.deductions }
    if (!payload.employee_id) { alert('يرجى اختيار الموظف'); return }
    if (editItem) { await supabase.from('payroll_records').update(payload).eq('id', editItem.id) }
    else { await supabase.from('payroll_records').insert([payload]) }
    setIsOpen(false); fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      await supabase.from('payroll_records').delete().eq('id', id); fetchAll()
    }
  }

  async function generateAll() {
    if (!confirm('سيتم إنشاء سجلات رواتب لجميع الموظفين النشطين. متأكد؟')) return
    const existing = records.map(r => r.employee_id)
    const newRecords = employees.filter(e => !existing.includes(e.id)).map(e => ({
      employee_id: e.id, period_month: month, period_year: year,
      base_salary: e.base_salary || 0, bonus: 0, deductions: 0,
      net_paid: e.base_salary || 0, is_paid: false,
    }))
    if (newRecords.length > 0) { await supabase.from('payroll_records').insert(newRecords); fetchAll() }
    else { alert('جميع الموظفين لديهم سجلات بالفعل') }
  }

  async function togglePaid(item: PayrollRecord) {
    await supabase.from('payroll_records').update({ is_paid: !item.is_paid }).eq('id', item.id); fetchAll()
  }

  const totalNet = records.reduce((s, r) => s + r.net_paid, 0)
  const totalPaid = records.filter(r => r.is_paid).reduce((s, r) => s + r.net_paid, 0)
  const totalUnpaid = records.filter(r => !r.is_paid).reduce((s, r) => s + r.net_paid, 0)

  const monthOptions = [1,2,3,4,5,6,7,8,9,10,11,12].map(m => ({ value: m, label: `شهر ${m}` }))
  const yearOptions = [2024,2025,2026].map(y => ({ value: y, label: String(y) }))

  return (
    <div className="w-full">
      <PageHeader title="الرواتب" subtitle={`كشف رواتب شهر ${month}/${year}`} icon={Banknote} iconBg="from-rose-500 to-rose-600" buttonLabel="إضافة سجل" onButtonClick={openAdd}>
        <StyledSelect value={month} onChange={(v) => setMonth(Number(v))} options={monthOptions} minWidth="110px" />
        <StyledSelect value={year} onChange={(v) => setYear(Number(v))} options={yearOptions} minWidth="90px" />
        <button onClick={generateAll} className="action-btn flex items-center gap-2 text-xs"><Calculator className="h-3 w-3" />إنشاء للكل</button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">إجمالي الرواتب</p>
          <p className="text-2xl font-extrabold text-rose-600">{formatCurrency(totalNet)}</p>
        </CardBody></Card>
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">تم الصرف</p>
          <p className="text-2xl font-extrabold text-green-600">{formatCurrency(totalPaid)}</p>
        </CardBody></Card>
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">لم يتم الصرف</p>
          <p className="text-2xl font-extrabold text-red-600">{formatCurrency(totalUnpaid)}</p>
        </CardBody></Card>
      </div>

      <Card className="shadow-md">
        <CardBody className="p-0">
          {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
          : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Banknote className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد سجلات رواتب</p>
              <button onClick={generateAll} className="action-btn mt-3">إنشاء رواتب لجميع الموظفين</button>
            </div>
          ) : (
            <Table aria-label="جدول الرواتب" removeWrapper className="min-w-full">
              <TableHeader>
                <TableColumn className="text-right font-bold">الموظف</TableColumn>
                <TableColumn className="text-right font-bold">الراتب الأساسي</TableColumn>
                <TableColumn className="text-right font-bold">المكافآت</TableColumn>
                <TableColumn className="text-right font-bold">الخصومات</TableColumn>
                <TableColumn className="text-right font-bold">الصافي</TableColumn>
                <TableColumn className="text-right font-bold">الحالة</TableColumn>
                <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
              </TableHeader>
              <TableBody>
                {records.map(r => {
                  const emp = r.employee as any
                  return (
                    <TableRow key={r.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold">{emp?.name || '-'}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(r.base_salary)}</TableCell>
                      <TableCell className="text-sm text-green-600 font-semibold">{r.bonus > 0 ? `+${formatCurrency(r.bonus)}` : '-'}</TableCell>
                      <TableCell className="text-sm text-red-600 font-semibold">{r.deductions > 0 ? `-${formatCurrency(r.deductions)}` : '-'}</TableCell>
                      <TableCell className="font-extrabold text-rose-600">{formatCurrency(r.net_paid)}</TableCell>
                      <TableCell>
                        <button onClick={() => togglePaid(r)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all duration-200 ${r.is_paid ? 'border-green-400 bg-green-50 text-green-700 hover:bg-green-100' : 'border-red-400 bg-red-50 text-red-700 hover:bg-red-100'}`}>
                          {r.is_paid ? 'تم الصرف' : 'لم يُصرف'}
                        </button>
                      </TableCell>
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

      <CustomModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editItem ? 'تعديل سجل راتب' : 'إضافة سجل راتب'} footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={() => setIsOpen(false)} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'إضافة'} onClick={handleSubmit} color="from-rose-500 to-rose-600" />
        </>
      }>
        <div className="flex flex-col gap-4">
          <FormSelect label="الموظف" value={String(formData.employee_id)} onChange={selectEmployee} required options={[
            { value: '0', label: 'اختر الموظف...' },
            ...employees.map(e => ({ value: String(e.id), label: `${e.name} (${formatCurrency(e.base_salary || 0)})` }))
          ]} />
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
