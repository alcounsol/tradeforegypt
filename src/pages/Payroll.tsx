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
    <div className="page-layout font-['Cairo']" dir="rtl">
      <Sidebar />
      <div className="page-content">
        <header className="top-header">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-sky-600" />
            <h1 className="text-base font-extrabold text-slate-900">الرواتب</h1>
          </div>
          <div className="flex gap-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="form-input" style={{ width: 'auto' }}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="form-input" style={{ width: 'auto' }}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </header>

        <main className="main-content">
          <div className="mb-6">
            <h1 className="page-title">إدارة الرواتب</h1>
            <p className="page-subtitle">صرف ومتابعة رواتب الموظفين</p>
          </div>

          <div className="stat-card purple mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">إجمالي المصروف لشهر {selectedMonth}/{selectedYear}</div>
                  <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(totalPaid)}</div>
                </div>
              </div>
              <div className="text-sm font-semibold text-slate-500">
                تم صرف: {payrolls.length} من {employees.length} موظف
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Unpaid */}
            <div className="card overflow-hidden">
              <div className="card-header" style={{ background: '#fffbeb' }}>
                <h3 className="font-bold text-amber-700 text-sm">لم يتم الصرف ({unpaidEmployees.length})</h3>
              </div>
              <div className="card-body space-y-3">
                {loading ? (
                  <div className="empty-state"><p className="text-slate-400 font-semibold text-sm">جاري التحميل...</p></div>
                ) : unpaidEmployees.length === 0 ? (
                  <div className="empty-state"><p className="text-emerald-600 font-bold text-sm">تم صرف جميع الرواتب</p></div>
                ) : (
                  unpaidEmployees.map(emp => (
                    <div key={emp.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{emp.name}</div>
                        <div className="text-xs text-slate-500">{emp.job_title}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <div className="text-xs text-slate-500">الراتب الأساسي</div>
                          <div className="font-bold text-sm">{formatCurrency(emp.base_salary || 0)}</div>
                        </div>
                        <button onClick={() => openPayrollForm(emp)} className="btn btn-primary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                          صرف
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Paid */}
            <div className="card overflow-hidden">
              <div className="card-header" style={{ background: '#ecfdf5' }}>
                <h3 className="font-bold text-emerald-700 text-sm">تم الصرف ({payrolls.length})</h3>
              </div>
              <div className="card-body space-y-3">
                {payrolls.length === 0 ? (
                  <div className="empty-state"><p className="text-slate-400 font-semibold text-sm">لا توجد رواتب مصروفة</p></div>
                ) : (
                  payrolls.map(pay => {
                    const emp = employees.find(e => e.id === pay.employee_id)
                    return (
                      <div key={pay.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{emp?.name || 'موظف'}</div>
                            <div className="text-xs text-slate-500">{emp?.job_title}</div>
                          </div>
                          <div className="text-left">
                            <div className="font-extrabold text-emerald-600">{formatCurrency(pay.net_paid)}</div>
                            <div className="text-[10px] text-slate-400">{pay.paid_date}</div>
                          </div>
                        </div>
                        <div className="flex gap-4 text-xs text-slate-500">
                          <span>أساسي: {formatCurrency(pay.base_salary)}</span>
                          {pay.bonus > 0 && <span className="text-emerald-600">+ حوافز: {formatCurrency(pay.bonus)}</span>}
                          {pay.deductions > 0 && <span className="text-rose-600">- خصم: {formatCurrency(pay.deductions)}</span>}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {showForm && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2 className="text-lg font-extrabold mb-5">صرف راتب</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="form-label">الراتب الأساسي</label>
                    <input type="number" value={formData.base_salary} onChange={(e) => setFormData({...formData, base_salary: parseFloat(e.target.value) || 0})} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">الحوافز</label>
                    <input type="number" value={formData.bonus} onChange={(e) => setFormData({...formData, bonus: parseFloat(e.target.value) || 0})} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">الخصومات</label>
                    <input type="number" value={formData.deductions} onChange={(e) => setFormData({...formData, deductions: parseFloat(e.target.value) || 0})} className="form-input" />
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <div className="text-xs font-semibold text-slate-500">صافي المستحق</div>
                    <div className="text-2xl font-extrabold text-purple-600">
                      {formatCurrency(formData.base_salary + formData.bonus - formData.deductions)}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-3">
                    <button type="submit" className="btn btn-primary flex-1">صرف</button>
                    <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">إلغاء</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
