'use client'

import { useEffect, useState } from 'react'
import { supabase, Purchase, Supplier, InventoryItem } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Button, Tooltip, Spinner } from '@nextui-org/react'
import { ShoppingCart, Edit, Trash2, Plus, Package, Download } from 'lucide-react'
import { exportToCSV, SECTIONS } from '@/lib/export'

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isNewItemOpen, setIsNewItemOpen] = useState(false)
  const onOpen = () => setIsOpen(true)
  const onClose = () => setIsOpen(false)
  const [editItem, setEditItem] = useState<Purchase | null>(null)
  const [formData, setFormData] = useState({ supplier_id: '', item_id: '', quantity: 1, unit_cost: 0, purchase_date: new Date().toISOString().split('T')[0], invoice_number: '', notes: '' })
  const [newItemForm, setNewItemForm] = useState({ name: '', sku: '', category: '', brand: '', unit: 'piece', cost_price: 0, sell_price: 0, min_stock_level: 5 })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: p }, { data: s }, { data: i }] = await Promise.all([
      supabase.from('purchases').select('*, suppliers(name), inventory_items(name,current_stock)').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('inventory_items').select('*').order('name'),
    ])
    setPurchases(p || []); setSuppliers(s || []); setItems(i || [])
    setLoading(false)
  }

  function openAdd() {
    setEditItem(null)
    setFormData({ supplier_id: '', item_id: '', quantity: 1, unit_cost: 0, purchase_date: new Date().toISOString().split('T')[0], invoice_number: '', notes: '' })
    onOpen()
  }

  function openEdit(item: Purchase) {
    setEditItem(item)
    setFormData({
      supplier_id: item.supplier_id ? String(item.supplier_id) : '',
      item_id: item.item_id ? String(item.item_id) : '',
      quantity: item.quantity, unit_cost: item.unit_cost,
      purchase_date: item.purchase_date || new Date().toISOString().split('T')[0],
      invoice_number: item.invoice_number || '', notes: item.notes || '',
    })
    onOpen()
  }

  async function handleSubmit() {
    const data: any = {
      supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
      item_id: formData.item_id ? parseInt(formData.item_id) : null,
      quantity: formData.quantity, unit_cost: formData.unit_cost,
      total_cost: formData.quantity * formData.unit_cost,
      purchase_date: formData.purchase_date,
      invoice_number: formData.invoice_number || null, notes: formData.notes || null,
    }
    if (!data.item_id) { alert('يرجى اختيار الصنف'); return }
    if (editItem) {
      await supabase.from('purchases').update(data).eq('id', editItem.id)
    } else {
      const { data: newPurchase } = await supabase.from('purchases').insert([data]).select().single()
      if (newPurchase) {
        const itemName = items.find(i => i.id === data.item_id)?.name || ''
        const supplierName = suppliers.find(s => s.id === data.supplier_id)?.name || ''
        await supabase.from('transactions').insert([{
          transaction_date: data.purchase_date || new Date().toISOString().split('T')[0],
          type: 'expense', category: 'مشتريات', amount: data.total_cost,
          description: `شراء ${data.quantity} ${itemName} من ${supplierName}`,
          reference_type: 'purchase', reference_id: newPurchase.id, purchase_id: newPurchase.id,
        }])
      }
    }
    onClose(); fetchAll()
  }

  async function handleNewItem() {
    const { data } = await supabase.from('inventory_items').insert([{ ...newItemForm, current_stock: 0 }]).select().single()
    if (data) {
      setFormData({ ...formData, item_id: String(data.id) })
      setIsNewItemOpen(false)
      fetchAll()
    }
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف عملية الشراء؟ (لن يتم إرجاع الكمية للمخزون تلقائياً)')) {
      await supabase.from('purchases').delete().eq('id', id); fetchAll()
    }
  }

  function handleExport() {
    exportToCSV(purchases as any, SECTIONS.purchases.headers, 'purchases')
  }

  const totalPurchases = purchases.reduce((s, p: any) => s + (p.total_cost || 0), 0)

  return (
    <div className="w-full">
      <PageHeader title="المشتريات" subtitle="إدارة عمليات الشراء - يتم إضافة الكمية للمخزون تلقائياً" icon={ShoppingCart} iconBg="from-cyan-500 to-cyan-600" buttonLabel="إضافة عملية شراء" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث..." />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">إجمالي المشتريات</p>
          <p className="text-lg sm:text-xl font-black text-cyan-600">{purchases.length}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">إجمالي التكلفة</p>
          <p className="text-lg sm:text-xl font-black text-blue-600">{formatCurrency(totalPurchases)}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">عدد الموردين</p>
          <p className="text-lg sm:text-xl font-black text-purple-600">{suppliers.length}</p>
        </CardBody></Card>
      </div>

      {loading ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex items-center justify-center h-48"><Spinner size="lg" /></CardBody></Card>
      ) : purchases.length === 0 ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          <ShoppingCart className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد مشتريات</p>
        </CardBody></Card>
      ) : (
        <>
        <Card className="shadow-md border border-slate-100 hidden sm:block">
          <div className="flex items-center justify-end px-4 pt-3 pb-1">
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 transition-all">
              <Download className="h-3.5 w-3.5" />تصدير CSV
            </button>
          </div>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-l from-slate-50 to-slate-100 border-b-2 border-slate-200">
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">#</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">المورد</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الصنف</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الكمية</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">سعر الوحدة</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الإجمالي</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الفاتورة</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">التاريخ</th>
                  <th className="text-center p-3 font-extrabold text-slate-600 text-xs">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p: any, idx) => (
                  <tr key={p.id} className="border-b border-slate-100 transition-all hover:bg-blue-50/30">
                    <td className="p-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-extrabold text-sm text-slate-800">{p.suppliers?.name || '-'}</td>
                    <td className="p-3">
                      <div>
                        <p className="font-bold text-sm text-slate-700">{p.inventory_items?.name || '-'}</p>
                        <p className="text-[10px] text-slate-400">المخزون: {p.inventory_items?.current_stock || 0}</p>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-sm">{p.quantity}</td>
                    <td className="p-3 text-sm text-slate-600">{formatCurrency(p.unit_cost || 0)}</td>
                    <td className="p-3 font-extrabold text-cyan-600 text-sm">{formatCurrency(p.total_cost || 0)}</td>
                    <td className="p-3 text-sm text-slate-500">{p.invoice_number || '-'}</td>
                    <td className="p-3 text-sm text-slate-500">{p.purchase_date ? formatDate(p.purchase_date) : '-'}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-0.5">
                        <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(p)}><Edit className="h-4 w-4" /></Button></Tooltip>
                        <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-l from-cyan-50 to-cyan-100 border-t-2 border-cyan-200">
                  <td colSpan={5} className="p-3 text-sm font-extrabold text-cyan-800">الإجمالي ({purchases.length} عملية شراء)</td>
                  <td className="p-3 text-sm font-black text-cyan-800">{formatCurrency(totalPurchases)}</td>
                  <td colSpan={3} className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </CardBody>
        </Card>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">{purchases.length} عملية شراء</span>
              <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-emerald-50 text-emerald-600 border-emerald-200">
                <Download className="h-3 w-3" />تصدير
              </button>
            </div>
            {purchases.map((p: any) => (
              <div key={p.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-sm text-slate-800">{p.inventory_items?.name || '-'}</p>
                    <p className="text-[10px] text-slate-400">{p.suppliers?.name || '-'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(p)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Edit className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(p.id)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-extrabold text-cyan-600">{formatCurrency(p.total_cost || 0)}</span>
                  <span className="text-slate-500">{p.quantity} × {formatCurrency(p.unit_cost || 0)}</span>
                  {p.invoice_number && <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 text-[10px]">{p.invoice_number}</span>}
                  <span className="text-slate-400">{p.purchase_date ? formatDate(p.purchase_date) : ''}</span>
                </div>
              </div>
            ))}
            <div className="bg-cyan-50 rounded-xl p-2.5 text-center">
              <span className="text-xs font-extrabold text-cyan-800">الإجمالي: {formatCurrency(totalPurchases)}</span>
            </div>
          </div>
        </>)}

      <CustomModal isOpen={isOpen} onClose={onClose} title={editItem ? 'تعديل عملية شراء' : 'إضافة عملية شراء جديدة'} footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={onClose} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'إضافة'} onClick={handleSubmit} color="from-cyan-500 to-cyan-600" />
        </>
      }>
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-[10px] text-blue-600 font-bold mb-1">ملاحظة: عند إضافة عملية شراء، يتم إضافة الكمية تلقائياً للمخزون</p>
          </div>
          <FormSelect label="المورد" value={formData.supplier_id} onChange={(v) => setFormData({...formData, supplier_id: v})} options={[
            { value: '', label: 'اختر المورد...' },
            ...suppliers.map(s => ({ value: String(s.id), label: s.name }))
          ]} />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <FormSelect label="الصنف" value={formData.item_id} onChange={(v) => setFormData({...formData, item_id: v})} required options={[
                { value: '', label: 'اختر الصنف...' },
                ...items.map(i => ({ value: String(i.id), label: `${i.name} (المخزون: ${i.current_stock})` }))
              ]} />
            </div>
            <button onClick={() => setIsNewItemOpen(true)} className="action-btn flex items-center gap-1 mb-1 text-xs">
              <Plus className="h-3 w-3" />صنف جديد
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="الكمية" type="number" value={formData.quantity} onChange={(v) => setFormData({...formData, quantity: parseInt(v) || 0})} required />
            <FormInput label="سعر الوحدة" type="number" value={formData.unit_cost} onChange={(v) => setFormData({...formData, unit_cost: parseFloat(v) || 0})} required />
          </div>
          <div className="p-2 bg-gray-50 rounded-lg text-center">
            <p className="text-xs text-slate-500">الإجمالي: <span className="font-extrabold text-cyan-600 text-lg">{formatCurrency(formData.quantity * formData.unit_cost)}</span></p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="رقم الفاتورة" value={formData.invoice_number} onChange={(v) => setFormData({...formData, invoice_number: v})} />
            <FormInput label="تاريخ الشراء" type="date" value={formData.purchase_date} onChange={(v) => setFormData({...formData, purchase_date: v})} />
          </div>
          <FormInput label="ملاحظات" value={formData.notes} onChange={(v) => setFormData({...formData, notes: v})} />
        </div>
      </CustomModal>

      <CustomModal isOpen={isNewItemOpen} onClose={() => setIsNewItemOpen(false)} title="إضافة صنف جديد للمخزون" footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={() => setIsNewItemOpen(false)} />
          <ModalSubmitButton label="إضافة" onClick={handleNewItem} color="from-emerald-500 to-emerald-600" />
        </>
      }>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="اسم الصنف" value={newItemForm.name} onChange={(v) => setNewItemForm({...newItemForm, name: v})} required />
            <FormInput label="رمز الصنف" value={newItemForm.sku} onChange={(v) => setNewItemForm({...newItemForm, sku: v})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="الماركة" value={newItemForm.brand} onChange={(v) => setNewItemForm({...newItemForm, brand: v})} />
            <FormInput label="الفئة" value={newItemForm.category} onChange={(v) => setNewItemForm({...newItemForm, category: v})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="سعر التكلفة" type="number" value={newItemForm.cost_price} onChange={(v) => setNewItemForm({...newItemForm, cost_price: parseFloat(v) || 0})} />
            <FormInput label="سعر البيع" type="number" value={newItemForm.sell_price} onChange={(v) => setNewItemForm({...newItemForm, sell_price: parseFloat(v) || 0})} />
          </div>
        </div>
      </CustomModal>
    </div>
  )
}
