'use client'

import { useEffect, useState } from 'react'
import { supabase, Purchase, InventoryItem, Supplier } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Input, Chip, Tooltip, Spinner, Select, SelectItem } from '@nextui-org/react'
import { ShoppingCart, Search, Edit, Trash2 } from 'lucide-react'

export default function Purchases() {
  const [purchases, setPurchases] = useState<(Purchase & { item_name?: string; supplier_name?: string })[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const onOpen = () => setIsOpen(true)
  const onClose = () => setIsOpen(false)
  const [editItem, setEditItem] = useState<Purchase | null>(null)
  const [formData, setFormData] = useState({ item_id: 0, supplier_id: 0, quantity: 1, unit_cost: 0, total_cost: 0, purchase_date: new Date().toISOString().split('T')[0], invoice_number: '', notes: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: p }, { data: inv }, { data: sup }] = await Promise.all([
      supabase.from('purchases').select('*').order('purchase_date', { ascending: false }),
      supabase.from('inventory_items').select('*'),
      supabase.from('suppliers').select('*'),
    ])
    setItems(inv || [])
    setSuppliers(sup || [])
    setPurchases((p || []).map(pur => ({
      ...pur,
      item_name: inv?.find(i => i.id === pur.item_id)?.name || '-',
      supplier_name: sup?.find(s => s.id === pur.supplier_id)?.name || '-',
    })))
    setLoading(false)
  }

  function openAdd() { setEditItem(null); setFormData({ item_id: 0, supplier_id: 0, quantity: 1, unit_cost: 0, total_cost: 0, purchase_date: new Date().toISOString().split('T')[0], invoice_number: '', notes: '' }); onOpen() }

  async function handleSubmit() {
    const data = { ...formData, total_cost: formData.quantity * formData.unit_cost }
    if (editItem) {
      await supabase.from('purchases').update(data).eq('id', editItem.id)
    } else {
      await supabase.from('purchases').insert([data])
      if (formData.item_id) {
        const item = items.find(i => i.id === formData.item_id)
        if (item) await supabase.from('inventory_items').update({ current_stock: item.current_stock + formData.quantity }).eq('id', formData.item_id)
      }
    }
    onClose(); fetchAll()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذه العملية؟')) {
      await supabase.from('purchases').delete().eq('id', id)
      fetchAll()
    }
  }

  return (
    <div className="w-full">
        <PageHeader title="المشتريات" subtitle="إدارة عمليات الشراء والتوريد" icon={ShoppingCart} iconBg="from-cyan-500 to-cyan-600" buttonLabel="إضافة عملية شراء" onButtonClick={openAdd} />

        <Card className="shadow-md">
          <CardBody className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-48"><Spinner size="lg" label="جاري التحميل..." /></div>
            ) : purchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <ShoppingCart className="h-16 w-16 mb-4 opacity-20" />
                <p className="font-bold text-lg">لا توجد عمليات شراء</p>
              </div>
            ) : (
              <Table aria-label="جدول المشتريات" removeWrapper>
                <TableHeader>
                  <TableColumn className="text-right font-bold">الصنف</TableColumn>
                  <TableColumn className="text-right font-bold">المورد</TableColumn>
                  <TableColumn className="text-right font-bold">الكمية</TableColumn>
                  <TableColumn className="text-right font-bold">سعر الوحدة</TableColumn>
                  <TableColumn className="text-right font-bold">الإجمالي</TableColumn>
                  <TableColumn className="text-right font-bold">التاريخ</TableColumn>
                  <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
                </TableHeader>
                <TableBody>
                  {purchases.map(p => (
                    <TableRow key={p.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold">{p.item_name}</TableCell>
                      <TableCell>{p.supplier_name}</TableCell>
                      <TableCell><Chip size="sm" variant="flat" color="primary" className="font-bold">{p.quantity}</Chip></TableCell>
                      <TableCell className="font-semibold">{formatCurrency(p.unit_cost)}</TableCell>
                      <TableCell className="font-bold text-cyan-600">{formatCurrency(p.total_cost)}</TableCell>
                      <TableCell className="text-sm text-slate-500">{formatDate(p.purchase_date)}</TableCell>
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
            <div className="grid grid-cols-2 gap-4">
                <Select label="الصنف" isRequired selectedKeys={formData.item_id ? [String(formData.item_id)] : []} onSelectionChange={(keys) => { const v = Array.from(keys)[0]; setFormData({...formData, item_id: Number(v)}) }} variant="bordered">
                  {items.map(i => <SelectItem key={String(i.id)}>{i.name}</SelectItem>)}
                </Select>
                <Select label="المورد" selectedKeys={formData.supplier_id ? [String(formData.supplier_id)] : []} onSelectionChange={(keys) => { const v = Array.from(keys)[0]; setFormData({...formData, supplier_id: Number(v)}) }} variant="bordered">
                  {suppliers.map(s => <SelectItem key={String(s.id)}>{s.name}</SelectItem>)}
                </Select>
                <Input label="الكمية" type="number" isRequired value={String(formData.quantity)} onValueChange={(v) => setFormData({...formData, quantity: parseInt(v) || 0})} variant="bordered" />
                <Input label="سعر الوحدة" type="number" isRequired value={String(formData.unit_cost)} onValueChange={(v) => setFormData({...formData, unit_cost: parseFloat(v) || 0})} variant="bordered" />
                <Input label="رقم الفاتورة" value={formData.invoice_number} onValueChange={(v) => setFormData({...formData, invoice_number: v})} variant="bordered" />
                <Input label="التاريخ" type="date" value={formData.purchase_date} onValueChange={(v) => setFormData({...formData, purchase_date: v})} variant="bordered" />
              </div>
          </CustomModal>
    </div>
  )
}
