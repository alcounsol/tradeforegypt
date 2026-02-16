'use client'

import { useEffect, useState } from 'react'
import { supabase, Expense } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import {
  Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, Chip, Tooltip, Spinner, Select, SelectItem, Textarea
} from '@nextui-org/react'
import { Receipt, Edit, Trash2 } from 'lucide-react'

const categories = ['إيجار', 'كهرباء', 'مياه', 'إنترنت', 'صيانة', 'نقل', 'مستلزمات', 'أخرى']

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [editItem, setEditItem] = useState<Expense | null>(null)
  const [formData, setFormData] = useState({ expense_type: 'BILL' as 'BILL' | 'PETTY', category: '', amount: 0, description: '', expense_date: new Date().toISOString().split('T')[0] })

  useEffect(() => { fetchExpenses() }, [])

  async function fetchExpenses() {
    setLoading(true)
    const { data } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }

  function openAdd() { setEditItem(null); setFormData({ expense_type: 'BILL', category: '', amount: 0, description: '', expense_date: new Date().toISOString().split('T')[0] }); onOpen() }
  function openEdit(item: Expense) { setEditItem(item); setFormData({ expense_type: item.expense_type, category: item.category, amount: item.amount, description: item.description || '', expense_date: item.expense_date }); onOpen() }

  async function handleSubmit() {
    if (editItem) { await supabase.from('expenses').update(formData).eq('id', editItem.id) }
    else { await supabase.from('expenses').insert([formData]) }
    onClose(); fetchExpenses()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) { await supabase.from('expenses').delete().eq('id', id); fetchExpenses() }
  }

  return (
    <div className="w-full">
        <PageHeader title="المصروفات" subtitle="إدارة وتتبع المصروفات" icon={Receipt} iconBg="from-rose-500 to-rose-600" buttonLabel="إضافة مصروف" onButtonClick={openAdd} />
        <Card className="shadow-md">
          <CardBody className="p-0">
            {loading ? <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
            : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Receipt className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد مصروفات مسجلة</p>
              </div>
            ) : (
              <Table aria-label="جدول المصروفات" removeWrapper>
                <TableHeader>
                  <TableColumn className="text-right font-bold">النوع</TableColumn>
                  <TableColumn className="text-right font-bold">الفئة</TableColumn>
                  <TableColumn className="text-right font-bold">المبلغ</TableColumn>
                  <TableColumn className="text-right font-bold">الوصف</TableColumn>
                  <TableColumn className="text-right font-bold">التاريخ</TableColumn>
                  <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
                </TableHeader>
                <TableBody>
                  {expenses.map(e => (
                    <TableRow key={e.id} className="hover:bg-slate-50/50">
                      <TableCell><Chip size="sm" variant="flat" color={e.expense_type === 'BILL' ? 'danger' : 'warning'} className="font-bold">{e.expense_type === 'BILL' ? 'فاتورة' : 'نثرية'}</Chip></TableCell>
                      <TableCell className="font-semibold">{e.category}</TableCell>
                      <TableCell className="font-bold text-rose-600">{formatCurrency(e.amount)}</TableCell>
                      <TableCell className="text-sm text-slate-500 max-w-[200px] truncate">{e.description || '-'}</TableCell>
                      <TableCell className="text-sm text-slate-500">{formatDate(e.expense_date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(e)}><Edit className="h-4 w-4" /></Button></Tooltip>
                          <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(e.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Modal isOpen={isOpen} onClose={onClose} size="xl" backdrop="blur" placement="auto">
          <ModalContent>
            <ModalHeader className="font-extrabold">{editItem ? 'تعديل مصروف' : 'إضافة مصروف جديد'}</ModalHeader>
            <ModalBody className="gap-4">
              <div className="flex gap-4">
                <Button variant={formData.expense_type === 'BILL' ? 'shadow' : 'flat'} color={formData.expense_type === 'BILL' ? 'danger' : 'default'} onPress={() => setFormData({...formData, expense_type: 'BILL'})} className="flex-1 font-bold">فاتورة</Button>
                <Button variant={formData.expense_type === 'PETTY' ? 'shadow' : 'flat'} color={formData.expense_type === 'PETTY' ? 'warning' : 'default'} onPress={() => setFormData({...formData, expense_type: 'PETTY'})} className="flex-1 font-bold">نثرية</Button>
              </div>
              <Select label="الفئة" isRequired selectedKeys={formData.category ? [formData.category] : []} onSelectionChange={(keys) => setFormData({...formData, category: Array.from(keys)[0] as string})} variant="bordered">
                {categories.map(c => <SelectItem key={c}>{c}</SelectItem>)}
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <Input label="المبلغ" type="number" isRequired value={String(formData.amount)} onValueChange={(v) => setFormData({...formData, amount: parseFloat(v) || 0})} variant="bordered" />
                <Input label="التاريخ" type="date" value={formData.expense_date} onValueChange={(v) => setFormData({...formData, expense_date: v})} variant="bordered" />
              </div>
              <Textarea label="الوصف" value={formData.description} onValueChange={(v) => setFormData({...formData, description: v})} variant="bordered" />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose} className="font-bold">إلغاء</Button>
              <Button color="primary" variant="shadow" onPress={handleSubmit} className="font-bold">{editItem ? 'تحديث' : 'إضافة'}</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
    </div>
  )
}
