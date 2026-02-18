'use client'

import { useEffect, useState } from 'react'
import { supabase, Transaction } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import { SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Spinner } from '@nextui-org/react'
import { Calculator, TrendingUp, TrendingDown, DollarSign, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

export default function AccountsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [period, setPeriod] = useState('month')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase.from('transactions').select('*').order('transaction_date', { ascending: false })
    setTransactions(data || [])
    setLoading(false)
  }

  // Period filter
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

  // Group by category for breakdown
  const incomeByCategory: Record<string, number> = {}
  const expenseByCategory: Record<string, number> = {}
  filtered.forEach(t => {
    if (t.type === 'income') {
      incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount
    } else {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount
    }
  })

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
                    <span className="font-bold text-green-700">{formatCurrency(amount)}</span>
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
                    <span className="font-bold text-red-700">{formatCurrency(amount)}</span>
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
      <Card className="shadow-md">
        <CardBody className="p-0">
          {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
          : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Calculator className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد حركات مالية</p>
            </div>
          ) : (
            <Table aria-label="جدول الحركات المالية" removeWrapper className="min-w-full">
              <TableHeader>
                <TableColumn className="text-right font-bold">التاريخ</TableColumn>
                <TableColumn className="text-right font-bold">النوع</TableColumn>
                <TableColumn className="text-right font-bold">الفئة</TableColumn>
                <TableColumn className="text-right font-bold">الوصف</TableColumn>
                <TableColumn className="text-right font-bold">المبلغ</TableColumn>
              </TableHeader>
              <TableBody>
                {filtered.map(t => (
                  <TableRow key={t.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-sm text-slate-500">{t.transaction_date}</TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" color={t.type === 'income' ? 'success' : 'danger'} className="font-semibold">
                        {t.type === 'income' ? 'إيراد' : 'مصروف'}
                      </Chip>
                    </TableCell>
                    <TableCell><Chip size="sm" variant="flat" color="secondary" className="font-semibold">{t.category}</Chip></TableCell>
                    <TableCell className="text-sm">{t.description || '-'}</TableCell>
                    <TableCell className={`font-extrabold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
