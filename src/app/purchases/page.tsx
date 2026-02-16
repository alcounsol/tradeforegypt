'use client'

import { useEffect, useState } from 'react'
import { supabase, Purchase, Supplier, InventoryItem } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Tooltip, Spinner } from '@nextui-org/react'
import { ShoppingCart, Edit, Trash2, Plus, Package } from 'lucide-react'

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
      quantity: formData.quantity,
      unit_cost: formData.unit_cost,
      total_cost: formData.quantity * formData.unit_cost,
      purchase_date: formData.purchase_date,
      invoice_number: formData.invoice_number || null,
      notes: formData.notes || null,
    }

    if (!data.item_id) { alert('يرجى اختيار الصنف'); return }

    if (editItem) {
      await supabase.from('purchases').update(data).eq('id', editItem.id)
    } else {
      // Insert purchase - trigger will auto-add to inventory
      await supabase.from('purchases').insert([data])
    }
    onClose(); fetchAll()
  }

  async function handleNewItem() {
    const { data } = await supabase.from('inventory_items').insert([{
      ...newItemForm, current_stock: 0,
    }]).select().single()
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

  const totalPurchases = purchases.reduce((s, p: any) => s + (p.total_cost || 0), 0)

  return (
    <div className="w-full">
      <PageHeader title="المشتريات" subtitle="إدارة عمليات الشراء - يتم إضافة الكمية للمخزون تلقائياً" icon={ShoppingCart} iconBg="from-cyan-500 to-cyan-600" buttonLabel="إضافة عملية شراء" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث..." />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">إجمالي المشتريات</p>
          <p className="text-2xl font-extrabold text-cyan-600">{purchases.length}</p>
        </CardBody></Card>
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">إجمالي التكلفة</p>
          <p className="text-2xl font-extrabold text-blue-600">{formatCurrency(totalPurchases)}</p>
        </CardBody></Card>
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">عدد الموردين</p>
          <p className="text-2xl font-extrabold text-purple-600">{suppliers.length}</p>
        </CardBody></Card>
      </div>

      <Card className="shadow-md">
        <CardBody className="p-0">
          {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
          : purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <ShoppingCart className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد مشتريات</p>
            </div>
          ) : (
            <Table aria-label="جدول المشتريات" removeWrapper className="min-w-full">
              <TableHeader>
                <TableColumn className="text-right font-bold">المورد</TableColumn>
                <TableColumn className="text-right font-bold">الصنف</TableColumn>
                <TableColumn className="text-right font-bold">الكمية</TableColumn>
                <TableColumn className="text-right font-bold">سعر الوحدة</TableColumn>
                <TableColumn className="text-right font-bold">الإجمالي</TableColumn>
                <TableColumn className="text-right font-bold">الفاتورة</TableColumn>
                <TableColumn className="text-right font-bold">التاريخ</TableColumn>
                <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
              </TableHeader>
              <TableBody>
                {purchases.map((p: any) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-bold">{p.suppliers?.name || '-'}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{p.inventory_items?.name || '-'}</p>
                        <p className="text-[10px] text-slate-400">المخزون: {p.inventory_items?.current_stock || 0}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{p.quantity}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(p.unit_cost || 0)}</TableCell>
                    <TableCell className="font-extrabold text-cyan-600">{formatCurrency(p.total_cost || 0)}</TableCell>
                    <TableCell className="text-sm text-slate-500">{p.invoice_number || '-'}</TableCell>
                    <TableCell className="text-sm text-slate-500">{p.purchase_date ? formatDate(p.purchase_date) : '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(p)}><Edit className="h-4 w-4" /></Button></Tooltip>
                        <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

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
            <Button size="sm" color="primary" variant="flat" className="mb-1 font-bold" onPress={() => setIsNewItemOpen(true)} startContent={<Plus className="h-3 w-3" />}>
              صنف جديد
            </Button>
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

      {/* New Item Modal */}
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
