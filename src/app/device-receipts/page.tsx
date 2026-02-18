'use client'

import { useEffect, useState } from 'react'
import { supabase, DeviceReceipt, Employee, Customer } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, CardHeader, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Tooltip, Spinner, Divider } from '@nextui-org/react'
import { ClipboardList, Edit, Trash2, Eye, Search, ArrowDownToLine, ArrowUpFromLine, Printer } from 'lucide-react'

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
  const [filterStatus, setFilterStatus] = useState('all')
  const [isOpen, setIsOpen] = useState(false)
  const [editItem, setEditItem] = useState<DeviceReceipt | null>(null)
  const [formData, setFormData] = useState({
    customer_id: 0, received_by: 0, delivered_by: 0,
    device_brand: '', device_name: '', device_type: '', device_model: '',
    serial_number: '', condition_notes: '', fault_description: '', status: 'received' as string,
  })

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Ticket detail modal
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
    setRecords(receipts || [])
    setEmployees(allEmps || [])
    setDeliveryEmployees((allEmps || []).filter(e => e.department === 'delivery'))
    setReceptionEmployees((allEmps || []).filter(e => e.department === 'reception' || e.department === 'maintenance'))
    setCustomers(custs || [])
    setLoading(false)
  }

  const filtered = records.filter(r => {
    const cust = r.customer as any
    const matchSearch = !search || r.device_brand?.includes(search) || r.device_name?.includes(search) || cust?.name?.includes(search) || cust?.phone?.includes(search) || String(r.id).includes(search)
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    return matchSearch && matchStatus
  })

  // Filter customers for dropdown
  const filteredCustomers = customers.filter(c =>
    c.name.includes(customerSearch) || (c.phone && c.phone.includes(customerSearch))
  ).slice(0, 10)

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c)
    setFormData({
      ...formData,
      customer_id: c.id,
      device_brand: c.device_brand || formData.device_brand,
      device_name: c.device_name || formData.device_name,
      device_type: c.device_type || formData.device_type,
      fault_description: c.fault_description || formData.fault_description,
    })
    setCustomerSearch(c.name + (c.phone ? ` (${c.phone})` : ''))
    setShowCustomerDropdown(false)
  }

  function openAdd() {
    setEditItem(null)
    setSelectedCustomer(null)
    setCustomerSearch('')
    setFormData({ customer_id: 0, received_by: 0, delivered_by: 0, device_brand: '', device_name: '', device_type: '', device_model: '', serial_number: '', condition_notes: '', fault_description: '', status: 'received' })
    setIsOpen(true)
  }

  function openEdit(item: DeviceReceipt) {
    setEditItem(item)
    const cust = item.customer as any
    setSelectedCustomer(cust || null)
    setCustomerSearch(cust ? `${cust.name} (${cust.phone || ''})` : '')
    setFormData({
      customer_id: item.customer_id || 0, received_by: item.received_by || 0, delivered_by: item.delivered_by || 0,
      device_brand: item.device_brand, device_name: item.device_name, device_type: item.device_type || '',
      device_model: item.device_model || '', serial_number: item.serial_number || '',
      condition_notes: item.condition_notes || '', fault_description: item.fault_description || '', status: item.status,
    })
    setIsOpen(true)
  }

  function openTicket(device: DeviceReceipt) {
    setTicketDevice(device)
    setIsTicketOpen(true)
  }

  async function handleSubmit() {
    const payload: any = { ...formData }
    if (!payload.customer_id) delete payload.customer_id
    if (!payload.received_by) delete payload.received_by
    if (!payload.delivered_by) delete payload.delivered_by

    if (editItem) {
      await supabase.from('device_receipts').update(payload).eq('id', editItem.id)

      // If status changed to delivered_to_customer, update customer status
      if (payload.status === 'delivered_to_customer' && editItem.customer_id) {
        await supabase.from('customers').update({ status: 'delivered' }).eq('id', editItem.customer_id)
      } else if (payload.status === 'in_repair' && editItem.customer_id) {
        await supabase.from('customers').update({ status: 'in_repair' }).eq('id', editItem.customer_id)
      } else if (payload.status === 'repaired' && editItem.customer_id) {
        await supabase.from('customers').update({ status: 'completed' }).eq('id', editItem.customer_id)
      }
    } else {
      const { data: receipt } = await supabase.from('device_receipts').insert([payload]).select().single()

      // Add incentive for delivery person (10 EGP per device) - عبد الرحمن
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

      // Add incentive for reception (5 EGP per customer) - نرمين
      if (formData.received_by && receipt) {
        await supabase.from('incentives').insert([{
          employee_id: formData.received_by,
          incentive_type: 'data_entry',
          amount: 5,
          reference_id: receipt.id,
          reference_type: 'device_receipt',
          description: `حافز استقبال وتسجيل جهاز: ${formData.device_brand} ${formData.device_name}`,
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

  // Get call center employee name
  function getCallCenterEmpName(empId: number | null) {
    if (!empId) return '-'
    const emp = employees.find(e => e.id === empId)
    return emp ? emp.name : '-'
  }

  return (
    <div className="w-full">
      <PageHeader title="استلام الأجهزة" subtitle="تسجيل وتتبع الأجهزة المستلمة - التيكتات" icon={ClipboardList} iconBg="from-lime-600 to-lime-700" buttonLabel="تسجيل جهاز جديد" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم التيكت أو اسم العميل أو الهاتف..." />
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <Card key={key} className="shadow-sm"><CardBody className="p-3 text-center">
            <p className="text-[10px] font-semibold text-slate-500">{cfg.label}</p>
            <p className="text-lg font-extrabold text-slate-800">{records.filter(r => r.status === key).length}</p>
          </CardBody></Card>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button onClick={() => setFilterStatus('all')} className={filterStatus === 'all' ? 'filter-btn-active filter-btn-active-primary' : 'filter-btn'}>
          الكل ({records.length})
        </button>
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const colorMap: Record<string, string> = { primary: 'filter-btn-active-primary', success: 'filter-btn-active-success', warning: 'filter-btn-active-warning', secondary: 'filter-btn-active-secondary', danger: 'filter-btn-active-danger' }
          return (
            <button key={key} onClick={() => setFilterStatus(key)} className={filterStatus === key ? `filter-btn-active ${colorMap[cfg.color] || 'filter-btn-active-primary'}` : 'filter-btn'}>
              {cfg.label} ({records.filter(r => r.status === key).length})
            </button>
          )
        })}
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
                <TableColumn className="text-right font-bold">رقم التيكت</TableColumn>
                <TableColumn className="text-right font-bold">العميل</TableColumn>
                <TableColumn className="text-right font-bold">الهاتف</TableColumn>
                <TableColumn className="text-right font-bold">الجهاز</TableColumn>
                <TableColumn className="text-right font-bold">الماركة</TableColumn>
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
                      <TableCell>
                        <Chip size="sm" variant="flat" color="default" className="font-mono font-bold">
                          #{String(r.id).padStart(5, '0')}
                        </Chip>
                      </TableCell>
                      <TableCell className="font-bold">{cust?.name || '-'}</TableCell>
                      <TableCell className="text-sm">{cust?.phone || '-'}</TableCell>
                      <TableCell className="text-sm">{r.device_name}</TableCell>
                      <TableCell className="text-sm">{r.device_brand}</TableCell>
                      <TableCell className="text-sm font-semibold">{deliverer?.name || '-'}</TableCell>
                      <TableCell><Chip size="sm" variant="flat" color={cfg.color} className="font-semibold">{cfg.label}</Chip></TableCell>
                      <TableCell className="text-sm text-slate-500">{r.receipt_date ? formatDate(r.receipt_date) : '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip content="عرض التيكت"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openTicket(r)}><Eye className="h-4 w-4" /></Button></Tooltip>
                          <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="warning" onPress={() => openEdit(r)}><Edit className="h-4 w-4" /></Button></Tooltip>
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
      <CustomModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editItem ? 'تعديل بيانات الجهاز' : 'تسجيل جهاز جديد'} footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={() => setIsOpen(false)} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'تسجيل'} onClick={handleSubmit} color="from-lime-600 to-lime-700" />
        </>
      }>
        <div className="flex flex-col gap-4">
          {/* Customer Search */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1">بحث عن العميل (بالاسم أو رقم الهاتف)</label>
            <div className="relative">
              <input
                type="text"
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ابحث عن عميل مسجل من الكول سنتر..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  setShowCustomerDropdown(true)
                  if (!e.target.value) {
                    setSelectedCustomer(null)
                    setFormData({ ...formData, customer_id: 0 })
                  }
                }}
                onFocus={() => setShowCustomerDropdown(true)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
            {showCustomerDropdown && customerSearch && filteredCustomers.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 max-h-48 overflow-y-auto">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    className="w-full px-4 py-2.5 text-right hover:bg-blue-50 transition-colors flex items-center justify-between"
                    onClick={() => selectCustomer(c)}
                  >
                    <div>
                      <span className="font-bold text-sm">{c.name}</span>
                      {c.phone && <span className="text-xs text-slate-500 mr-2">({c.phone})</span>}
                    </div>
                    {c.source === 'call_center' && (
                      <Chip size="sm" variant="flat" color="success" className="font-semibold text-[9px]">كول سنتر</Chip>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected customer info */}
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
            <div className="mt-3">
              <FormInput label="الرقم التسلسلي" value={formData.serial_number} onChange={(v) => setFormData({...formData, serial_number: v})} />
            </div>
          </div>
          <FormTextarea label="وصف العطل" value={formData.fault_description} onChange={(v) => setFormData({...formData, fault_description: v})} />
          <FormTextarea label="حالة الجهاز عند الاستلام" value={formData.condition_notes} onChange={(v) => setFormData({...formData, condition_notes: v})} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="المندوب (أحضر الجهاز)" value={String(formData.delivered_by)} onChange={(v) => setFormData({...formData, delivered_by: parseInt(v) || 0})} options={[
              { value: '0', label: 'العميل أحضر الجهاز بنفسه' },
              ...deliveryEmployees.map(e => ({ value: String(e.id), label: e.name }))
            ]} />
            <FormSelect label="موظف الاستقبال" value={String(formData.received_by)} onChange={(v) => setFormData({...formData, received_by: parseInt(v) || 0})} options={[
              { value: '0', label: 'اختر الموظف...' },
              ...receptionEmployees.map(e => ({ value: String(e.id), label: e.name }))
            ]} />
          </div>
          {editItem && (
            <FormSelect label="الحالة" value={formData.status} onChange={(v) => setFormData({...formData, status: v as any})} options={Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))} />
          )}
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
              {/* Ticket Header */}
              <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl text-white">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-xl">Trade For Egypt</h3>
                  <Chip size="sm" variant="flat" color={cfg.color} className="font-bold">{cfg.label}</Chip>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-extrabold text-amber-400">#{String(ticketDevice.id).padStart(5, '0')}</span>
                  <span className="text-sm text-slate-300">{ticketDevice.receipt_date ? formatDate(ticketDevice.receipt_date) : '-'}</span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-700 mb-2">بيانات العميل</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-500">الاسم:</span> <span className="font-bold">{cust?.name || '-'}</span></div>
                  <div><span className="text-slate-500">الهاتف:</span> <span className="font-bold">{cust?.phone || '-'}</span></div>
                  <div><span className="text-slate-500">العنوان:</span> <span className="font-bold">{cust?.address || '-'}</span></div>
                  <div><span className="text-slate-500">النوع:</span> <span className="font-bold">{cust?.customer_type === 'company' ? 'شركة' : 'فرد'}</span></div>
                </div>
              </div>

              {/* Device Info */}
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

              {/* Fault & Condition */}
              {ticketDevice.fault_description && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xs font-bold text-red-700 mb-1">وصف العطل</p>
                  <p className="text-sm">{ticketDevice.fault_description}</p>
                </div>
              )}
              {ticketDevice.condition_notes && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-700 mb-1">حالة الجهاز عند الاستلام</p>
                  <p className="text-sm">{ticketDevice.condition_notes}</p>
                </div>
              )}

              {/* Staff */}
              <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                <p className="text-xs font-bold text-green-700 mb-2">الموظفين المسؤولين</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-500">موظف الاستقبال:</span> <span className="font-bold">{receiver?.name || '-'}</span></div>
                  <div><span className="text-slate-500">المندوب:</span> <span className="font-bold">{deliverer?.name || '-'}</span></div>
                  {cust?.assigned_call_center_employee && (
                    <div><span className="text-slate-500">موظف الكول سنتر:</span> <span className="font-bold text-green-700">{getCallCenterEmpName(cust.assigned_call_center_employee)}</span></div>
                  )}
                </div>
              </div>

              {/* Dates */}
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
