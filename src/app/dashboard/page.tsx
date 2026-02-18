'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Card, CardBody, CardHeader, Chip, Button, Divider, Spinner, Progress } from '@nextui-org/react'
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Wrench, Users, Package, FileBarChart, Download, Phone, PhoneForwarded,
  MonitorSmartphone, Gift, ShoppingCart, LayoutDashboard, UserCheck, CheckCircle, Clock, Target
} from 'lucide-react'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month')
  const [stats, setStats] = useState({
    totalRevenue: 0, totalExpenses: 0, netProfit: 0,
    totalCustomers: 0, totalServices: 0, inventoryCount: 0,
    totalCalls: 0, totalFollowUps: 0, totalSales: 0, totalDevices: 0,
    totalIncentives: 0, totalEmployees: 0,
    ordersReceived: 0, ordersArrived: 0, ordersInRepair: 0, ordersCompleted: 0,
    lowStockItems: [] as { name: string; current_stock: number; min_stock_level: number }[],
    recentCalls: [] as any[], recentFollowUps: [] as any[],
    recentServices: [] as { customer_name: string; device_type: string; amount: number; status: string; service_date: string }[],
    employeePerformance: [] as { name: string; department: string; calls: number; registered: number; arrived: number; incentives: number }[],
    departmentStats: [] as { department: string; label: string; count: number; color: string }[],
  })

  useEffect(() => { fetchStats() }, [period])

  async function fetchStats() {
    setLoading(true)
    try {
      const now = new Date()
      let startDate = ''
      if (period === 'today') startDate = now.toISOString().split('T')[0]
      else if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); startDate = d.toISOString().split('T')[0] }
      else { startDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01` }

      const [
        { data: services }, { data: expenses }, { data: payrolls },
        { count: customerCount }, { count: serviceCount }, { data: inventory },
        { data: recentSvc }, { data: calls }, { data: followUps },
        { count: salesCount }, { data: devices }, { data: incentives },
        { data: employees }, { data: recentCalls }, { data: recentFollowUps },
        { data: allCustomers },
      ] = await Promise.all([
        supabase.from('service_records').select('*').gte('service_date', startDate),
        supabase.from('expenses').select('*').gte('expense_date', startDate),
        supabase.from('payroll_records').select('*'),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('service_records').select('*', { count: 'exact', head: true }),
        supabase.from('inventory_items').select('*'),
        supabase.from('service_records').select('*').order('service_date', { ascending: false }).limit(5),
        supabase.from('call_records').select('*, employee:employees(id,name,department)'),
        supabase.from('follow_ups').select('*'),
        supabase.from('sales_activities').select('*', { count: 'exact', head: true }),
        supabase.from('device_receipts').select('*'),
        supabase.from('incentives').select('*, employee:employees(id,name,department)'),
        supabase.from('employees').select('*').eq('is_active', true),
        supabase.from('call_records').select('*, employee:employees(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('follow_ups').select('*, employee:employees(name), customer:customers(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('customers').select('*'),
      ])

      const totalRevenue = services?.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) || 0
      const totalExpenses = expenses?.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) || 0
      const totalPayroll = payrolls?.reduce((sum, p) => sum + (p.net_paid || 0), 0) || 0
      const totalIncentives = incentives?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0
      const lowStockItems = inventory?.filter(i => i.current_stock <= i.min_stock_level).map(i => ({ name: i.name, current_stock: i.current_stock, min_stock_level: i.min_stock_level })) || []

      // Orders stats
      const allCusts = allCustomers || []
      const ordersReceived = allCusts.filter(c => c.source === 'call_center').length
      const ordersArrived = allCusts.filter(c => ['arrived', 'device_received', 'in_repair', 'completed', 'delivered'].includes(c.status)).length
      const ordersInRepair = (devices || []).filter(d => ['in_diagnosis', 'in_repair'].includes(d.status)).length
      const ordersCompleted = (devices || []).filter(d => ['repaired', 'delivered_to_customer'].includes(d.status)).length

      // Employee performance
      const empPerf = (employees || [])
        .filter(e => ['call_center', 'follow_up', 'sales', 'reception', 'delivery'].includes(e.department || ''))
        .map(emp => {
          const empCalls = (calls || []).filter(c => c.employee_id === emp.id).length
          const empRegistered = allCusts.filter(c => c.assigned_call_center_employee === emp.id).length
          const empArrived = allCusts.filter(c => c.assigned_call_center_employee === emp.id && c.status !== 'new' && c.status !== 'contacted' && c.status !== 'follow_up').length
          const empIncentives = (incentives || []).filter(i => i.employee_id === emp.id).reduce((s, i) => s + (i.amount || 0), 0)
          return { name: emp.name, department: emp.department || '', calls: empCalls, registered: empRegistered, arrived: empArrived, incentives: empIncentives }
        })
        .sort((a, b) => b.incentives - a.incentives)

      // Department stats
      const deptLabels: Record<string, { label: string; color: string }> = {
        call_center: { label: 'الكول سنتر', color: 'text-green-600' },
        follow_up: { label: 'المتابعة', color: 'text-sky-600' },
        sales: { label: 'المبيعات', color: 'text-purple-600' },
        maintenance: { label: 'الصيانة', color: 'text-amber-600' },
        reception: { label: 'الاستقبال', color: 'text-pink-600' },
        delivery: { label: 'التوصيل', color: 'text-orange-600' },
        hr: { label: 'الموارد البشرية', color: 'text-indigo-600' },
      }
      const deptStats = Object.entries(deptLabels).map(([dept, info]) => ({
        department: dept,
        label: info.label,
        count: (employees || []).filter(e => e.department === dept).length,
        color: info.color,
      })).filter(d => d.count > 0)

      setStats({
        totalRevenue, totalExpenses: totalExpenses + totalPayroll,
        netProfit: totalRevenue - totalExpenses - totalPayroll - totalIncentives,
        totalCustomers: customerCount || 0, totalServices: serviceCount || 0,
        inventoryCount: inventory?.length || 0, lowStockItems,
        totalCalls: (calls || []).length, totalFollowUps: (followUps || []).length,
        totalSales: salesCount || 0, totalDevices: (devices || []).length,
        totalIncentives, totalEmployees: (employees || []).length,
        ordersReceived, ordersArrived, ordersInRepair, ordersCompleted,
        recentCalls: recentCalls || [], recentFollowUps: recentFollowUps || [],
        recentServices: recentSvc?.map(s => ({ customer_name: s.customer_name || 'غير محدد', device_type: s.device_type || '-', amount: s.amount, status: s.service_type, service_date: s.service_date })) || [],
        employeePerformance: empPerf,
        departmentStats: deptStats,
      })
    } catch (error) { console.error('Error:', error) }
    finally { setLoading(false) }
  }

  const statCards = [
    { title: 'إجمالي الإيرادات', value: formatCurrency(stats.totalRevenue), icon: TrendingUp, gradient: 'from-emerald-500 to-green-600', textColor: 'text-emerald-700' },
    { title: 'إجمالي المصروفات', value: formatCurrency(stats.totalExpenses), icon: TrendingDown, gradient: 'from-rose-500 to-pink-600', textColor: 'text-rose-700' },
    { title: 'صافي الربح', value: formatCurrency(stats.netProfit), icon: DollarSign, gradient: stats.netProfit >= 0 ? 'from-blue-500 to-cyan-600' : 'from-red-500 to-rose-600', textColor: stats.netProfit >= 0 ? 'text-blue-700' : 'text-red-700' },
  ]

  return (
    <div className="w-full">
      {/* Welcome */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
          <LayoutDashboard className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">لوحة تحكم الأدمن</h1>
          <p className="text-slate-500 font-medium mt-1">نظرة شاملة على أداء شركة Trade For Egypt</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-8">
        {[
          { key: 'today' as const, label: 'اليوم' },
          { key: 'week' as const, label: 'هذا الأسبوع' },
          { key: 'month' as const, label: 'هذا الشهر' },
        ].map(p => (
          <Button key={p.key} size="sm" variant={period === p.key ? 'shadow' : 'flat'} color={period === p.key ? 'primary' : 'default'} onPress={() => setPeriod(p.key)} className="font-bold">
            {p.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* Financial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {statCards.map((card, i) => (
              <Card key={i} className="border-none shadow-md hover:shadow-xl transition-shadow">
                <CardBody className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500 mb-1">{card.title}</p>
                      <p className={`text-3xl font-extrabold ${card.textColor}`}>{card.value}</p>
                    </div>
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                      <card.icon className="h-7 w-7 text-white" />
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Orders Pipeline */}
          <Card className="mb-8 shadow-md">
            <CardHeader className="px-6 pt-5 pb-0 flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-500" />
              <h3 className="font-extrabold text-slate-900">مسار الأوردرات</h3>
            </CardHeader>
            <CardBody className="px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <Phone className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-slate-500">أوردرات مستقبلة (كول سنتر)</p>
                  <p className="text-2xl font-extrabold text-blue-600">{stats.ordersReceived}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl text-center">
                  <UserCheck className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-slate-500">جاءوا للشركة</p>
                  <p className="text-2xl font-extrabold text-green-600">{stats.ordersArrived}</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl text-center">
                  <Wrench className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-slate-500">قيد الصيانة</p>
                  <p className="text-2xl font-extrabold text-amber-600">{stats.ordersInRepair}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl text-center">
                  <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-slate-500">مكتمل / تم التسليم</p>
                  <p className="text-2xl font-extrabold text-emerald-600">{stats.ordersCompleted}</p>
                </div>
              </div>
              {stats.ordersReceived > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-500">نسبة التحويل (من الكول سنتر للشركة)</span>
                    <span className="font-extrabold text-indigo-600">{Math.round((stats.ordersArrived / stats.ordersReceived) * 100)}%</span>
                  </div>
                  <Progress value={Math.round((stats.ordersArrived / stats.ordersReceived) * 100)} color="primary" size="md" />
                </div>
              )}
            </CardBody>
          </Card>

          {/* Activity Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
            {[
              { label: 'الموظفين', value: stats.totalEmployees, icon: Users, color: 'text-violet-500', bg: 'bg-violet-50' },
              { label: 'العملاء', value: stats.totalCustomers, icon: Users, color: 'text-teal-500', bg: 'bg-teal-50' },
              { label: 'المكالمات', value: stats.totalCalls, icon: Phone, color: 'text-green-500', bg: 'bg-green-50' },
              { label: 'المتابعات', value: stats.totalFollowUps, icon: PhoneForwarded, color: 'text-sky-500', bg: 'bg-sky-50' },
              { label: 'المبيعات', value: stats.totalSales, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
              { label: 'الخدمات', value: stats.totalServices, icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-50' },
              { label: 'الأجهزة', value: stats.totalDevices, icon: MonitorSmartphone, color: 'text-lime-500', bg: 'bg-lime-50' },
              { label: 'المخزون', value: stats.inventoryCount, icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            ].map((item, i) => (
              <Card key={i} className="shadow-sm hover:shadow-md transition-shadow">
                <CardBody className="p-3 text-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.bg} mx-auto mb-1`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500">{item.label}</p>
                  <p className="text-lg font-extrabold text-slate-900">{item.value}</p>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Employee Performance */}
          <Card className="mb-8 shadow-md">
            <CardHeader className="px-6 pt-5 pb-0 flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-500" />
              <h3 className="font-extrabold text-slate-900">أداء الموظفين</h3>
            </CardHeader>
            <CardBody className="px-6">
              {stats.employeePerformance.length === 0 ? (
                <p className="text-center text-slate-400 py-4">لا توجد بيانات</p>
              ) : (
                <div className="space-y-3">
                  {stats.employeePerformance.slice(0, 10).map((emp, i) => {
                    const deptLabels: Record<string, string> = {
                      call_center: 'كول سنتر', follow_up: 'متابعة', sales: 'مبيعات',
                      reception: 'استقبال', delivery: 'توصيل', maintenance: 'صيانة', hr: 'HR',
                    }
                    return (
                      <div key={i} className={`p-3 rounded-xl border ${i === 0 ? 'bg-gradient-to-l from-amber-50 to-yellow-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {i === 0 && <span>🏆</span>}
                            <span className="font-extrabold text-sm">{emp.name}</span>
                            <Chip size="sm" variant="flat" color="default" className="font-semibold text-[9px]">{deptLabels[emp.department] || emp.department}</Chip>
                          </div>
                          <Chip size="sm" variant="flat" color="success" className="font-bold">
                            {formatCurrency(emp.incentives)}
                          </Chip>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                          <div><span className="text-slate-500">مكالمات:</span> <span className="font-extrabold text-green-600">{emp.calls}</span></div>
                          <div><span className="text-slate-500">عملاء مسجلين:</span> <span className="font-extrabold text-blue-600">{emp.registered}</span></div>
                          <div><span className="text-slate-500">جاءوا للشركة:</span> <span className="font-extrabold text-emerald-600">{emp.arrived}</span></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Department Distribution */}
          <Card className="mb-8 shadow-md">
            <CardHeader className="px-6 pt-5 pb-0 flex items-center gap-2">
              <FileBarChart className="h-5 w-5 text-indigo-500" />
              <h3 className="font-extrabold text-slate-900">توزيع الموظفين حسب الأقسام</h3>
            </CardHeader>
            <CardBody className="px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {stats.departmentStats.map((dept, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-slate-500">{dept.label}</p>
                    <p className={`text-xl font-extrabold ${dept.color}`}>{dept.count}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Low Stock Alert */}
          {stats.lowStockItems.length > 0 && (
            <Card className="mb-8 border-l-4 border-amber-400 shadow-md">
              <CardBody className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">تنبيهات المخزون</h3>
                    <p className="text-xs text-slate-500">{stats.lowStockItems.length} أصناف منخفضة</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.lowStockItems.map((item, i) => (
                    <Chip key={i} color="warning" variant="flat" size="sm" className="font-semibold">
                      {item.name} ({item.current_stock}/{item.min_stock_level})
                    </Chip>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Recent Calls */}
            <Card className="shadow-md">
              <CardHeader className="px-6 pt-5 pb-0 flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-500" />
                <h3 className="font-bold text-slate-900">آخر المكالمات</h3>
              </CardHeader>
              <CardBody className="px-6 space-y-2">
                {stats.recentCalls.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <Phone className="h-10 w-10 mb-2 opacity-30" />
                    <p className="font-semibold text-sm">لا توجد مكالمات</p>
                  </div>
                ) : stats.recentCalls.map((call: any) => (
                  <div key={call.id} className="p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <p className="text-xs font-bold text-slate-800">{call.customer_name}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[10px] text-slate-500">{call.device_brand} - {(call.employee as any)?.name}</p>
                      <Chip size="sm" variant="flat" color={call.request_type === 'maintenance' ? 'warning' : 'secondary'} className="font-semibold text-[9px]">
                        {call.request_type === 'maintenance' ? 'صيانة' : 'توريد'}
                      </Chip>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>

            {/* Recent Follow-ups */}
            <Card className="shadow-md">
              <CardHeader className="px-6 pt-5 pb-0 flex items-center gap-2">
                <PhoneForwarded className="h-5 w-5 text-sky-500" />
                <h3 className="font-bold text-slate-900">آخر المتابعات</h3>
              </CardHeader>
              <CardBody className="px-6 space-y-2">
                {stats.recentFollowUps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <PhoneForwarded className="h-10 w-10 mb-2 opacity-30" />
                    <p className="font-semibold text-sm">لا توجد متابعات</p>
                  </div>
                ) : stats.recentFollowUps.map((fu: any) => (
                  <div key={fu.id} className="p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <p className="text-xs font-bold text-slate-800">{(fu.customer as any)?.name || 'عميل'}</p>
                    <p className="text-[10px] text-slate-500">{(fu.employee as any)?.name} - {fu.status}</p>
                  </div>
                ))}
              </CardBody>
            </Card>

            {/* Recent Services */}
            <Card className="shadow-md">
              <CardHeader className="px-6 pt-5 pb-0 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-slate-900">آخر الخدمات</h3>
              </CardHeader>
              <CardBody className="px-6 space-y-2">
                {stats.recentServices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <Wrench className="h-10 w-10 mb-2 opacity-30" />
                    <p className="font-semibold text-sm">لا توجد خدمات</p>
                  </div>
                ) : stats.recentServices.map((svc, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800">{svc.customer_name}</p>
                      <span className="text-xs font-extrabold text-emerald-600">{formatCurrency(svc.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[10px] text-slate-500">{svc.device_type}</p>
                      <Chip size="sm" variant="flat" color={svc.status === 'INSPECTION' ? 'primary' : 'success'} className="font-semibold text-[9px]">
                        {svc.status === 'INSPECTION' ? 'كشف' : 'صيانة'}
                      </Chip>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
