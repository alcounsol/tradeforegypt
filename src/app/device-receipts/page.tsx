'use client'

import { useEffect, useState } from 'react'
import { supabase, DeviceReceipt, Employee, Customer } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Tooltip, Spinner } from '@nextui-org/react'
import { ClipboardList, Edit, Trash2 } from 'lucide-react'

const statusConfig: Record<string, { label: string; color: any }> = {
  received: { label: 'تم الاستلام', color: 'primary' },
  in_diagnosis: { label: 'قيد التشخيص', color: 'warning' },
  in_repair: { label: 'قيد الصيانة', color: 'secondary' },
  repaired: { label: 'تم الإصلاح', color: 'success' },
  delivered_to_customer: { label: 'تم التسليم للعميل', color: 'success' },
  returned: { label: 'مرتجع', color: 'danger' },
}

export default function DeviceReceiptsPage() {
  const [records, setRecords] = useState<DeviceReceipt[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [deliveryEmployees, setDeliveryEmployees] = useState<Employee[]>([])
  const [receptionEmployees, setReceptionEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editItem, setEditItem] = useState<DeviceReceipt | null>(null)
  const [formData, setFormData] = useState({
    customer_id: 0, received_by: 0, delivered_by: 0,
    device_brand: '', device_name: '', device_type: '', device_model: '',
    serial_number: '', condition_notes: '', fault_description: '', status: 'received' as string,
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: receipts }, { data: allEmps }, { data: custs }] = await Promise.all([
      supabase.from('device_receipts').select('*, customer:customers(id,name,phone), receiver:employees!device_receipts_received_by_fkey(id,name), deliverer:employees!device_receipts_delivered_by_fkey(id,name)').order('receipt_date', { ascending: false }),
      supabase.from('employees').select('*').eq('is_active', true),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
    ])
    setRecords(receipts || [])
    setEmployees(allEmps || [])
    setDeliveryEmployees((allEmps || []).filter(e => e.department === 'delivery'))
    setReceptionEmployees((allEmps || []).filter(e => e.department === 'reception' || e.department === 'maintenance'))
    setCustomers(custs || [])
    setLoading(false)
  }

  const filtered = records.filter(r => {
    const cust = r.customer as any
    return r.device_brand?.includes(search) || r.device_name?.includes(search) || cust?.name?.includes(search) || cust?.phone?.includes(search)
  })

  function openAdd() {
    setEditItem(null)
    setFormData({ customer_id: 0, received_by: 0, delivered_by: 0, device_brand: '', device_name: '', device_type: '', device_model: '', serial_number: '', condition_notes: '', fault_description: '', status: 'received' })
    setIsOpen(true)
  }

  function openEdit(item: DeviceReceipt) {
    setEditItem(item)
    setFormData({
      customer_id: item.customer_id || 0, received_by: item.received_by || 0, delivered_by: item.delivered_by || 0,
      device_brand: item.device_brand, device_name: item.device_name, device_type: item.device_type || '',
      device_model: item.device_model || '', serial_number: item.serial_number || '',
      condition_notes: item.condition_notes || '', fault_description: item.fault_description || '', status: item.status,
    })
    setIsOpen(true)
  }

  async function handleSubmit() {
    const payload: any = { ...formData }
    if (!payload.customer_id) delete payload.customer_id
    if (!payload.received_by) delete payload.received_by
    if (!payload.delivered_by) delete payload.delivered_by

    if (editItem) {
      await supabase.from('device_receipts').update(payload).eq('id', editItem.id)
    } else {
      const { data: receipt } = await supabase.from('device_receipts').insert([payload]).select().single()

      // Add incentive for delivery person (10 EGP per device)
      if (formData.delivered_by && receipt) {
        await supabase.from('incentives').insert([{
          employee_id: formData.delivered_by,
          incentive_type: 'device_pickup',
          amount: 10,
          reference_id: receipt.id,
          reference_type: 'device_receipt',
          description: `حافز إحضار جهاز: ${formData.device_brand} ${formData.device_name}`,
          period_month: new Date().getMonth() + 1,
          period_year: new Date().getFullYear(),
        }])
      }

      // Add incentive for reception (5 EGP per customer)
      if (formData.received_by && receipt) {
        await supabase.from('incentives').insert([{
          employee_id: formData.received_by,
          incentive_type: 'data_entry',
          amount: 5,
          reference_id: receipt.id,
          reference_type: 'device_receipt',
          description: `حافز استقبال عميل وإدخال بيانات جهاز: ${formData.device_brand} ${formData.device_name}`,
          period_month: new Date().getMonth() + 1,
          period_year: new Date().getFullYear(),
        }])
      }

      // Update customer status
      if (formData.customer_id) {
        await supabase.from('customers').update({ status: 'device_received' }).eq('id', formData.customer_id)
      }
    }

    setIsOpen(false)
    fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      await supabase.from('device_receipts').delete().eq('id', id)
      fetchAll()
    }
  }

  return (
    <div className="w-full">
      <PageHeader title="استلام الأجهزة" subtitle="تسجيل وتتبع الأجهزة المستلمة من العملاء" icon={ClipboardList} iconBg="from-lime-600 to-lime-700" buttonLabel="تسجيل جهاز جديد" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث عن جهاز أو عميل..." />
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <Card key={key} className="shadow-sm"><CardBody className="p-3 text-center">
            <p className="text-[10px] font-semibold text-slate-500">{cfg.label}</p>
            <p className="text-lg font-extrabold text-slate-800">{records.filter(r => r.status === key).length}</p>
          </CardBody></Card>
        ))}
      </div>

      <Card className="shadow-md">
        <CardBody className="p-0">
          {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
          : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <ClipboardList className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد أجهزة مستلمة</p>
            </div>
          ) : (
            <Table aria-label="جدول الأجهزة" removeWrapper className="min-w-full">
              <TableHeader>
                <TableColumn className="text-right font-bold">العميل</TableColumn>
                <TableColumn className="text-right font-bold">الجهاز</TableColumn>
                <TableColumn className="text-right font-bold">الماركة</TableColumn>
                <TableColumn className="text-right font-bold">العطل</TableColumn>
                <TableColumn className="text-right font-bold">المندوب</TableColumn>
                <TableColumn className="text-right font-bold">الحالة</TableColumn>
                <TableColumn className="text-right font-bold">التاريخ</TableColumn>
                <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const cust = r.customer as any
                  const deliverer = r.deliverer as any
                  const cfg = statusConfig[r.status] || statusConfig.received
                  return (
                    <TableRow key={r.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold">{cust?.name || '-'}</TableCell>
                      <TableCell className="text-sm">{r.device_name}</TableCell>
                      <TableCell className="text-sm">{r.device_brand}</TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-[150px] truncate">{r.fault_description || '-'}</TableCell>
                      <TableCell className="text-sm font-semibold">{deliverer?.name || '-'}</TableCell>
                      <TableCell><Chip size="sm" variant="flat" color={cfg.color} className="font-semibold">{cfg.label}</Chip></TableCell>
                      <TableCell className="text-sm text-slate-500">{r.receipt_date ? formatDate(r.receipt_date) : '-'}</TableCell>
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

      <CustomModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editItem ? 'تعديل بيانات الجهاز' : 'تسجيل جهاز جديد'} footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={() => setIsOpen(false)} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'تسجيل'} onClick={handleSubmit} color="from-lime-600 to-lime-700" />
        </>
      }>
        <div className="flex flex-col gap-4">
          <FormSelect label="العميل" value={String(formData.customer_id)} onChange={(v) => setFormData({...formData, customer_id: parseInt(v) || 0})} options={[
            { value: '0', label: 'اختر العميل...' },
            ...customers.map(c => ({ value: String(c.id), label: `${c.name} ${c.phone ? `(${c.phone})` : ''}` }))
          ]} />
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs font-bold text-amber-700 mb-2">بيانات الجهاز</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label="ماركة الجهاز" value={formData.device_brand} onChange={(v) => setFormData({...formData, device_brand: v})} required />
              <FormInput label="اسم الجهاز" value={formData.device_name} onChange={(v) => setFormData({...formData, device_name: v})} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <FormInput label="نوع الجهاز" value={formData.device_type} onChange={(v) => setFormData({...formData, device_type: v})} />
              <FormInput label="الموديل" value={formData.device_model} onChange={(v) => setFormData({...formData, device_model: v})} />
            </div>
            <div className="mt-3">
              <FormInput label="الرقم التسلسلي" value={formData.serial_number} onChange={(v) => setFormData({...formData, serial_number: v})} />
            </div>
          </div>
          <FormTextarea label="وصف العطل" value={formData.fault_description} onChange={(v) => setFormData({...formData, fault_description: v})} />
          <FormTextarea label="حالة الجهاز عند الاستلام" value={formData.condition_notes} onChange={(v) => setFormData({...formData, condition_notes: v})} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="المندوب (أحضر الجهاز)" value={String(formData.delivered_by)} onChange={(v) => setFormData({...formData, delivered_by: parseInt(v) || 0})} options={[
              { value: '0', label: 'اختر المندوب...' },
              ...deliveryEmployees.map(e => ({ value: String(e.id), label: e.name }))
            ]} />
            <FormSelect label="موظف الاستقبال" value={String(formData.received_by)} onChange={(v) => setFormData({...formData, received_by: parseInt(v) || 0})} options={[
              { value: '0', label: 'اختر الموظف...' },
              ...receptionEmployees.map(e => ({ value: String(e.id), label: e.name }))
            ]} />
          </div>
          <FormSelect label="الحالة" value={formData.status} onChange={(v) => setFormData({...formData, status: v as any})} options={Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))} />
        </div>
      </CustomModal>
    </div>
  )
}
