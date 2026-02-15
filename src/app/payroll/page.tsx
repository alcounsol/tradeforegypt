'use client'

import { useEffect, useState } from 'react'
import { supabase, PayrollRecord, Employee } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import Sidebar from '@/components/Sidebar'
import PageHeader from '@/components/PageHeader'
import {
  Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, Chip, Tooltip, Spinner, Select, SelectItem
} from '@nextui-org/react'
import { Wallet, Trash2 } from 'lucide-react'

export default function Payroll() {
  const [records, setRecords] = useState<(PayrollRecord & { employee_name?: string })[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [formData, setFormData] = useState({ employee_id: 0, period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear(), base_salary: 0, bonus: 0, deductions: 0, net_paid: 0, paid_date: new Date().toISOString().split('T')[0] })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: p }, { data: emp }] = await Promise.all([
      supabase.from('payroll_records').select('*').order('period_year', { ascending: false }).order('period_month', { ascending: false }),
      supabase.from('employees').select('*').eq('is_active', true),
    ])
    setEmployees(emp || [])
    setRecords((p || []).map(r => ({ ...r, employee_name: emp?.find(e => e.id === r.employee_id)?.name || '-' })))
    setLoading(false)
  }

  function openAdd() {
    setFormData({ employee_id: 0, period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear(), base_salary: 0, bonus: 0, deductions: 0, net_paid: 0, paid_date: new Date().toISOString().split('T')[0] })
    onOpen()
  }

  function selectEmployee(id: number) {
    const emp = employees.find(e => e.id === id)
    const base = emp?.base_salary || 0
    setFormData(prev => ({ ...prev, employee_id: id, base_salary: base, net_paid: base + prev.bonus - prev.deductions }))
  }

  function updateCalc(field: string, value: number) {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      updated.net_paid = updated.base_salary + updated.bonus - updated.deductions
      return updated
    })
  }

  async function handleSubmit() {
    await supabase.from('payroll_records').insert([formData])
    onClose(); fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) { await supabase.from('payroll_records').delete().eq('id', id); fetchAll() }
  }

  return (
    <div className="flex min-h-screen" dir="rtl">
      <Sidebar />
      <main className="flex-1 mr-[260px] p-8">
        <PageHeader title="الرواتب" subtitle="إدارة رواتب الموظفين" icon={Wallet} iconColor="text-pink-500" buttonLabel="صرف راتب" onButtonClick={openAdd} />

        <Card className="shadow-md">
          <CardBody className="p-0">
            {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
            : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Wallet className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد سجلات رواتب</p>
              </div>
            ) : (
              <Table aria-label="جدول الرواتب" removeWrapper>
                <TableHeader>
                  <TableColumn className="text-right font-bold">الموظف</TableColumn>
                  <TableColumn className="text-right font-bold">الفترة</TableColumn>
                  <TableColumn className="text-right font-bold">الأساسي</TableColumn>
                  <TableColumn className="text-right font-bold">المكافآت</TableColumn>
                  <TableColumn className="text-right font-bold">الخصومات</TableColumn>
                  <TableColumn className="text-right font-bold">الصافي</TableColumn>
                  <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
                </TableHeader>
                <TableBody>
                  {records.map(r => (
                    <TableRow key={r.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold">{r.employee_name}</TableCell>
                      <TableCell><Chip size="sm" variant="flat" color="secondary" className="font-bold">{r.period_month}/{r.period_year}</Chip></TableCell>
                      <TableCell className="font-semibold">{formatCurrency(r.base_salary)}</TableCell>
                      <TableCell className="font-semibold text-emerald-600">{formatCurrency(r.bonus)}</TableCell>
                      <TableCell className="font-semibold text-rose-600">{formatCurrency(r.deductions)}</TableCell>
                      <TableCell className="font-extrabold text-violet-600">{formatCurrency(r.net_paid)}</TableCell>
                      <TableCell>
                        <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Modal isOpen={isOpen} onClose={onClose} size="xl" backdrop="blur" placement="center">
          <ModalContent>
            <ModalHeader className="font-extrabold">صرف راتب</ModalHeader>
            <ModalBody className="gap-4">
              <Select label="الموظف" isRequired selectedKeys={formData.employee_id ? [String(formData.employee_id)] : []} onSelectionChange={(keys) => selectEmployee(Number(Array.from(keys)[0]))} variant="bordered">
                {employees.map(e => <SelectItem key={String(e.id)}>{e.name}</SelectItem>)}
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <Input label="الشهر" type="number" value={String(formData.period_month)} onValueChange={(v) => setFormData({...formData, period_month: parseInt(v) || 1})} variant="bordered" />
                <Input label="السنة" type="number" value={String(formData.period_year)} onValueChange={(v) => setFormData({...formData, period_year: parseInt(v) || 2026})} variant="bordered" />
              </div>
              <Input label="الراتب الأساسي" type="number" value={String(formData.base_salary)} onValueChange={(v) => updateCalc('base_salary', parseFloat(v) || 0)} variant="bordered" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="المكافآت" type="number" value={String(formData.bonus)} onValueChange={(v) => updateCalc('bonus', parseFloat(v) || 0)} variant="bordered" />
                <Input label="الخصومات" type="number" value={String(formData.deductions)} onValueChange={(v) => updateCalc('deductions', parseFloat(v) || 0)} variant="bordered" />
              </div>
              <Card className="bg-gradient-to-r from-violet-50 to-purple-50 border-none">
                <CardBody className="flex flex-row items-center justify-between p-4">
                  <span className="font-bold text-slate-700">صافي الراتب</span>
                  <span className="text-2xl font-extrabold text-violet-600">{formatCurrency(formData.net_paid)}</span>
                </CardBody>
              </Card>
              <Input label="تاريخ الصرف" type="date" value={formData.paid_date} onValueChange={(v) => setFormData({...formData, paid_date: v})} variant="bordered" />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose} className="font-bold">إلغاء</Button>
              <Button color="primary" variant="shadow" onPress={handleSubmit} className="font-bold">صرف</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </main>
    </div>
  )
}
