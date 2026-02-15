import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Employee } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import Sidebar from '../components/Sidebar'
import { Plus, Edit, Trash2, UserCheck, UserX, Users } from 'lucide-react'

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({ name: '', job_title: '', phone: '', base_salary: 0, is_active: true })

  useEffect(() => { fetchEmployees() }, [])

  async function fetchEmployees() {
    try {
      const { data, error } = await supabase.from('employees').select('*').order('name')
      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editItem) {
        const { error } = await supabase.from('employees').update(formData).eq('id', editItem.id)
        if (error) throw error
        alert('تم تحديث بيانات الموظف')
      } else {
        const { error } = await supabase.from('employees').insert(formData)
        if (error) throw error
        alert('تم إضافة الموظف')
      }
      setShowForm(false)
      setEditItem(null)
      resetForm()
      fetchEmployees()
    } catch (error) {
      alert('خطأ في حفظ البيانات')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return
    try {
      const { error } = await supabase.from('employees').delete().eq('id', id)
      if (error) throw error
      fetchEmployees()
    } catch (error) {
      alert('خطأ في حذف الموظف')
    }
  }

  function resetForm() {
    setFormData({ name: '', job_title: '', phone: '', base_salary: 0, is_active: true })
  }

  function openEdit(item: Employee) {
    setEditItem(item)
    setFormData({ name: item.name, job_title: item.job_title || '', phone: item.phone || '', base_salary: item.base_salary || 0, is_active: item.is_active })
    setShowForm(true)
  }

  return (
    <div className="page-layout font-['Cairo']" dir="rtl">
      <Sidebar />
      <div className="page-content">
        <header className="top-header">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-600" />
            <h1 className="text-base font-extrabold text-slate-900">الموظفين</h1>
          </div>
          <button onClick={() => { setShowForm(true); setEditItem(null); resetForm(); }} className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600">
            <Plus className="h-5 w-5" />
            إضافة موظف
          </button>
        </header>

        <main className="main-content">
          <div className="mb-6">
            <h1 className="page-title">الموظفين</h1>
            <p className="page-subtitle">إدارة بيانات الموظفين</p>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8">جاري التحميل...</div>
          ) : employees.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">لا يوجد موظفين</div>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className={`bg-white rounded-lg shadow p-4 ${!emp.is_active ? 'opacity-60' : ''}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    {emp.is_active ? <UserCheck className="h-5 w-5 text-green-500" /> : <UserX className="h-5 w-5 text-red-500" />}
                    <span className={`text-xs px-2 py-1 rounded ${emp.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {emp.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(emp)} className="icon-btn edit"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(emp.id)} className="icon-btn delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <h3 className="font-bold text-lg">{emp.name}</h3>
                <p className="text-gray-500">{emp.job_title || 'غير محدد'}</p>
                {emp.phone && <p className="text-sm text-gray-400 mt-1">{emp.phone}</p>}
                <div className="mt-3 pt-3 border-t">
                  <div className="text-sm text-gray-500">الراتب الأساسي</div>
                  <div className="font-bold text-purple-600">{formatCurrency(emp.base_salary || 0)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {showForm && (
          <div className="modal-overlay">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-extrabold mb-5">{editItem ? 'تعديل موظف' : 'إضافة موظف جديد'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">الاسم *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="form-label">الوظيفة</label>
                  <input type="text" value={formData.job_title} onChange={(e) => setFormData({...formData, job_title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="form-label">رقم الهاتف</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="form-label">الراتب الأساسي</label>
                  <input type="number" value={formData.base_salary} onChange={(e) => setFormData({...formData, base_salary: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} className="rounded" />
                  <label htmlFor="is_active">موظف نشط</label>
                </div>
                <div className="flex gap-3 pt-3">
                  <button type="submit" className="flex-1 bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600">{editItem ? 'تحديث' : 'إضافة'}</button>
                  <button type="button" onClick={() => { setShowForm(false); setEditItem(null); }} className="btn btn-secondary flex-1">إلغاء</button>
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
