'use client'

import { useEffect, useState } from 'react'
import { supabase, Expense } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button,  Chip, Tooltip, Spinner } from '@nextui-org/react'
import { Receipt, Search, Edit, Trash2 } from 'lucide-react'

const categories = ['إيجار', 'كهرباء', 'مياه', 'إنترنت', 'صيانة', 'نقل', 'مواد استهلاكية', 'أخرى']

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const onOpen = () => setIsOpen(true)
  const onClose = () => setIsOpen(false)
  const [editItem, setEditItem] = useState<Expense | null>(null)
  const [formData, setFormData] = useState({ description: '', amount: 0, category: '', expense_date: new Date().toISOString().split('T')[0] })

  useEffect(() => { fetchExpenses() }, [])

  async function fetchExpenses() {
    setLoading(true)
    const { data } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }

  const filtered = expenses.filter(e => (e.description && e.description.includes(search)) || (e.category && e.category.includes(search)))

  function openAdd() { setEditItem(null); setFormData({ description: '', amount: 0, category: '', expense_date: new Date().toISOString().split('T')[0] }); onOpen() }
  function openEdit(item: Expense) { setEditItem(item); setFormData({ description: item.description || '', amount: item.amount, category: item.category || '', expense_date: item.expense_date || '' }); onOpen() }

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
        <PageHeader title="المصروفات" subtitle="إدارة المصروفات والنفقات" icon={Receipt} iconBg="from-rose-500 to-rose-600" buttonLabel="إضافة مصروف" onButtonClick={openAdd}>
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
            : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Receipt className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد مصروفات</p>
              </div>
            ) : (
              <Table aria-label="جدول المصروفات" removeWrapper className="min-w-full">
                <TableHeader>
                  <TableColumn className="text-right font-bold">الوصف</TableColumn>
                  <TableColumn className="text-right font-bold">الفئة</TableColumn>
                  <TableColumn className="text-right font-bold">المبلغ</TableColumn>
                  <TableColumn className="text-right font-bold">التاريخ</TableColumn>
                  <TableColumn className="text-center font-bold">الإجراءات</TableColumn>
                </TableHeader>
                <TableBody>
                  {filtered.map(e => (
                    <TableRow key={e.id} className="hover:bg-slate-50/50">
                      <TableCell><p className="font-bold text-slate-900">{e.description}</p></TableCell>
                      <TableCell><Chip size="sm" variant="flat" color="warning" className="font-semibold">{e.category || '-'}</Chip></TableCell>
                      <TableCell className="font-extrabold text-rose-600">{formatCurrency(e.amount)}</TableCell>
                      <TableCell className="text-sm text-slate-500">{e.expense_date}</TableCell>
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

        <CustomModal isOpen={isOpen} onClose={onClose} title={editItem ? 'تعديل مصروف' : 'إضافة مصروف جديد'} footer={
            <>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">إلغاء</button>
              <button onClick={handleSubmit} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors">{editItem ? 'تحديث' : 'إضافة'}</button>
            </>
          }>
            <div className="flex flex-col gap-4">
              <FormInput label="الوصف" value={formData.description} onChange={(v) => setFormData({...formData, description: v})} required />
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="المبلغ" type="number" value={formData.amount} onChange={(v) => setFormData({...formData, amount: parseFloat(v) || 0})} required />
                <FormSelect label="الفئة" value={formData.category} onChange={(v) => setFormData({...formData, category: v})} options={categories.map(c => ({ value: c, label: c }))} placeholder="اختر الفئة" />
              </div>
              <FormInput label="التاريخ" type="date" value={formData.expense_date} onChange={(v) => setFormData({...formData, expense_date: v})} />
              
            </div>
          </CustomModal>
    </div>
  )
}
