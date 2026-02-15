import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Customer } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import { Plus, Search, Edit, Trash2, Phone, Mail, UserCircle } from 'lucide-react'

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', notes: '' })

  useEffect(() => { fetchCustomers() }, [])

  async function fetchCustomers() {
    try {
      const { data, error } = await supabase.from('customers').select('*').order('name')
      if (error) throw error
      setCustomers(data || [])
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
        const { error } = await supabase.from('customers').update(formData).eq('id', editItem.id)
        if (error) throw error
        alert('تم تحديث بيانات العميل')
      } else {
        const { error } = await supabase.from('customers').insert(formData)
        if (error) throw error
        alert('تم إضافة العميل')
      }
      setShowForm(false)
      setEditItem(null)
      resetForm()
      fetchCustomers()
    } catch (error) {
      alert('خطأ في حفظ البيانات')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id)
      if (error) throw error
      fetchCustomers()
    } catch (error) {
      alert('خطأ في حذف العميل')
    }
  }

  function resetForm() {
    setFormData({ name: '', phone: '', email: '', address: '', notes: '' })
  }

  function openEdit(item: Customer) {
    setEditItem(item)
    setFormData({ name: item.name, phone: item.phone || '', email: item.email || '', address: item.address || '', notes: item.notes || '' })
    setShowForm(true)
  }

  const filteredCustomers = customers.filter(c => c.name.includes(search) || c.phone?.includes(search))

  return (
    <div className="page-layout font-['Cairo']" dir="rtl">
      <Sidebar />
      <div className="page-content">
        <header className="top-header">
          <div className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-sky-600" />
            <h1 className="text-base font-extrabold text-slate-900">العملاء</h1>
          </div>
          <button onClick={() => { setShowForm(true); setEditItem(null); resetForm(); }} className="btn btn-primary">
            <Plus className="h-5 w-5" />
            إضافة عميل
          </button>
        </header>

        <main className="main-content">
          <div className="mb-6">
            <h1 className="page-title">العملاء</h1>
            <p className="page-subtitle">إدارة بيانات العملاء</p>
          </div>

        <div className="mb-5">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="بحث بالاسم أو رقم الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8">جاري التحميل...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">لا يوجد عملاء</div>
          ) : (
            filteredCustomers.map(cust => (
              <div key={cust.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg">{cust.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(cust)} className="icon-btn edit"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(cust.id)} className="icon-btn delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                {cust.phone && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Phone className="h-4 w-4" />
                    <span>{cust.phone}</span>
                  </div>
                )}
                {cust.email && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Mail className="h-4 w-4" />
                    <span>{cust.email}</span>
                  </div>
                )}
                {cust.address && <p className="text-sm text-gray-400 mt-2">{cust.address}</p>}
              </div>
            ))
          )}
        </div>

        {showForm && (
          <div className="modal-overlay">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-extrabold mb-5">{editItem ? 'تعديل عميل' : 'إضافة عميل جديد'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">الاسم *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="form-label">رقم الهاتف</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="form-label">البريد الإلكتروني</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="form-label">العنوان</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="form-label">ملاحظات</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} className="form-input" />
                </div>
                <div className="flex gap-3 pt-3">
                  <button type="submit" className="btn btn-primary flex-1">{editItem ? 'تحديث' : 'إضافة'}</button>
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
