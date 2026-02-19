'use client'

import { useEffect, useState } from 'react'
import { supabase, Transaction } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import { SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Spinner } from '@nextui-org/react'
import { exportToCSV } from '@/lib/export'
import { Calculator, TrendingUp, TrendingDown, DollarSign, ArrowUpCircle, ArrowDownCircle, BarChart3, PieChart as PieChartIcon, Download } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import for Recharts (client-side only)
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const RechartsTooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false })
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false })
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false })
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false })
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false })

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1']

export default function AccountsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [period, setPeriod] = useState('month')
  const [chartReady, setChartReady] = useState(false)

  useEffect(() => { fetchAll(); setChartReady(true) }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase.from('transactions').select('*').order('transaction_date', { ascending: false })
    setTransactions(data || [])
    setLoading(false)
  }

  const now = new Date()
  const periodStart = period === 'today' ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0]
    : period === 'week' ? new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0]
    : period === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    : period === 'year' ? new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    : '2000-01-01'

  const filtered = transactions.filter(t => {
    const matchSearch = !search || (t.description?.includes(search)) || (t.category?.includes(search))
    const matchType = filterType === 'all' || t.type === filterType
    const matchCategory = filterCategory === 'all' || t.category === filterCategory
    const matchPeriod = t.transaction_date >= periodStart
    return matchSearch && matchType && matchCategory && matchPeriod
  })

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const netProfit = totalIncome - totalExpense
  const categories = [...new Set(transactions.map(t => t.category))].filter(Boolean)

  // Group by category
  const incomeByCategory: Record<string, number> = {}
  const expenseByCategory: Record<string, number> = {}
  filtered.forEach(t => {
    if (t.type === 'income') incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount
    else expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount
  })

  // Pie chart data
  const incomePieData = Object.entries(incomeByCategory).map(([name, value]) => ({ name, value }))
  const expensePieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }))

  // Monthly trend data (last 6 months)
  const monthlyData: { month: string; income: number; expense: number; profit: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = d.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' })
    const monthTxns = transactions.filter(t => t.transaction_date?.startsWith(monthStr))
    const inc = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const exp = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    monthlyData.push({ month: monthLabel, income: inc, expense: exp, profit: inc - exp })
  }

  // Category comparison bar chart
  const allCats = [...new Set([...Object.keys(incomeByCategory), ...Object.keys(expenseByCategory)])]
  const categoryBarData = allCats.map(cat => ({
    category: cat,
    income: incomeByCategory[cat] || 0,
    expense: expenseByCategory[cat] || 0,
  }))

  return (
    <div className="w-full">
      <PageHeader title="الحسابات المالية" subtitle="المركز المالي الشامل للشركة" icon={Calculator} iconBg="from-emerald-500 to-emerald-600">
        <SearchInput value={search} onChange={setSearch} placeholder="بحث في الحركات المالية..." />
      </PageHeader>

      {/* Period Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {[{ key: 'today', label: 'اليوم' }, { key: 'week', label: 'هذا الأسبوع' }, { key: 'month', label: 'هذا الشهر' }, { key: 'year', label: 'هذا العام' }, { key: 'all', label: 'الكل' }].map(f => (
            <button key={f.key} onClick={() => setPeriod(f.key)}
              className={`filter-btn ${period === f.key ? 'filter-btn-active' : ''}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm border-l-4 border-l-green-500"><CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-xl"><ArrowUpCircle className="h-6 w-6 text-green-600" /></div>
            <div>
              <p className="text-xs font-semibold text-slate-500">إجمالي الإيرادات</p>
              <p className="text-2xl font-extrabold text-green-600">{formatCurrency(totalIncome)}</p>
            </div>
          </div>
        </CardBody></Card>
        <Card className="shadow-sm border-l-4 border-l-red-500"><CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-xl"><ArrowDownCircle className="h-6 w-6 text-red-600" /></div>
            <div>
              <p className="text-xs font-semibold text-slate-500">إجمالي المصروفات</p>
              <p className="text-2xl font-extrabold text-red-600">{formatCurrency(totalExpense)}</p>
            </div>
          </div>
        </CardBody></Card>
        <Card className={`shadow-sm border-l-4 ${netProfit >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}><CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${netProfit >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
              <DollarSign className={`h-6 w-6 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">صافي الربح</p>
              <p className={`text-2xl font-extrabold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(netProfit)}</p>
            </div>
          </div>
        </CardBody></Card>
        <Card className="shadow-sm border-l-4 border-l-purple-500"><CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-xl"><Calculator className="h-6 w-6 text-purple-600" /></div>
            <div>
              <p className="text-xs font-semibold text-slate-500">عدد الحركات</p>
              <p className="text-2xl font-extrabold text-purple-600">{filtered.length}</p>
            </div>
          </div>
        </CardBody></Card>
      </div>

      {/* Charts Section */}
      {chartReady && (
        <>
          {/* Monthly Trend Chart */}
          <Card className="shadow-md mb-6">
            <CardBody className="p-4">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />الاتجاه المالي الشهري (آخر 6 أشهر)
              </h3>
              <div style={{ width: '100%', height: 320, direction: 'ltr' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Tajawal' }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} labelStyle={{ fontFamily: 'Tajawal' }} contentStyle={{ fontFamily: 'Tajawal', direction: 'rtl' }} />
                    <Legend wrapperStyle={{ fontFamily: 'Tajawal' }} />
                    <Area type="monotone" dataKey="income" name="الإيرادات" stroke="#10b981" fill="#10b98130" strokeWidth={2} />
                    <Area type="monotone" dataKey="expense" name="المصروفات" stroke="#ef4444" fill="#ef444430" strokeWidth={2} />
                    <Area type="monotone" dataKey="profit" name="صافي الربح" stroke="#3b82f6" fill="#3b82f630" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Pie Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="shadow-md">
              <CardBody className="p-4">
                <h3 className="text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4" />توزيع الإيرادات حسب الفئة
                </h3>
                {incomePieData.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">لا توجد إيرادات في هذه الفترة</p>
                ) : (
                  <div style={{ width: '100%', height: 280, direction: 'ltr' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={incomePieData} cx="50%" cy="50%" outerRadius={90} innerRadius={40} paddingAngle={3} dataKey="value" label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={true}>
                          {incomePieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} contentStyle={{ fontFamily: 'Tajawal', direction: 'rtl' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardBody>
            </Card>
            <Card className="shadow-md">
              <CardBody className="p-4">
                <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4" />توزيع المصروفات حسب الفئة
                </h3>
                {expensePieData.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">لا توجد مصروفات في هذه الفترة</p>
                ) : (
                  <div style={{ width: '100%', height: 280, direction: 'ltr' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={expensePieData} cx="50%" cy="50%" outerRadius={90} innerRadius={40} paddingAngle={3} dataKey="value" label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={true}>
                          {expensePieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} contentStyle={{ fontFamily: 'Tajawal', direction: 'rtl' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Category Comparison Bar Chart */}
          {categoryBarData.length > 0 && (
            <Card className="shadow-md mb-6">
              <CardBody className="p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-600" />مقارنة الإيرادات والمصروفات حسب الفئة
                </h3>
                <div style={{ width: '100%', height: 320, direction: 'ltr' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryBarData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="category" tick={{ fontSize: 10, fontFamily: 'Tajawal' }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                      <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} contentStyle={{ fontFamily: 'Tajawal', direction: 'rtl' }} />
                      <Legend wrapperStyle={{ fontFamily: 'Tajawal' }} />
                      <Bar dataKey="income" name="إيرادات" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name="مصروفات" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* Income/Expense Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="shadow-sm">
          <CardBody className="p-4">
            <h3 className="text-sm font-bold text-green-700 mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4" />تفصيل الإيرادات</h3>
            {Object.keys(incomeByCategory).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">لا توجد إيرادات في هذه الفترة</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                  <div key={cat} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <span className="text-sm font-semibold">{cat}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-green-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${(amount / totalIncome) * 100}%` }} />
                      </div>
                      <span className="font-bold text-green-700 text-sm">{formatCurrency(amount)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-2 bg-green-100 rounded-lg border border-green-200 mt-2">
                  <span className="text-sm font-bold">الإجمالي</span>
                  <span className="font-extrabold text-green-700">{formatCurrency(totalIncome)}</span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
        <Card className="shadow-sm">
          <CardBody className="p-4">
            <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2"><TrendingDown className="h-4 w-4" />تفصيل المصروفات</h3>
            {Object.keys(expenseByCategory).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">لا توجد مصروفات في هذه الفترة</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                  <div key={cat} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <span className="text-sm font-semibold">{cat}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-red-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${(amount / totalExpense) * 100}%` }} />
                      </div>
                      <span className="font-bold text-red-700 text-sm">{formatCurrency(amount)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-2 bg-red-100 rounded-lg border border-red-200 mt-2">
                  <span className="text-sm font-bold">الإجمالي</span>
                  <span className="font-extrabold text-red-700">{formatCurrency(totalExpense)}</span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Type/Category Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {[{ key: 'all', label: 'الكل' }, { key: 'income', label: 'إيرادات' }, { key: 'expense', label: 'مصروفات' }].map(f => (
            <button key={f.key} onClick={() => setFilterType(f.key)}
              className={`filter-btn ${filterType === f.key ? 'filter-btn-active' : ''}`}>{f.label}</button>
          ))}
        </div>
        {categories.length > 0 && (
          <>
            <div className="w-px bg-gray-200 mx-2 hidden md:block" />
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setFilterCategory('all')} className={`filter-btn ${filterCategory === 'all' ? 'filter-btn-active' : ''}`}>كل الفئات</button>
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCategory(cat)} className={`filter-btn ${filterCategory === cat ? 'filter-btn-active' : ''}`}>{cat}</button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Transactions Table */}
      {loading ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex items-center justify-center h-48"><Spinner size="lg" /></CardBody></Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Calculator className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد حركات مالية</p>
        </CardBody></Card>
      ) : (
        <Card className="shadow-md border border-slate-100">
          <div className="flex items-center justify-end px-4 pt-3 pb-1">
            <button onClick={() => exportToCSV(filtered as any, [{key:'transaction_date',label:'التاريخ'},{key:'type',label:'النوع'},{key:'category',label:'الفئة'},{key:'description',label:'الوصف'},{key:'amount',label:'المبلغ'}], 'transactions')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 transition-all">
              <Download className="h-3.5 w-3.5" />تصدير CSV
            </button>
          </div>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-l from-slate-50 to-slate-100 border-b-2 border-slate-200">
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">#</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">التاريخ</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">النوع</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الفئة</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الوصف</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => (
                  <tr key={t.id} className="border-b border-slate-100 transition-all hover:bg-blue-50/30">
                    <td className="p-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 text-sm text-slate-500">{t.transaction_date}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {t.type === 'income' ? 'إيراد' : 'مصروف'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 text-xs font-bold border border-purple-100">{t.category}</span>
                    </td>
                    <td className="p-3 text-sm max-w-[300px] truncate text-slate-600">{t.description || '-'}</td>
                    <td className={`p-3 font-extrabold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-l from-emerald-50 to-emerald-100 border-t-2 border-emerald-200">
                  <td colSpan={5} className="p-3 text-sm font-extrabold text-emerald-800">الإجمالي ({filtered.length} حركة)</td>
                  <td className="p-3 text-sm font-black text-emerald-800">{formatCurrency(netProfit)}</td>
                </tr>
              </tfoot>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
