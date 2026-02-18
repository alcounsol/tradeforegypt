'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Card, CardBody, CardHeader, Chip, Divider, Spinner, Progress } from '@nextui-org/react'
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Wrench, Users, Package, FileBarChart, Phone, PhoneForwarded,
  MonitorSmartphone, Gift, ShoppingCart, LayoutDashboard, UserCheck, CheckCircle, Clock, Target,
  FileText, Calculator, Wallet, ArrowUpRight, ArrowDownRight, BarChart3
} from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month')
  const [stats, setStats] = useState({
    totalRevenue: 0, totalExpenses: 0, netProfit: 0,
    totalCustomers: 0, totalServices: 0, inventoryCount: 0,
    totalCalls: 0, totalFollowUps: 0, totalSales: 0, totalDevices: 0,
    totalIncentives: 0, totalEmployees: 0, totalPayroll: 0,
    ordersReceived: 0, ordersArrived: 0, ordersInRepair: 0, ordersCompleted: 0,
    invoicesCount: 0, invoicesPaid: 0, invoicesUnpaid: 0, invoicesTotal: 0,
    transactionsIncome: 0, transactionsExpense: 0,
    purchasesTotal: 0, purchasesCount: 0,
    lowStockItems: [] as { name: string; current_stock: number; min_stock_level: number }[],
    recentCalls: [] as any[], recentFollowUps: [] as any[],
    recentServices: [] as { customer_name: string; device_type: string; amount: number; status: string; service_date: string }[],
    recentInvoices: [] as any[],
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
        { data: allCustomers }, { data: invoices }, { data: transactions },
        { data: purchases }, { data: recentInvoices },
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
        supabase.from('invoices').select('*'),
        supabase.from('transactions').select('*').gte('transaction_date', startDate),
        supabase.from('purchases').select('*').gte('purchase_date', startDate),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(5),
      ])

      const totalRevenue = services?.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) || 0
      const totalExpenses = expenses?.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) || 0
      const totalPayroll = payrolls?.filter(p => p.is_paid).reduce((sum, p) => sum + (p.net_paid || 0), 0) || 0
      const totalIncentives = incentives?.reduce((sum, i) => sum + (i.total_amount || i.amount || 0), 0) || 0
      const lowStockItems = inventory?.filter(i => i.current_stock <= (i.min_stock_level || 5)).map(i => ({ name: i.name, current_stock: i.current_stock, min_stock_level: i.min_stock_level || 5 })) || []

      // Invoices
      const allInvoices = invoices || []
      const invoicesTotal = allInvoices.reduce((s, inv) => s + (parseFloat(inv.total_amount) || 0), 0)
      const invoicesPaid = allInvoices.filter(inv => inv.status === 'paid').reduce((s, inv) => s + (parseFloat(inv.total_amount) || 0), 0)
      const invoicesUnpaid = allInvoices.filter(inv => inv.status !== 'paid').reduce((s, inv) => s + (parseFloat(inv.total_amount) || 0), 0)

      // Transactions
      const transactionsIncome = (transactions || []).filter(t => t.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
      const transactionsExpense = (transactions || []).filter(t => t.type === 'expense').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)

      // Purchases
      const purchasesTotal = (purchases || []).reduce((s, p) => s + (parseFloat(p.total_cost) || 0), 0)

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
          const empIncentives = (incentives || []).filter(i => i.employee_id === emp.id).reduce((s, i) => s + (i.total_amount || i.amount || 0), 0)
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
        department: dept, label: info.label,
        count: (employees || []).filter(e => e.department === dept).length,
        color: info.color,
      })).filter(d => d.count > 0)

      setStats({
        totalRevenue: totalRevenue + transactionsIncome,
        totalExpenses: totalExpenses + totalPayroll + purchasesTotal,
        netProfit: totalRevenue + transactionsIncome - totalExpenses - totalPayroll - totalIncentives - purchasesTotal,
        totalCustomers: customerCount || 0, totalServices: serviceCount || 0,
        inventoryCount: inventory?.length || 0, lowStockItems,
        totalCalls: (calls || []).length, totalFollowUps: (followUps || []).length,
        totalSales: salesCount || 0, totalDevices: (devices || []).length,
        totalIncentives, totalEmployees: (employees || []).length, totalPayroll,
        ordersReceived, ordersArrived, ordersInRepair, ordersCompleted,
        invoicesCount: allInvoices.length, invoicesPaid, invoicesUnpaid, invoicesTotal,
        transactionsIncome, transactionsExpense,
        purchasesTotal, purchasesCount: (purchases || []).length,
        recentCalls: recentCalls || [], recentFollowUps: recentFollowUps || [],
        recentServices: recentSvc?.map(s => ({ customer_name: s.customer_name || 'غير محدد', device_type: s.device_type || '-', amount: s.amount, status: s.service_type, service_date: s.service_date })) || [],
        recentInvoices: recentInvoices || [],
        employeePerformance: empPerf,
        departmentStats: deptStats,
      })
    } catch (error) { console.error('Error:', error) }
    finally { setLoading(false) }
  }

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
      <div className="flex gap-3 mb-8">
        {[
          { key: 'today' as const, label: 'اليوم' },
          { key: 'week' as const, label: 'هذا الأسبوع' },
          { key: 'month' as const, label: 'هذا الشهر' },
        ].map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)} className={period === p.key ? 'period-btn-active' : 'period-btn'}>
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <Card className="border-none shadow-md hover:shadow-xl transition-shadow bg-gradient-to-br from-emerald-50 to-green-50">
              <CardBody className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">إجمالي الإيرادات</p>
                    <p className="text-2xl font-extrabold text-emerald-700">{formatCurrency(stats.totalRevenue)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-500">خدمات + فواتير + مبيعات</span>
                    </div>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="border-none shadow-md hover:shadow-xl transition-shadow bg-gradient-to-br from-rose-50 to-pink-50">
              <CardBody className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">إجمالي المصروفات</p>
                    <p className="text-2xl font-extrabold text-rose-700">{formatCurrency(stats.totalExpenses)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <ArrowDownRight className="h-3 w-3 text-rose-500" />
                      <span className="text-[10px] font-bold text-rose-500">رواتب + مشتريات + مصروفات</span>
                    </div>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg">
                    <TrendingDown className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className={`border-none shadow-md hover:shadow-xl transition-shadow ${stats.netProfit >= 0 ? 'bg-gradient-to-br from-blue-50 to-cyan-50' : 'bg-gradient-to-br from-red-50 to-orange-50'}`}>
              <CardBody className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">صافي الربح</p>
                    <p className={`text-2xl font-extrabold ${stats.netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatCurrency(stats.netProfit)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <BarChart3 className={`h-3 w-3 ${stats.netProfit >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
                      <span className={`text-[10px] font-bold ${stats.netProfit >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                        {stats.netProfit >= 0 ? 'ربح' : 'خسارة'}
                      </span>
                    </div>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${stats.netProfit >= 0 ? 'from-blue-500 to-cyan-600' : 'from-red-500 to-rose-600'} shadow-lg`}>
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="border-none shadow-md hover:shadow-xl transition-shadow bg-gradient-to-br from-indigo-50 to-violet-50">
              <CardBody className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">الفواتير المستحقة</p>
                    <p className="text-2xl font-extrabold text-indigo-700">{formatCurrency(stats.invoicesUnpaid)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <FileText className="h-3 w-3 text-indigo-500" />
                      <span className="text-[10px] font-bold text-indigo-500">{stats.invoicesCount} فاتورة إجمالي</span>
                    </div>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Financial Breakdown */}
          <Card className="mb-8 shadow-md">
            <CardHeader className="px-6 pt-5 pb-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-emerald-500" />
                <h3 className="font-extrabold text-slate-900">التفاصيل المالية</h3>
              </div>
              <Link href="/accounts" className="text-xs font-bold text-blue-600 hover:underline">عرض الحسابات الكاملة ←</Link>
            </CardHeader>
            <CardBody className="px-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="p-3 bg-green-50 rounded-xl text-center border border-green-100">
                  <Wrench className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-[10px] font-bold text-slate-500">إيرادات الخدمات</p>
                  <p className="text-lg font-extrabold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl text-center border border-indigo-100">
                  <FileText className="h-5 w-5 text-indigo-500 mx-auto mb-1" />
                  <p className="text-[10px] font-bold text-slate-500">إيرادات الفواتير</p>
                  <p className="text-lg font-extrabold text-indigo-600">{formatCurrency(stats.invoicesPaid)}</p>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl text-center border border-rose-100">
                  <Wallet className="h-5 w-5 text-rose-500 mx-auto mb-1" />
                  <p className="text-[10px] font-bold text-slate-500">الرواتب المصروفة</p>
                  <p className="text-lg font-extrabold text-rose-600">{formatCurrency(stats.totalPayroll)}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-center border border-amber-100">
                  <Gift className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                  <p className="text-[10px] font-bold text-slate-500">الحوافز</p>
                  <p className="text-lg font-extrabold text-amber-600">{formatCurrency(stats.totalIncentives)}</p>
                </div>
                <div className="p-3 bg-cyan-50 rounded-xl text-center border border-cyan-100">
                  <ShoppingCart className="h-5 w-5 text-cyan-500 mx-auto mb-1" />
                  <p className="text-[10px] font-bold text-slate-500">المشتريات ({stats.purchasesCount})</p>
                  <p className="text-lg font-extrabold text-cyan-600">{formatCurrency(stats.purchasesTotal)}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl text-center border border-orange-100">
                  <TrendingDown className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                  <p className="text-[10px] font-bold text-slate-500">مصروفات أخرى</p>
                  <p className="text-lg font-extrabold text-orange-600">{formatCurrency(stats.totalExpenses - stats.totalPayroll - stats.purchasesTotal)}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Orders Pipeline */}
          <Card className="mb-8 shadow-md">
            <CardHeader className="px-6 pt-5 pb-0 flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-500" />
              <h3 className="font-extrabold text-slate-900">مسار الأوردرات</h3>
            </CardHeader>
            <CardBody className="px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl text-center border border-blue-100">
                  <Phone className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-slate-500">أوردرات مستقبلة (كول سنتر)</p>
                  <p className="text-2xl font-extrabold text-blue-600">{stats.ordersReceived}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl text-center border border-green-100">
                  <UserCheck className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-slate-500">جاءوا للشركة</p>
                  <p className="text-2xl font-extrabold text-green-600">{stats.ordersArrived}</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl text-center border border-amber-100">
                  <Wrench className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-slate-500">قيد الصيانة</p>
                  <p className="text-2xl font-extrabold text-amber-600">{stats.ordersInRepair}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl text-center border border-emerald-100">
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
                    const conversionRate = emp.registered > 0 ? Math.round((emp.arrived / emp.registered) * 100) : 0
                    return (
                      <div key={i} className={`p-3 rounded-xl border ${i === 0 ? 'bg-gradient-to-l from-amber-50 to-yellow-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {i === 0 && <span className="text-lg">&#127942;</span>}
                            <span className="font-extrabold text-sm">{emp.name}</span>
                            <Chip size="sm" variant="flat" color="default" className="font-semibold text-[9px]">{deptLabels[emp.department] || emp.department}</Chip>
                          </div>
                          <Chip size="sm" variant="flat" color="success" className="font-bold">
                            حوافز: {formatCurrency(emp.incentives)}
                          </Chip>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                          <div className="p-1.5 bg-white rounded-lg"><span className="text-slate-500">مكالمات:</span> <span className="font-extrabold text-green-600">{emp.calls}</span></div>
                          <div className="p-1.5 bg-white rounded-lg"><span className="text-slate-500">مسجلين:</span> <span className="font-extrabold text-blue-600">{emp.registered}</span></div>
                          <div className="p-1.5 bg-white rounded-lg"><span className="text-slate-500">جاءوا:</span> <span className="font-extrabold text-emerald-600">{emp.arrived}</span></div>
                          <div className="p-1.5 bg-white rounded-lg"><span className="text-slate-500">تحويل:</span> <span className="font-extrabold text-indigo-600">{conversionRate}%</span></div>
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
                  <div key={i} className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            {/* Recent Calls */}
            <Card className="shadow-md">
              <CardHeader className="px-6 pt-5 pb-0 flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-500" />
                <h3 className="font-bold text-slate-900 text-sm">آخر المكالمات</h3>
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
                <h3 className="font-bold text-slate-900 text-sm">آخر المتابعات</h3>
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
                <h3 className="font-bold text-slate-900 text-sm">آخر الخدمات</h3>
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

            {/* Recent Invoices */}
            <Card className="shadow-md">
              <CardHeader className="px-6 pt-5 pb-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-500" />
                  <h3 className="font-bold text-slate-900 text-sm">آخر الفواتير</h3>
                </div>
                <Link href="/invoices" className="text-[10px] font-bold text-blue-600 hover:underline">الكل</Link>
              </CardHeader>
              <CardBody className="px-6 space-y-2">
                {stats.recentInvoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <FileText className="h-10 w-10 mb-2 opacity-30" />
                    <p className="font-semibold text-sm">لا توجد فواتير</p>
                  </div>
                ) : stats.recentInvoices.map((inv: any) => (
                  <div key={inv.id} className="p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800">{inv.customer_name}</p>
                      <span className="text-xs font-extrabold text-indigo-600">{formatCurrency(inv.total_amount)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[10px] text-slate-500">#{inv.invoice_number}</p>
                      <Chip size="sm" variant="flat" color={inv.status === 'paid' ? 'success' : inv.status === 'partial' ? 'warning' : 'danger'} className="font-semibold text-[9px]">
                        {inv.status === 'paid' ? 'مدفوعة' : inv.status === 'partial' ? 'جزئي' : 'غير مدفوعة'}
                      </Chip>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>

          {/* Quick Links */}
          <Card className="shadow-md">
            <CardHeader className="px-6 pt-5 pb-0">
              <h3 className="font-extrabold text-slate-900">روابط سريعة</h3>
            </CardHeader>
            <CardBody className="px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[
                  { href: '/invoices', label: 'إنشاء فاتورة', icon: FileText, color: 'from-indigo-500 to-violet-600' },
                  { href: '/accounts', label: 'الحسابات المالية', icon: Calculator, color: 'from-emerald-500 to-green-600' },
                  { href: '/call-center', label: 'الكول سنتر', icon: Phone, color: 'from-green-500 to-emerald-600' },
                  { href: '/reception', label: 'الاستقبال', icon: UserCheck, color: 'from-pink-500 to-rose-600' },
                  { href: '/reports', label: 'التقارير', icon: FileBarChart, color: 'from-blue-500 to-cyan-600' },
                  { href: '/payroll', label: 'الرواتب', icon: Wallet, color: 'from-rose-500 to-pink-600' },
                ].map((link, i) => (
                  <Link key={i} href={link.href} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 transition-all hover:shadow-md">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${link.color} shadow-md`}>
                      <link.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{link.label}</span>
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
