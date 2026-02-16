'use client'

import { useEffect, useState } from 'react'
import { supabase, PayrollRecord, Employee } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect } from '@/components/FormInput'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Tooltip, Spinner } from '@nextui-org/react'
import { Wallet, Edit, Trash2 } from 'lucide-react'

export default function Payroll() {
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const onOpen = () => setIsOpen(true)
  const onClose = () => setIsOpen(false)
  const [formData, setFormData] = useState({ employee_id: '', period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear(), bonus: 0, deductions: 0, net_paid: 0 })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: r }, { data: e }] = await Promise.all([
      supabase.from('payroll_records').select('*, employees(name, base_salary)').order('period_year', { ascending: false }).order('period_month', { ascending: false }),
      supabase.from('employees').select('*').eq('is_active', true),
    ])
    setRecords(r || []); setEmployees(e || [])
    setLoading(false)
  }

  function openAdd() {
    setFormData({ employee_id: '', period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear(), bonus: 0, deductions: 0, net_paid: 0 })
    onOpen()
  }

  async function handleSubmit() {
    const emp = employees.find(e => e.id === parseInt(formData.employee_id))
    const baseSalary = emp?.base_salary || 0
    const net = baseSalary + formData.bonus - formData.deductions
    await supabase.from('payroll_records').insert([{ ...formData, employee_id: parseInt(formData.employee_id), net_paid: net }])
    onClose(); fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) { await supabase.from('payroll_records').delete().eq('id', id); fetchAll() }
  }

  const months = Array.from({length: 12}, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))

  return (
    <div className="w-full">
        <PageHeader title="الرواتب" subtitle="إدارة رواتب الموظفين" icon={Wallet} iconBg="from-pink-500 to-pink-600" buttonLabel="صرف راتب" onButtonClick={openAdd} />

        <Card className="shadow-md">
          <CardBody className="p-0">
            {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
            : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Wallet className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد سجلات رواتب</p>
              </div>
            ) : (
              <Table aria-label="جدول الرواتب" removeWrapper className="min-w-full">
                <TableHeader>
                  <TableColumn className="text-right font-bold">الموظف</TableColumn>
                  <TableColumn className="text-right font-bold">الفترة</TableColumn>
                  <TableColumn className="text-right font-bold">المكافآت</TableColumn>
                  <TableColumn className="text-right font-bold">الخصومات</TableColumn>
                  <TableColumn className="text-right font-bold">صافي المدفوع</TableColumn>
                  <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
                </TableHeader>
                <TableBody>
                  {records.map((r: any) => (
                    <TableRow key={r.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold">{r.employees?.name || '-'}</TableCell>
                      <TableCell><Chip size="sm" variant="flat">{r.period_month}/{r.period_year}</Chip></TableCell>
                      <TableCell className="text-emerald-600 font-semibold">{formatCurrency(r.bonus || 0)}</TableCell>
                      <TableCell className="text-rose-600 font-semibold">{formatCurrency(r.deductions || 0)}</TableCell>
                      <TableCell className="font-extrabold text-pink-600">{formatCurrency(r.net_paid || 0)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <CustomModal isOpen={isOpen} onClose={onClose} title="صرف راتب" footer={
            <>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">إلغاء</button>
              <button onClick={handleSubmit} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors">صرف</button>
            </>
          }>
            <div className="flex flex-col gap-4">
              <FormSelect label="الموظف" value={formData.employee_id} onChange={(v) => setFormData({...formData, employee_id: v})} options={employees.map(e => ({ value: String(e.id), label: e.name }))} placeholder="اختر الموظف" required />
              <div className="grid grid-cols-2 gap-4">
                <FormSelect label="الشهر" value={String(formData.period_month)} onChange={(v) => setFormData({...formData, period_month: parseInt(v)})} options={months} />
                <FormInput label="السنة" type="number" value={formData.period_year} onChange={(v) => setFormData({...formData, period_year: parseInt(v) || 2026})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="المكافآت" type="number" value={formData.bonus} onChange={(v) => setFormData({...formData, bonus: parseFloat(v) || 0})} />
                <FormInput label="الخصومات" type="number" value={formData.deductions} onChange={(v) => setFormData({...formData, deductions: parseFloat(v) || 0})} />
              </div>
            </div>
          </CustomModal>
    </div>
  )
}
