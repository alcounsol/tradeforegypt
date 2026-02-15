import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import Sidebar from '../components/Sidebar'
import { Link } from 'react-router-dom'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle,
  Package,
  Users,
  Wrench,
  FileText
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
  const [loading, setLoading] = useState(true)
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
      setLoading(false)
    }
  }

  const quickLinks = [
    { href: '/services', icon: Wrench, label: 'تسجيل خدمة', color: 'bg-blue-500' },
    { href: '/expenses', icon: FileText, label: 'تسجيل مصروف', color: 'bg-red-500' },
    { href: '/inventory', icon: Package, label: 'المخزون', color: 'bg-green-500' },
    { href: '/reports', icon: TrendingUp, label: 'التقارير', color: 'bg-purple-500' },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">لوحة تحكم Trade For Egypt</h1>
          <p className="text-gray-500">نظرة عامة على الأداء المالي لشهر {new Date().getMonth() + 1}/{new Date().getFullYear()}</p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`${link.color} text-white rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:opacity-90 transition-opacity`}
            >
              <link.icon className="h-8 w-8" />
              <span className="font-medium">{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">إجمالي الإيرادات</span>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '...' : formatCurrency(stats.totalRevenue)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">إجمالي المصروفات</span>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              {loading ? '...' : formatCurrency(stats.totalExpenses)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">صافي الربح</span>
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {loading ? '...' : formatCurrency(stats.netProfit)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">تنبيهات المخزون</span>
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {loading ? '...' : stats.lowStockCount}
            </div>
            <div className="text-xs text-gray-400">أصناف تحت الحد الأدنى</div>
          </div>
        </div>

        {/* Summary and Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-4">ملخص الشهر</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span>إيرادات الكشف والصيانة</span>
                </div>
                <span className="font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  <span>المصروفات</span>
                </div>
                <span className="font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded border-2 border-blue-200">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                  <span className="font-semibold">صافي الربح</span>
                </div>
                <span className={`font-bold text-xl ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.netProfit)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-gray-500 mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">العملاء</span>
                </div>
                <div className="text-xl font-bold">{stats.customersCount}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-gray-500 mb-1">
                  <Wrench className="h-4 w-4" />
                  <span className="text-sm">الخدمات</span>
                </div>
                <div className="text-xl font-bold">{stats.servicesCount}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">آخر الخدمات</h3>
              <Link to="/services" className="text-sm text-blue-500 hover:underline">
                عرض الكل
              </Link>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-4 text-gray-500">جاري التحميل...</div>
              ) : recentServices.length === 0 ? (
                <div className="text-center py-4 text-gray-500">لا توجد خدمات</div>
              ) : (
                recentServices.map((service, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{service.customer_name || 'عميل'}</div>
                      <div className="text-sm text-gray-500">
                        {service.device_type} - {service.service_type === 'INSPECTION' ? 'كشف' : 'صيانة'}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-green-600">{formatCurrency(service.amount)}</div>
                      <div className="text-xs text-gray-400">{service.service_date}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
