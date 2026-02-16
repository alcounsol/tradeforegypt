'use client'

import { useEffect, useState } from 'react'
import { supabase, InventoryItem } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput from '@/components/FormInput'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button,  Chip, Tooltip, Spinner } from '@nextui-org/react'
import { Package, Search, Edit, Trash2 } from 'lucide-react'

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const onOpen = () => setIsOpen(true)
  const onClose = () => setIsOpen(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [formData, setFormData] = useState({ name: '', sku: '', category: '', unit: 'piece', current_stock: 0, min_stock_level: 5, cost_price: 0, sell_price: 0 })

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase.from('inventory_items').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  const filtered = items.filter(i => i.name.includes(search) || (i.sku && i.sku.includes(search)) || (i.category && i.category.includes(search)))

  function openAdd() { setEditItem(null); setFormData({ name: '', sku: '', category: '', unit: 'piece', current_stock: 0, min_stock_level: 5, cost_price: 0, sell_price: 0 }); onOpen() }
  function openEdit(item: InventoryItem) { setEditItem(item); setFormData({ name: item.name, sku: item.sku || '', category: item.category || '', unit: item.unit, current_stock: item.current_stock, min_stock_level: item.min_stock_level, cost_price: item.cost_price || 0, sell_price: item.sell_price || 0 }); onOpen() }

  async function handleSubmit() {
    if (editItem) {
      await supabase.from('inventory_items').update(formData).eq('id', editItem.id)
    } else {
      await supabase.from('inventory_items').insert([formData])
    }
    onClose(); fetchItems()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
      await supabase.from('inventory_items').delete().eq('id', id)
      fetchItems()
    }
  }

  return (
    <div className="w-full">
        <PageHeader title="المخزون" subtitle="إدارة قطع الغيار والأصناف" icon={Package} iconBg="from-emerald-500 to-emerald-600" buttonLabel="إضافة صنف" onButtonClick={openAdd}>
          <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="بحث عن صنف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-56 pr-9 pl-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
        </PageHeader>

        <Card className="shadow-md">
          <CardBody className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-48"><Spinner size="lg" label="جاري التحميل..." /></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Package className="h-16 w-16 mb-4 opacity-20" />
                <p className="font-bold text-lg">لا توجد أصناف</p>
                <p className="text-sm">قم بإضافة أصناف جديدة للمخزون</p>
              </div>
            ) : (
              <Table aria-label="جدول المخزون" removeWrapper className="min-w-full">
                <TableHeader>
                  <TableColumn className="text-right font-bold">الصنف</TableColumn>
                  <TableColumn className="text-right font-bold">الفئة</TableColumn>
                  <TableColumn className="text-right font-bold">المخزون</TableColumn>
                  <TableColumn className="text-right font-bold">سعر التكلفة</TableColumn>
                  <TableColumn className="text-right font-bold">سعر البيع</TableColumn>
                  <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
                </TableHeader>
                <TableBody>
                  {filtered.map(item => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div>
                          <p className="font-bold text-slate-900">{item.name}</p>
                          {item.sku && <p className="text-xs text-slate-400">{item.sku}</p>}
                        </div>
                      </TableCell>
                      <TableCell><Chip size="sm" variant="flat" color="default" className="font-semibold">{item.category || '-'}</Chip></TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color={item.current_stock <= item.min_stock_level ? 'danger' : 'success'} className="font-bold">
                          {item.current_stock} {item.unit}
                        </Chip>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(item.cost_price || 0)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(item.sell_price || 0)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(item)}><Edit className="h-4 w-4" /></Button></Tooltip>
                          <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <CustomModal isOpen={isOpen} onClose={onClose} title={editItem ? 'تعديل صنف' : 'إضافة صنف جديد'} footer={
            <>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">إلغاء</button>
              <button onClick={handleSubmit} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors">{editItem ? 'تحديث' : 'إضافة'}</button>
            </>
          }>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="اسم الصنف" value={formData.name} onChange={(v) => setFormData({...formData, name: v})} required />
                <FormInput label="رمز الصنف (SKU)" value={formData.sku} onChange={(v) => setFormData({...formData, sku: v})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="الفئة" value={formData.category} onChange={(v) => setFormData({...formData, category: v})} />
                <FormInput label="الوحدة" value={formData.unit} onChange={(v) => setFormData({...formData, unit: v})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="الكمية الحالية" type="number" value={formData.current_stock} onChange={(v) => setFormData({...formData, current_stock: parseInt(v) || 0})} />
                <FormInput label="الحد الأدنى" type="number" value={formData.min_stock_level} onChange={(v) => setFormData({...formData, min_stock_level: parseInt(v) || 0})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="سعر التكلفة" type="number" value={formData.cost_price} onChange={(v) => setFormData({...formData, cost_price: parseFloat(v) || 0})} />
                <FormInput label="سعر البيع" type="number" value={formData.sell_price} onChange={(v) => setFormData({...formData, sell_price: parseFloat(v) || 0})} />
              </div>
            </div>
          </CustomModal>
    </div>
  )
}
