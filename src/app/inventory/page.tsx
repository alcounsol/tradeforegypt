'use client'

import { useEffect, useState } from 'react'
import { supabase, InventoryItem } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import CustomModal from '@/components/CustomModal'
import FormInput, { FormSelect } from '@/components/FormInput'
import { ModalSubmitButton, ModalCancelButton, SearchInput } from '@/components/ActionButtons'
import { Card, CardBody, Button, Chip, Tooltip, Spinner, Progress } from '@nextui-org/react'
import { Package, Edit, Trash2, AlertTriangle, TrendingDown, TrendingUp, BarChart3, Eye, Download, Upload, Filter, ArrowUpDown, Box, Layers } from 'lucide-react'

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null)
  const onOpen = () => setIsOpen(true)
  const onClose = () => setIsOpen(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStock, setFilterStock] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [formData, setFormData] = useState({ name: '', sku: '', category: '', brand: '', unit: 'قطعة', current_stock: 0, min_stock_level: 5, cost_price: 0, sell_price: 0 })

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase.from('inventory_items').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  // Get unique categories
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))]
  
  // Filter items
  let filtered = items.filter(i => 
    i.name.includes(search) || (i.sku && i.sku.includes(search)) || (i.category && i.category.includes(search)) || (i.brand && i.brand.includes(search))
  )
  if (filterCategory !== 'all') filtered = filtered.filter(i => i.category === filterCategory)
  if (filterStock === 'low') filtered = filtered.filter(i => i.current_stock <= i.min_stock_level && i.current_stock > 0)
  if (filterStock === 'out') filtered = filtered.filter(i => i.current_stock === 0)
  if (filterStock === 'available') filtered = filtered.filter(i => i.current_stock > i.min_stock_level)

  // Sort items
  filtered.sort((a, b) => {
    let cmp = 0
    if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
    else if (sortBy === 'stock') cmp = a.current_stock - b.current_stock
    else if (sortBy === 'value') cmp = (a.current_stock * (a.cost_price || 0)) - (b.current_stock * (b.cost_price || 0))
    else if (sortBy === 'price') cmp = (a.sell_price || 0) - (b.sell_price || 0)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const lowStock = items.filter(i => i.current_stock <= i.min_stock_level && i.current_stock > 0)
  const outOfStock = items.filter(i => i.current_stock === 0)
  const totalValue = items.reduce((s, i) => s + (i.current_stock * (i.cost_price || 0)), 0)
  const totalSellValue = items.reduce((s, i) => s + (i.current_stock * (i.sell_price || 0)), 0)
  const totalUnits = items.reduce((s, i) => s + i.current_stock, 0)
  const potentialProfit = totalSellValue - totalValue

  function openAdd() { setEditItem(null); setFormData({ name: '', sku: '', category: '', brand: '', unit: 'قطعة', current_stock: 0, min_stock_level: 5, cost_price: 0, sell_price: 0 }); onOpen() }
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

  function exportCSV() {
    const headers = ['الصنف', 'رمز SKU', 'الماركة', 'الفئة', 'الوحدة', 'المخزون الحالي', 'الحد الأدنى', 'سعر التكلفة', 'سعر البيع', 'قيمة المخزون', 'الحالة']
    const rows = items.map(i => [
      i.name, i.sku || '', i.brand || '', i.category || '', i.unit,
      i.current_stock, i.min_stock_level, i.cost_price || 0, i.sell_price || 0,
      i.current_stock * (i.cost_price || 0),
      i.current_stock === 0 ? 'نفد' : i.current_stock <= i.min_stock_level ? 'منخفض' : 'متوفر'
    ])
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`; a.click()
  }

  function getStockStatus(item: InventoryItem) {
    if (item.current_stock === 0) return { label: 'نفد المخزون', color: 'bg-red-100 text-red-700 border-red-200', dotColor: 'bg-red-500' }
    if (item.current_stock <= item.min_stock_level) return { label: 'مخزون منخفض', color: 'bg-amber-100 text-amber-700 border-amber-200', dotColor: 'bg-amber-500' }
    return { label: 'متوفر', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' }
  }

  function getStockPercentage(item: InventoryItem) {
    const max = Math.max(item.min_stock_level * 3, item.current_stock, 10)
    return Math.min((item.current_stock / max) * 100, 100)
  }

  function getMarginPercentage(item: InventoryItem) {
    if (!item.cost_price || !item.sell_price || item.cost_price === 0) return 0
    return ((item.sell_price - item.cost_price) / item.cost_price) * 100
  }

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('asc') }
  }

  return (
    <div className="w-full">
      <PageHeader title="المخزون" subtitle="إدارة قطع الغيار والأصناف" icon={Package} iconBg="from-emerald-500 to-emerald-600" buttonLabel="إضافة صنف" onButtonClick={openAdd}>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الرمز أو الماركة..." />
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1"><Box className="h-4 w-4 text-blue-500" /></div>
          <p className="text-[10px] font-bold text-slate-400 mb-0.5">إجمالي الأصناف</p>
          <p className="text-xl font-black text-blue-600">{items.length}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1"><Layers className="h-4 w-4 text-purple-500" /></div>
          <p className="text-[10px] font-bold text-slate-400 mb-0.5">إجمالي الوحدات</p>
          <p className="text-xl font-black text-purple-600">{totalUnits.toLocaleString()}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1"><BarChart3 className="h-4 w-4 text-emerald-500" /></div>
          <p className="text-[10px] font-bold text-slate-400 mb-0.5">قيمة المخزون (تكلفة)</p>
          <p className="text-xl font-black text-emerald-600">{formatCurrency(totalValue)}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1"><TrendingUp className="h-4 w-4 text-cyan-500" /></div>
          <p className="text-[10px] font-bold text-slate-400 mb-0.5">قيمة المخزون (بيع)</p>
          <p className="text-xl font-black text-cyan-600">{formatCurrency(totalSellValue)}</p>
        </CardBody></Card>
        <Card className={`shadow-sm border ${lowStock.length > 0 ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100'}`}><CardBody className="p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1"><TrendingDown className="h-4 w-4 text-amber-500" /></div>
          <p className="text-[10px] font-bold text-slate-400 mb-0.5">مخزون منخفض</p>
          <p className="text-xl font-black text-amber-600">{lowStock.length}</p>
        </CardBody></Card>
        <Card className={`shadow-sm border ${outOfStock.length > 0 ? 'border-red-200 bg-red-50/30' : 'border-slate-100'}`}><CardBody className="p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1"><AlertTriangle className="h-4 w-4 text-red-500" /></div>
          <p className="text-[10px] font-bold text-slate-400 mb-0.5">نفد المخزون</p>
          <p className="text-xl font-black text-red-600">{outOfStock.length}</p>
        </CardBody></Card>
      </div>

      {/* Low Stock Alert */}
      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <Card className="shadow-sm mb-6 border-2 border-amber-200 bg-gradient-to-l from-amber-50 to-orange-50">
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-amber-100"><AlertTriangle className="h-4 w-4 text-amber-600" /></div>
              <p className="text-sm font-extrabold text-amber-800">تنبيهات المخزون</p>
            </div>
            {outOfStock.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-bold text-red-600 mb-1.5">نفد المخزون:</p>
                <div className="flex flex-wrap gap-1.5">
                  {outOfStock.map(i => (
                    <span key={i.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                      {i.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {lowStock.length > 0 && (
              <div>
                <p className="text-xs font-bold text-amber-600 mb-1.5">مخزون منخفض:</p>
                <div className="flex flex-wrap gap-1.5">
                  {lowStock.map(i => (
                    <span key={i.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                      {i.name} ({i.current_stock} {i.unit})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Filters & Controls */}
      <Card className="shadow-sm mb-4 border border-slate-100">
        <CardBody className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 ml-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500">تصفية:</span>
            </div>
            
            {/* Category Filter */}
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setFilterCategory('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${filterCategory === 'all' ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/25' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>كل الفئات</button>
              {categories.map(c => (
                <button key={c} onClick={() => setFilterCategory(c!)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${filterCategory === c ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/25' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>{c}</button>
              ))}
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            {/* Stock Filter */}
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setFilterStock('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${filterStock === 'all' ? 'bg-slate-700 text-white border-slate-700 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>الكل ({items.length})</button>
              <button onClick={() => setFilterStock('available')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${filterStock === 'available' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/25' : 'bg-white text-emerald-600 border-emerald-200 hover:border-emerald-400'}`}>متوفر ({items.filter(i => i.current_stock > i.min_stock_level).length})</button>
              <button onClick={() => setFilterStock('low')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${filterStock === 'low' ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/25' : 'bg-white text-amber-600 border-amber-200 hover:border-amber-400'}`}>منخفض ({lowStock.length})</button>
              <button onClick={() => setFilterStock('out')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${filterStock === 'out' ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/25' : 'bg-white text-red-600 border-red-200 hover:border-red-400'}`}>نفد ({outOfStock.length})</button>
            </div>

            <div className="mr-auto flex items-center gap-1">
              <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-lg border-2 transition-all ${viewMode === 'table' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-500 border-slate-200'}`}>
                <BarChart3 className="h-4 w-4" />
              </button>
              <button onClick={() => setViewMode('cards')} className={`p-1.5 rounded-lg border-2 transition-all ${viewMode === 'cards' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-500 border-slate-200'}`}>
                <Package className="h-4 w-4" />
              </button>
              <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border-2 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 transition-all">
                <Download className="h-3.5 w-3.5" />
                تصدير CSV
              </button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-sm"><CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Package className="h-16 w-16 mb-4 opacity-20" />
          <p className="font-bold text-lg">لا توجد أصناف</p>
          <p className="text-sm">أضف أصناف جديدة للمخزون</p>
        </CardBody></Card>
      ) : viewMode === 'table' ? (
        <Card className="shadow-md border border-slate-100">
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-l from-slate-50 to-slate-100 border-b-2 border-slate-200">
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">#</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs cursor-pointer hover:text-blue-600" onClick={() => toggleSort('name')}>
                    <span className="flex items-center gap-1">الصنف <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الماركة</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الفئة</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs cursor-pointer hover:text-blue-600" onClick={() => toggleSort('stock')}>
                    <span className="flex items-center gap-1">المخزون <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">الحالة</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs cursor-pointer hover:text-blue-600" onClick={() => toggleSort('price')}>
                    <span className="flex items-center gap-1">التكلفة / البيع <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs">هامش الربح</th>
                  <th className="text-right p-3 font-extrabold text-slate-600 text-xs cursor-pointer hover:text-blue-600" onClick={() => toggleSort('value')}>
                    <span className="flex items-center gap-1">القيمة <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="text-center p-3 font-extrabold text-slate-600 text-xs">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const status = getStockStatus(item)
                  const margin = getMarginPercentage(item)
                  const stockPct = getStockPercentage(item)
                  return (
                    <tr key={item.id} className={`border-b border-slate-100 transition-all hover:bg-blue-50/30 ${item.current_stock === 0 ? 'bg-red-50/40' : item.current_stock <= item.min_stock_level ? 'bg-amber-50/40' : ''}`}>
                      <td className="p-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3">
                        <div>
                          <p className="font-extrabold text-slate-800 text-sm">{item.name}</p>
                          {item.sku && <p className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {item.sku}</p>}
                        </div>
                      </td>
                      <td className="p-3">
                        {item.brand ? (
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-bold">{item.brand}</span>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="p-3">
                        {item.category ? (
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100">{item.category}</span>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="p-3">
                        <div className="min-w-[100px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-black text-slate-800">{item.current_stock}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{item.unit}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${item.current_stock === 0 ? 'bg-red-500' : item.current_stock <= item.min_stock_level ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${stockPct}%` }}></div>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-0.5">الحد الأدنى: {item.min_stock_level}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${status.color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dotColor}`}></span>
                          {status.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-xs text-slate-500"><span className="font-bold">تكلفة:</span> {formatCurrency(item.cost_price || 0)}</p>
                          <p className="text-xs text-emerald-600 font-bold"><span className="font-bold">بيع:</span> {formatCurrency(item.sell_price || 0)}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        {margin > 0 ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${margin >= 30 ? 'bg-emerald-100 text-emerald-700' : margin >= 15 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            <TrendingUp className="h-3 w-3" />
                            {margin.toFixed(0)}%
                          </span>
                        ) : <span className="text-slate-300 text-xs">-</span>}
                      </td>
                      <td className="p-3">
                        <p className="font-black text-emerald-600 text-sm">{formatCurrency(item.current_stock * (item.cost_price || 0))}</p>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-0.5">
                          <Tooltip content="عرض التفاصيل"><Button isIconOnly size="sm" variant="light" color="default" onPress={() => setDetailItem(item)}><Eye className="h-4 w-4" /></Button></Tooltip>
                          <Tooltip content="تعديل"><Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(item)}><Edit className="h-4 w-4" /></Button></Tooltip>
                          <Tooltip content="حذف" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button></Tooltip>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-l from-emerald-50 to-emerald-100 border-t-2 border-emerald-200">
                  <td colSpan={4} className="p-3 text-sm font-extrabold text-emerald-800">الإجمالي ({filtered.length} صنف)</td>
                  <td className="p-3 text-sm font-black text-emerald-800">{filtered.reduce((s, i) => s + i.current_stock, 0)} وحدة</td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                  <td className="p-3 text-sm font-black text-emerald-800">{formatCurrency(filtered.reduce((s, i) => s + (i.current_stock * (i.cost_price || 0)), 0))}</td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </CardBody>
        </Card>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const status = getStockStatus(item)
            const margin = getMarginPercentage(item)
            const stockPct = getStockPercentage(item)
            return (
              <Card key={item.id} className={`shadow-sm border-2 transition-all hover:shadow-md ${item.current_stock === 0 ? 'border-red-200' : item.current_stock <= item.min_stock_level ? 'border-amber-200' : 'border-slate-100'}`}>
                <CardBody className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base">{item.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {item.sku && <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded">SKU: {item.sku}</span>}
                        {item.brand && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{item.brand}</span>}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${status.color}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dotColor}`}></span>
                      {status.label}
                    </span>
                  </div>

                  {item.category && (
                    <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100 mb-3">{item.category}</span>
                  )}

                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-500">المخزون</span>
                      <span className="text-sm font-black text-slate-800">{item.current_stock} <span className="text-[10px] text-slate-400">{item.unit}</span></span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${item.current_stock === 0 ? 'bg-red-500' : item.current_stock <= item.min_stock_level ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${stockPct}%` }}></div>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-0.5">الحد الأدنى: {item.min_stock_level}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-lg mb-3">
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 font-bold">التكلفة</p>
                      <p className="text-xs font-bold text-slate-700">{formatCurrency(item.cost_price || 0)}</p>
                    </div>
                    <div className="text-center border-x border-slate-200">
                      <p className="text-[9px] text-slate-400 font-bold">البيع</p>
                      <p className="text-xs font-bold text-emerald-600">{formatCurrency(item.sell_price || 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 font-bold">الهامش</p>
                      <p className={`text-xs font-bold ${margin >= 30 ? 'text-emerald-600' : margin >= 15 ? 'text-blue-600' : 'text-amber-600'}`}>{margin > 0 ? `${margin.toFixed(0)}%` : '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500">القيمة: <span className="text-emerald-600 font-black">{formatCurrency(item.current_stock * (item.cost_price || 0))}</span></p>
                    <div className="flex gap-0.5">
                      <Button isIconOnly size="sm" variant="light" color="primary" onPress={() => openEdit(item)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      <CustomModal isOpen={!!detailItem} onClose={() => setDetailItem(null)} title="تفاصيل الصنف" footer={
        <ModalCancelButton label="إغلاق" onClick={() => setDetailItem(null)} />
      }>
        {detailItem && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-gradient-to-l from-emerald-50 to-blue-50 rounded-xl">
              <h3 className="text-xl font-black text-slate-800">{detailItem.name}</h3>
              {detailItem.sku && <p className="text-xs text-slate-400 font-mono mt-1">SKU: {detailItem.sku}</p>}
              <div className="flex items-center justify-center gap-2 mt-2">
                {detailItem.brand && <span className="px-2 py-0.5 rounded bg-slate-100 text-xs font-bold">{detailItem.brand}</span>}
                {detailItem.category && <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-600 text-xs font-bold">{detailItem.category}</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-[10px] text-slate-400 font-bold">المخزون الحالي</p>
                <p className="text-2xl font-black text-slate-800">{detailItem.current_stock} <span className="text-xs text-slate-400">{detailItem.unit}</span></p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-[10px] text-slate-400 font-bold">الحد الأدنى</p>
                <p className="text-2xl font-black text-slate-800">{detailItem.min_stock_level} <span className="text-xs text-slate-400">{detailItem.unit}</span></p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-[10px] text-slate-400 font-bold">سعر التكلفة</p>
                <p className="text-lg font-black text-slate-800">{formatCurrency(detailItem.cost_price || 0)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-center">
                <p className="text-[10px] text-slate-400 font-bold">سعر البيع</p>
                <p className="text-lg font-black text-emerald-600">{formatCurrency(detailItem.sell_price || 0)}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg text-center col-span-2">
                <p className="text-[10px] text-slate-400 font-bold">إجمالي قيمة المخزون</p>
                <p className="text-2xl font-black text-emerald-600">{formatCurrency(detailItem.current_stock * (detailItem.cost_price || 0))}</p>
              </div>
            </div>
          </div>
        )}
      </CustomModal>

      {/* Add/Edit Modal */}
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
            <FormSelect label="الوحدة" value={formData.unit} onChange={(v) => setFormData({...formData, unit: v})} options={[{value:'قطعة',label:'قطعة'},{value:'متر',label:'متر'},{value:'كيلو',label:'كيلو'},{value:'لتر',label:'لتر'},{value:'علبة',label:'علبة'},{value:'كرتونة',label:'كرتونة'},{value:'حبة',label:'حبة'}]} />
            <FormInput label="الحد الأدنى للمخزون" type="number" value={formData.min_stock_level} onChange={(v) => setFormData({...formData, min_stock_level: parseInt(v) || 0})} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormInput label="الكمية الحالية" type="number" value={formData.current_stock} onChange={(v) => setFormData({...formData, current_stock: parseInt(v) || 0})} />
            <FormInput label="سعر التكلفة" type="number" value={formData.cost_price} onChange={(v) => setFormData({...formData, cost_price: parseFloat(v) || 0})} />
            <FormInput label="سعر البيع" type="number" value={formData.sell_price} onChange={(v) => setFormData({...formData, sell_price: parseFloat(v) || 0})} />
          </div>
        </div>
      </CustomModal>
    </div>
  )
}
