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
  // Calendar,
  Bell,
  Search
} from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    lowStockCount: 0,
    customersCount: 0,
    servicesCount: 0
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

      setStats({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        lowStockCount: lowStock?.length || 0,
        customersCount: customersCount || 0,
        servicesCount: allServices?.length || 0
      })

      setRecentServices(services || [])
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-['Cairo'] text-slate-900" dir="rtl">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-2xl w-96">
            <Search className="h-4 w-4 text-slate-400" />
            <input type="text" placeholder="ابحث عن أي شيء..." className="bg-transparent border-none outline-none text-sm w-full" />
          </div>
          <div className="flex items-center gap-6">
            <div className="relative p-2 bg-slate-100 rounded-xl cursor-pointer hover:bg-slate-200 transition-colors">
              <Bell className="h-5 w-5 text-slate-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-200 flex items-center justify-center text-white font-bold">
              A
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 lg:p-10">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h1 className="text-3xl font-black text-slate-900">أهلاً بك، أدمن 👋</h1>
              <p className="text-slate-500 mt-2 font-medium">إليك ملخص أداء شركة Trade For Egypt اليوم.</p>
            </div>
            <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
              <button className="px-6 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white shadow-lg shadow-slate-200 transition-all">اليوم</button>
              <button className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">هذا الأسبوع</button>
              <button className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all">هذا الشهر</button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard 
              title="إجمالي الإيرادات" 
              value={formatCurrency(stats.totalRevenue)} 
              icon={TrendingUp} 
              color="text-sky-600" 
              bgColor="bg-sky-50"
              trend="+12.5%"
              isUp={true}
            />
            <StatCard 
              title="إجمالي المصروفات" 
              value={formatCurrency(stats.totalExpenses)} 
              icon={TrendingDown} 
              color="text-rose-600" 
              bgColor="bg-rose-50"
              trend="+4.2%"
              isUp={false}
            />
            <StatCard 
              title="صافي الربح" 
              value={formatCurrency(stats.netProfit)} 
              icon={DollarSign} 
              color="text-emerald-600" 
              bgColor="bg-emerald-50"
              trend="+8.1%"
              isUp={true}
            />
            <StatCard 
              title="تنبيهات المخزون" 
              value={stats.lowStockCount} 
              icon={AlertTriangle} 
              color="text-amber-600" 
              bgColor="bg-amber-50"
              trend="أصناف منخفضة"
              isWarning={stats.lowStockCount > 0}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Activity Table */}
            <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">آخر عمليات الصيانة</h2>
                <button className="text-sky-600 font-bold text-sm px-4 py-2 rounded-xl hover:bg-sky-50 transition-all">عرض السجل الكامل</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-slate-400 font-bold text-xs uppercase tracking-wider">العميل</th>
                      <th className="px-8 py-5 text-slate-400 font-bold text-xs uppercase tracking-wider">الجهاز</th>
                      <th className="px-8 py-5 text-slate-400 font-bold text-xs uppercase tracking-wider">المبلغ</th>
                      <th className="px-8 py-5 text-slate-400 font-bold text-xs uppercase tracking-wider">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentServices.length > 0 ? recentServices.map((service) => (
                      <tr key={service.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="font-bold text-slate-900">{service.customer_name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">منذ ساعتين</div>
                        </td>
                        <td className="px-8 py-6 text-slate-600 font-medium">{service.device_brand} {service.device_model}</td>
                        <td className="px-8 py-6 font-black text-slate-900">{formatCurrency(service.amount)}</td>
                        <td className="px-8 py-6">
                          <span className="px-4 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-black">مكتمل</span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="p-4 bg-slate-50 rounded-full">
                              <Wrench className="h-8 w-8 text-slate-300" />
                            </div>
                            <p className="text-slate-400 font-bold">لا توجد عمليات صيانة مسجلة حالياً</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Side Cards */}
            <div className="space-y-8">
              <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
                <h2 className="text-lg font-black text-slate-900 mb-8">إحصائيات سريعة</h2>
                <div className="space-y-5">
                  <QuickStatItem icon={Users} label="إجمالي العملاء" value={stats.customersCount} color="bg-sky-500" />
                  <QuickStatItem icon={Wrench} label="إجمالي الخدمات" value={stats.servicesCount} color="bg-indigo-500" />
                  <QuickStatItem icon={Package} label="أصناف المخزون" value="42" color="bg-amber-500" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] shadow-2xl p-10 text-white relative overflow-hidden group">
                <div className="relative z-10">
                  <h3 className="text-2xl font-black mb-3">التقارير الذكية</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-8 font-medium">احصل على تحليل كامل لأرباحك ومصروفاتك بضغطة زر واحدة.</p>
                  <button className="w-full bg-sky-500 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-sky-500/20 hover:bg-sky-400 transition-all active:scale-95">تحميل تقرير الشهر</button>
                </div>
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-all"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color, bgColor, trend, isUp, isWarning }: any) {
  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/40 border border-slate-100 hover:border-sky-200 transition-all group cursor-default">
      <div className="flex items-center justify-between mb-6">
        <div className={`p-4 rounded-2xl ${bgColor} ${color} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="h-7 w-7" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-full ${isWarning ? 'bg-rose-100 text-rose-700' : isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {isWarning ? null : isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend}
          </div>
        )}
      </div>
      <h3 className="text-slate-400 font-bold text-sm mb-2">{title}</h3>
      <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
    </div>
  )
}

function QuickStatItem({ icon: Icon, label, value, color }: any) {
  return (
    <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color} text-white shadow-lg shadow-${color.split('-')[1]}-200 group-hover:rotate-12 transition-transform`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-slate-600 font-bold text-sm">{label}</span>
      </div>
      <span className="text-slate-900 font-black text-lg">{value}</span>
    </div>
  )
}
