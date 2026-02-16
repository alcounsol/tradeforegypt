'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import Sidebar from '@/components/Sidebar'
import { Card, CardBody, CardHeader, Chip, Button, Divider, Spinner } from '@nextui-org/react'
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Wrench, Users, Package, FileBarChart, Download
} from 'lucide-react'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month')
  const [stats, setStats] = useState({
    totalRevenue: 0, totalExpenses: 0, netProfit: 0,
    totalCustomers: 0, totalServices: 0, inventoryCount: 0,
    lowStockItems: [] as { name: string; current_stock: number; min_stock_level: number }[],
    recentServices: [] as { customer_name: string; device_type: string; amount: number; status: string; service_date: string }[],
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

      const { data: services } = await supabase.from('service_records').select('*').gte('service_date', startDate)
      const totalRevenue = services?.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) || 0

      const { data: expenses } = await supabase.from('expenses').select('*').gte('expense_date', startDate)
      const totalExpenses = expenses?.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) || 0

      const { data: payrolls } = await supabase.from('payroll_records').select('*')
      const totalPayroll = payrolls?.reduce((sum, p) => sum + (p.net_paid || 0), 0) || 0

      const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true })
      const { count: serviceCount } = await supabase.from('service_records').select('*', { count: 'exact', head: true })
      const { data: inventory } = await supabase.from('inventory_items').select('*')
      const lowStockItems = inventory?.filter(i => i.current_stock <= i.min_stock_level).map(i => ({ name: i.name, current_stock: i.current_stock, min_stock_level: i.min_stock_level })) || []

      const { data: recentSvc } = await supabase.from('service_records').select('*').order('service_date', { ascending: false }).limit(5)

      setStats({
        totalRevenue, totalExpenses: totalExpenses + totalPayroll,
        netProfit: totalRevenue - totalExpenses - totalPayroll,
        totalCustomers: customerCount || 0, totalServices: serviceCount || 0,
        inventoryCount: inventory?.length || 0, lowStockItems,
        recentServices: recentSvc?.map(s => ({ customer_name: s.customer_name || 'غير محدد', device_type: s.device_type || '-', amount: s.amount, status: s.service_type, service_date: s.service_date })) || [],
      })
    } catch (error) { console.error('Error:', error) }
    finally { setLoading(false) }
  }

  const statCards = [
    { title: 'إجمالي الإيرادات', value: formatCurrency(stats.totalRevenue), icon: TrendingUp, gradient: 'from-emerald-500 to-green-600', bgLight: 'bg-emerald-50', textColor: 'text-emerald-700' },
    { title: 'إجمالي المصروفات', value: formatCurrency(stats.totalExpenses), icon: TrendingDown, gradient: 'from-rose-500 to-pink-600', bgLight: 'bg-rose-50', textColor: 'text-rose-700' },
    { title: 'صافي الربح', value: formatCurrency(stats.netProfit), icon: DollarSign, gradient: stats.netProfit >= 0 ? 'from-blue-500 to-cyan-600' : 'from-red-500 to-rose-600', bgLight: stats.netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50', textColor: stats.netProfit >= 0 ? 'text-blue-700' : 'text-red-700' },
  ]

  return (
    <div className="flex min-h-screen" dir="rtl">
      <Sidebar />
      <main className="flex-1 mr-[250px] p-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">أهلاً بك، أدمن 👋</h1>
          <p className="text-slate-500 font-medium mt-1">إليك ملخص أداء شركة Trade For Egypt اليوم.</p>
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
          <div className="flex items-center justify-center h-64"><Spinner size="lg" label="جاري التحميل..." /></div>
        ) : (
          <>
            {/* Stat Cards */}
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
              {/* Recent Services */}
              <Card className="lg:col-span-2 shadow-md">
                <CardHeader className="flex justify-between items-center px-6 pt-5 pb-0">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-amber-500" />
                    <h3 className="font-bold text-slate-900">آخر عمليات الصيانة</h3>
                  </div>
                  <Button size="sm" variant="flat" color="primary" className="font-bold">عرض الكل</Button>
                </CardHeader>
                <CardBody className="px-6">
                  {stats.recentServices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <Wrench className="h-12 w-12 mb-3 opacity-30" />
                      <p className="font-semibold">لا توجد عمليات صيانة مسجلة حالياً</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-right py-3 px-2 text-xs font-bold text-slate-500">العميل</th>
                            <th className="text-right py-3 px-2 text-xs font-bold text-slate-500">الجهاز</th>
                            <th className="text-right py-3 px-2 text-xs font-bold text-slate-500">المبلغ</th>
                            <th className="text-right py-3 px-2 text-xs font-bold text-slate-500">النوع</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentServices.map((svc, i) => (
                            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-2 font-semibold text-sm">{svc.customer_name}</td>
                              <td className="py-3 px-2 text-sm text-slate-600">{svc.device_type}</td>
                              <td className="py-3 px-2 font-bold text-sm text-emerald-600">{formatCurrency(svc.amount)}</td>
                              <td className="py-3 px-2">
                                <Chip size="sm" color={svc.status === 'INSPECTION' ? 'primary' : 'success'} variant="flat" className="font-semibold text-xs">
                                  {svc.status === 'INSPECTION' ? 'كشف' : 'صيانة'}
                                </Chip>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Quick Stats */}
              <Card className="shadow-md">
                <CardHeader className="px-6 pt-5 pb-0">
                  <h3 className="font-bold text-slate-900">إحصائيات سريعة</h3>
                </CardHeader>
                <CardBody className="px-6 space-y-4">
                  {[
                    { label: 'إجمالي العملاء', value: stats.totalCustomers, icon: Users, color: 'text-teal-500', bg: 'bg-teal-50' },
                    { label: 'إجمالي الخدمات', value: stats.totalServices, icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'أصناف المخزون', value: stats.inventoryCount, icon: Package, color: 'text-violet-500', bg: 'bg-violet-50' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg}`}>
                          <item.icon className={`h-5 w-5 ${item.color}`} />
                        </div>
                        <span className="font-semibold text-sm text-slate-700">{item.label}</span>
                      </div>
                      <span className="text-xl font-extrabold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                  <Divider className="my-2" />
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileBarChart className="h-4 w-4 text-indigo-500" />
                      <span className="font-bold text-sm text-slate-700">التقارير الذكية</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">احصل على تحليل كامل لأرباحك ومصروفاتك بضغطة زر واحدة.</p>
                    <Button color="primary" variant="flat" size="sm" startContent={<Download className="h-4 w-4" />} className="w-full font-bold">
                      تحميل تقرير الشهر
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
