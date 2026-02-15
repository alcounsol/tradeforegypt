import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { InventoryItem } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import Sidebar from '../components/Sidebar'
import { Plus, Search, Edit, Trash2, AlertTriangle, Package } from 'lucide-react'

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
    <div className="page-layout font-['Cairo']" dir="rtl">
      <Sidebar />
      <div className="page-content">
        <header className="top-header">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-sky-600" />
            <h1 className="text-base font-extrabold text-slate-900">المخزون</h1>
          </div>
          <button onClick={() => { setShowForm(true); setEditItem(null); resetForm(); }} className="btn btn-primary">
            <Plus className="h-4 w-4" />
            إضافة صنف
          </button>
        </header>

        <main className="main-content">
          <div className="mb-6">
            <h1 className="page-title">إدارة المخزون</h1>
            <p className="page-subtitle">إدارة قطع الغيار والأصناف</p>
          </div>

          {/* Search */}
          <div className="mb-5">
            <div className="search-input-wrapper" style={{ maxWidth: '400px' }}>
              <Search className="h-4 w-4" />
              <input
                type="text"
                placeholder="بحث عن صنف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>الفئة</th>
                  <th>المخزون</th>
                  <th>سعر التكلفة</th>
                  <th>سعر البيع</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}><div className="empty-state"><p className="text-slate-400 font-semibold">جاري التحميل...</p></div></td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon"><Package className="h-6 w-6 text-slate-400" /></div><p className="text-slate-400 font-semibold text-sm">لا توجد أصناف</p></div></td></tr>
                ) : (
                  filteredItems.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-bold text-slate-900">{item.name}</div>
                        {item.sku && <div className="text-xs text-slate-400 mt-0.5">{item.sku}</div>}
                      </td>
                      <td className="text-slate-500">{item.category || '-'}</td>
                      <td>
                        <div className={`flex items-center gap-1.5 font-bold text-sm ${item.current_stock <= item.min_stock_level ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {item.current_stock <= item.min_stock_level && <AlertTriangle className="h-3.5 w-3.5" />}
                          {item.current_stock} {item.unit}
                        </div>
                      </td>
                      <td className="font-semibold">{formatCurrency(item.cost_price || 0)}</td>
                      <td className="font-semibold">{formatCurrency(item.sell_price || 0)}</td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(item)} className="icon-btn edit"><Edit className="h-4 w-4 text-slate-400" /></button>
                          <button onClick={() => handleDelete(item.id)} className="icon-btn delete"><Trash2 className="h-4 w-4 text-slate-400" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Modal */}
          {showForm && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2 className="text-lg font-extrabold mb-5">{editItem ? 'تعديل صنف' : 'إضافة صنف جديد'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="form-label">اسم الصنف *</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="form-input" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">كود الصنف</label>
                      <input type="text" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} className="form-input" />
                    </div>
                    <div>
                      <label className="form-label">الفئة</label>
                      <input type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="form-input" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">الكمية الحالية</label>
                      <input type="number" value={formData.current_stock} onChange={(e) => setFormData({...formData, current_stock: parseInt(e.target.value) || 0})} className="form-input" />
                    </div>
                    <div>
                      <label className="form-label">الحد الأدنى</label>
                      <input type="number" value={formData.min_stock_level} onChange={(e) => setFormData({...formData, min_stock_level: parseInt(e.target.value) || 0})} className="form-input" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">سعر التكلفة</label>
                      <input type="number" step="0.01" value={formData.cost_price} onChange={(e) => setFormData({...formData, cost_price: parseFloat(e.target.value) || 0})} className="form-input" />
                    </div>
                    <div>
                      <label className="form-label">سعر البيع</label>
                      <input type="number" step="0.01" value={formData.sell_price} onChange={(e) => setFormData({...formData, sell_price: parseFloat(e.target.value) || 0})} className="form-input" />
                    </div>
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
