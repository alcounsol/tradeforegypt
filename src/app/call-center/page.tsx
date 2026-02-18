'use client'

import { useEffect, useState } from 'react'
import { supabase, CallRecord, Employee, Customer } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, CardHeader, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Tooltip, Spinner, Divider, Progress } from '@nextui-org/react'
import { Phone, Edit, Trash2, User, Building2, CheckCircle, XCircle, Clock, UserCheck, TrendingUp } from 'lucide-react'

type FormType = {
  customer_name: string; customer_phone: string; customer_address: string;
  customer_type: string; request_type: string;
  device_brand: string; device_name: string; device_type: string;
  fault_description: string; supply_details: string; notes: string; call_outcome: string;
  employee_id: number; call_type: string; call_purpose: string;
}

const emptyForm: FormType = {
  customer_name: '', customer_phone: '', customer_address: '',
  customer_type: 'individual', request_type: 'maintenance',
  device_brand: '', device_name: '', device_type: '',
  fault_description: '', supply_details: '', notes: '', call_outcome: '',
  employee_id: 0, call_type: 'incoming', call_purpose: 'registration',
}

export default function CallCenter() {
  const [records, setRecords] = useState<CallRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editItem, setEditItem] = useState<CallRecord | null>(null)
  const [formData, setFormData] = useState(emptyForm)

  // Employee performance modal
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: calls }, { data: emps }, { data: custs }] = await Promise.all([
      supabase.from('call_records').select('*, employee:employees(id,name), customer:customers(id,name,status)').order('call_date', { ascending: false }),
      supabase.from('employees').select('*').eq('department', 'call_center').eq('is_active', true),
      supabase.from('customers').select('*').in('source', ['call_center']),
    ])
    setRecords(calls || [])
    setEmployees(emps || [])
    setCustomers(custs || [])
    setLoading(false)
  }

  const filtered = records.filter(r =>
    r.customer_name.includes(search) ||
    (r.customer_phone && r.customer_phone.includes(search)) ||
    (r.device_brand && r.device_brand.includes(search))
  )

  // Calculate employee performance
  function getEmployeePerformance() {
    return employees.map(emp => {
      const empCalls = records.filter(r => r.employee_id === emp.id)
      const empCustomers = customers.filter(c => c.assigned_call_center_employee === emp.id)
      const arrivedCustomers = empCustomers.filter(c => c.status !== 'new' && c.status !== 'contacted' && c.status !== 'follow_up')
      const conversionRate = empCustomers.length > 0 ? Math.round((arrivedCustomers.length / empCustomers.length) * 100) : 0
      return {
        employee: emp,
        totalCalls: empCalls.length,
        totalRegistered: empCustomers.length,
        arrivedCount: arrivedCustomers.length,
        conversionRate,
        incentiveEarned: arrivedCustomers.length * 5,
      }
    }).sort((a, b) => b.arrivedCount - a.arrivedCount)
  }

  const today = new Date().toISOString().split('T')[0]
  const todayCalls = records.filter(r => r.call_date?.startsWith(today)).length
  const totalArrived = customers.filter(c => c.status !== 'new' && c.status !== 'contacted' && c.status !== 'follow_up').length
  const conversionRate = customers.length > 0 ? Math.round((totalArrived / customers.length) * 100) : 0

  function openAdd() {
    setEditItem(null)
    setFormData(emptyForm)
    setIsOpen(true)
  }

  function openEdit(item: CallRecord) {
    setEditItem(item)
    setFormData({
      customer_name: item.customer_name, customer_phone: item.customer_phone || '',
      customer_address: item.customer_address || '', customer_type: item.customer_type || 'individual',
      request_type: item.request_type || 'maintenance',
      device_brand: item.device_brand || '',
      device_name: item.device_name || '', device_type: item.device_type || '',
      fault_description: item.fault_description || '', supply_details: item.supply_details || '',
      notes: item.notes || '', call_outcome: item.call_outcome || '',
      employee_id: item.employee_id || 0, call_type: item.call_type || 'incoming',
      call_purpose: item.call_purpose || 'registration',
    })
    setIsOpen(true)
  }

  async function handleSubmit() {
    const payload: any = { ...formData }
    if (!payload.employee_id) delete payload.employee_id

    if (editItem) {
      await supabase.from('call_records').update(payload).eq('id', editItem.id)
    } else {
      const { data: callData } = await supabase.from('call_records').insert([payload]).select().single()

      const customerPayload = {
        name: formData.customer_name,
        phone: formData.customer_phone,
        address: formData.customer_address,
        customer_type: formData.customer_type,
        request_type: formData.request_type,
        device_brand: formData.device_brand,
        device_name: formData.device_name,
        device_type: formData.device_type,
        fault_description: formData.fault_description,
        supply_details: formData.supply_details,
        notes: formData.notes,
        status: 'new',
        source: 'call_center',
        assigned_call_center_employee: formData.employee_id || null,
      }

      if (formData.customer_phone) {
        const { data: existing } = await supabase.from('customers').select('id').eq('phone', formData.customer_phone).single()
        if (existing) {
          await supabase.from('customers').update(customerPayload).eq('id', existing.id)
          if (callData) {
            await supabase.from('call_records').update({ customer_id: existing.id }).eq('id', callData.id)
          }
        } else {
          const { data: newCust } = await supabase.from('customers').insert([customerPayload]).select().single()
          if (callData && newCust) {
            await supabase.from('call_records').update({ customer_id: newCust.id }).eq('id', callData.id)
          }
        }
      } else {
        const { data: newCust } = await supabase.from('customers').insert([customerPayload]).select().single()
        if (callData && newCust) {
          await supabase.from('call_records').update({ customer_id: newCust.id }).eq('id', callData.id)
        }
      }
    }
    setIsOpen(false)
    fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      await supabase.from('call_records').delete().eq('id', id)
      fetchAll()
    }
  }

  // Get customer status for a call record
  function getCustomerStatus(record: CallRecord) {
    const cust = record.customer as any
    if (!cust) return null
    return cust.status
  }

  return (
    <div className="w-full">
      <PageHeader title="الكول سنتر" subtitle="استقبال المكالمات وتسجيل بيانات العملاء" icon={Phone} iconBg="from-green-500 to-green-600" buttonLabel="تسجيل مكالمة جديدة" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الهاتف..." />
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'إجمالي المكالمات', value: records.length, color: 'text-green-600' },
          { label: 'مكالمات اليوم', value: todayCalls, color: 'text-blue-600' },
          { label: 'عملاء مسجلين', value: customers.length, color: 'text-indigo-600' },
          { label: 'جاءوا للشركة', value: totalArrived, color: 'text-emerald-600' },
          { label: 'نسبة التحويل', value: `${conversionRate}%`, color: 'text-amber-600' },
          { label: 'طلبات صيانة', value: records.filter(r => r.request_type === 'maintenance').length, color: 'text-purple-600' },
        ].map((stat, i) => (
          <Card key={i} className="shadow-sm"><CardBody className="p-3 text-center">
            <p className="text-[10px] font-semibold text-slate-500">{stat.label}</p>
            <p className={`text-xl font-extrabold ${stat.color}`}>{stat.value}</p>
          </CardBody></Card>
        ))}
      </div>

      {/* Employee Performance Button */}
      <div className="mb-4">
        <Button size="sm" variant="flat" color="primary" onPress={() => setIsPerformanceOpen(true)} className="font-bold" startContent={<TrendingUp className="h-4 w-4" />}>
          أداء موظفي الكول سنتر
        </Button>
      </div>

      <Card className="shadow-md">
        <CardBody className="p-0">
          {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
          : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Phone className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد مكالمات مسجلة</p>
            </div>
          ) : (
            <Table aria-label="جدول المكالمات" removeWrapper className="min-w-full">
              <TableHeader>
                <TableColumn className="text-right font-bold">العميل</TableColumn>
                <TableColumn className="text-right font-bold">الهاتف</TableColumn>
                <TableColumn className="text-right font-bold">النوع</TableColumn>
                <TableColumn className="text-right font-bold">الطلب</TableColumn>
                <TableColumn className="text-right font-bold">الجهاز</TableColumn>
                <TableColumn className="text-right font-bold">الموظف</TableColumn>
                <TableColumn className="text-right font-bold">حالة العميل</TableColumn>
                <TableColumn className="text-right font-bold">التاريخ</TableColumn>
                <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const custStatus = getCustomerStatus(r)
                  const arrived = custStatus && custStatus !== 'new' && custStatus !== 'contacted' && custStatus !== 'follow_up'
                  return (
                    <TableRow key={r.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {r.customer_type === 'company' ? <Building2 className="h-4 w-4 text-purple-500" /> : <User className="h-4 w-4 text-blue-500" />}
                          <span className="font-bold">{r.customer_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{r.customer_phone || '-'}</TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color={r.customer_type === 'company' ? 'secondary' : 'primary'} className="font-semibold">
                          {r.customer_type === 'company' ? 'شركة' : 'فرد'}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color={r.request_type === 'maintenance' ? 'warning' : r.request_type === 'supply' ? 'secondary' : 'primary'} className="font-semibold">
                          {r.request_type === 'maintenance' ? 'صيانة' : r.request_type === 'supply' ? 'توريد' : 'صيانة وتوريد'}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-sm">{r.device_brand ? `${r.device_brand} - ${r.device_name || ''}` : '-'}</TableCell>
                      <TableCell className="text-sm font-semibold">{(r.employee as any)?.name || '-'}</TableCell>
                      <TableCell>
                        {arrived ? (
                          <Chip size="sm" variant="flat" color="success" startContent={<CheckCircle className="h-3 w-3" />} className="font-semibold">
                            جاء للشركة
                          </Chip>
                        ) : custStatus === 'new' ? (
                          <Chip size="sm" variant="flat" color="warning" startContent={<Clock className="h-3 w-3" />} className="font-semibold">
                            في الانتظار
                          </Chip>
                        ) : (
                          <Chip size="sm" variant="flat" color="default" className="font-semibold">
                            -
                          </Chip>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{r.call_date ? formatDate(r.call_date) : '-'}</TableCell>
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

      {/* Add/Edit Modal */}
      <CustomModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editItem ? 'تعديل مكالمة' : 'تسجيل مكالمة جديدة'} footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={() => setIsOpen(false)} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'تسجيل'} onClick={handleSubmit} color="from-green-500 to-green-600" />
        </>
      }>
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-bold text-blue-700 mb-2">بيانات العميل</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label="اسم العميل" value={formData.customer_name} onChange={(v) => setFormData({...formData, customer_name: v})} required />
              <FormInput label="رقم الهاتف" value={formData.customer_phone} onChange={(v) => setFormData({...formData, customer_phone: v})} type="tel" />
            </div>
            <div className="mt-3">
              <FormInput label="العنوان" value={formData.customer_address} onChange={(v) => setFormData({...formData, customer_address: v})} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <FormSelect label="نوع العميل" value={formData.customer_type} onChange={(v) => setFormData({...formData, customer_type: v as any})} options={[
                { value: 'individual', label: 'فرد' },
                { value: 'company', label: 'شركة' },
              ]} />
              <FormSelect label="نوع الطلب" value={formData.request_type} onChange={(v) => setFormData({...formData, request_type: v as any})} options={[
                { value: 'maintenance', label: 'صيانة' },
                { value: 'supply', label: 'توريد' },
                { value: 'both', label: 'صيانة وتوريد' },
              ]} />
            </div>
          </div>

          {(formData.request_type === 'maintenance' || formData.request_type === 'both') && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs font-bold text-amber-700 mb-2">بيانات الجهاز (صيانة)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormInput label="ماركة الجهاز" value={formData.device_brand} onChange={(v) => setFormData({...formData, device_brand: v})} placeholder="مثال: كينود" />
                <FormInput label="اسم الجهاز" value={formData.device_name} onChange={(v) => setFormData({...formData, device_name: v})} placeholder="مثال: عجان" />
                <FormInput label="نوع الجهاز" value={formData.device_type} onChange={(v) => setFormData({...formData, device_type: v})} placeholder="مثال: أجهزة مطبخ" />
              </div>
              <div className="mt-3">
                <FormTextarea label="وصف العطل" value={formData.fault_description} onChange={(v) => setFormData({...formData, fault_description: v})} placeholder="اكتب وصف العطل الذي يعاني منه العميل..." />
              </div>
            </div>
          )}

          {(formData.request_type === 'supply' || formData.request_type === 'both') && (
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
              <p className="text-xs font-bold text-purple-700 mb-2">بيانات التوريد</p>
              <FormTextarea label="تفاصيل الأجهزة المطلوب توريدها" value={formData.supply_details} onChange={(v) => setFormData({...formData, supply_details: v})} placeholder="اكتب تفاصيل الأجهزة المطلوبة..." />
            </div>
          )}

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-bold text-gray-700 mb-2">بيانات المكالمة</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormSelect label="موظف الكول سنتر" value={String(formData.employee_id)} onChange={(v) => setFormData({...formData, employee_id: parseInt(v) || 0})} options={[
                { value: '0', label: 'اختر الموظف...' },
                ...employees.map(e => ({ value: String(e.id), label: e.name }))
              ]} />
              <FormSelect label="نوع المكالمة" value={formData.call_type} onChange={(v) => setFormData({...formData, call_type: v as any})} options={[
                { value: 'incoming', label: 'واردة' },
                { value: 'outgoing', label: 'صادرة' },
              ]} />
            </div>
            <div className="mt-3">
              <FormTextarea label="ملاحظات" value={formData.notes} onChange={(v) => setFormData({...formData, notes: v})} />
            </div>
          </div>
        </div>
      </CustomModal>

      {/* Employee Performance Modal */}
      <CustomModal isOpen={isPerformanceOpen} onClose={() => setIsPerformanceOpen(false)} title="أداء موظفي الكول سنتر" footer={
        <ModalCancelButton label="إغلاق" onClick={() => setIsPerformanceOpen(false)} />
      }>
        <div className="space-y-4">
          {getEmployeePerformance().map((perf, i) => (
            <div key={perf.employee.id} className={`p-4 rounded-xl border ${i === 0 ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {i === 0 && <span className="text-lg">🏆</span>}
                  <h4 className="font-extrabold text-slate-800">{perf.employee.name}</h4>
                </div>
                <Chip size="sm" variant="flat" color="success" className="font-bold">
                  حافز: {perf.incentiveEarned} ج.م.
                </Chip>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center mb-3">
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">المكالمات</p>
                  <p className="text-lg font-extrabold text-green-600">{perf.totalCalls}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">عملاء مسجلين</p>
                  <p className="text-lg font-extrabold text-blue-600">{perf.totalRegistered}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">جاءوا للشركة</p>
                  <p className="text-lg font-extrabold text-emerald-600">{perf.arrivedCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">نسبة التحويل</p>
                  <p className="text-lg font-extrabold text-amber-600">{perf.conversionRate}%</p>
                </div>
              </div>
              <Progress value={perf.conversionRate} color={perf.conversionRate >= 50 ? 'success' : perf.conversionRate >= 25 ? 'warning' : 'danger'} size="sm" className="max-w-full" />
            </div>
          ))}
          {getEmployeePerformance().length === 0 && (
            <p className="text-center text-slate-400 py-8 font-semibold">لا يوجد موظفين كول سنتر</p>
          )}
        </div>
      </CustomModal>
    </div>
  )
}
