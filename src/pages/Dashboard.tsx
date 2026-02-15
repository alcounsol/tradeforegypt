import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import Sidebar from '../components/Sidebar'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Package,
  Users,
  Wrench,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Search,
  Download
} from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    lowStockCount: 0,
    customersCount: 0,
    servicesCount: 0,
    inventoryCount: 0
  })
  const [recentServices, setRecentServices] = useState<any[]>([])

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`

      const { data: services } = await supabase
        .from('service_records')
        .select('*')
        .gte('service_date', startDate)
        .order('service_date', { ascending: false })
        .limit(5)

      const { data: allServices } = await supabase
        .from('service_records')
        .select('amount')
        .gte('service_date', startDate)

      const totalRevenue = allServices?.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) || 0

      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', startDate)

      const totalExpenses = expenses?.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) || 0

      const { data: lowStock } = await supabase
        .from('inventory_items')
        .select('id')
        .lte('current_stock', 5)

      const { count: customersCount } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })

      const { count: inventoryCount } = await supabase
        .from('inventory_items')
        .select('id', { count: 'exact', head: true })

      setStats({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        lowStockCount: lowStock?.length || 0,
        customersCount: customersCount || 0,
        servicesCount: allServices?.length || 0,
        inventoryCount: inventoryCount || 0
      })

      setRecentServices(services || [])
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  return (
    <div className="page-layout font-['Cairo']" dir="rtl">
      <Sidebar />

      <div className="page-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl w-80 border border-slate-200/60">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث عن أي شيء..."
              className="bg-transparent border-none outline-none text-sm w-full font-medium"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200/60">
              <Bell className="h-[18px] w-[18px] text-slate-500" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
            >
              A
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="main-content">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                أهلاً بك، أدمن 👋
              </h1>
              <p className="text-slate-500 mt-1 text-sm font-medium">
                إليك ملخص أداء شركة Trade For Egypt اليوم.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
              <button className="px-5 py-2 rounded-lg text-sm font-bold bg-slate-900 text-white shadow-sm transition-all">
                اليوم
              </button>
              <button className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all">
                هذا الأسبوع
              </button>
              <button className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all">
                هذا الشهر
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="إجمالي الإيرادات"
              value={formatCurrency(stats.totalRevenue)}
              icon={TrendingUp}
              iconBg="bg-sky-50"
              iconColor="text-sky-600"
              trend="+12.5%"
              isUp={true}
              accentClass="blue"
            />
            <StatCard
              title="إجمالي المصروفات"
              value={formatCurrency(stats.totalExpenses)}
              icon={TrendingDown}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
              trend="+4.2%"
              isUp={false}
              accentClass="red"
            />
            <StatCard
              title="صافي الربح"
              value={formatCurrency(stats.netProfit)}
              icon={DollarSign}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              trend="+8.1%"
              isUp={true}
              accentClass="green"
            />
            <StatCard
              title="تنبيهات المخزون"
              value={stats.lowStockCount}
              icon={AlertTriangle}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              trend="أصناف منخفضة"
              isWarning={stats.lowStockCount > 0}
              accentClass="amber"
            />
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Services Table */}
            <div className="lg:col-span-2 card overflow-hidden">
              <div className="card-header">
                <h2 className="text-base font-extrabold text-slate-900">
                  آخر عمليات الصيانة
                </h2>
                <button className="text-sky-600 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-sky-50 transition-all">
                  عرض السجل الكامل
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>العميل</th>
                      <th>الجهاز</th>
                      <th>المبلغ</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentServices.length > 0 ? (
                      recentServices.map((service) => (
                        <tr key={service.id}>
                          <td>
                            <div className="font-bold text-slate-900 text-sm">
                              {service.customer_name}
                            </div>
                          </td>
                          <td className="text-slate-600 font-medium">
                            {service.device_brand} {service.device_model}
                          </td>
                          <td className="font-extrabold text-slate-900">
                            {formatCurrency(service.amount)}
                          </td>
                          <td>
                            <span className="badge badge-success">مكتمل</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4}>
                          <div className="empty-state">
                            <div className="empty-state-icon">
                              <Wrench className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-slate-400 font-semibold text-sm">
                              لا توجد عمليات صيانة مسجلة حالياً
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Side Cards */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-base font-extrabold text-slate-900">
                    إحصائيات سريعة
                  </h2>
                </div>
                <div className="card-body space-y-3">
                  <QuickStatItem
                    icon={Users}
                    label="إجمالي العملاء"
                    value={stats.customersCount}
                    color="#0ea5e9"
                  />
                  <QuickStatItem
                    icon={Wrench}
                    label="إجمالي الخدمات"
                    value={stats.servicesCount}
                    color="#6366f1"
                  />
                  <QuickStatItem
                    icon={Package}
                    label="أصناف المخزون"
                    value={stats.inventoryCount}
                    color="#f59e0b"
                  />
                </div>
              </div>

              {/* Reports Card */}
              <div
                className="rounded-xl p-6 text-white relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                }}
              >
                <div className="relative z-10">
                  <h3 className="text-lg font-extrabold mb-2">التقارير الذكية</h3>
                  <p className="text-slate-400 text-xs leading-relaxed mb-5 font-medium">
                    احصل على تحليل كامل لأرباحك ومصروفاتك بضغطة زر واحدة.
                  </p>
                  <button
                    className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                      boxShadow: '0 4px 15px rgba(14, 165, 233, 0.3)',
                    }}
                  >
                    <Download className="h-4 w-4" />
                    تحميل تقرير الشهر
                  </button>
                </div>
                <div
                  className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full opacity-10"
                  style={{ background: '#0ea5e9' }}
                />
                <div
                  className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-5"
                  style={{ background: '#0ea5e9' }}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, iconBg, iconColor, trend, isUp, isWarning, accentClass }: any) {
  return (
    <div className={`stat-card ${accentClass}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
              isWarning
                ? 'bg-amber-50 text-amber-700'
                : isUp
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            {isWarning ? null : isUp ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {trend}
          </div>
        )}
      </div>
      <h3 className="text-slate-500 font-semibold text-xs mb-1">{title}</h3>
      <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</p>
    </div>
  )
}

function QuickStatItem({ icon: Icon, label, value, color }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-lg text-white shadow-sm"
          style={{ background: color }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-slate-600 font-semibold text-sm">{label}</span>
      </div>
      <span className="text-slate-900 font-extrabold text-base">{value}</span>
    </div>
  )
}
