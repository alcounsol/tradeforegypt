'use client'

import { useEffect, useState } from 'react'
import { supabase, InventoryItem } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Tooltip, Spinner } from '@nextui-org/react'
import { Package, Edit, Trash2, AlertTriangle } from 'lucide-react'

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const onOpen = () => setIsOpen(true)
  const onClose = () => setIsOpen(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [formData, setFormData] = useState({ name: '', sku: '', category: '', brand: '', unit: 'piece', current_stock: 0, min_stock_level: 5, cost_price: 0, sell_price: 0 })

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase.from('inventory_items').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  const filtered = items.filter(i => i.name.includes(search) || (i.sku && i.sku.includes(search)) || (i.category && i.category.includes(search)) || (i.brand && i.brand.includes(search)))
  const lowStock = items.filter(i => i.current_stock <= i.min_stock_level)
  const totalValue = items.reduce((s, i) => s + (i.current_stock * (i.cost_price || 0)), 0)

  function openAdd() { setEditItem(null); setFormData({ name: '', sku: '', category: '', brand: '', unit: 'piece', current_stock: 0, min_stock_level: 5, cost_price: 0, sell_price: 0 }); onOpen() }
  function openEdit(item: InventoryItem) { setEditItem(item); setFormData({ name: item.name, sku: item.sku || '', category: item.category || '', brand: item.brand || '', unit: item.unit, current_stock: item.current_stock, min_stock_level: item.min_stock_level, cost_price: item.cost_price || 0, sell_price: item.sell_price || 0 }); onOpen() }

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
        <SearchInput value={search} onChange={setSearch} placeholder="بحث عن صنف..." />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">إجمالي الأصناف</p>
          <p className="text-2xl font-extrabold text-emerald-600">{items.length}</p>
        </CardBody></Card>
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">قيمة المخزون</p>
          <p className="text-2xl font-extrabold text-blue-600">{formatCurrency(totalValue)}</p>
        </CardBody></Card>
        <Card className={`shadow-sm ${lowStock.length > 0 ? 'border-2 border-red-200' : ''}`}><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">أصناف منخفضة</p>
          <p className="text-2xl font-extrabold text-red-600">{lowStock.length}</p>
        </CardBody></Card>
        <Card className="shadow-sm"><CardBody className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-500">إجمالي الوحدات</p>
          <p className="text-2xl font-extrabold text-purple-600">{items.reduce((s, i) => s + i.current_stock, 0)}</p>
        </CardBody></Card>
      </div>

      {lowStock.length > 0 && (
        <Card className="shadow-sm mb-6 border-2 border-amber-200 bg-amber-50">
          <CardBody className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-xs font-bold text-amber-700">تنبيه: أصناف وصلت للحد الأدنى من المخزون</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStock.map(i => (
                <Chip key={i.id} size="sm" variant="flat" color="danger" className="font-semibold">{i.name} ({i.current_stock} {i.unit})</Chip>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Card className="shadow-md">
        <CardBody className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Package className="h-16 w-16 mb-4 opacity-20" />
              <p className="font-bold text-lg">لا توجد أصناف</p>
            </div>
          ) : (
            <Table aria-label="جدول المخزون" removeWrapper className="min-w-full">
              <TableHeader>
                <TableColumn className="text-right font-bold">الصنف</TableColumn>
                <TableColumn className="text-right font-bold">الماركة</TableColumn>
                <TableColumn className="text-right font-bold">الفئة</TableColumn>
                <TableColumn className="text-right font-bold">المخزون</TableColumn>
                <TableColumn className="text-right font-bold">سعر التكلفة</TableColumn>
                <TableColumn className="text-right font-bold">سعر البيع</TableColumn>
                <TableColumn className="text-right font-bold">القيمة</TableColumn>
                <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
              </TableHeader>
              <TableBody>
                {filtered.map(item => (
                  <TableRow key={item.id} className={`hover:bg-slate-50/50 ${item.current_stock <= item.min_stock_level ? 'bg-red-50/50' : ''}`}>
                    <TableCell>
                      <div>
                        <p className="font-bold text-slate-900">{item.name}</p>
                        {item.sku && <p className="text-xs text-slate-400">{item.sku}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{item.brand || '-'}</TableCell>
                    <TableCell><Chip size="sm" variant="flat" color="default" className="font-semibold">{item.category || '-'}</Chip></TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" color={item.current_stock <= item.min_stock_level ? 'danger' : 'success'} className="font-bold">
                        {item.current_stock} {item.unit}
                      </Chip>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(item.cost_price || 0)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(item.sell_price || 0)}</TableCell>
                    <TableCell className="font-extrabold text-emerald-600">{formatCurrency(item.current_stock * (item.cost_price || 0))}</TableCell>
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
          <ModalCancelButton label="إلغاء" onClick={onClose} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'إضافة'} onClick={handleSubmit} color="from-emerald-500 to-emerald-600" />
        </>
      }>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="اسم الصنف" value={formData.name} onChange={(v) => setFormData({...formData, name: v})} required />
            <FormInput label="رمز الصنف (SKU)" value={formData.sku} onChange={(v) => setFormData({...formData, sku: v})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="الماركة" value={formData.brand} onChange={(v) => setFormData({...formData, brand: v})} />
            <FormInput label="الفئة" value={formData.category} onChange={(v) => setFormData({...formData, category: v})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="الوحدة" value={formData.unit} onChange={(v) => setFormData({...formData, unit: v})} />
            <FormInput label="الحد الأدنى" type="number" value={formData.min_stock_level} onChange={(v) => setFormData({...formData, min_stock_level: parseInt(v) || 0})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="الكمية الحالية" type="number" value={formData.current_stock} onChange={(v) => setFormData({...formData, current_stock: parseInt(v) || 0})} />
            <FormInput label="سعر التكلفة" type="number" value={formData.cost_price} onChange={(v) => setFormData({...formData, cost_price: parseFloat(v) || 0})} />
          </div>
          <FormInput label="سعر البيع" type="number" value={formData.sell_price} onChange={(v) => setFormData({...formData, sell_price: parseFloat(v) || 0})} />
        </div>
      </CustomModal>
    </div>
  )
}
