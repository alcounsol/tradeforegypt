import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import Sidebar from '../components/Sidebar'
import { FileText, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [report, setReport] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalPayroll: 0,
    netProfit: 0,
    expensesByCategory: [] as { category: string; total: number }[],
    servicesByType: { inspection: 0, repair: 0 },
    inventoryValue: 0
  })

  useEffect(() => { fetchReport() }, [selectedMonth, selectedYear])

  async function fetchReport() {
    setLoading(true)
    try {
      const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]

      const { data: services } = await supabase.from('service_records').select('*').gte('service_date', startDate).lte('service_date', endDate)
      const totalRevenue = services?.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) || 0
      const inspection = services?.filter(s => s.service_type === 'INSPECTION').reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) || 0
      const repair = services?.filter(s => s.service_type === 'REPAIR').reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) || 0

      const { data: expenses } = await supabase.from('expenses').select('*').gte('expense_date', startDate).lte('expense_date', endDate)
      const totalExpenses = expenses?.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) || 0
      
      const expensesByCategory: { [key: string]: number } = {}
      expenses?.forEach(e => {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + parseFloat(e.amount)
      })

      const { data: payrolls } = await supabase.from('payroll_records').select('*').eq('period_month', selectedMonth).eq('period_year', selectedYear)
      const totalPayroll = payrolls?.reduce((sum, p) => sum + (p.net_paid || 0), 0) || 0

      const { data: inventory } = await supabase.from('inventory_items').select('*')
      const inventoryValue = inventory?.reduce((sum, i) => sum + (i.current_stock * (i.cost_price || 0)), 0) || 0

      setReport({
        totalRevenue,
        totalExpenses: totalExpenses + totalPayroll,
        totalPayroll,
        netProfit: totalRevenue - totalExpenses - totalPayroll,
        expensesByCategory: Object.entries(expensesByCategory).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total),
        servicesByType: { inspection, repair },
        inventoryValue
      })
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  function exportCSV() {
    const rows = [
      ['تقرير الأرباح والخسائر', `${selectedMonth}/${selectedYear}`],
      [''],
      ['البند', 'المبلغ'],
      ['إجمالي الإيرادات', report.totalRevenue],
      ['- إيرادات الكشف', report.servicesByType.inspection],
      ['- إيرادات الصيانة', report.servicesByType.repair],
      [''],
      ['إجمالي المصروفات', report.totalExpenses],
      ...report.expensesByCategory.map(e => [`- ${e.category}`, e.total]),
      ['- الرواتب', report.totalPayroll],
      [''],
      ['صافي الربح', report.netProfit],
      [''],
      ['قيمة المخزون الحالي', report.inventoryValue]
    ]

    const csvContent = '\uFEFF' + rows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `تقرير_${selectedMonth}_${selectedYear}.csv`
    link.click()
  }

  return (
    <div className="page-layout font-['Cairo']" dir="rtl">
      <Sidebar />
      <div className="page-content">
        <header className="top-header">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-sky-600" />
            <h1 className="text-base font-extrabold text-slate-900">التقارير</h1>
          </div>
          <div className="flex gap-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="form-input" style={{ width: 'auto' }}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="form-input" style={{ width: 'auto' }}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={exportCSV} className="btn btn-primary">
              <Download className="h-4 w-4" />
              تصدير CSV
            </button>
          </div>
        </header>

        <main className="main-content">
          <div className="mb-6">
            <h1 className="page-title">التقارير والإحصائيات</h1>
            <p className="page-subtitle">تحليل مالي شامل لشهر {selectedMonth}/{selectedYear}</p>
          </div>

          {loading ? (
            <div className="empty-state"><p className="text-slate-400 font-semibold">جاري التحميل...</p></div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
                <div className="stat-card green">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">إجمالي الإيرادات</span>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(report.totalRevenue)}</div>
                </div>
                <div className="stat-card red">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                      <TrendingDown className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">إجمالي المصروفات</span>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(report.totalExpenses)}</div>
                </div>
                <div className="stat-card blue">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">صافي الربح</span>
                  </div>
                  <div className={`text-2xl font-extrabold ${report.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(report.netProfit)}
                  </div>
                </div>
                <div className="stat-card purple">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">قيمة المخزون</span>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(report.inventoryValue)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Breakdown */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="font-extrabold text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      تفاصيل الإيرادات
                    </h3>
                  </div>
                  <div className="card-body space-y-3">
                    <div className="flex justify-between items-center p-3 bg-sky-50 rounded-xl">
                      <span className="font-semibold text-sm">إيرادات الكشف</span>
                      <span className="font-extrabold text-sky-600">{formatCurrency(report.servicesByType.inspection)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl">
                      <span className="font-semibold text-sm">إيرادات الصيانة</span>
                      <span className="font-extrabold text-emerald-600">{formatCurrency(report.servicesByType.repair)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-100 rounded-xl border-2 border-slate-200">
                      <span className="font-bold text-sm">الإجمالي</span>
                      <span className="font-extrabold text-lg">{formatCurrency(report.totalRevenue)}</span>
                    </div>
                  </div>
                </div>

                {/* Expenses Breakdown */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="font-extrabold text-sm flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-rose-500" />
                      تفاصيل المصروفات
                    </h3>
                  </div>
                  <div className="card-body space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {report.expensesByCategory.map((exp, i) => (
                      <div key={i} className="flex justify-between items-center p-2.5 bg-rose-50 rounded-xl">
                        <span className="font-semibold text-sm">{exp.category}</span>
                        <span className="font-extrabold text-rose-600">{formatCurrency(exp.total)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-2.5 bg-purple-50 rounded-xl">
                      <span className="font-semibold text-sm">الرواتب</span>
                      <span className="font-extrabold text-purple-600">{formatCurrency(report.totalPayroll)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-100 rounded-xl border-2 border-slate-200 mt-2">
                      <span className="font-bold text-sm">الإجمالي</span>
                      <span className="font-extrabold text-lg">{formatCurrency(report.totalExpenses)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profit/Loss Statement */}
              <div className="card mt-6 overflow-hidden">
                <div className="card-header">
                  <h3 className="font-extrabold text-sm">قائمة الأرباح والخسائر - {selectedMonth}/{selectedYear}</h3>
                </div>
                <table className="data-table">
                  <tbody>
                    <tr style={{ background: '#ecfdf5' }}>
                      <td className="font-bold">إجمالي الإيرادات</td>
                      <td className="text-left font-extrabold text-emerald-600">{formatCurrency(report.totalRevenue)}</td>
                    </tr>
                    <tr>
                      <td className="pr-8 text-slate-500">إيرادات الكشف</td>
                      <td className="text-left">{formatCurrency(report.servicesByType.inspection)}</td>
                    </tr>
                    <tr>
                      <td className="pr-8 text-slate-500">إيرادات الصيانة</td>
                      <td className="text-left">{formatCurrency(report.servicesByType.repair)}</td>
                    </tr>
                    <tr style={{ background: '#fef2f2' }}>
                      <td className="font-bold">إجمالي المصروفات</td>
                      <td className="text-left font-extrabold text-rose-600">({formatCurrency(report.totalExpenses)})</td>
                    </tr>
                    {report.expensesByCategory.slice(0, 5).map((exp, i) => (
                      <tr key={i}>
                        <td className="pr-8 text-slate-500">{exp.category}</td>
                        <td className="text-left">{formatCurrency(exp.total)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="pr-8 text-slate-500">الرواتب</td>
                      <td className="text-left">{formatCurrency(report.totalPayroll)}</td>
                    </tr>
                    <tr style={{ background: report.netProfit >= 0 ? '#dcfce7' : '#fee2e2' }}>
                      <td className="font-extrabold text-base">صافي الربح / الخسارة</td>
                      <td className={`text-left font-extrabold text-xl ${report.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(report.netProfit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
