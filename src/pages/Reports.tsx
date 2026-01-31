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

      // Services (Revenue)
      const { data: services } = await supabase.from('service_records').select('*').gte('service_date', startDate).lte('service_date', endDate)
      const totalRevenue = services?.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) || 0
      const inspection = services?.filter(s => s.service_type === 'INSPECTION').reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) || 0
      const repair = services?.filter(s => s.service_type === 'REPAIR').reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) || 0

      // Expenses
      const { data: expenses } = await supabase.from('expenses').select('*').gte('expense_date', startDate).lte('expense_date', endDate)
      const totalExpenses = expenses?.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) || 0
      
      // Group expenses by category
      const expensesByCategory: { [key: string]: number } = {}
      expenses?.forEach(e => {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + parseFloat(e.amount)
      })

      // Payroll
      const { data: payrolls } = await supabase.from('payroll_records').select('*').eq('period_month', selectedMonth).eq('period_year', selectedYear)
      const totalPayroll = payrolls?.reduce((sum, p) => sum + (p.net_paid || 0), 0) || 0

      // Inventory Value
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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">التقارير</h1>
            <p className="text-gray-500">تقارير الأرباح والخسائر والمخزون</p>
          </div>
          <div className="flex gap-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg">
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg">
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={exportCSV} className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
              <Download className="h-5 w-5" />
              تصدير CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span>إجمالي الإيرادات</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(report.totalRevenue)}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  <span>إجمالي المصروفات</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(report.totalExpenses)}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                  <span>صافي الربح</span>
                </div>
                <div className={`text-2xl font-bold ${report.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(report.netProfit)}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  <span>قيمة المخزون</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(report.inventoryValue)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Breakdown */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  تفاصيل الإيرادات
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span>إيرادات الكشف</span>
                    <span className="font-bold text-blue-600">{formatCurrency(report.servicesByType.inspection)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <span>إيرادات الصيانة</span>
                    <span className="font-bold text-green-600">{formatCurrency(report.servicesByType.repair)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-100 rounded border-2 border-gray-200">
                    <span className="font-semibold">الإجمالي</span>
                    <span className="font-bold text-lg">{formatCurrency(report.totalRevenue)}</span>
                  </div>
                </div>
              </div>

              {/* Expenses Breakdown */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  تفاصيل المصروفات
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {report.expensesByCategory.map((exp, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <span>{exp.category}</span>
                      <span className="font-bold text-red-600">{formatCurrency(exp.total)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                    <span>الرواتب</span>
                    <span className="font-bold text-purple-600">{formatCurrency(report.totalPayroll)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-100 rounded border-2 border-gray-200 mt-2">
                    <span className="font-semibold">الإجمالي</span>
                    <span className="font-bold text-lg">{formatCurrency(report.totalExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profit/Loss Statement */}
            <div className="bg-white rounded-lg shadow p-4 mt-6">
              <h3 className="font-semibold mb-4">قائمة الأرباح والخسائر - {selectedMonth}/{selectedYear}</h3>
              <table className="w-full">
                <tbody className="divide-y">
                  <tr className="bg-green-50">
                    <td className="px-4 py-3 font-semibold">إجمالي الإيرادات</td>
                    <td className="px-4 py-3 text-left font-bold text-green-600">{formatCurrency(report.totalRevenue)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 pr-8">إيرادات الكشف</td>
                    <td className="px-4 py-3 text-left">{formatCurrency(report.servicesByType.inspection)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 pr-8">إيرادات الصيانة</td>
                    <td className="px-4 py-3 text-left">{formatCurrency(report.servicesByType.repair)}</td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="px-4 py-3 font-semibold">إجمالي المصروفات</td>
                    <td className="px-4 py-3 text-left font-bold text-red-600">({formatCurrency(report.totalExpenses)})</td>
                  </tr>
                  {report.expensesByCategory.slice(0, 5).map((exp, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 pr-8">{exp.category}</td>
                      <td className="px-4 py-3 text-left">{formatCurrency(exp.total)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-4 py-3 pr-8">الرواتب</td>
                    <td className="px-4 py-3 text-left">{formatCurrency(report.totalPayroll)}</td>
                  </tr>
                  <tr className={`${report.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <td className="px-4 py-3 font-bold text-lg">صافي الربح / الخسارة</td>
                    <td className={`px-4 py-3 text-left font-bold text-xl ${report.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
  )
}
