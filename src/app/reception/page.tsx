'use client'

import { useEffect, useState } from 'react'
import { supabase, Customer, Employee, DeviceReceipt } from '@/lib/supabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Button, Chip, Tooltip, Spinner } from '@nextui-org/react'
import { UserCheck, Phone, MapPin, ArrowDownToLine, Eye, Building2, User, Download } from 'lucide-react'
import { exportToCSV, SECTIONS } from '@/lib/export'

const customerStatusLabels: Record<string, string> = {
  new: 'جديد - مسجل من الكول سنتر', contacted: 'تم التواصل', follow_up: 'متابعة',
  arrived: 'وصل الشركة', device_received: 'تم استلام الجهاز', in_repair: 'قيد الصيانة',
  completed: 'مكتمل', delivered: 'تم التسليم',
}
const customerStatusColors: Record<string, string> = {
  new: 'bg-blue-50 text-blue-600 border-blue-100', contacted: 'bg-purple-50 text-purple-600 border-purple-100',
  follow_up: 'bg-amber-50 text-amber-600 border-amber-100', arrived: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  device_received: 'bg-slate-50 text-slate-600 border-slate-200', in_repair: 'bg-amber-50 text-amber-600 border-amber-100',
  completed: 'bg-emerald-50 text-emerald-600 border-emerald-100', delivered: 'bg-emerald-50 text-emerald-600 border-emerald-100',
}

export default function ReceptionPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [devices, setDevices] = useState<DeviceReceipt[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [callCenterEmps, setCallCenterEmps] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [deviceForm, setDeviceForm] = useState({ device_brand: '', device_name: '', device_type: '', device_model: '', serial_number: '', condition_notes: '', fault_description: '', status: 'received' as string, delivered_by: 0 })
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null)
  const [customerDevices, setCustomerDevices] = useState<DeviceReceipt[]>([])
  const [stats, setStats] = useState({ todayArrivals: 0, totalRegistered: 0, totalDevicesReceived: 0, todayDevices: 0 })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const [{ data: custs }, { data: devs }, { data: allEmps }] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('device_receipts').select('*, customer:customers(id,name,phone), receiver:employees!device_receipts_received_by_fkey(id,name), deliverer:employees!device_receipts_delivered_by_fkey(id,name)').order('receipt_date', { ascending: false }),
      supabase.from('employees').select('*').eq('is_active', true),
    ])
    const allCusts = custs || []
    setAllCustomers(allCusts); setCustomers(allCusts); setDevices(devs || []); setEmployees(allEmps || [])
    setCallCenterEmps((allEmps || []).filter(e => e.department === 'call_center'))
    setStats({
      todayArrivals: allCusts.filter(c => c.status === 'arrived' && c.created_at?.startsWith(today)).length,
      totalRegistered: allCusts.filter(c => c.source === 'call_center').length,
      totalDevicesReceived: (devs || []).length,
      todayDevices: (devs || []).filter(d => d.receipt_date?.startsWith(today)).length,
    })
    setLoading(false)
  }

  const filtered = customers.filter(c => {
    const matchSearch = !search || c.name.includes(search) || (c.phone && c.phone.includes(search)) || (c.company_name && c.company_name.includes(search))
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  function getCallCenterEmpName(empId: number | null) {
    if (!empId) return '-'
    const emp = callCenterEmps.find(e => e.id === empId)
    return emp ? emp.name : '-'
  }

  async function markAsArrived(customer: Customer) {
    await supabase.from('customers').update({ status: 'arrived' }).eq('id', customer.id)
    const receptionEmp = employees.find(e => e.department === 'reception')
    if (receptionEmp) {
      await supabase.from('incentives').insert([{ employee_id: receptionEmp.id, incentive_type: 'data_entry', amount: 5, reference_id: customer.id, reference_type: 'customer_arrival', description: `حافز استقبال عميل: ${customer.name}`, period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear() }])
    }
    if (customer.assigned_call_center_employee) {
      await supabase.from('incentives').insert([{ employee_id: customer.assigned_call_center_employee, incentive_type: 'customer_visit', amount: 5, reference_id: customer.id, reference_type: 'customer_arrival', description: `حافز عميل جاء للشركة: ${customer.name}`, period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear() }])
    }
    fetchAll()
  }

  function openDeviceReceipt(customer: Customer) {
    setSelectedCustomer(customer)
    setDeviceForm({ device_brand: customer.device_brand || '', device_name: customer.device_name || '', device_type: customer.device_type || '', device_model: '', serial_number: '', condition_notes: '', fault_description: customer.fault_description || '', status: 'received', delivered_by: 0 })
    setIsDeviceModalOpen(true)
  }

  async function handleDeviceSubmit() {
    if (!selectedCustomer) return
    const receptionEmp = employees.find(e => e.department === 'reception')
    const payload: any = { customer_id: selectedCustomer.id, received_by: receptionEmp?.id || null, delivered_by: deviceForm.delivered_by || null, device_brand: deviceForm.device_brand, device_name: deviceForm.device_name, device_type: deviceForm.device_type, device_model: deviceForm.device_model, serial_number: deviceForm.serial_number, condition_notes: deviceForm.condition_notes, fault_description: deviceForm.fault_description, status: 'received' }
    const { data: receipt } = await supabase.from('device_receipts').insert([payload]).select().single()
    if (deviceForm.delivered_by && receipt) {
      await supabase.from('incentives').insert([{ employee_id: deviceForm.delivered_by, incentive_type: 'device_pickup', amount: 10, reference_id: receipt.id, reference_type: 'device_receipt', description: `حافز إحضار جهاز: ${deviceForm.device_brand} ${deviceForm.device_name} - عميل: ${selectedCustomer.name}`, period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear() }])
    }
    await supabase.from('customers').update({ status: 'device_received' }).eq('id', selectedCustomer.id)
    setIsDeviceModalOpen(false); fetchAll()
  }

  async function openDetail(customer: Customer) {
    setDetailCustomer(customer)
    const { data: custDevices } = await supabase.from('device_receipts').select('*, receiver:employees!device_receipts_received_by_fkey(id,name), deliverer:employees!device_receipts_delivered_by_fkey(id,name)').eq('customer_id', customer.id).order('receipt_date', { ascending: false })
    setCustomerDevices(custDevices || []); setIsDetailOpen(true)
  }

  const deliveryEmployees = employees.filter(e => e.department === 'delivery')

  function handleExport() { exportToCSV(filtered as any, SECTIONS.customers.headers, 'reception_customers') }

  return (
    <div className="w-full">
      <PageHeader title="الاستقبال" subtitle="استقبال العملاء وتسجيل دخول وخروج الأجهزة" icon={UserCheck} iconBg="from-pink-500 to-pink-600">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو رقم الهاتف..." />
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'إجمالي العملاء المسجلين (كول سنتر)', value: stats.totalRegistered, color: 'text-green-600' },
          { label: 'وصلوا الشركة اليوم', value: stats.todayArrivals, color: 'text-blue-600' },
          { label: 'إجمالي الأجهزة المستلمة', value: stats.totalDevicesReceived, color: 'text-amber-600' },
          { label: 'أجهزة مستلمة اليوم', value: stats.todayDevices, color: 'text-purple-600' },
        ].map((stat, i) => (
          <Card key={i} className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
            <p className="text-[10px] font-bold text-slate-400 mb-0.5">{stat.label}</p>
            <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
          </CardBody></Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <button onClick={() => setFilterStatus('all')} className={filterStatus === 'all' ? 'filter-btn-active filter-btn-active-primary' : 'filter-btn'}>الكل ({customers.length})</button>
        <button onClick={() => setFilterStatus('new')} className={filterStatus === 'new' ? 'filter-btn-active filter-btn-active-primary' : 'filter-btn'}>جديد - من الكول سنتر ({customers.filter(c => c.status === 'new').length})</button>
        <button onClick={() => setFilterStatus('arrived')} className={filterStatus === 'arrived' ? 'filter-btn-active filter-btn-active-success' : 'filter-btn'}>وصل الشركة ({customers.filter(c => c.status === 'arrived').length})</button>
        <button onClick={() => setFilterStatus('device_received')} className={filterStatus === 'device_received' ? 'filter-btn-active filter-btn-active-warning' : 'filter-btn'}>تم استلام الجهاز ({customers.filter(c => c.status === 'device_received').length})</button>
        <button onClick={() => setFilterStatus('in_repair')} className={filterStatus === 'in_repair' ? 'filter-btn-active filter-btn-active-secondary' : 'filter-btn'}>قيد الصيانة ({customers.filter(c => c.status === 'in_repair').length})</button>
        <button onClick={() => setFilterStatus('completed')} className={filterStatus === 'completed' ? 'filter-btn-active filter-btn-active-success' : 'filter-btn'}>مكتمل ({customers.filter(c => c.status === 'completed').length})</button>
      </div>

      {loading ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex items-center justify-center h-48"><Spinner size="lg" /></CardBody></Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          <UserCheck className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا يوجد عملاء</p>
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
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">العميل</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الهاتف</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">النوع</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الطلب</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الجهاز</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">موظف الكول سنتر</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الحالة</th>
                  <th className="text-center p-3 font-extrabold text-slate-600 text-xs">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, idx) => (
                  <tr key={c.id} className="border-b border-slate-100 transition-all hover:bg-blue-50/30">
                    <td className="p-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {c.customer_type === 'company' ? <Building2 className="h-3.5 w-3.5 text-purple-500" /> : <User className="h-3.5 w-3.5 text-blue-500" />}
                        <div>
                          <span className="font-extrabold text-sm text-slate-800">{c.name}</span>
                          {c.company_name && <p className="text-[10px] text-slate-500">{c.company_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-sm text-slate-600"><Phone className="h-3 w-3 text-slate-400" />{c.phone || '-'}</div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border ${c.customer_type === 'company' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        {c.customer_type === 'company' ? 'شركة' : 'فرد'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border ${c.request_type === 'maintenance' ? 'bg-amber-50 text-amber-600 border-amber-100' : c.request_type === 'supply' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                        {c.request_type === 'maintenance' ? 'صيانة' : c.request_type === 'supply' ? 'توريد' : 'صيانة وتوريد'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-slate-600">{c.device_brand ? `${c.device_brand} - ${c.device_name || ''}` : '-'}</td>
                    <td className="p-3 text-sm font-bold text-green-700">{getCallCenterEmpName(c.assigned_call_center_employee)}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border ${customerStatusColors[c.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {customerStatusLabels[c.status] || c.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-0.5">
                        <Tooltip content="عرض التفاصيل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openDetail(c)}><Eye className="h-4 w-4" /></Button></Tooltip>
                        {c.status === 'new' && (
                          <Tooltip content="تأكيد وصول العميل"><Button isIconOnly size="sm" variant="flat" color="success" onPress={() => markAsArrived(c)}><UserCheck className="h-4 w-4" /></Button></Tooltip>
                        )}
                        {(c.status === 'arrived' || c.status === 'new') && c.request_type !== 'supply' && (
                          <Tooltip content="تسجيل دخول جهاز"><Button isIconOnly size="sm" variant="flat" color="warning" onPress={() => openDeviceReceipt(c)}><ArrowDownToLine className="h-4 w-4" /></Button></Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      <CustomModal isOpen={isDeviceModalOpen} onClose={() => setIsDeviceModalOpen(false)} title={`تسجيل دخول جهاز - ${selectedCustomer?.name || ''}`} footer={
        <><ModalCancelButton label="إلغاء" onClick={() => setIsDeviceModalOpen(false)} /><ModalSubmitButton label="تسجيل دخول الجهاز" onClick={handleDeviceSubmit} color="from-amber-500 to-amber-600" /></>
      }>
        <div className="flex flex-col gap-4">
          {selectedCustomer && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs font-bold text-blue-700 mb-1">بيانات العميل</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-500">الاسم:</span> <span className="font-bold">{selectedCustomer.name}</span></div>
                <div><span className="text-slate-500">الهاتف:</span> <span className="font-bold">{selectedCustomer.phone || '-'}</span></div>
                <div><span className="text-slate-500">العنوان:</span> <span className="font-bold">{selectedCustomer.address || '-'}</span></div>
                <div><span className="text-slate-500">النوع:</span> <span className="font-bold">{selectedCustomer.customer_type === 'company' ? 'شركة' : 'فرد'}</span></div>
              </div>
            </div>
          )}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs font-bold text-amber-700 mb-2">بيانات الجهاز</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label="ماركة الجهاز" value={deviceForm.device_brand} onChange={(v) => setDeviceForm({...deviceForm, device_brand: v})} required />
              <FormInput label="اسم الجهاز" value={deviceForm.device_name} onChange={(v) => setDeviceForm({...deviceForm, device_name: v})} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <FormInput label="نوع الجهاز" value={deviceForm.device_type} onChange={(v) => setDeviceForm({...deviceForm, device_type: v})} />
              <FormInput label="الموديل" value={deviceForm.device_model} onChange={(v) => setDeviceForm({...deviceForm, device_model: v})} />
            </div>
            <div className="mt-3"><FormInput label="الرقم التسلسلي" value={deviceForm.serial_number} onChange={(v) => setDeviceForm({...deviceForm, serial_number: v})} /></div>
          </div>
          <FormTextarea label="وصف العطل" value={deviceForm.fault_description} onChange={(v) => setDeviceForm({...deviceForm, fault_description: v})} />
          <FormTextarea label="حالة الجهاز عند الاستلام" value={deviceForm.condition_notes} onChange={(v) => setDeviceForm({...deviceForm, condition_notes: v})} />
          <FormSelect label="المندوب (أحضر الجهاز)" value={String(deviceForm.delivered_by)} onChange={(v) => setDeviceForm({...deviceForm, delivered_by: parseInt(v) || 0})} options={[{ value: '0', label: 'العميل أحضر الجهاز بنفسه' }, ...deliveryEmployees.map(e => ({ value: String(e.id), label: e.name }))]} />
        </div>
      </CustomModal>

      <CustomModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`تفاصيل العميل - ${detailCustomer?.name || ''}`} footer={
        <ModalCancelButton label="إغلاق" onClick={() => setIsDetailOpen(false)} />
      }>
        {detailCustomer && (
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3 mb-3">
                {detailCustomer.customer_type === 'company' ? <Building2 className="h-6 w-6 text-purple-500" /> : <User className="h-6 w-6 text-blue-500" />}
                <div>
                  <h3 className="font-extrabold text-lg">{detailCustomer.name}</h3>
                  {detailCustomer.company_name && <p className="text-sm text-slate-500">{detailCustomer.company_name}</p>}
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border mr-auto ${customerStatusColors[detailCustomer.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  {customerStatusLabels[detailCustomer.status] || detailCustomer.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /><span>{detailCustomer.phone || '-'}</span></div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /><span>{detailCustomer.address || '-'}</span></div>
              </div>
            </div>
            {detailCustomer.device_brand && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-bold text-amber-700 mb-2">بيانات الجهاز (من الكول سنتر)</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-500">الماركة:</span> <span className="font-bold">{detailCustomer.device_brand}</span></div>
                  <div><span className="text-slate-500">الجهاز:</span> <span className="font-bold">{detailCustomer.device_name || '-'}</span></div>
                  <div><span className="text-slate-500">النوع:</span> <span className="font-bold">{detailCustomer.device_type || '-'}</span></div>
                </div>
                {detailCustomer.fault_description && (<div className="mt-2"><span className="text-slate-500 text-sm">العطل:</span> <span className="text-sm font-semibold">{detailCustomer.fault_description}</span></div>)}
              </div>
            )}
            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
              <p className="text-xs font-bold text-green-700 mb-1">موظف الكول سنتر المسجل</p>
              <p className="font-bold">{getCallCenterEmpName(detailCustomer.assigned_call_center_employee)}</p>
            </div>
            <div>
              <p className="font-bold text-sm mb-2">الأجهزة المستلمة ({customerDevices.length})</p>
              {customerDevices.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">لا توجد أجهزة مستلمة لهذا العميل</p>
              ) : (
                <div className="space-y-2">
                  {customerDevices.map(d => (
                    <div key={d.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{d.device_brand} - {d.device_name}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border ${d.status === 'received' ? 'bg-blue-50 text-blue-600 border-blue-100' : d.status === 'repaired' || d.status === 'delivered_to_customer' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          {d.status === 'received' ? 'مستلم' : d.status === 'in_diagnosis' ? 'تشخيص' : d.status === 'in_repair' ? 'صيانة' : d.status === 'repaired' ? 'تم الإصلاح' : d.status === 'delivered_to_customer' ? 'تم التسليم' : d.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-[11px] text-slate-500">
                        <span>تاريخ الاستلام: {d.receipt_date ? formatDate(d.receipt_date) : '-'}</span>
                        {d.delivery_date && <span>تاريخ التسليم: {formatDate(d.delivery_date)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CustomModal>
    </div>
  )
}
