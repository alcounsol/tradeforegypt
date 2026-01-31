import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { InventoryItem, Supplier, Purchase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/utils'
import Sidebar from '../components/Sidebar'
import { Plus, Search, Trash2 } from 'lucide-react'

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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">المشتريات</h1>
            <p className="text-gray-500">تسجيل مشتريات قطع الغيار</p>
          </div>
          <button onClick={() => { setShowForm(true); resetForm(); }} className="flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600">
            <Plus className="h-5 w-5" />
            تسجيل مشتريات
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
                <th className="px-4 py-3 text-right text-sm font-semibold">المورد</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">الكمية</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">سعر الوحدة</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">الإجمالي</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8">جاري التحميل...</td></tr>
              ) : filteredPurchases.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">لا توجد مشتريات</td></tr>
              ) : (
                filteredPurchases.map(pur => (
                  <tr key={pur.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{pur.item?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{pur.supplier?.name || '-'}</td>
                    <td className="px-4 py-3">{pur.quantity}</td>
                    <td className="px-4 py-3">{formatCurrency(pur.unit_cost)}</td>
                    <td className="px-4 py-3 font-bold text-sky-600">{formatCurrency(pur.total_cost)}</td>
                    <td className="px-4 py-3">{formatDate(pur.purchase_date)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(pur.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
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
              <h2 className="text-xl font-bold mb-4">تسجيل مشتريات جديدة</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">الصنف *</label>
                  <select required value={formData.item_id} onChange={(e) => setFormData({...formData, item_id: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500">
                    <option value={0}>اختر الصنف</option>
                    {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">المورد</label>
                  <select value={formData.supplier_id} onChange={(e) => setFormData({...formData, supplier_id: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500">
                    <option value={0}>اختر المورد</option>
                    {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">الكمية *</label>
                    <input type="number" required min={1} value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">سعر الوحدة *</label>
                    <input type="number" required step="0.01" value={formData.unit_cost} onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500" />
                  </div>
                </div>
                <div className="p-3 bg-sky-50 rounded">
                  <div className="text-sm text-gray-500">الإجمالي</div>
                  <div className="text-xl font-bold text-sky-600">{formatCurrency(formData.quantity * formData.unit_cost)}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">رقم الفاتورة</label>
                    <input type="text" value={formData.invoice_number} onChange={(e) => setFormData({...formData, invoice_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">التاريخ</label>
                    <input type="date" value={formData.purchase_date} onChange={(e) => setFormData({...formData, purchase_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-sky-500 text-white py-2 rounded-lg hover:bg-sky-600">تسجيل</button>
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
