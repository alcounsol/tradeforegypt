'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import {
  Card, CardBody, CardHeader, Button, Spinner, Chip, Divider, Select, SelectItem
} from '@nextui-org/react'
import { FileBarChart, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [report, setReport] = useState({
    totalRevenue: 0, totalExpenses: 0, totalPayroll: 0, netProfit: 0,
    expensesByCategory: [] as { category: string; total: number }[],
    servicesByType: { inspection: 0, repair: 0 }, inventoryValue: 0,
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
      expenses?.forEach(e => { expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + parseFloat(e.amount) })

      const { data: payrolls } = await supabase.from('payroll_records').select('*').eq('period_month', selectedMonth).eq('period_year', selectedYear)
      const totalPayroll = payrolls?.reduce((sum, p) => sum + (p.net_paid || 0), 0) || 0

      const { data: inventory } = await supabase.from('inventory_items').select('*')
      const inventoryValue = inventory?.reduce((sum, i) => sum + (i.current_stock * (i.cost_price || 0)), 0) || 0

      setReport({
        totalRevenue, totalExpenses: totalExpenses + totalPayroll, totalPayroll,
        netProfit: totalRevenue - totalExpenses - totalPayroll,
        expensesByCategory: Object.entries(expensesByCategory).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total),
        servicesByType: { inspection, repair }, inventoryValue,
      })
    } catch (error) { console.error('Error:', error) }
    finally { setLoading(false) }
  }

  function exportCSV() {
    const rows = [
      ['تقرير الأرباح والخسائر', `${selectedMonth}/${selectedYear}`], [''],
      ['البند', 'المبلغ'], ['إجمالي الإيرادات', report.totalRevenue],
      ['- إيرادات الكشف', report.servicesByType.inspection], ['- إيرادات الصيانة', report.servicesByType.repair], [''],
      ['إجمالي المصروفات', report.totalExpenses],
      ...report.expensesByCategory.map(e => [`- ${e.category}`, e.total]),
      ['- الرواتب', report.totalPayroll], [''], ['صافي الربح', report.netProfit], [''], ['قيمة المخزون الحالي', report.inventoryValue],
    ]
    const csvContent = '\uFEFF' + rows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `تقرير_${selectedMonth}_${selectedYear}.csv`
    link.click()
  }

  const months = [1,2,3,4,5,6,7,8,9,10,11,12]

  return (
    <div className="w-full">
        <PageHeader title="التقارير" subtitle={`تحليل مالي شامل لشهر ${selectedMonth}/${selectedYear}`} icon={FileBarChart} iconBg="from-indigo-500 to-indigo-600">
          <Select size="sm" selectedKeys={[String(selectedMonth)]} onSelectionChange={(keys) => setSelectedMonth(Number(Array.from(keys)[0]))} className="w-24" variant="bordered" aria-label="الشهر">
            {months.map(m => <SelectItem key={String(m)}>{String(m)}</SelectItem>)}
          </Select>
          <Select size="sm" selectedKeys={[String(selectedYear)]} onSelectionChange={(keys) => setSelectedYear(Number(Array.from(keys)[0]))} className="w-28" variant="bordered" aria-label="السنة">
            {[2024,2025,2026].map(y => <SelectItem key={String(y)}>{String(y)}</SelectItem>)}
          </Select>
          <Button color="success" variant="shadow" size="sm" startContent={<Download className="h-4 w-4" />} onPress={exportCSV} className="font-bold">تصدير CSV</Button>
        </PageHeader>

        {loading ? <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div> : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
              {[
                { title: 'إجمالي الإيرادات', value: formatCurrency(report.totalRevenue), icon: TrendingUp, gradient: 'from-emerald-500 to-green-600', textColor: 'text-emerald-700' },
                { title: 'إجمالي المصروفات', value: formatCurrency(report.totalExpenses), icon: TrendingDown, gradient: 'from-rose-500 to-pink-600', textColor: 'text-rose-700' },
                { title: 'صافي الربح', value: formatCurrency(report.netProfit), icon: DollarSign, gradient: report.netProfit >= 0 ? 'from-blue-500 to-cyan-600' : 'from-red-500 to-rose-600', textColor: report.netProfit >= 0 ? 'text-blue-700' : 'text-red-700' },
                { title: 'قيمة المخزون', value: formatCurrency(report.inventoryValue), icon: FileBarChart, gradient: 'from-violet-500 to-purple-600', textColor: 'text-violet-700' },
              ].map((card, i) => (
                <Card key={i} className="shadow-md">
                  <CardBody className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">{card.title}</p>
                        <p className={`text-2xl font-extrabold ${card.textColor}`}>{card.value}</p>
                      </div>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                        <card.icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue Breakdown */}
              <Card className="shadow-md">
                <CardHeader className="px-6 pt-5 pb-0 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-extrabold text-slate-900">تفاصيل الإيرادات</h3>
                </CardHeader>
                <CardBody className="px-6 space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-blue-50">
                    <span className="font-semibold text-sm">إيرادات الكشف</span>
                    <span className="font-extrabold text-blue-600">{formatCurrency(report.servicesByType.inspection)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50">
                    <span className="font-semibold text-sm">إيرادات الصيانة</span>
                    <span className="font-extrabold text-emerald-600">{formatCurrency(report.servicesByType.repair)}</span>
                  </div>
                  <Divider />
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-100">
                    <span className="font-bold">الإجمالي</span>
                    <span className="font-extrabold text-lg">{formatCurrency(report.totalRevenue)}</span>
                  </div>
                </CardBody>
              </Card>

              {/* Expenses Breakdown */}
              <Card className="shadow-md">
                <CardHeader className="px-6 pt-5 pb-0 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-rose-500" />
                  <h3 className="font-extrabold text-slate-900">تفاصيل المصروفات</h3>
                </CardHeader>
                <CardBody className="px-6 space-y-2 max-h-64 overflow-y-auto">
                  {report.expensesByCategory.map((exp, i) => (
                    <div key={i} className="flex justify-between items-center p-2.5 rounded-xl bg-rose-50">
                      <span className="font-semibold text-sm">{exp.category}</span>
                      <span className="font-extrabold text-rose-600">{formatCurrency(exp.total)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-violet-50">
                    <span className="font-semibold text-sm">الرواتب</span>
                    <span className="font-extrabold text-violet-600">{formatCurrency(report.totalPayroll)}</span>
                  </div>
                  <Divider />
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-100">
                    <span className="font-bold">الإجمالي</span>
                    <span className="font-extrabold text-lg">{formatCurrency(report.totalExpenses)}</span>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* P&L Statement */}
            <Card className="shadow-md overflow-hidden">
              <CardHeader className="px-6 pt-5 pb-0">
                <h3 className="font-extrabold text-slate-900">قائمة الأرباح والخسائر - {selectedMonth}/{selectedYear}</h3>
              </CardHeader>
              <CardBody className="px-0">
                <table className="w-full">
                  <tbody>
                    <tr className="bg-emerald-50"><td className="px-6 py-3 font-bold">إجمالي الإيرادات</td><td className="px-6 py-3 text-left font-extrabold text-emerald-600">{formatCurrency(report.totalRevenue)}</td></tr>
                    <tr><td className="px-6 py-2.5 pr-10 text-slate-500">إيرادات الكشف</td><td className="px-6 py-2.5 text-left">{formatCurrency(report.servicesByType.inspection)}</td></tr>
                    <tr><td className="px-6 py-2.5 pr-10 text-slate-500">إيرادات الصيانة</td><td className="px-6 py-2.5 text-left">{formatCurrency(report.servicesByType.repair)}</td></tr>
                    <tr className="bg-rose-50"><td className="px-6 py-3 font-bold">إجمالي المصروفات</td><td className="px-6 py-3 text-left font-extrabold text-rose-600">({formatCurrency(report.totalExpenses)})</td></tr>
                    {report.expensesByCategory.slice(0, 5).map((exp, i) => (
                      <tr key={i}><td className="px-6 py-2.5 pr-10 text-slate-500">{exp.category}</td><td className="px-6 py-2.5 text-left">{formatCurrency(exp.total)}</td></tr>
                    ))}
                    <tr><td className="px-6 py-2.5 pr-10 text-slate-500">الرواتب</td><td className="px-6 py-2.5 text-left">{formatCurrency(report.totalPayroll)}</td></tr>
                    <tr className={report.netProfit >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}>
                      <td className="px-6 py-4 font-extrabold text-base">صافي الربح / الخسارة</td>
                      <td className={`px-6 py-4 text-left font-extrabold text-xl ${report.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(report.netProfit)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardBody>
            </Card>
          </>
        )}
    </div>
  )
}
