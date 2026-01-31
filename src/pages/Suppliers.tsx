import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Supplier } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import { Plus, Search, Edit, Trash2, Phone, Mail, User } from 'lucide-react'

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' })

  useEffect(() => { fetchSuppliers() }, [])

  async function fetchSuppliers() {
    try {
      const { data, error } = await supabase.from('suppliers').select('*').order('name')
      if (error) throw error
      setSuppliers(data || [])
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
        const { error } = await supabase.from('suppliers').update(formData).eq('id', editItem.id)
        if (error) throw error
        alert('تم تحديث بيانات المورد')
      } else {
        const { error } = await supabase.from('suppliers').insert(formData)
        if (error) throw error
        alert('تم إضافة المورد')
      }
      setShowForm(false)
      setEditItem(null)
      resetForm()
      fetchSuppliers()
    } catch (error) {
      alert('خطأ في حفظ البيانات')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا المورد؟')) return
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id)
      if (error) throw error
      fetchSuppliers()
    } catch (error) {
      alert('خطأ في حذف المورد')
    }
  }

  function resetForm() {
    setFormData({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' })
  }

  function openEdit(item: Supplier) {
    setEditItem(item)
    setFormData({ name: item.name, contact_person: item.contact_person || '', phone: item.phone || '', email: item.email || '', address: item.address || '', notes: item.notes || '' })
    setShowForm(true)
  }

  const filteredSuppliers = suppliers.filter(s => s.name.includes(search) || s.phone?.includes(search))

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">الموردين</h1>
            <p className="text-gray-500">إدارة بيانات الموردين</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditItem(null); resetForm(); }} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">
            <Plus className="h-5 w-5" />
            إضافة مورد
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="بحث بالاسم أو رقم الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8">جاري التحميل...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">لا يوجد موردين</div>
          ) : (
            filteredSuppliers.map(sup => (
              <div key={sup.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg">{sup.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(sup)} className="text-blue-500 hover:text-blue-700"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(sup.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                {sup.contact_person && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <User className="h-4 w-4" />
                    <span>{sup.contact_person}</span>
                  </div>
                )}
                {sup.phone && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Phone className="h-4 w-4" />
                    <span>{sup.phone}</span>
                  </div>
                )}
                {sup.email && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Mail className="h-4 w-4" />
                    <span>{sup.email}</span>
                  </div>
                )}
                {sup.address && <p className="text-sm text-gray-400 mt-2">{sup.address}</p>}
              </div>
            ))
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">{editItem ? 'تعديل مورد' : 'إضافة مورد جديد'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">اسم الشركة/المورد *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الشخص المسؤول</label>
                  <input type="text" value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">العنوان</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600">{editItem ? 'تحديث' : 'إضافة'}</button>
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
