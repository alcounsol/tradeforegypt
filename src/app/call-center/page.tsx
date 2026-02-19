'use client'

import { useEffect, useState } from 'react'
import { supabase, CallRecord, Employee, Customer } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Button, Tooltip, Spinner, Progress } from '@nextui-org/react'
import { Phone, Edit, Trash2, User, Building2, CheckCircle, Clock, TrendingUp, Download } from 'lucide-react'
import { exportToCSV, SECTIONS } from '@/lib/export'

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

  function getEmployeePerformance() {
    return employees.map(emp => {
      const empCalls = records.filter(r => r.employee_id === emp.id)
      const empCustomers = customers.filter(c => c.assigned_call_center_employee === emp.id)
      const arrivedCustomers = empCustomers.filter(c => c.status !== 'new' && c.status !== 'contacted' && c.status !== 'follow_up')
      const conversionRate = empCustomers.length > 0 ? Math.round((arrivedCustomers.length / empCustomers.length) * 100) : 0
      return { employee: emp, totalCalls: empCalls.length, totalRegistered: empCustomers.length, arrivedCount: arrivedCustomers.length, conversionRate, incentiveEarned: arrivedCustomers.length * 5 }
    }).sort((a, b) => b.arrivedCount - a.arrivedCount)
  }

  const today = new Date().toISOString().split('T')[0]
  const todayCalls = records.filter(r => r.call_date?.startsWith(today)).length
  const totalArrived = customers.filter(c => c.status !== 'new' && c.status !== 'contacted' && c.status !== 'follow_up').length
  const conversionRate = customers.length > 0 ? Math.round((totalArrived / customers.length) * 100) : 0

  function openAdd() { setEditItem(null); setFormData(emptyForm); setIsOpen(true) }

  function openEdit(item: CallRecord) {
    setEditItem(item)
    setFormData({
      customer_name: item.customer_name, customer_phone: item.customer_phone || '',
      customer_address: item.customer_address || '', customer_type: item.customer_type || 'individual',
      request_type: item.request_type || 'maintenance', device_brand: item.device_brand || '',
      device_name: item.device_name || '', device_type: item.device_type || '',
      fault_description: item.fault_description || '', supply_details: item.supply_details || '',
      notes: item.notes || '', call_outcome: item.call_outcome || '',
      employee_id: item.employee_id || 0, call_type: item.call_type || 'incoming', call_purpose: item.call_purpose || 'registration',
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
        name: formData.customer_name, phone: formData.customer_phone, address: formData.customer_address,
        customer_type: formData.customer_type, request_type: formData.request_type,
        device_brand: formData.device_brand, device_name: formData.device_name, device_type: formData.device_type,
        fault_description: formData.fault_description, supply_details: formData.supply_details,
        notes: formData.notes, status: 'new', source: 'call_center',
        assigned_call_center_employee: formData.employee_id || null,
      }
      if (formData.customer_phone) {
        const { data: existing } = await supabase.from('customers').select('id').eq('phone', formData.customer_phone).single()
        if (existing) {
          await supabase.from('customers').update(customerPayload).eq('id', existing.id)
          if (callData) await supabase.from('call_records').update({ customer_id: existing.id }).eq('id', callData.id)
        } else {
          const { data: newCust } = await supabase.from('customers').insert([customerPayload]).select().single()
          if (callData && newCust) await supabase.from('call_records').update({ customer_id: newCust.id }).eq('id', callData.id)
        }
      } else {
        const { data: newCust } = await supabase.from('customers').insert([customerPayload]).select().single()
        if (callData && newCust) await supabase.from('call_records').update({ customer_id: newCust.id }).eq('id', callData.id)
      }
    }
    setIsOpen(false); fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) { await supabase.from('call_records').delete().eq('id', id); fetchAll() }
  }

  function getCustomerStatus(record: CallRecord) {
    const cust = record.customer as any
    if (!cust) return null
    return cust.status
  }

  function handleExport() {
    exportToCSV(filtered as any, SECTIONS.call_records.headers, 'call_records')
  }

  return (
    <div className="w-full">
      <PageHeader title="الكول سنتر" subtitle="استقبال المكالمات وتسجيل بيانات العملاء" icon={Phone} iconBg="from-green-500 to-green-600" buttonLabel="تسجيل مكالمة جديدة" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الهاتف..." />
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {[
          { label: 'إجمالي المكالمات', value: records.length, color: 'text-green-600' },
          { label: 'مكالمات اليوم', value: todayCalls, color: 'text-blue-600' },
          { label: 'عملاء مسجلين', value: customers.length, color: 'text-indigo-600' },
          { label: 'جاءوا للشركة', value: totalArrived, color: 'text-emerald-600' },
          { label: 'نسبة التحويل', value: `${conversionRate}%`, color: 'text-amber-600' },
          { label: 'طلبات صيانة', value: records.filter(r => r.request_type === 'maintenance').length, color: 'text-purple-600' },
        ].map((stat, i) => (
          <Card key={i} className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">{stat.label}</p>
            <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
          </CardBody></Card>
        ))}
      </div>

      <div className="mb-4">
        <button onClick={() => setIsPerformanceOpen(true)} className="action-btn flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />أداء موظفي الكول سنتر
        </button>
      </div>

      {loading ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex items-center justify-center h-48"><Spinner size="lg" /></CardBody></Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Phone className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد مكالمات مسجلة</p>
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
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">النوع</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الطلب</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الجهاز</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الموظف</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">حالة العميل</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">التاريخ</th>
                  <th className="text-center p-3 font-extrabold text-slate-600 text-xs">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const custStatus = getCustomerStatus(r)
                  const arrived = custStatus && custStatus !== 'new' && custStatus !== 'contacted' && custStatus !== 'follow_up'
                  return (
                    <tr key={r.id} className="border-b border-slate-100 transition-all hover:bg-blue-50/30">
                      <td className="p-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          {r.customer_type === 'company' ? <Building2 className="h-3.5 w-3.5 text-purple-500" /> : <User className="h-3.5 w-3.5 text-blue-500" />}
                          <span className="font-extrabold text-sm text-slate-800">{r.customer_name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-slate-600">{r.customer_phone || '-'}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border ${r.customer_type === 'company' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          {r.customer_type === 'company' ? 'شركة' : 'فرد'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border ${r.request_type === 'maintenance' ? 'bg-amber-50 text-amber-600 border-amber-100' : r.request_type === 'supply' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          {r.request_type === 'maintenance' ? 'صيانة' : r.request_type === 'supply' ? 'توريد' : 'صيانة وتوريد'}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-slate-600">{r.device_brand ? `${r.device_brand} - ${r.device_name || ''}` : '-'}</td>
                      <td className="p-3 text-sm font-bold text-slate-700">{(r.employee as any)?.name || '-'}</td>
                      <td className="p-3">
                        {arrived ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100">
                            <CheckCircle className="h-3 w-3" />جاء للشركة
                          </span>
                        ) : custStatus === 'new' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-xs font-bold border border-amber-100">
                            <Clock className="h-3 w-3" />في الانتظار
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-slate-500">{r.call_date ? formatDate(r.call_date) : '-'}</td>
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
              <span className="text-xs font-bold text-slate-500">{filtered.length} مكالمة</span>
              <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-emerald-50 text-emerald-600 border-emerald-200">
                <Download className="h-3 w-3" />تصدير
              </button>
            </div>
            {filtered.map((r) => {
              const custStatus = getCustomerStatus(r)
              const arrived = custStatus && custStatus !== 'new' && custStatus !== 'contacted' && custStatus !== 'follow_up'
              return (
                <div key={r.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {r.customer_type === 'company' ? <Building2 className="h-3.5 w-3.5 text-purple-500" /> : <User className="h-3.5 w-3.5 text-blue-500" />}
                        <p className="font-extrabold text-sm text-slate-800">{r.customer_name}</p>
                      </div>
                      {r.customer_phone && <p className="text-[10px] text-slate-400 mt-0.5">{r.customer_phone}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(r)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Edit className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(r.id)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.request_type === 'maintenance' ? 'bg-amber-50 text-amber-600' : r.request_type === 'supply' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                      {r.request_type === 'maintenance' ? 'صيانة' : r.request_type === 'supply' ? 'توريد' : 'صيانة وتوريد'}
                    </span>
                    {arrived && <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold">جاء للشركة</span>}
                    {r.device_brand && <span className="text-slate-500">{r.device_brand}</span>}
                    <span className="text-slate-400">{r.call_date ? formatDate(r.call_date) : ''}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>)}

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
            <div className="mt-3"><FormInput label="العنوان" value={formData.customer_address} onChange={(v) => setFormData({...formData, customer_address: v})} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <FormSelect label="نوع العميل" value={formData.customer_type} onChange={(v) => setFormData({...formData, customer_type: v as any})} options={[{ value: 'individual', label: 'فرد' }, { value: 'company', label: 'شركة' }]} />
              <FormSelect label="نوع الطلب" value={formData.request_type} onChange={(v) => setFormData({...formData, request_type: v as any})} options={[{ value: 'maintenance', label: 'صيانة' }, { value: 'supply', label: 'توريد' }, { value: 'both', label: 'صيانة وتوريد' }]} />
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
              <div className="mt-3"><FormTextarea label="وصف العطل" value={formData.fault_description} onChange={(v) => setFormData({...formData, fault_description: v})} placeholder="اكتب وصف العطل..." /></div>
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
              <FormSelect label="موظف الكول سنتر" value={String(formData.employee_id)} onChange={(v) => setFormData({...formData, employee_id: parseInt(v) || 0})} options={[{ value: '0', label: 'اختر الموظف...' }, ...employees.map(e => ({ value: String(e.id), label: e.name }))]} />
              <FormSelect label="نوع المكالمة" value={formData.call_type} onChange={(v) => setFormData({...formData, call_type: v as any})} options={[{ value: 'incoming', label: 'واردة' }, { value: 'outgoing', label: 'صادرة' }]} />
            </div>
            <div className="mt-3"><FormTextarea label="ملاحظات" value={formData.notes} onChange={(v) => setFormData({...formData, notes: v})} /></div>
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
                <span className="inline-flex px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100">حافز: {perf.incentiveEarned} ج.م.</span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center mb-3">
                <div><p className="text-[10px] text-slate-500 font-bold">المكالمات</p><p className="text-lg font-black text-green-600">{perf.totalCalls}</p></div>
                <div><p className="text-[10px] text-slate-500 font-bold">عملاء مسجلين</p><p className="text-lg font-black text-blue-600">{perf.totalRegistered}</p></div>
                <div><p className="text-[10px] text-slate-500 font-bold">جاءوا للشركة</p><p className="text-lg font-black text-emerald-600">{perf.arrivedCount}</p></div>
                <div><p className="text-[10px] text-slate-500 font-bold">نسبة التحويل</p><p className="text-lg font-black text-amber-600">{perf.conversionRate}%</p></div>
              </div>
              <Progress value={perf.conversionRate} color={perf.conversionRate >= 50 ? 'success' : perf.conversionRate >= 25 ? 'warning' : 'danger'} size="sm" className="max-w-full" />
            </div>
          ))}
          {getEmployeePerformance().length === 0 && (<p className="text-center text-slate-400 py-8 font-semibold">لا يوجد موظفين كول سنتر</p>)}
        </div>
      </CustomModal>
    </div>
  )
}
