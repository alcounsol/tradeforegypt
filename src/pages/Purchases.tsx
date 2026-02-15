import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { InventoryItem, Supplier, Purchase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/utils'
import Sidebar from '../components/Sidebar'
import { Plus, Search, Trash2, ShoppingCart } from 'lucide-react'

export default function Purchases() {
  const [purchases, setPurchases] = useState<(Purchase & { item?: InventoryItem; supplier?: Supplier })[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ item_id: 0, supplier_id: 0, quantity: 1, unit_cost: 0, invoice_number: '', notes: '', purchase_date: new Date().toISOString().split('T')[0] })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      const [{ data: purchasesData }, { data: itemsData }, { data: suppliersData }] = await Promise.all([
        supabase.from('purchases').select('*').order('purchase_date', { ascending: false }),
        supabase.from('inventory_items').select('*').order('name'),
        supabase.from('suppliers').select('*').order('name')
      ])
      
      const enrichedPurchases = (purchasesData || []).map(p => ({
        ...p,
        item: itemsData?.find(i => i.id === p.item_id),
        supplier: suppliersData?.find(s => s.id === p.supplier_id)
      }))
      
      setPurchases(enrichedPurchases)
      setItems(itemsData || [])
      setSuppliers(suppliersData || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const total_cost = formData.quantity * formData.unit_cost
      const { error } = await supabase.from('purchases').insert({ ...formData, total_cost })
      if (error) throw error
      
      // Update inventory
      const item = items.find(i => i.id === formData.item_id)
      if (item) {
        await supabase.from('inventory_items').update({ current_stock: item.current_stock + formData.quantity }).eq('id', formData.item_id)
      }
      
      alert('تم تسجيل المشتريات بنجاح')
      setShowForm(false)
      resetForm()
      fetchData()
    } catch (error) {
      alert('خطأ في حفظ البيانات')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذه العملية؟')) return
    try {
      const { error } = await supabase.from('purchases').delete().eq('id', id)
      if (error) throw error
      fetchData()
    } catch (error) {
      alert('خطأ في حذف العملية')
    }
  }

  function resetForm() {
    setFormData({ item_id: 0, supplier_id: 0, quantity: 1, unit_cost: 0, invoice_number: '', notes: '', purchase_date: new Date().toISOString().split('T')[0] })
  }

  const filteredPurchases = purchases.filter(p => p.item?.name.includes(search) || p.supplier?.name.includes(search) || p.invoice_number?.includes(search))

  return (
    <div className="page-layout font-['Cairo']" dir="rtl">
      <Sidebar />
      <div className="page-content">
        <header className="top-header">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-sky-600" />
            <h1 className="text-base font-extrabold text-slate-900">المشتريات</h1>
          </div>
          <button onClick={() => { setShowForm(true); resetForm(); }} className="btn btn-primary">
            <Plus className="h-5 w-5" />
            تسجيل مشتريات
          </button>
        </header>

        <main className="main-content">
          <div className="mb-6">
            <h1 className="page-title">المشتريات</h1>
            <p className="page-subtitle">تسجيل مشتريات قطع الغيار</p>
          </div>

        <div className="mb-5">
          <div className="search-input-wrapper" style={{ maxWidth: '400px' }}>
              <Search className="h-4 w-4" />
              <input type="text" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="search-input" />
            </div>
        </div>

        <div className="card overflow-hidden">
          <table className="data-table">
            <thead >
              <tr>
                <th >الصنف</th>
                <th >المورد</th>
                <th >الكمية</th>
                <th >سعر الوحدة</th>
                <th >الإجمالي</th>
                <th >التاريخ</th>
                <th >الإجراءات</th>
              </tr>
            </thead>
            <tbody >
              {loading ? (
                <tr><td colSpan={7} >جاري التحميل...</td></tr>
              ) : filteredPurchases.length === 0 ? (
                <tr><td colSpan={7} >لا توجد مشتريات</td></tr>
              ) : (
                filteredPurchases.map(pur => (
                  <tr key={pur.id} >
                    <td className="font-bold text-slate-900">{pur.item?.name || '-'}</td>
                    <td className="text-slate-500">{pur.supplier?.name || '-'}</td>
                    <td >{pur.quantity}</td>
                    <td >{formatCurrency(pur.unit_cost)}</td>
                    <td className="font-extrabold text-sky-600">{formatCurrency(pur.total_cost)}</td>
                    <td >{formatDate(pur.purchase_date)}</td>
                    <td >
                      <button onClick={() => handleDelete(pur.id)} className="icon-btn delete"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 className="text-lg font-extrabold mb-5">تسجيل مشتريات جديدة</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">الصنف *</label>
                  <select required value={formData.item_id} onChange={(e) => setFormData({...formData, item_id: parseInt(e.target.value)})} className="form-input">
                    <option value={0}>اختر الصنف</option>
                    {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">المورد</label>
                  <select value={formData.supplier_id} onChange={(e) => setFormData({...formData, supplier_id: parseInt(e.target.value)})} className="form-input">
                    <option value={0}>اختر المورد</option>
                    {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">الكمية *</label>
                    <input type="number" required min={1} value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">سعر الوحدة *</label>
                    <input type="number" required step="0.01" value={formData.unit_cost} onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value) || 0})} className="form-input" />
                  </div>
                </div>
                <div className="p-3 bg-sky-50 rounded">
                  <div className="text-sm text-gray-500">الإجمالي</div>
                  <div className="text-xl font-bold text-sky-600">{formatCurrency(formData.quantity * formData.unit_cost)}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">رقم الفاتورة</label>
                    <input type="text" value={formData.invoice_number} onChange={(e) => setFormData({...formData, invoice_number: e.target.value})} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">التاريخ</label>
                    <input type="date" value={formData.purchase_date} onChange={(e) => setFormData({...formData, purchase_date: e.target.value})} className="form-input" />
                  </div>
                </div>
                <div className="flex gap-3 pt-3">
                  <button type="submit" className="btn btn-primary flex-1">تسجيل</button>
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
