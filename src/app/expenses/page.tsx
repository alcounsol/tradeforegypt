'use client'

import { useEffect, useState } from 'react'
import { supabase, Expense } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect, FormTextarea } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Button, Tooltip, Spinner } from '@nextui-org/react'
import { Receipt, Edit, Trash2, Download } from 'lucide-react'
import { exportToCSV, SECTIONS } from '@/lib/export'

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
    if (editItem) {
      await supabase.from('expenses').update(formData).eq('id', editItem.id)
    } else {
      const { data: newExpense } = await supabase.from('expenses').insert([formData]).select().single()
      if (newExpense) {
        await supabase.from('transactions').insert([{
          transaction_date: formData.expense_date || new Date().toISOString().split('T')[0],
          type: 'expense', category: formData.category || 'مصروفات عامة', amount: formData.amount,
          description: formData.description, reference_type: 'expense', reference_id: newExpense.id, expense_id: newExpense.id,
        }])
      }
    }
    onClose(); fetchExpenses()
  }

  async function handleDelete(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) { await supabase.from('expenses').delete().eq('id', id); fetchExpenses() }
  }

  function handleExport() {
    exportToCSV(filtered as any, SECTIONS.expenses.headers, 'expenses')
  }

  const totalExpenses = filtered.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="w-full">
      <PageHeader title="المصروفات" subtitle="إدارة المصروفات والنفقات" icon={Receipt} iconBg="from-rose-500 to-rose-600" buttonLabel="إضافة مصروف" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث في المصروفات..." />
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">إجمالي المصروفات</p>
          <p className="text-lg sm:text-xl font-black text-rose-600">{expenses.length}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">إجمالي المبالغ</p>
          <p className="text-lg sm:text-xl font-black text-red-600">{formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-0.5">عدد الفئات</p>
          <p className="text-lg sm:text-xl font-black text-purple-600">{new Set(expenses.map(e => e.category).filter(Boolean)).size}</p>
        </CardBody></Card>
      </div>

      {loading ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex items-center justify-center h-48"><Spinner size="lg" /></CardBody></Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-md border border-slate-100"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Receipt className="h-16 w-16 mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد مصروفات</p>
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
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الوصف</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الفئة</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">المبلغ</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">التاريخ</th>
                  <th className="text-center p-3 font-extrabold text-slate-600 text-xs">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, idx) => (
                  <tr key={e.id} className="border-b border-slate-100 transition-all hover:bg-blue-50/30">
                    <td className="p-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-extrabold text-sm text-slate-800">{e.description}</td>
                    <td className="p-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-xs font-bold border border-amber-100">{e.category || '-'}</span>
                    </td>
                    <td className="p-3 font-extrabold text-rose-600 text-sm">{formatCurrency(e.amount)}</td>
                    <td className="p-3 text-sm text-slate-500">{e.expense_date}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-0.5">
                        <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(e)}><Edit className="h-4 w-4" /></Button></Tooltip>
                        <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(e.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-l from-rose-50 to-rose-100 border-t-2 border-rose-200">
                  <td colSpan={3} className="p-3 text-sm font-extrabold text-rose-800">الإجمالي ({filtered.length} مصروف)</td>
                  <td className="p-3 text-sm font-black text-rose-800">{formatCurrency(totalExpenses)}</td>
                  <td colSpan={2} className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </CardBody>
        </Card>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">{filtered.length} مصروف</span>
              <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-emerald-50 text-emerald-600 border-emerald-200">
                <Download className="h-3 w-3" />تصدير
              </button>
            </div>
            {filtered.map((e) => (
              <div key={e.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-sm text-slate-800">{e.description || '-'}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                      <span className="font-extrabold text-rose-600">{formatCurrency(e.amount)}</span>
                      {e.category && <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 text-[10px] font-bold">{e.category}</span>}
                      <span className="text-slate-400">{e.expense_date || ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(e)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Edit className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(e.id)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
            <div className="bg-rose-50 rounded-xl p-2.5 text-center">
              <span className="text-xs font-extrabold text-rose-800">الإجمالي: {formatCurrency(totalExpenses)}</span>
            </div>
          </div>
        </>)}

      <CustomModal isOpen={isOpen} onClose={onClose} title={editItem ? 'تعديل مصروف' : 'إضافة مصروف جديد'} footer={
        <>
          <ModalCancelButton label="إلغاء" onClick={onClose} />
          <ModalSubmitButton label={editItem ? 'تحديث' : 'إضافة'} onClick={handleSubmit} color="from-rose-500 to-rose-600" />
        </>
      }>
        <div className="flex flex-col gap-4">
          <FormInput label="الوصف" value={formData.description} onChange={(v) => setFormData({...formData, description: v})} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormInput label="المبلغ" type="number" value={formData.amount} onChange={(v) => setFormData({...formData, amount: parseFloat(v) || 0})} required />
            <FormSelect label="الفئة" value={formData.category} onChange={(v) => setFormData({...formData, category: v})} options={categories.map(c => ({ value: c, label: c }))} placeholder="اختر الفئة" />
          </div>
          <FormInput label="التاريخ" type="date" value={formData.expense_date} onChange={(v) => setFormData({...formData, expense_date: v})} />
        </div>
      </CustomModal>
    </div>
  )
}
