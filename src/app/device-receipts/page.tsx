'use client'

import { useEffect, useState } from 'react'
import { supabase, DeviceReceipt, Employee, Customer } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Button, Chip, Tooltip, Spinner } from '@nextui-org/react'
import { ClipboardList, Edit, Trash2, Eye, Search, Download } from 'lucide-react'
import { exportToCSV } from '@/lib/export'

const statusConfig: Record<string, { label: string; color: string }> = {
  received: { label: 'تم الاستلام', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  in_diagnosis: { label: 'قيد التشخيص', color: 'bg-amber-50 text-amber-600 border-amber-100' },
  in_repair: { label: 'قيد الصيانة', color: 'bg-purple-50 text-purple-600 border-purple-100' },
  repaired: { label: 'تم الإصلاح', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  delivered_to_customer: { label: 'تم التسليم للعميل', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  returned: { label: 'مرتجع', color: 'bg-red-50 text-red-600 border-red-100' },
}

export default function DeviceReceiptsPage() {
  const [records, setRecords] = useState<DeviceReceipt[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [deliveryEmployees, setDeliveryEmployees] = useState<Employee[]>([])
  const [receptionEmployees, setReceptionEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isOpen, setIsOpen] = useState(false)
  const [editItem, setEditItem] = useState<DeviceReceipt | null>(null)
  const [formData, setFormData] = useState({ customer_id: 0, received_by: 0, delivered_by: 0, device_brand: '', device_name: '', device_type: '', device_model: '', serial_number: '', condition_notes: '', fault_description: '', status: 'received' as string })
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isTicketOpen, setIsTicketOpen] = useState(false)
  const [ticketDevice, setTicketDevice] = useState<DeviceReceipt | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: receipts }, { data: allEmps }, { data: custs }] = await Promise.all([
      supabase.from('device_receipts').select('*, customer:customers(id,name,phone,address,customer_type,assigned_call_center_employee), receiver:employees!device_receipts_received_by_fkey(id,name), deliverer:employees!device_receipts_delivered_by_fkey(id,name)').order('receipt_date', { ascending: false }),
      supabase.from('employees').select('*').eq('is_active', true),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
    ])
    setRecords(receipts || []); setEmployees(allEmps || [])
    setDeliveryEmployees((allEmps || []).filter(e => e.department === 'delivery'))
    setReceptionEmployees((allEmps || []).filter(e => e.department === 'reception' || e.department === 'maintenance'))
    setCustomers(custs || []); setLoading(false)
  }

  const filtered = records.filter(r => {
    const cust = r.customer as any
    const matchSearch = !search || r.device_brand?.includes(search) || r.device_name?.includes(search) || cust?.name?.includes(search) || cust?.phone?.includes(search) || String(r.id).includes(search)
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    return matchSearch && matchStatus
  })

  const filteredCustomers = customers.filter(c => c.name.includes(customerSearch) || (c.phone && c.phone.includes(customerSearch))).slice(0, 10)

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c)
    setFormData({ ...formData, customer_id: c.id, device_brand: c.device_brand || formData.device_brand, device_name: c.device_name || formData.device_name, device_type: c.device_type || formData.device_type, fault_description: c.fault_description || formData.fault_description })
    setCustomerSearch(c.name + (c.phone ? ` (${c.phone})` : '')); setShowCustomerDropdown(false)
  }

  function openAdd() {
    setEditItem(null); setSelectedCustomer(null); setCustomerSearch('')
    setFormData({ customer_id: 0, received_by: 0, delivered_by: 0, device_brand: '', device_name: '', device_type: '', device_model: '', serial_number: '', condition_notes: '', fault_description: '', status: 'received' })
    setIsOpen(true)
  }

  function openEdit(item: DeviceReceipt) {
    setEditItem(item); const cust = item.customer as any; setSelectedCustomer(cust || null)
    setCustomerSearch(cust ? `${cust.name} (${cust.phone || ''})` : '')
    setFormData({ customer_id: item.customer_id || 0, received_by: item.received_by || 0, delivered_by: item.delivered_by || 0, device_brand: item.device_brand, device_name: item.device_name, device_type: item.device_type || '', device_model: item.device_model || '', serial_number: item.serial_number || '', condition_notes: item.condition_notes || '', fault_description: item.fault_description || '', status: item.status })
    setIsOpen(true)
  }

  function openTicket(device: DeviceReceipt) { setTicketDevice(device); setIsTicketOpen(true) }

  async function handleSubmit() {
    const payload: any = { ...formData }
    if (!payload.customer_id) delete payload.customer_id
    if (!payload.received_by) delete payload.received_by
    if (!payload.delivered_by) delete payload.delivered_by
    if (editItem) {
      await supabase.from('device_receipts').update(payload).eq('id', editItem.id)
      if (payload.status === 'delivered_to_customer' && editItem.customer_id) await supabase.from('customers').update({ status: 'delivered' }).eq('id', editItem.customer_id)
      else if (payload.status === 'in_repair' && editItem.customer_id) await supabase.from('customers').update({ status: 'in_repair' }).eq('id', editItem.customer_id)
      else if (payload.status === 'repaired' && editItem.customer_id) await supabase.from('customers').update({ status: 'completed' }).eq('id', editItem.customer_id)
    } else {
      const { data: receipt } = await supabase.from('device_receipts').insert([payload]).select().single()
      if (formData.delivered_by && receipt) await supabase.from('incentives').insert([{ employee_id: formData.delivered_by, incentive_type: 'device_pickup', amount: 10, reference_id: receipt.id, reference_type: 'device_receipt', description: `حافز إحضار جهاز: ${formData.device_brand} ${formData.device_name}`, period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear() }])
      if (formData.received_by && receipt) await supabase.from('incentives').insert([{ employee_id: formData.received_by, incentive_type: 'data_entry', amount: 5, reference_id: receipt.id, reference_type: 'device_receipt', description: `حافز استقبال وتسجيل جهاز: ${formData.device_brand} ${formData.device_name}`, period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear() }])
      if (formData.customer_id) await supabase.from('customers').update({ status: 'device_received' }).eq('id', formData.customer_id)
    }
    setIsOpen(false); fetchAll()
  }

  async function handleDelete(id: number) { if (confirm('هل أنت متأكد من حذف هذا السجل؟')) { await supabase.from('device_receipts').delete().eq('id', id); fetchAll() } }

  function getCallCenterEmpName(empId: number | null) { if (!empId) return '-'; const emp = employees.find(e => e.id === empId); return emp ? emp.name : '-' }

  function handleExport() {
    const exportData = filtered.map(r => { const cust = r.customer as any; const deliverer = r.deliverer as any; return { ticket: `#${String(r.id).padStart(5, '0')}`, customer: cust?.name || '-', phone: cust?.phone || '-', device: r.device_name, brand: r.device_brand, deliverer: deliverer?.name || '-', status: statusConfig[r.status]?.label || r.status, date: r.receipt_date || '-' } })
    exportToCSV(exportData as any, [{key:'ticket',label:'رقم التيكت'},{key:'customer',label:'العميل'},{key:'phone',label:'الهاتف'},{key:'device',label:'الجهاز'},{key:'brand',label:'الماركة'},{key:'deliverer',label:'المندوب'},{key:'status',label:'الحالة'},{key:'date',label:'التاريخ'}], 'device_receipts')
  }

  return (
    <div className="w-full">
      <PageHeader title="استلام الأجهزة" subtitle="تسجيل وتتبع الأجهزة المستلمة - التيكتات" icon={ClipboardList} iconBg="from-lime-600 to-lime-700" buttonLabel="تسجيل جهاز جديد" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم التيكت أو اسم العميل أو الهاتف..." />
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <Card key={key} className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
            <p className="text-[10px] font-bold text-slate-400">{cfg.label}</p>
            <p className="text-lg font-black text-slate-800">{records.filter(r => r.status === key).length}</p>
          </CardBody></Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <button onClick={() => setFilterStatus('all')} className={filterStatus === 'all' ? 'filter-btn-active filter-btn-active-primary' : 'filter-btn'}>الكل ({records.length})</button>
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilterStatus(key)} className={filterStatus === key ? 'filter-btn-active filter-btn-active-primary' : 'filter-btn'}>
            {cfg.label} ({records.filter(r => r.status === key).length})
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex items-center justify-center h-48"><Spinner size="lg" /></CardBody></Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          <ClipboardList className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد أجهزة مستلمة</p>
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
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">رقم التيكت</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">العميل</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الهاتف</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الجهاز</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الماركة</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">المندوب</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الحالة</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">التاريخ</th>
                  <th className="text-center p-3 font-extrabold text-slate-600 text-xs">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const cust = r.customer as any
                  const deliverer = r.deliverer as any
                  const cfg = statusConfig[r.status] || statusConfig.received
                  return (
                    <tr key={r.id} className="border-b border-slate-100 transition-all hover:bg-blue-50/30">
                      <td className="p-3">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-extrabold border border-slate-200">#{String(r.id).padStart(5, '0')}</span>
                      </td>
                      <td className="p-3 font-extrabold text-sm text-slate-800">{cust?.name || '-'}</td>
                      <td className="p-3 text-sm text-slate-600">{cust?.phone || '-'}</td>
                      <td className="p-3 text-sm text-slate-600">{r.device_name}</td>
                      <td className="p-3 text-sm text-slate-600">{r.device_brand}</td>
                      <td className="p-3 text-sm font-bold text-slate-700">{deliverer?.name || '-'}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="p-3 text-sm text-slate-500">{r.receipt_date ? formatDate(r.receipt_date) : '-'}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-0.5">
                          <Tooltip content="عرض التيكت"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openTicket(r)}><Eye className="h-4 w-4" /></Button></Tooltip>
                          <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="warning" onPress={() => openEdit(r)}><Edit className="h-4 w-4" /></Button></Tooltip>
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
      )}

      {/* Add/Edit Modal */}
      <CustomModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editItem ? 'تعديل بيانات الجهاز' : 'تسجيل جهاز جديد'} footer={
        <><ModalCancelButton label="إلغاء" onClick={() => setIsOpen(false)} /><ModalSubmitButton label={editItem ? 'تحديث' : 'تسجيل'} onClick={handleSubmit} color="from-lime-600 to-lime-700" /></>
      }>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1">بحث عن العميل (بالاسم أو رقم الهاتف)</label>
            <div className="relative">
              <input type="text" className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="ابحث عن عميل مسجل من الكول سنتر..." value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); if (!e.target.value) { setSelectedCustomer(null); setFormData({ ...formData, customer_id: 0 }) } }} onFocus={() => setShowCustomerDropdown(true)} />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
            {showCustomerDropdown && customerSearch && filteredCustomers.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 max-h-48 overflow-y-auto">
                {filteredCustomers.map(c => (
                  <button key={c.id} className="w-full px-4 py-2.5 text-right hover:bg-blue-50 transition-colors flex items-center justify-between" onClick={() => selectCustomer(c)}>
                    <div><span className="font-bold text-sm">{c.name}</span>{c.phone && <span className="text-xs text-slate-500 mr-2">({c.phone})</span>}</div>
                    {c.source === 'call_center' && <span className="inline-flex px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-bold border border-emerald-100">كول سنتر</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedCustomer && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs font-bold text-blue-700 mb-1">بيانات العميل المختار</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-500">الاسم:</span> <span className="font-bold">{selectedCustomer.name}</span></div>
                <div><span className="text-slate-500">الهاتف:</span> <span className="font-bold">{selectedCustomer.phone || '-'}</span></div>
                <div><span className="text-slate-500">العنوان:</span> <span className="font-bold">{selectedCustomer.address || '-'}</span></div>
                <div><span className="text-slate-500">موظف الكول سنتر:</span> <span className="font-bold text-green-700">{getCallCenterEmpName(selectedCustomer.assigned_call_center_employee)}</span></div>
              </div>
            </div>
          )}
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
            <div className="mt-3"><FormInput label="الرقم التسلسلي" value={formData.serial_number} onChange={(v) => setFormData({...formData, serial_number: v})} /></div>
          </div>
          <FormTextarea label="وصف العطل" value={formData.fault_description} onChange={(v) => setFormData({...formData, fault_description: v})} />
          <FormTextarea label="حالة الجهاز عند الاستلام" value={formData.condition_notes} onChange={(v) => setFormData({...formData, condition_notes: v})} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="المندوب (أحضر الجهاز)" value={String(formData.delivered_by)} onChange={(v) => setFormData({...formData, delivered_by: parseInt(v) || 0})} options={[{ value: '0', label: 'العميل أحضر الجهاز بنفسه' }, ...deliveryEmployees.map(e => ({ value: String(e.id), label: e.name }))]} />
            <FormSelect label="موظف الاستقبال" value={String(formData.received_by)} onChange={(v) => setFormData({...formData, received_by: parseInt(v) || 0})} options={[{ value: '0', label: 'اختر الموظف...' }, ...receptionEmployees.map(e => ({ value: String(e.id), label: e.name }))]} />
          </div>
          {editItem && (<FormSelect label="الحالة" value={formData.status} onChange={(v) => setFormData({...formData, status: v as any})} options={Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))} />)}
        </div>
      </CustomModal>

      {/* Ticket Detail Modal */}
      <CustomModal isOpen={isTicketOpen} onClose={() => setIsTicketOpen(false)} title={ticketDevice ? `تيكت #${String(ticketDevice.id).padStart(5, '0')}` : 'تفاصيل التيكت'} footer={
        <ModalCancelButton label="إغلاق" onClick={() => setIsTicketOpen(false)} />
      }>
        {ticketDevice && (() => {
          const cust = ticketDevice.customer as any
          const receiver = ticketDevice.receiver as any
          const deliverer = ticketDevice.deliverer as any
          const cfg = statusConfig[ticketDevice.status] || statusConfig.received
          return (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl text-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-xl">Trade For Egypt</h3>
                  <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border ${cfg.color}`}>{cfg.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-extrabold text-amber-400">#{String(ticketDevice.id).padStart(5, '0')}</span>
                  <span className="text-sm text-slate-300">{ticketDevice.receipt_date ? formatDate(ticketDevice.receipt_date) : '-'}</span>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-700 mb-2">بيانات العميل</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-500">الاسم:</span> <span className="font-bold">{cust?.name || '-'}</span></div>
                  <div><span className="text-slate-500">الهاتف:</span> <span className="font-bold">{cust?.phone || '-'}</span></div>
                  <div><span className="text-slate-500">العنوان:</span> <span className="font-bold">{cust?.address || '-'}</span></div>
                  <div><span className="text-slate-500">النوع:</span> <span className="font-bold">{cust?.customer_type === 'company' ? 'شركة' : 'فرد'}</span></div>
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-bold text-amber-700 mb-2">بيانات الجهاز</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-500">الماركة:</span> <span className="font-bold">{ticketDevice.device_brand}</span></div>
                  <div><span className="text-slate-500">الجهاز:</span> <span className="font-bold">{ticketDevice.device_name}</span></div>
                  <div><span className="text-slate-500">النوع:</span> <span className="font-bold">{ticketDevice.device_type || '-'}</span></div>
                  <div><span className="text-slate-500">الموديل:</span> <span className="font-bold">{ticketDevice.device_model || '-'}</span></div>
                  <div><span className="text-slate-500">الرقم التسلسلي:</span> <span className="font-bold">{ticketDevice.serial_number || '-'}</span></div>
                </div>
              </div>
              {ticketDevice.fault_description && (<div className="p-3 bg-red-50 rounded-xl border border-red-100"><p className="text-xs font-bold text-red-700 mb-1">وصف العطل</p><p className="text-sm">{ticketDevice.fault_description}</p></div>)}
              {ticketDevice.condition_notes && (<div className="p-3 bg-gray-50 rounded-xl border border-gray-100"><p className="text-xs font-bold text-gray-700 mb-1">حالة الجهاز عند الاستلام</p><p className="text-sm">{ticketDevice.condition_notes}</p></div>)}
              <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                <p className="text-xs font-bold text-green-700 mb-2">الموظفين المسؤولين</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-500">موظف الاستقبال:</span> <span className="font-bold">{receiver?.name || '-'}</span></div>
                  <div><span className="text-slate-500">المندوب:</span> <span className="font-bold">{deliverer?.name || '-'}</span></div>
                  {cust?.assigned_call_center_employee && (<div><span className="text-slate-500">موظف الكول سنتر:</span> <span className="font-bold text-green-700">{getCallCenterEmpName(cust.assigned_call_center_employee)}</span></div>)}
                </div>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-xs font-bold text-indigo-700 mb-2">التواريخ</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-500">تاريخ الاستلام:</span> <span className="font-bold">{ticketDevice.receipt_date ? formatDate(ticketDevice.receipt_date) : '-'}</span></div>
                  <div><span className="text-slate-500">تاريخ التسليم:</span> <span className="font-bold">{ticketDevice.delivery_date ? formatDate(ticketDevice.delivery_date) : 'لم يتم التسليم بعد'}</span></div>
                </div>
              </div>
            </div>
          )
        })()}
      </CustomModal>
    </div>
  )
}
