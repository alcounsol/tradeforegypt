'use client'

import { useEffect, useState } from 'react'
import { supabase, Purchase, Supplier, InventoryItem } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect } from '@/components/FormInput'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button,  Chip, Tooltip, Spinner } from '@nextui-org/react'
import { ShoppingCart, Search, Edit, Trash2 } from 'lucide-react'

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const onOpen = () => setIsOpen(true)
  const onClose = () => setIsOpen(false)
  const [editItem, setEditItem] = useState<Purchase | null>(null)
  const [formData, setFormData] = useState({ supplier_id: '', item_id: '', quantity: 1, unit_price: 0, purchase_date: new Date().toISOString().split('T')[0], notes: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: p }, { data: s }, { data: i }] = await Promise.all([
      supabase.from('purchases').select('*, suppliers(name), inventory_items(name)').order('purchase_date', { ascending: false }),
      supabase.from('suppliers').select('*'),
      supabase.from('inventory_items').select('*'),
    ])
    setPurchases(p || []); setSuppliers(s || []); setItems(i || [])
    setLoading(false)
  }

  function openAdd() { setEditItem(null); setFormData({ supplier_id: '', item_id: '', quantity: 1, unit_price: 0, purchase_date: new Date().toISOString().split('T')[0], notes: '' }); onOpen() }

  async function handleSubmit() {
    const data = { ...formData, supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null, item_id: formData.item_id ? parseInt(formData.item_id) : null, total_price: formData.quantity * formData.unit_price }
    if (editItem) { await supabase.from('purchases').update(data).eq('id', editItem.id) }
    else { await supabase.from('purchases').insert([data]) }
    onClose(); fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف عملية الشراء؟')) { await supabase.from('purchases').delete().eq('id', id); fetchAll() }
  }

  return (
    <div className="w-full">
        <PageHeader title="المشتريات" subtitle="إدارة عمليات الشراء" icon={ShoppingCart} iconBg="from-cyan-500 to-cyan-600" buttonLabel="إضافة عملية شراء" onButtonClick={openAdd}>
          <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="بحث..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-56 pr-9 pl-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
        </PageHeader>

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
                  <TableColumn className="text-right font-bold">الإجمالي</TableColumn>
                  <TableColumn className="text-right font-bold">التاريخ</TableColumn>
                  <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
                </TableHeader>
                <TableBody>
                  {purchases.map((p: any) => (
                    <TableRow key={p.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold">{p.suppliers?.name || '-'}</TableCell>
                      <TableCell>{p.inventory_items?.name || '-'}</TableCell>
                      <TableCell>{p.quantity}</TableCell>
                      <TableCell className="font-extrabold text-cyan-600">{formatCurrency(p.total_price || 0)}</TableCell>
                      <TableCell className="text-sm text-slate-500">{p.purchase_date}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
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

        <CustomModal isOpen={isOpen} onClose={onClose} title="إضافة عملية شراء" footer={
            <>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">إلغاء</button>
              <button onClick={handleSubmit} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors">إضافة</button>
            </>
          }>
            <div className="flex flex-col gap-4">
              <FormSelect label="المورد" value={formData.supplier_id} onChange={(v) => setFormData({...formData, supplier_id: v})} options={suppliers.map(s => ({ value: String(s.id), label: s.name }))} placeholder="اختر المورد" />
              <FormSelect label="الصنف" value={formData.item_id} onChange={(v) => setFormData({...formData, item_id: v})} options={items.map(i => ({ value: String(i.id), label: i.name }))} placeholder="اختر الصنف" />
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="الكمية" type="number" value={formData.quantity} onChange={(v) => setFormData({...formData, quantity: parseInt(v) || 0})} />
                <FormInput label="سعر الوحدة" type="number" value={formData.unit_price} onChange={(v) => setFormData({...formData, unit_price: parseFloat(v) || 0})} />
              </div>
              <FormInput label="تاريخ الشراء" type="date" value={formData.purchase_date} onChange={(v) => setFormData({...formData, purchase_date: v})} />
              <FormInput label="ملاحظات" value={formData.notes} onChange={(v) => setFormData({...formData, notes: v})} />
            </div>
          </CustomModal>
    </div>
  )
}
