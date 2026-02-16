'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import { ExportButton, StyledSelect } from '@/components/ActionButtons'
import {
  Card, CardBody, CardHeader, Spinner, Divider
} from '@nextui-org/react'
import { FileBarChart, Download, TrendingUp, TrendingDown, DollarSign, Users, Phone, Package, Gift } from 'lucide-react'

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [report, setReport] = useState({
    totalRevenue: 0, totalExpenses: 0, totalPayroll: 0, totalIncentives: 0,
    totalPurchases: 0, totalSalesWon: 0, netProfit: 0,
    expensesByCategory: [] as { category: string; total: number }[],
    servicesByType: { inspection: 0, repair: 0 }, inventoryValue: 0,
    employeeCount: 0, activeEmployees: 0, customerCount: 0, callCount: 0,
    followUpCount: 0, salesCount: 0, deviceCount: 0,
  })

  useEffect(() => { fetchReport() }, [selectedMonth, selectedYear])

  async function fetchReport() {
    setLoading(true)
    try {
      const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]

      const [
        { data: services }, { data: expenses }, { data: payrolls },
        { data: inventory }, { data: purchases }, { data: incentives },
        { data: employees }, { data: customers }, { data: calls },
        { data: followUps }, { data: sales }, { data: devices },
      ] = await Promise.all([
        supabase.from('service_records').select('*').gte('service_date', startDate).lte('service_date', endDate),
        supabase.from('expenses').select('*').gte('expense_date', startDate).lte('expense_date', endDate),
        supabase.from('payroll_records').select('*').eq('period_month', selectedMonth).eq('period_year', selectedYear),
        supabase.from('inventory_items').select('*'),
        supabase.from('purchases').select('*').gte('purchase_date', startDate).lte('purchase_date', endDate),
        supabase.from('incentives').select('*').eq('period_month', selectedMonth).eq('period_year', selectedYear),
        supabase.from('employees').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('call_records').select('*').gte('call_date', startDate).lte('call_date', endDate),
        supabase.from('follow_ups').select('*').gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59'),
        supabase.from('sales_activities').select('*').gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59'),
        supabase.from('device_receipts').select('*').gte('receipt_date', startDate).lte('receipt_date', endDate),
      ])

      const totalRevenue = services?.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) || 0
      const inspection = services?.filter(s => s.service_type === 'INSPECTION').reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) || 0
      const repair = services?.filter(s => s.service_type === 'REPAIR').reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) || 0

      const totalExpenses = expenses?.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) || 0
      const expensesByCategory: { [key: string]: number } = {}
      expenses?.forEach(e => { expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + parseFloat(e.amount) })

      const totalPayroll = payrolls?.reduce((sum, p) => sum + (p.net_paid || 0), 0) || 0
      const totalIncentives = incentives?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0
      const totalPurchases = purchases?.reduce((sum, p) => sum + (p.total_cost || 0), 0) || 0
      const totalSalesWon = sales?.filter(s => s.status === 'closed_won').reduce((sum, s) => sum + (s.offered_amount || 0), 0) || 0
      const inventoryValue = inventory?.reduce((sum, i) => sum + (i.current_stock * (i.cost_price || 0)), 0) || 0

      setReport({
        totalRevenue, totalExpenses: totalExpenses + totalPayroll + totalIncentives,
        totalPayroll, totalIncentives, totalPurchases, totalSalesWon,
        netProfit: totalRevenue + totalSalesWon - totalExpenses - totalPayroll - totalIncentives - totalPurchases,
        expensesByCategory: Object.entries(expensesByCategory).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total),
        servicesByType: { inspection, repair }, inventoryValue,
        employeeCount: employees?.length || 0,
        activeEmployees: employees?.filter(e => e.is_active).length || 0,
        customerCount: customers?.length || 0,
        callCount: calls?.length || 0,
        followUpCount: followUps?.length || 0,
        salesCount: sales?.length || 0,
        deviceCount: devices?.length || 0,
      })
    } catch (error) { console.error('Error:', error) }
    finally { setLoading(false) }
  }

  function exportCSV() {
    const rows = [
      ['تقرير الأرباح والخسائر', `${selectedMonth}/${selectedYear}`], [''],
      ['البند', 'المبلغ'], ['إجمالي الإيرادات (خدمات)', report.totalRevenue],
      ['- إيرادات الكشف', report.servicesByType.inspection], ['- إيرادات الصيانة', report.servicesByType.repair],
      ['إيرادات المبيعات', report.totalSalesWon], [''],
      ['إجمالي المصروفات', report.totalExpenses],
      ...report.expensesByCategory.map(e => [`- ${e.category}`, e.total]),
      ['- الرواتب', report.totalPayroll], ['- الحوافز', report.totalIncentives],
      ['- المشتريات', report.totalPurchases], [''],
      ['صافي الربح', report.netProfit], [''], ['قيمة المخزون الحالي', report.inventoryValue],
      [''], ['إحصائيات'], ['عدد الموظفين', report.employeeCount],
      ['عدد العملاء', report.customerCount], ['عدد المكالمات', report.callCount],
      ['عدد المتابعات', report.followUpCount], ['عدد أنشطة البيع', report.salesCount],
      ['عدد الأجهزة المستلمة', report.deviceCount],
    ]
    const csvContent = '\uFEFF' + rows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `تقرير_${selectedMonth}_${selectedYear}.csv`
    link.click()
  }

  const monthOptions = [1,2,3,4,5,6,7,8,9,10,11,12].map(m => ({ value: m, label: `شهر ${m}` }))
  const yearOptions = [2024,2025,2026].map(y => ({ value: y, label: String(y) }))

  return (
    <div className="w-full">
      <PageHeader title="التقارير" subtitle={`تحليل مالي شامل لشهر ${selectedMonth}/${selectedYear}`} icon={FileBarChart} iconBg="from-indigo-500 to-indigo-600">
        <StyledSelect value={selectedMonth} onChange={(v) => setSelectedMonth(Number(v))} options={monthOptions} minWidth="110px" />
        <StyledSelect value={selectedYear} onChange={(v) => setSelectedYear(Number(v))} options={yearOptions} minWidth="90px" />
        <ExportButton label="تصدير CSV" onClick={exportCSV} icon={Download} />
      </PageHeader>

      {loading ? <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div> : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {[
              { title: 'إجمالي الإيرادات', value: formatCurrency(report.totalRevenue + report.totalSalesWon), icon: TrendingUp, gradient: 'from-emerald-500 to-green-600', textColor: 'text-emerald-700' },
              { title: 'إجمالي المصروفات', value: formatCurrency(report.totalExpenses + report.totalPurchases), icon: TrendingDown, gradient: 'from-rose-500 to-pink-600', textColor: 'text-rose-700' },
              { title: 'صافي الربح', value: formatCurrency(report.netProfit), icon: DollarSign, gradient: report.netProfit >= 0 ? 'from-blue-500 to-cyan-600' : 'from-red-500 to-rose-600', textColor: report.netProfit >= 0 ? 'text-blue-700' : 'text-red-700' },
              { title: 'قيمة المخزون', value: formatCurrency(report.inventoryValue), icon: Package, gradient: 'from-violet-500 to-purple-600', textColor: 'text-violet-700' },
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

          {/* Activity Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            {[
              { label: 'الموظفين', value: report.activeEmployees, icon: Users, color: 'text-violet-600' },
              { label: 'العملاء', value: report.customerCount, icon: Users, color: 'text-teal-600' },
              { label: 'المكالمات', value: report.callCount, icon: Phone, color: 'text-green-600' },
              { label: 'المتابعات', value: report.followUpCount, icon: Phone, color: 'text-sky-600' },
              { label: 'أنشطة البيع', value: report.salesCount, icon: TrendingUp, color: 'text-purple-600' },
              { label: 'الأجهزة', value: report.deviceCount, icon: Package, color: 'text-lime-600' },
              { label: 'الحوافز', value: formatCurrency(report.totalIncentives), icon: Gift, color: 'text-yellow-600' },
            ].map((stat, i) => (
              <Card key={i} className="shadow-sm"><CardBody className="p-3 text-center">
                <stat.icon className={`h-4 w-4 mx-auto mb-1 ${stat.color}`} />
                <p className="text-[10px] font-bold text-slate-500">{stat.label}</p>
                <p className={`text-lg font-extrabold ${stat.color}`}>{stat.value}</p>
              </CardBody></Card>
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
                <div className="flex justify-between items-center p-3 rounded-xl bg-purple-50">
                  <span className="font-semibold text-sm">إيرادات المبيعات</span>
                  <span className="font-extrabold text-purple-600">{formatCurrency(report.totalSalesWon)}</span>
                </div>
                <Divider />
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-100">
                  <span className="font-bold">الإجمالي</span>
                  <span className="font-extrabold text-lg">{formatCurrency(report.totalRevenue + report.totalSalesWon)}</span>
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
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-yellow-50">
                  <span className="font-semibold text-sm">الحوافز</span>
                  <span className="font-extrabold text-yellow-600">{formatCurrency(report.totalIncentives)}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-cyan-50">
                  <span className="font-semibold text-sm">المشتريات</span>
                  <span className="font-extrabold text-cyan-600">{formatCurrency(report.totalPurchases)}</span>
                </div>
                <Divider />
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-100">
                  <span className="font-bold">الإجمالي</span>
                  <span className="font-extrabold text-lg">{formatCurrency(report.totalExpenses + report.totalPurchases)}</span>
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
                  <tr className="bg-emerald-50"><td className="px-6 py-3 font-bold text-right">إجمالي الإيرادات</td><td className="px-6 py-3 text-left font-extrabold text-emerald-600">{formatCurrency(report.totalRevenue + report.totalSalesWon)}</td></tr>
                  <tr><td className="px-6 py-2.5 pr-10 text-slate-500 text-right">إيرادات الكشف</td><td className="px-6 py-2.5 text-left">{formatCurrency(report.servicesByType.inspection)}</td></tr>
                  <tr><td className="px-6 py-2.5 pr-10 text-slate-500 text-right">إيرادات الصيانة</td><td className="px-6 py-2.5 text-left">{formatCurrency(report.servicesByType.repair)}</td></tr>
                  <tr><td className="px-6 py-2.5 pr-10 text-slate-500 text-right">إيرادات المبيعات</td><td className="px-6 py-2.5 text-left">{formatCurrency(report.totalSalesWon)}</td></tr>
                  <tr className="bg-rose-50"><td className="px-6 py-3 font-bold text-right">إجمالي المصروفات</td><td className="px-6 py-3 text-left font-extrabold text-rose-600">({formatCurrency(report.totalExpenses + report.totalPurchases)})</td></tr>
                  {report.expensesByCategory.slice(0, 5).map((exp, i) => (
                    <tr key={i}><td className="px-6 py-2.5 pr-10 text-slate-500 text-right">{exp.category}</td><td className="px-6 py-2.5 text-left">{formatCurrency(exp.total)}</td></tr>
                  ))}
                  <tr><td className="px-6 py-2.5 pr-10 text-slate-500 text-right">الرواتب</td><td className="px-6 py-2.5 text-left">{formatCurrency(report.totalPayroll)}</td></tr>
                  <tr><td className="px-6 py-2.5 pr-10 text-slate-500 text-right">الحوافز</td><td className="px-6 py-2.5 text-left">{formatCurrency(report.totalIncentives)}</td></tr>
                  <tr><td className="px-6 py-2.5 pr-10 text-slate-500 text-right">المشتريات</td><td className="px-6 py-2.5 text-left">{formatCurrency(report.totalPurchases)}</td></tr>
                  <tr className={report.netProfit >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}>
                    <td className="px-6 py-4 font-extrabold text-base text-right">صافي الربح / الخسارة</td>
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
