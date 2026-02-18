'use client'

import { useEffect, useState } from 'react'
import { supabase, Incentive, Employee } from '@/lib/supabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea, FormCheckbox } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Tooltip, Spinner } from '@nextui-org/react'
import { Gift, Edit, Trash2 } from 'lucide-react'

const typeLabels: Record<string, { label: string; color: any }> = {
  customer_visit: { label: 'حافز زيارة عميل', color: 'primary' },
  data_entry: { label: 'حافز إدخال بيانات', color: 'secondary' },
  device_pickup: { label: 'حافز إحضار جهاز', color: 'success' },
  sales_commission: { label: 'عمولة مبيعات', color: 'warning' },
  bonus: { label: 'مكافأة', color: 'danger' },
}

export default function IncentivesPage() {
  const [records, setRecords] = useState<Incentive[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editItem, setEditItem] = useState<Incentive | null>(null)
  const [formData, setFormData] = useState({
    employee_id: 0, incentive_type: 'bonus' as string, amount: 0,
    description: '', is_paid: false,
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: incs }, { data: emps }] = await Promise.all([
      supabase.from('incentives').select('*, employee:employees(id,name,department)').order('created_at', { ascending: false }),
      supabase.from('employees').select('*').eq('is_active', true).order('name'),
    ])
    setRecords(incs || [])
    setEmployees(emps || [])
    setLoading(false)
  }

  const filtered = records.filter(r => {
    const emp = r.employee as any
    return emp?.name?.includes(search) || r.description?.includes(search)
  })

  function openAdd() {
    setEditItem(null)
    setFormData({ employee_id: 0, incentive_type: 'bonus', amount: 0, description: '', is_paid: false })
    setIsOpen(true)
  }

  function openEdit(item: Incentive) {
    setEditItem(item)
    setFormData({
      employee_id: item.employee_id || 0, incentive_type: item.incentive_type as any,
      amount: item.amount, description: item.description || '', is_paid: item.is_paid,
    })
    setIsOpen(true)
  }

  async function handleSubmit() {
    const payload: any = {
      ...formData,
      period_month: new Date().getMonth() + 1,
      period_year: new Date().getFullYear(),
    }
    if (!payload.employee_id) { alert('يرجى اختيار الموظف'); return }

    if (editItem) {
      await supabase.from('incentives').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('incentives').insert([payload])
    }
    setIsOpen(false)
    fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا الحافز؟')) {
      await supabase.from('incentives').delete().eq('id', id)
      fetchAll()
    }
  }

  async function togglePaid(item: Incentive) {
    await supabase.from('incentives').update({ is_paid: !item.is_paid }).eq('id', item.id)
    fetchAll()
  }

  const totalUnpaid = records.filter(r => !r.is_paid).reduce((s, r) => s + r.amount, 0)
  const totalPaid = records.filter(r => r.is_paid).reduce((s, r) => s + r.amount, 0)

  // Group by employee
  const empTotals = records.reduce((acc, r) => {
    const emp = r.employee as any
    const name = emp?.name || 'غير محدد'
    if (!acc[name]) acc[name] = { total: 0, unpaid: 0 }
    acc[name].total += r.amount
    if (!r.is_paid) acc[name].unpaid += r.amount
    return acc
  }, {} as Record<string, { total: number; unpaid: number }>)

  return (
    <div className="w-full">
      <PageHeader title="الحوافز" subtitle="إدارة حوافز ومكافآت الموظفين" icon={Gift} iconBg="from-yellow-500 to-yellow-600" buttonLabel="إضافة حافز" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث عن موظف..." />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">إجمالي الحوافز</p>
          <p className="text-2xl font-extrabold text-yellow-600">{formatCurrency(totalPaid + totalUnpaid)}</p>
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

      {/* Employee Summary */}
      {Object.keys(empTotals).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {Object.entries(empTotals).map(([name, data]) => (
            <Card key={name} className="shadow-sm"><CardBody className="p-3 text-center">
              <p className="text-[10px] font-bold text-slate-500 truncate">{name}</p>
              <p className="text-sm font-extrabold text-slate-800">{formatCurrency(data.total)}</p>
              {data.unpaid > 0 && <p className="text-[10px] text-red-500 font-semibold">غير مصروف: {formatCurrency(data.unpaid)}</p>}
            </CardBody></Card>
          ))}
        </div>
      )}

      <Card className="shadow-md">
        <CardBody className="p-0">
          {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
          : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Gift className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد حوافز</p>
            </div>
          ) : (
            <Table aria-label="جدول الحوافز" removeWrapper className="min-w-full">
              <TableHeader>
                <TableColumn className="text-right font-bold">الموظف</TableColumn>
                <TableColumn className="text-right font-bold">النوع</TableColumn>
                <TableColumn className="text-right font-bold">المبلغ</TableColumn>
                <TableColumn className="text-right font-bold">الوصف</TableColumn>
                <TableColumn className="text-right font-bold">الحالة</TableColumn>
                <TableColumn className="text-right font-bold">التاريخ</TableColumn>
                <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const emp = r.employee as any
                  const cfg = typeLabels[r.incentive_type] || typeLabels.bonus
                  return (
                    <TableRow key={r.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold">{emp?.name || '-'}</TableCell>
                      <TableCell><Chip size="sm" variant="flat" color={cfg.color} className="font-semibold">{cfg.label}</Chip></TableCell>
                      <TableCell className="font-extrabold text-yellow-600">{formatCurrency(r.amount)}</TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-[200px] truncate">{r.description || '-'}</TableCell>
                      <TableCell>
                        <button onClick={() => togglePaid(r)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all duration-200 ${r.is_paid ? 'border-green-400 bg-green-50 text-green-700 hover:bg-green-100' : 'border-red-400 bg-red-50 text-red-700 hover:bg-red-100'}`}>
                          {r.is_paid ? 'تم الصرف' : 'لم يُصرف'}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{r.incentive_date ? formatDate(r.incentive_date) : '-'}</TableCell>
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

      <CustomModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editItem ? 'تعديل حافز' : 'إضافة حافز جديد'} footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={() => setIsOpen(false)} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'إضافة'} onClick={handleSubmit} color="from-yellow-500 to-yellow-600" />
        </>
      }>
        <div className="flex flex-col gap-4">
          <FormSelect label="الموظف" value={String(formData.employee_id)} onChange={(v) => setFormData({...formData, employee_id: parseInt(v) || 0})} required options={[
            { value: '0', label: 'اختر الموظف...' },
            ...employees.map(e => ({ value: String(e.id), label: e.name }))
          ]} />
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
