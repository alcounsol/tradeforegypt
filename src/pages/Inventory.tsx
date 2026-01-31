import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { InventoryItem } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import Sidebar from '../components/Sidebar'
import { Plus, Search, Edit, Trash2, AlertTriangle } from 'lucide-react'

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [formData, setFormData] = useState({
    name: '', sku: '', category: '', brand: '', unit: 'قطعة',
    current_stock: 0, min_stock_level: 5, cost_price: 0, sell_price: 0
  })

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    try {
      const { data, error } = await supabase.from('inventory_items').select('*').order('name')
      if (error) throw error
      setItems(data || [])
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
        const { error } = await supabase.from('inventory_items').update(formData).eq('id', editItem.id)
        if (error) throw error
        alert('تم تحديث الصنف بنجاح')
      } else {
        const { error } = await supabase.from('inventory_items').insert(formData)
        if (error) throw error
        alert('تم إضافة الصنف بنجاح')
      }
      setShowForm(false)
      setEditItem(null)
      resetForm()
      fetchItems()
    } catch (error) {
      console.error('Error:', error)
      alert('خطأ في حفظ البيانات')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا الصنف؟')) return
    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id)
      if (error) throw error
      alert('تم حذف الصنف')
      fetchItems()
    } catch (error) {
      alert('خطأ في حذف الصنف')
    }
  }

  function resetForm() {
    setFormData({ name: '', sku: '', category: '', brand: '', unit: 'قطعة', current_stock: 0, min_stock_level: 5, cost_price: 0, sell_price: 0 })
  }

  function openEdit(item: InventoryItem) {
    setEditItem(item)
    setFormData({
      name: item.name, sku: item.sku || '', category: item.category || '', brand: item.brand || '',
      unit: item.unit, current_stock: item.current_stock, min_stock_level: item.min_stock_level,
      cost_price: item.cost_price || 0, sell_price: item.sell_price || 0
    })
    setShowForm(true)
  }

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku?.includes(search))

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">المخزون</h1>
            <p className="text-gray-500">إدارة قطع الغيار والأصناف</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditItem(null); resetForm(); }} className="flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600">
            <Plus className="h-5 w-5" />
            إضافة صنف
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold">الصنف</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">الفئة</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">المخزون</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">سعر التكلفة</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">سعر البيع</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8">جاري التحميل...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">لا توجد أصناف</td></tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.name}</div>
                      {item.sku && <div className="text-sm text-gray-500">{item.sku}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.category || '-'}</td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-2 ${item.current_stock <= item.min_stock_level ? 'text-red-600' : 'text-green-600'}`}>
                        {item.current_stock <= item.min_stock_level && <AlertTriangle className="h-4 w-4" />}
                        {item.current_stock} {item.unit}
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatCurrency(item.cost_price || 0)}</td>
                    <td className="px-4 py-3">{formatCurrency(item.sell_price || 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(item)} className="text-blue-500 hover:text-blue-700"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
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
              <h2 className="text-xl font-bold mb-4">{editItem ? 'تعديل صنف' : 'إضافة صنف جديد'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">اسم الصنف *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">كود الصنف</label>
                    <input type="text" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">الفئة</label>
                    <input type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">الكمية الحالية</label>
                    <input type="number" value={formData.current_stock} onChange={(e) => setFormData({...formData, current_stock: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">الحد الأدنى</label>
                    <input type="number" value={formData.min_stock_level} onChange={(e) => setFormData({...formData, min_stock_level: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">سعر التكلفة</label>
                    <input type="number" step="0.01" value={formData.cost_price} onChange={(e) => setFormData({...formData, cost_price: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">سعر البيع</label>
                    <input type="number" step="0.01" value={formData.sell_price} onChange={(e) => setFormData({...formData, sell_price: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-sky-500 text-white py-2 rounded-lg hover:bg-sky-600">{editItem ? 'تحديث' : 'إضافة'}</button>
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
