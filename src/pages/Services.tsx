import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ServiceRecord } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/utils'
import Sidebar from '../components/Sidebar'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'

export default function Services() {
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<ServiceRecord | null>(null)
  const [formData, setFormData] = useState({
    service_type: 'INSPECTION' as 'INSPECTION' | 'REPAIR',
    customer_name: '', customer_phone: '', device_type: '', device_brand: '', device_model: '',
    amount: 0, payment_method: 'CASH', notes: '', service_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => { fetchServices() }, [])

  async function fetchServices() {
    try {
      const { data, error } = await supabase.from('service_records').select('*').order('service_date', { ascending: false })
      if (error) throw error
      setServices(data || [])
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
        const { error } = await supabase.from('service_records').update(formData).eq('id', editItem.id)
        if (error) throw error
        alert('تم تحديث الخدمة بنجاح')
      } else {
        const { error } = await supabase.from('service_records').insert(formData)
        if (error) throw error
        alert('تم إضافة الخدمة بنجاح')
      }
      setShowForm(false)
      setEditItem(null)
      resetForm()
      fetchServices()
    } catch (error) {
      console.error('Error:', error)
      alert('خطأ في حفظ البيانات')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return
    try {
      const { error } = await supabase.from('service_records').delete().eq('id', id)
      if (error) throw error
      alert('تم حذف الخدمة')
      fetchServices()
    } catch (error) {
      alert('خطأ في حذف الخدمة')
    }
  }

  function resetForm() {
    setFormData({ service_type: 'INSPECTION', customer_name: '', customer_phone: '', device_type: '', device_brand: '', device_model: '', amount: 0, payment_method: 'CASH', notes: '', service_date: new Date().toISOString().split('T')[0] })
  }

  function openEdit(item: ServiceRecord) {
    setEditItem(item)
    setFormData({
      service_type: item.service_type, customer_name: item.customer_name || '', customer_phone: item.customer_phone || '',
      device_type: item.device_type || '', device_brand: item.device_brand || '', device_model: item.device_model || '',
      amount: item.amount, payment_method: item.payment_method, notes: item.notes || '', service_date: item.service_date
    })
    setShowForm(true)
  }

  const filteredServices = services.filter(s => s.customer_name?.includes(search) || s.device_type?.includes(search) || s.customer_phone?.includes(search))

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">الخدمات</h1>
            <p className="text-gray-500">تسجيل خدمات الكشف والصيانة</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditItem(null); resetForm(); }} className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
            <Plus className="h-5 w-5" />
            تسجيل خدمة
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="بحث بالاسم أو الجهاز أو رقم الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold">النوع</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">العميل</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">الجهاز</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">المبلغ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8">جاري التحميل...</td></tr>
              ) : filteredServices.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">لا توجد خدمات</td></tr>
              ) : (
                filteredServices.map(srv => (
                  <tr key={srv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${srv.service_type === 'INSPECTION' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {srv.service_type === 'INSPECTION' ? 'كشف' : 'صيانة'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{srv.customer_name || 'عميل'}</div>
                      {srv.customer_phone && <div className="text-sm text-gray-500">{srv.customer_phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div>{srv.device_type}</div>
                      {srv.device_brand && <div className="text-sm text-gray-500">{srv.device_brand} {srv.device_model}</div>}
                    </td>
                    <td className="px-4 py-3 font-bold text-green-600">{formatCurrency(srv.amount)}</td>
                    <td className="px-4 py-3">{formatDate(srv.service_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(srv)} className="text-blue-500 hover:text-blue-700"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(srv.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
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
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">{editItem ? 'تعديل خدمة' : 'تسجيل خدمة جديدة'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">نوع الخدمة</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={formData.service_type === 'INSPECTION'} onChange={() => setFormData({...formData, service_type: 'INSPECTION'})} />
                      <span>كشف</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={formData.service_type === 'REPAIR'} onChange={() => setFormData({...formData, service_type: 'REPAIR'})} />
                      <span>صيانة</span>
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">اسم العميل</label>
                    <input type="text" value={formData.customer_name} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
                    <input type="tel" value={formData.customer_phone} onChange={(e) => setFormData({...formData, customer_phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">نوع الجهاز</label>
                    <input type="text" value={formData.device_type} onChange={(e) => setFormData({...formData, device_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">الماركة</label>
                    <input type="text" value={formData.device_brand} onChange={(e) => setFormData({...formData, device_brand: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">الموديل</label>
                    <input type="text" value={formData.device_model} onChange={(e) => setFormData({...formData, device_model: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">المبلغ *</label>
                    <input type="number" required step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">طريقة الدفع</label>
                    <select value={formData.payment_method} onChange={(e) => setFormData({...formData, payment_method: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500">
                      <option value="CASH">نقداً</option>
                      <option value="CARD">بطاقة</option>
                      <option value="TRANSFER">تحويل</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">التاريخ</label>
                  <input type="date" value={formData.service_date} onChange={(e) => setFormData({...formData, service_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ملاحظات</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600">{editItem ? 'تحديث' : 'تسجيل'}</button>
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
