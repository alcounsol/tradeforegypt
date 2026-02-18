'use client'

import { useEffect, useState } from 'react'
import { supabase, Customer, Employee, DeviceReceipt } from '@/lib/supabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, CardHeader, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Tooltip, Spinner, Divider } from '@nextui-org/react'
import { UserCheck, Search, Phone, MapPin, Wrench, Package, ArrowDownToLine, ArrowUpFromLine, Eye, Plus, Building2, User } from 'lucide-react'

const customerStatusLabels: Record<string, string> = {
  new: 'جديد - مسجل من الكول سنتر', contacted: 'تم التواصل', follow_up: 'متابعة',
  arrived: 'وصل الشركة', device_received: 'تم استلام الجهاز', in_repair: 'قيد الصيانة',
  completed: 'مكتمل', delivered: 'تم التسليم',
}
const customerStatusColors: Record<string, string> = {
  new: 'primary', contacted: 'secondary', follow_up: 'warning', arrived: 'success',
  device_received: 'default', in_repair: 'warning', completed: 'success', delivered: 'success',
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

  // Device receipt modal
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [deviceForm, setDeviceForm] = useState({
    device_brand: '', device_name: '', device_type: '', device_model: '',
    serial_number: '', condition_notes: '', fault_description: '', status: 'received' as string,
    delivered_by: 0,
  })

  // Customer detail modal
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null)
  const [customerDevices, setCustomerDevices] = useState<DeviceReceipt[]>([])

  // Stats
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
    setAllCustomers(allCusts)
    setCustomers(allCusts)
    setDevices(devs || [])
    setEmployees(allEmps || [])
    setCallCenterEmps((allEmps || []).filter(e => e.department === 'call_center'))

    const arrivedToday = allCusts.filter(c => c.status === 'arrived' && c.created_at?.startsWith(today)).length
    const devicesToday = (devs || []).filter(d => d.receipt_date?.startsWith(today)).length

    setStats({
      todayArrivals: arrivedToday,
      totalRegistered: allCusts.filter(c => c.source === 'call_center').length,
      totalDevicesReceived: (devs || []).length,
      todayDevices: devicesToday,
    })
    setLoading(false)
  }

  const filtered = customers.filter(c => {
    const matchSearch = !search || c.name.includes(search) || (c.phone && c.phone.includes(search)) || (c.company_name && c.company_name.includes(search))
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  // Get the call center employee name for a customer
  function getCallCenterEmpName(empId: number | null) {
    if (!empId) return '-'
    const emp = callCenterEmps.find(e => e.id === empId)
    return emp ? emp.name : '-'
  }

  // Mark customer as arrived and add incentive to call center employee
  async function markAsArrived(customer: Customer) {
    // Update customer status
    await supabase.from('customers').update({ status: 'arrived' }).eq('id', customer.id)

    // Get reception employee (نرمين)
    const receptionEmp = employees.find(e => e.department === 'reception')

    // Add incentive for reception employee (5 EGP)
    if (receptionEmp) {
      await supabase.from('incentives').insert([{
        employee_id: receptionEmp.id,
        incentive_type: 'data_entry',
        amount: 5,
        reference_id: customer.id,
        reference_type: 'customer_arrival',
        description: `حافز استقبال عميل: ${customer.name}`,
        period_month: new Date().getMonth() + 1,
        period_year: new Date().getFullYear(),
      }])
    }

    // Add incentive for call center employee who registered this customer (5 EGP)
    if (customer.assigned_call_center_employee) {
      await supabase.from('incentives').insert([{
        employee_id: customer.assigned_call_center_employee,
        incentive_type: 'customer_visit',
        amount: 5,
        reference_id: customer.id,
        reference_type: 'customer_arrival',
        description: `حافز عميل جاء للشركة: ${customer.name}`,
        period_month: new Date().getMonth() + 1,
        period_year: new Date().getFullYear(),
      }])
    }

    fetchAll()
  }

  // Open device receipt for customer
  function openDeviceReceipt(customer: Customer) {
    setSelectedCustomer(customer)
    setDeviceForm({
      device_brand: customer.device_brand || '', device_name: customer.device_name || '',
      device_type: customer.device_type || '', device_model: '',
      serial_number: '', condition_notes: '', fault_description: customer.fault_description || '',
      status: 'received', delivered_by: 0,
    })
    setIsDeviceModalOpen(true)
  }

  // Submit device receipt
  async function handleDeviceSubmit() {
    if (!selectedCustomer) return
    const receptionEmp = employees.find(e => e.department === 'reception')

    const payload: any = {
      customer_id: selectedCustomer.id,
      received_by: receptionEmp?.id || null,
      delivered_by: deviceForm.delivered_by || null,
      device_brand: deviceForm.device_brand,
      device_name: deviceForm.device_name,
      device_type: deviceForm.device_type,
      device_model: deviceForm.device_model,
      serial_number: deviceForm.serial_number,
      condition_notes: deviceForm.condition_notes,
      fault_description: deviceForm.fault_description,
      status: 'received',
    }

    const { data: receipt } = await supabase.from('device_receipts').insert([payload]).select().single()

    // Add incentive for delivery person (10 EGP per device)
    if (deviceForm.delivered_by && receipt) {
      await supabase.from('incentives').insert([{
        employee_id: deviceForm.delivered_by,
        incentive_type: 'device_pickup',
        amount: 10,
        reference_id: receipt.id,
        reference_type: 'device_receipt',
        description: `حافز إحضار جهاز: ${deviceForm.device_brand} ${deviceForm.device_name} - عميل: ${selectedCustomer.name}`,
        period_month: new Date().getMonth() + 1,
        period_year: new Date().getFullYear(),
      }])
    }

    // Update customer status
    await supabase.from('customers').update({ status: 'device_received' }).eq('id', selectedCustomer.id)

    setIsDeviceModalOpen(false)
    fetchAll()
  }

  // Open customer detail
  async function openDetail(customer: Customer) {
    setDetailCustomer(customer)
    const { data: custDevices } = await supabase.from('device_receipts')
      .select('*, receiver:employees!device_receipts_received_by_fkey(id,name), deliverer:employees!device_receipts_delivered_by_fkey(id,name)')
      .eq('customer_id', customer.id)
      .order('receipt_date', { ascending: false })
    setCustomerDevices(custDevices || [])
    setIsDetailOpen(true)
  }

  const deliveryEmployees = employees.filter(e => e.department === 'delivery')

  return (
    <div className="w-full">
      <PageHeader title="الاستقبال" subtitle="استقبال العملاء وتسجيل دخول وخروج الأجهزة" icon={UserCheck} iconBg="from-pink-500 to-pink-600">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو رقم الهاتف..." />
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'إجمالي العملاء المسجلين (كول سنتر)', value: stats.totalRegistered, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'وصلوا الشركة اليوم', value: stats.todayArrivals, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'إجمالي الأجهزة المستلمة', value: stats.totalDevicesReceived, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'أجهزة مستلمة اليوم', value: stats.todayDevices, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <Card key={i} className="shadow-sm"><CardBody className="p-4 text-center">
            <p className="text-[10px] font-semibold text-slate-500">{stat.label}</p>
            <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
          </CardBody></Card>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button size="sm" variant={filterStatus === 'all' ? 'shadow' : 'flat'} color={filterStatus === 'all' ? 'primary' : 'default'} onPress={() => setFilterStatus('all')} className="font-bold">
          الكل ({customers.length})
        </Button>
        <Button size="sm" variant={filterStatus === 'new' ? 'shadow' : 'flat'} color={filterStatus === 'new' ? 'primary' : 'default'} onPress={() => setFilterStatus('new')} className="font-bold">
          جديد - من الكول سنتر ({customers.filter(c => c.status === 'new').length})
        </Button>
        <Button size="sm" variant={filterStatus === 'arrived' ? 'shadow' : 'flat'} color={filterStatus === 'arrived' ? 'success' : 'default'} onPress={() => setFilterStatus('arrived')} className="font-bold">
          وصل الشركة ({customers.filter(c => c.status === 'arrived').length})
        </Button>
        <Button size="sm" variant={filterStatus === 'device_received' ? 'shadow' : 'flat'} color={filterStatus === 'device_received' ? 'warning' : 'default'} onPress={() => setFilterStatus('device_received')} className="font-bold">
          تم استلام الجهاز ({customers.filter(c => c.status === 'device_received').length})
        </Button>
        <Button size="sm" variant={filterStatus === 'in_repair' ? 'shadow' : 'flat'} color={filterStatus === 'in_repair' ? 'secondary' : 'default'} onPress={() => setFilterStatus('in_repair')} className="font-bold">
          قيد الصيانة ({customers.filter(c => c.status === 'in_repair').length})
        </Button>
        <Button size="sm" variant={filterStatus === 'completed' ? 'shadow' : 'flat'} color={filterStatus === 'completed' ? 'success' : 'default'} onPress={() => setFilterStatus('completed')} className="font-bold">
          مكتمل ({customers.filter(c => c.status === 'completed').length})
        </Button>
      </div>

      {/* Customer Table */}
      <Card className="shadow-md">
        <CardBody className="p-0">
          {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
          : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <UserCheck className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا يوجد عملاء</p>
            </div>
          ) : (
            <Table aria-label="جدول العملاء" removeWrapper className="min-w-full">
              <TableHeader>
                <TableColumn className="text-right font-bold">العميل</TableColumn>
                <TableColumn className="text-right font-bold">الهاتف</TableColumn>
                <TableColumn className="text-right font-bold">النوع</TableColumn>
                <TableColumn className="text-right font-bold">الطلب</TableColumn>
                <TableColumn className="text-right font-bold">الجهاز</TableColumn>
                <TableColumn className="text-right font-bold">موظف الكول سنتر</TableColumn>
                <TableColumn className="text-right font-bold">الحالة</TableColumn>
                <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {c.customer_type === 'company' ? <Building2 className="h-4 w-4 text-purple-500" /> : <User className="h-4 w-4 text-blue-500" />}
                        <div>
                          <span className="font-bold text-sm">{c.name}</span>
                          {c.company_name && <p className="text-[10px] text-slate-500">{c.company_name}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span className="text-sm">{c.phone || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" color={c.customer_type === 'company' ? 'secondary' : 'primary'} className="font-semibold">
                        {c.customer_type === 'company' ? 'شركة' : 'فرد'}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" color={c.request_type === 'maintenance' ? 'warning' : c.request_type === 'supply' ? 'secondary' : 'primary'} className="font-semibold">
                        {c.request_type === 'maintenance' ? 'صيانة' : c.request_type === 'supply' ? 'توريد' : 'صيانة وتوريد'}
                      </Chip>
                    </TableCell>
                    <TableCell className="text-sm">{c.device_brand ? `${c.device_brand} - ${c.device_name || ''}` : '-'}</TableCell>
                    <TableCell className="text-sm font-semibold text-green-700">{getCallCenterEmpName(c.assigned_call_center_employee)}</TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" color={(customerStatusColors[c.status] || 'default') as any} className="font-semibold">
                        {customerStatusLabels[c.status] || c.status}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip content="عرض التفاصيل">
                          <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openDetail(c)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                        {c.status === 'new' && (
                          <Tooltip content="تأكيد وصول العميل">
                            <Button isIconOnly size="sm" variant="flat" color="success" onPress={() => markAsArrived(c)}>
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                        )}
                        {(c.status === 'arrived' || c.status === 'new') && c.request_type !== 'supply' && (
                          <Tooltip content="تسجيل دخول جهاز">
                            <Button isIconOnly size="sm" variant="flat" color="warning" onPress={() => openDeviceReceipt(c)}>
                              <ArrowDownToLine className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Device Receipt Modal */}
      <CustomModal isOpen={isDeviceModalOpen} onClose={() => setIsDeviceModalOpen(false)} title={`تسجيل دخول جهاز - ${selectedCustomer?.name || ''}`} footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={() => setIsDeviceModalOpen(false)} />
          <ModalSubmitButton label="تسجيل دخول الجهاز" onClick={handleDeviceSubmit} color="from-amber-500 to-amber-600" />
        </>
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
            <div className="mt-3">
              <FormInput label="الرقم التسلسلي" value={deviceForm.serial_number} onChange={(v) => setDeviceForm({...deviceForm, serial_number: v})} />
            </div>
          </div>
          <FormTextarea label="وصف العطل" value={deviceForm.fault_description} onChange={(v) => setDeviceForm({...deviceForm, fault_description: v})} />
          <FormTextarea label="حالة الجهاز عند الاستلام" value={deviceForm.condition_notes} onChange={(v) => setDeviceForm({...deviceForm, condition_notes: v})} />
          <FormSelect label="المندوب (أحضر الجهاز)" value={String(deviceForm.delivered_by)} onChange={(v) => setDeviceForm({...deviceForm, delivered_by: parseInt(v) || 0})} options={[
            { value: '0', label: 'العميل أحضر الجهاز بنفسه' },
            ...deliveryEmployees.map(e => ({ value: String(e.id), label: e.name }))
          ]} />
        </div>
      </CustomModal>

      {/* Customer Detail Modal */}
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
                <Chip size="sm" variant="flat" color={(customerStatusColors[detailCustomer.status] || 'default') as any} className="font-semibold mr-auto">
                  {customerStatusLabels[detailCustomer.status] || detailCustomer.status}
                </Chip>
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
                {detailCustomer.fault_description && (
                  <div className="mt-2"><span className="text-slate-500 text-sm">العطل:</span> <span className="text-sm font-semibold">{detailCustomer.fault_description}</span></div>
                )}
              </div>
            )}

            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
              <p className="text-xs font-bold text-green-700 mb-1">موظف الكول سنتر المسجل</p>
              <p className="font-bold">{getCallCenterEmpName(detailCustomer.assigned_call_center_employee)}</p>
            </div>

            {/* Devices for this customer */}
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
                        <Chip size="sm" variant="flat" color={d.status === 'received' ? 'primary' : d.status === 'repaired' ? 'success' : d.status === 'delivered_to_customer' ? 'success' : 'warning'} className="font-semibold">
                          {d.status === 'received' ? 'مستلم' : d.status === 'in_diagnosis' ? 'تشخيص' : d.status === 'in_repair' ? 'صيانة' : d.status === 'repaired' ? 'تم الإصلاح' : d.status === 'delivered_to_customer' ? 'تم التسليم' : d.status}
                        </Chip>
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
