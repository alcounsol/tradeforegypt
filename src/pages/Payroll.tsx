import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Employee, PayrollRecord } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import Sidebar from '../components/Sidebar'
import { Wallet } from 'lucide-react'

export default function Payroll() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [formData, setFormData] = useState({ employee_id: 0, base_salary: 0, bonus: 0, deductions: 0 })

  useEffect(() => { fetchData() }, [selectedMonth, selectedYear])

  async function fetchData() {
    try {
      const { data: emps } = await supabase.from('employees').select('*').eq('is_active', true).order('name')
      setEmployees(emps || [])
      
      const { data: pays } = await supabase.from('payroll_records').select('*').eq('period_month', selectedMonth).eq('period_year', selectedYear)
      setPayrolls(pays || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const net_paid = formData.base_salary + formData.bonus - formData.deductions
      const { error } = await supabase.from('payroll_records').insert({
        ...formData, period_month: selectedMonth, period_year: selectedYear, net_paid, paid_date: new Date().toISOString().split('T')[0]
      })
      if (error) throw error
      alert('تم صرف الراتب بنجاح')
      setShowForm(false)
      resetForm()
      fetchData()
    } catch (error) {
      alert('خطأ في حفظ البيانات')
    }
  }

  function resetForm() {
    setFormData({ employee_id: 0, base_salary: 0, bonus: 0, deductions: 0 })
  }

  function openPayrollForm(emp: Employee) {
    setFormData({ employee_id: emp.id, base_salary: emp.base_salary || 0, bonus: 0, deductions: 0 })
    setShowForm(true)
  }

  const paidEmployeeIds = payrolls.map(p => p.employee_id)
  const unpaidEmployees = employees.filter(e => !paidEmployeeIds.includes(e.id))
  const totalPaid = payrolls.reduce((sum, p) => sum + p.net_paid, 0)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">الرواتب</h1>
            <p className="text-gray-500">صرف الرواتب الشهرية</p>
          </div>
          <div className="flex gap-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg">
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg">
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-sm text-gray-500">إجمالي المصروف لشهر {selectedMonth}/{selectedYear}</div>
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(totalPaid)}</div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              تم صرف: {payrolls.length} من {employees.length} موظف
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Unpaid */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b bg-orange-50">
              <h3 className="font-semibold text-orange-700">لم يتم الصرف ({unpaidEmployees.length})</h3>
            </div>
            <div className="p-4 space-y-3">
              {loading ? (
                <div className="text-center py-4">جاري التحميل...</div>
              ) : unpaidEmployees.length === 0 ? (
                <div className="text-center py-4 text-green-600">تم صرف جميع الرواتب</div>
              ) : (
                unpaidEmployees.map(emp => (
                  <div key={emp.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-sm text-gray-500">{emp.job_title}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <div className="text-sm text-gray-500">الراتب الأساسي</div>
                        <div className="font-bold">{formatCurrency(emp.base_salary || 0)}</div>
                      </div>
                      <button onClick={() => openPayrollForm(emp)} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm">
                        صرف
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Paid */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b bg-green-50">
              <h3 className="font-semibold text-green-700">تم الصرف ({payrolls.length})</h3>
            </div>
            <div className="p-4 space-y-3">
              {payrolls.length === 0 ? (
                <div className="text-center py-4 text-gray-500">لا توجد رواتب مصروفة</div>
              ) : (
                payrolls.map(pay => {
                  const emp = employees.find(e => e.id === pay.employee_id)
                  return (
                    <div key={pay.id} className="p-3 bg-gray-50 rounded">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{emp?.name || 'موظف'}</div>
                          <div className="text-sm text-gray-500">{emp?.job_title}</div>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-green-600">{formatCurrency(pay.net_paid)}</div>
                          <div className="text-xs text-gray-400">{pay.paid_date}</div>
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>أساسي: {formatCurrency(pay.base_salary)}</span>
                        {pay.bonus > 0 && <span className="text-green-600">+ حوافز: {formatCurrency(pay.bonus)}</span>}
                        {pay.deductions > 0 && <span className="text-red-600">- خصم: {formatCurrency(pay.deductions)}</span>}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">صرف راتب</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">الراتب الأساسي</label>
                  <input type="number" value={formData.base_salary} onChange={(e) => setFormData({...formData, base_salary: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الحوافز</label>
                  <input type="number" value={formData.bonus} onChange={(e) => setFormData({...formData, bonus: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الخصومات</label>
                  <input type="number" value={formData.deductions} onChange={(e) => setFormData({...formData, deductions: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="p-3 bg-purple-50 rounded">
                  <div className="text-sm text-gray-500">صافي المستحق</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(formData.base_salary + formData.bonus - formData.deductions)}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600">صرف</button>
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
