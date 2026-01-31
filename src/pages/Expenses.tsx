import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Expense } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/utils'
import Sidebar from '../components/Sidebar'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'

const BILL_CATEGORIES = ['كهرباء', 'مياه', 'إنترنت', 'تليفون أرضي', 'أورانج', 'فودافون', 'صيانة عمارة', 'أخرى']
const PETTY_CATEGORIES = ['مواصلات', 'أدوات مكتبية', 'نظافة', 'ضيافة', 'صيانة', 'أخرى']

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Expense | null>(null)
  const [formData, setFormData] = useState({
    expense_type: 'BILL' as 'BILL' | 'PETTY',
    category: '',
    amount: 0,
    description: '',
    expense_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => { fetchExpenses() }, [])

  async function fetchExpenses() {
    try {
      const { data, error } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false })
      if (error) throw error
      setExpenses(data || [])
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
        const { error } = await supabase.from('expenses').update(formData).eq('id', editItem.id)
        if (error) throw error
        alert('تم تحديث المصروف بنجاح')
      } else {
        const { error } = await supabase.from('expenses').insert(formData)
        if (error) throw error
        alert('تم إضافة المصروف بنجاح')
      }
      setShowForm(false)
      setEditItem(null)
      resetForm()
      fetchExpenses()
    } catch (error) {
      console.error('Error:', error)
      alert('خطأ في حفظ البيانات')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      alert('تم حذف المصروف')
      fetchExpenses()
    } catch (error) {
      alert('خطأ في حذف المصروف')
    }
  }

  function resetForm() {
    setFormData({ expense_type: 'BILL', category: '', amount: 0, description: '', expense_date: new Date().toISOString().split('T')[0] })
  }

  function openEdit(item: Expense) {
    setEditItem(item)
    setFormData({
      expense_type: item.expense_type,
      category: item.category,
      amount: item.amount,
      description: item.description || '',
      expense_date: item.expense_date
    })
    setShowForm(true)
  }

  const categories = formData.expense_type === 'BILL' ? BILL_CATEGORIES : PETTY_CATEGORIES
  const filteredExpenses = expenses.filter(e => e.category.includes(search) || e.description?.includes(search))

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">المصروفات</h1>
            <p className="text-gray-500">تسجيل الفواتير والمصروفات النثرية</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditItem(null); resetForm(); }} className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
            <Plus className="h-5 w-5" />
            إضافة مصروف
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold">النوع</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">الفئة</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">المبلغ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">الوصف</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8">جاري التحميل...</td></tr>
              ) : filteredExpenses.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">لا توجد مصروفات</td></tr>
              ) : (
                filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${exp.expense_type === 'BILL' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {exp.expense_type === 'BILL' ? 'فاتورة' : 'نثريات'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{exp.category}</td>
                    <td className="px-4 py-3 font-bold text-red-600">{formatCurrency(exp.amount)}</td>
                    <td className="px-4 py-3 text-gray-500">{exp.description || '-'}</td>
                    <td className="px-4 py-3">{formatDate(exp.expense_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(exp)} className="text-blue-500 hover:text-blue-700"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(exp.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4">{editItem ? 'تعديل مصروف' : 'إضافة مصروف جديد'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">نوع المصروف</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={formData.expense_type === 'BILL'} onChange={() => setFormData({...formData, expense_type: 'BILL', category: ''})} className="text-sky-500" />
                      <span>فاتورة</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={formData.expense_type === 'PETTY'} onChange={() => setFormData({...formData, expense_type: 'PETTY', category: ''})} className="text-sky-500" />
                      <span>نثريات</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الفئة *</label>
                  <select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500">
                    <option value="">اختر الفئة</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">المبلغ *</label>
                    <input type="number" required step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">التاريخ</label>
                    <input type="date" value={formData.expense_date} onChange={(e) => setFormData({...formData, expense_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الوصف</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600">{editItem ? 'تحديث' : 'إضافة'}</button>
                  <button type="button" onClick={() => { setShowForm(false); setEditItem(null); }} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
