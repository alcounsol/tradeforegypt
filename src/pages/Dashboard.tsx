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
  Calendar
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
  // const [loading, setLoading] = useState(true)
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
    } finally {
      // setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-['Cairo']" dir="rtl">
      <Sidebar />
      
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">لوحة التحكم الرئيسية</h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              نظرة عامة على أداء الشركة لشهر {new Date().getMonth() + 1} / {new Date().getFullYear()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-semibold shadow-sm hover:bg-slate-50 transition-all">تصدير التقرير</button>
            <button className="bg-sky-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-sky-600/20 hover:bg-sky-700 transition-all">تحديث البيانات</button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard 
            title="إجمالي الإيرادات" 
            value={formatCurrency(stats.totalRevenue)} 
            icon={TrendingUp} 
            color="text-emerald-600" 
            bgColor="bg-emerald-50"
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
            color="text-sky-600" 
            bgColor="bg-sky-50"
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
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">آخر عمليات الصيانة</h2>
              <button className="text-sky-600 font-semibold text-sm hover:underline">عرض الكل</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-slate-500 font-semibold text-sm">العميل</th>
                    <th className="px-6 py-4 text-slate-500 font-semibold text-sm">الجهاز</th>
                    <th className="px-6 py-4 text-slate-500 font-semibold text-sm">المبلغ</th>
                    <th className="px-6 py-4 text-slate-500 font-semibold text-sm">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentServices.length > 0 ? recentServices.map((service) => (
                    <tr key={service.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{service.customer_name}</td>
                      <td className="px-6 py-4 text-slate-600">{service.device_brand} {service.device_model}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(service.amount)}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">مكتمل</span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">لا توجد عمليات حديثة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-6">إحصائيات سريعة</h2>
              <div className="space-y-4">
                <QuickStatItem icon={Users} label="إجمالي العملاء" value={stats.customersCount} color="bg-blue-500" />
                <QuickStatItem icon={Wrench} label="إجمالي الخدمات" value={stats.servicesCount} color="bg-purple-500" />
                <QuickStatItem icon={Package} label="أصناف المخزون" value="42" color="bg-orange-500" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-sky-600 to-sky-800 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">تحتاج مساعدة؟</h3>
                <p className="text-sky-100 text-sm mb-6">فريق الدعم الفني جاهز لمساعدتك في أي وقت لإدارة حساباتك.</p>
                <button className="bg-white text-sky-700 px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg">تواصل معنا</button>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color, bgColor, trend, isUp, isWarning }: any) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${bgColor} ${color} group-hover:scale-110 transition-transform`}>
          <Icon className="h-6 w-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${isWarning ? 'bg-amber-100 text-amber-700' : isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {isWarning ? null : isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend}
          </div>
        )}
      </div>
      <h3 className="text-slate-500 font-medium text-sm mb-1">{title}</h3>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
    </div>
  )
}

function QuickStatItem({ icon: Icon, label, value, color }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${color} text-white`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-slate-600 font-medium text-sm">{label}</span>
      </div>
      <span className="text-slate-900 font-bold">{value}</span>
    </div>
  )
}
