'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { SECTIONS, exportToCSV, exportToJSON, parseCSV, parseJSON } from '@/lib/export'
import PageHeader from '@/components/PageHeader'
import { Card, CardBody, Button, Spinner, Chip, Progress } from '@nextui-org/react'
import { Database, Download, Upload, RefreshCw, CheckCircle, XCircle, AlertTriangle, FileDown, FileUp, Trash2, HardDrive, Shield, Clock, FileText, FileJson, Table2 } from 'lucide-react'

type SectionKey = keyof typeof SECTIONS
type BackupStatus = 'idle' | 'loading' | 'success' | 'error'
type UploadResult = { section: string; count: number; status: 'success' | 'error'; message: string }

export default function BackupPage() {
  const [sectionCounts, setSectionCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [backupStatus, setBackupStatus] = useState<BackupStatus>('idle')
  const [restoreStatus, setRestoreStatus] = useState<BackupStatus>('idle')
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
  const [selectedSections, setSelectedSections] = useState<Set<SectionKey>>(new Set(Object.keys(SECTIONS) as SectionKey[]))
  const [backupProgress, setBackupProgress] = useState(0)
  const [restoreProgress, setRestoreProgress] = useState(0)
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const singleFileRef = useRef<HTMLInputElement>(null)
  const [uploadSection, setUploadSection] = useState<SectionKey | null>(null)

  useEffect(() => { fetchCounts() }, [])

  async function fetchCounts() {
    setLoading(true)
    const counts: Record<string, number> = {}
    for (const [key, section] of Object.entries(SECTIONS)) {
      const { count } = await supabase.from(section.table).select('*', { count: 'exact', head: true })
      counts[key] = count || 0
    }
    setSectionCounts(counts)
    setLoading(false)
  }

  function toggleSection(key: SectionKey) {
    const newSet = new Set(selectedSections)
    if (newSet.has(key)) newSet.delete(key)
    else newSet.add(key)
    setSelectedSections(newSet)
  }

  function selectAll() { setSelectedSections(new Set(Object.keys(SECTIONS) as SectionKey[])) }
  function selectNone() { setSelectedSections(new Set()) }

  // ===== FULL BACKUP =====
  async function handleFullBackup() {
    setBackupStatus('loading')
    setBackupProgress(0)
    try {
      const backup: Record<string, unknown[]> = {}
      const sections = Array.from(selectedSections)
      for (let i = 0; i < sections.length; i++) {
        const key = sections[i]
        const section = SECTIONS[key]
        const { data } = await supabase.from(section.table).select('*')
        backup[key] = data || []
        setBackupProgress(Math.round(((i + 1) / sections.length) * 100))
      }
      
      const backupData = {
        version: '2.0',
        app: 'Trade For Egypt',
        date: new Date().toISOString(),
        sections: backup,
        metadata: {
          totalRecords: Object.values(backup).reduce((s, arr) => s + arr.length, 0),
          sectionCount: sections.length
        }
      }
      
      const jsonContent = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tradeforegypt_backup_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setBackupStatus('success')
      setLastBackup(new Date().toLocaleString('ar-EG'))
    } catch (err) {
      setBackupStatus('error')
    }
  }

  // ===== EXPORT SECTION =====
  async function handleExportSection(key: SectionKey) {
    const section = SECTIONS[key]
    const { data } = await supabase.from(section.table).select('*')
    if (!data || data.length === 0) {
      alert('لا توجد بيانات للتصدير في هذا القسم')
      return
    }
    if (exportFormat === 'csv') {
      exportToCSV(data as Record<string, unknown>[], section.headers, section.table)
    } else {
      exportToJSON(data, section.table)
    }
  }

  // ===== FULL RESTORE =====
  async function handleFullRestore(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    
    if (!confirm('تحذير: سيتم استبدال جميع البيانات الحالية بالبيانات من ملف الباكب. هل أنت متأكد؟')) {
      event.target.value = ''
      return
    }

    setRestoreStatus('loading')
    setRestoreProgress(0)
    setUploadResults([])

    try {
      const content = await file.text()
      const backupData = JSON.parse(content)
      
      let sections: Record<string, unknown[]>
      if (backupData.sections) {
        sections = backupData.sections
      } else if (Array.isArray(backupData)) {
        alert('هذا الملف يحتوي على بيانات قسم واحد فقط. استخدم "رفع ملف" لقسم محدد.')
        setRestoreStatus('idle')
        event.target.value = ''
        return
      } else {
        sections = backupData
      }

      const keys = Object.keys(sections).filter(k => k in SECTIONS)
      const results: UploadResult[] = []

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i] as SectionKey
        const section = SECTIONS[key]
        const records = sections[key] as Record<string, unknown>[]
        
        try {
          // Delete existing data
          await supabase.from(section.table).delete().gte('id', 0)
          
          // Insert new data in batches
          if (records.length > 0) {
            const cleanRecords = records.map((r) => {
              const clean = { ...r }
              delete clean.id
              delete clean.created_at
              delete clean.updated_at
              return clean
            })
            
            const batchSize = 50
            for (let j = 0; j < cleanRecords.length; j += batchSize) {
              const batch = cleanRecords.slice(j, j + batchSize)
              const { error } = await supabase.from(section.table).insert(batch)
              if (error) throw error
            }
          }
          
          results.push({ section: section.label, count: records.length, status: 'success', message: `تم استعادة ${records.length} سجل` })
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'خطأ غير معروف'
          results.push({ section: section.label, count: 0, status: 'error', message: errorMessage })
        }
        
        setRestoreProgress(Math.round(((i + 1) / keys.length) * 100))
      }

      setUploadResults(results)
      setRestoreStatus('success')
      fetchCounts()
    } catch (err) {
      setRestoreStatus('error')
    }
    event.target.value = ''
  }

  // ===== UPLOAD SINGLE SECTION =====
  async function handleUploadSection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !uploadSection) return

    const section = SECTIONS[uploadSection]
    
    if (!confirm(`سيتم إضافة البيانات إلى قسم "${section.label}". هل تريد المتابعة؟`)) {
      event.target.value = ''
      return
    }

    try {
      const content = await file.text()
      let records: Record<string, unknown>[]

      if (file.name.endsWith('.csv')) {
        const parsed = parseCSV(content)
        // Map Arabic headers back to English keys
        records = parsed.map(row => {
          const mapped: Record<string, unknown> = {}
          for (const header of section.headers) {
            if (row[header.label] !== undefined) {
              mapped[header.key] = row[header.label]
            } else if (row[header.key] !== undefined) {
              mapped[header.key] = row[header.key]
            }
          }
          return mapped
        })
      } else {
        const parsed = parseJSON(content)
        records = parsed.map(r => {
          const clean = { ...r }
          delete clean.id
          delete clean.created_at
          delete clean.updated_at
          return clean
        })
      }

      if (records.length === 0) {
        alert('لم يتم العثور على بيانات صالحة في الملف')
        event.target.value = ''
        return
      }

      const batchSize = 50
      let insertedCount = 0
      for (let j = 0; j < records.length; j += batchSize) {
        const batch = records.slice(j, j + batchSize)
        const { error } = await supabase.from(section.table).insert(batch)
        if (error) throw error
        insertedCount += batch.length
      }

      setUploadResults([{ section: section.label, count: insertedCount, status: 'success', message: `تم إضافة ${insertedCount} سجل بنجاح` }])
      fetchCounts()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في رفع الملف'
      setUploadResults([{ section: section.label, count: 0, status: 'error', message: errorMessage }])
    }
    event.target.value = ''
    setUploadSection(null)
  }

  // ===== DELETE SECTION =====
  async function handleDeleteSection(key: SectionKey) {
    const section = SECTIONS[key]
    if (!confirm(`تحذير: سيتم حذف جميع بيانات "${section.label}" نهائياً. هل أنت متأكد؟`)) return
    
    try {
      await supabase.from(section.table).delete().gte('id', 0)
      fetchCounts()
      alert(`تم حذف جميع بيانات "${section.label}" بنجاح`)
    } catch {
      alert('حدث خطأ أثناء الحذف')
    }
  }

  const totalRecords = Object.values(sectionCounts).reduce((s, c) => s + c, 0)

  return (
    <div className="w-full">
      <PageHeader title="النسخ الاحتياطي" subtitle="باكب وريستور وتصدير واستيراد البيانات" icon={Database} iconBg="from-violet-500 to-purple-600" />

      {/* Hidden file inputs */}
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFullRestore} />
      <input type="file" ref={singleFileRef} className="hidden" accept=".json,.csv" onChange={handleUploadSection} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
          <HardDrive className="h-5 w-5 text-violet-500 mx-auto mb-1" />
          <p className="text-[10px] font-bold text-slate-400">إجمالي الأقسام</p>
          <p className="text-lg sm:text-xl font-black text-violet-600">{Object.keys(SECTIONS).length}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
          <Table2 className="h-5 w-5 text-blue-500 mx-auto mb-1" />
          <p className="text-[10px] font-bold text-slate-400">إجمالي السجلات</p>
          <p className="text-lg sm:text-xl font-black text-blue-600">{loading ? '...' : totalRecords.toLocaleString()}</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
          <Shield className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-[10px] font-bold text-slate-400">حالة النظام</p>
          <p className="text-sm font-black text-emerald-600">متصل وجاهز</p>
        </CardBody></Card>
        <Card className="shadow-sm border border-slate-100"><CardBody className="p-3 text-center">
          <Clock className="h-5 w-5 text-amber-500 mx-auto mb-1" />
          <p className="text-[10px] font-bold text-slate-400">آخر نسخة</p>
          <p className="text-sm font-black text-amber-600">{lastBackup || 'لم يتم بعد'}</p>
        </CardBody></Card>
      </div>

      {/* Full Backup & Restore */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Full Backup */}
        <Card className="shadow-md border-2 border-emerald-100">
          <CardBody className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
                <Download className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800">نسخة احتياطية كاملة</h3>
                <p className="text-xs text-slate-400">تحميل جميع بيانات الشركة في ملف واحد</p>
              </div>
            </div>

            {/* Section Selection */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-500">اختر الأقسام:</p>
                <div className="flex gap-1">
                  <button onClick={selectAll} className="text-[10px] font-bold text-blue-500 hover:underline">تحديد الكل</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={selectNone} className="text-[10px] font-bold text-red-500 hover:underline">إلغاء الكل</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(SECTIONS) as SectionKey[]).map(key => (
                  <button key={key} onClick={() => toggleSection(key)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border-2 transition-all ${selectedSections.has(key) ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300'}`}>
                    {SECTIONS[key].label} ({sectionCounts[key] || 0})
                  </button>
                ))}
              </div>
            </div>

            {backupStatus === 'loading' && (
              <div className="mb-3">
                <Progress value={backupProgress} color="success" size="sm" className="mb-1" />
                <p className="text-[10px] text-slate-400 text-center">{backupProgress}% - جاري التحميل...</p>
              </div>
            )}

            <Button color="success" className="w-full font-bold" size="lg" onPress={handleFullBackup} isLoading={backupStatus === 'loading'} startContent={<Download className="h-4 w-4" />}>
              تحميل نسخة احتياطية ({selectedSections.size} قسم)
            </Button>

            {backupStatus === 'success' && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <p className="text-xs font-bold text-emerald-700">تم تحميل النسخة الاحتياطية بنجاح</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Full Restore */}
        <Card className="shadow-md border-2 border-amber-100">
          <CardBody className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25">
                <Upload className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800">استعادة نسخة احتياطية</h3>
                <p className="text-xs text-slate-400">استعادة جميع البيانات من ملف باكب</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-800">تحذير هام</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">سيتم استبدال جميع البيانات الحالية بالبيانات من ملف الباكب. تأكد من أخذ نسخة احتياطية أولاً.</p>
                </div>
              </div>
            </div>

            {restoreStatus === 'loading' && (
              <div className="mb-3">
                <Progress value={restoreProgress} color="warning" size="sm" className="mb-1" />
                <p className="text-[10px] text-slate-400 text-center">{restoreProgress}% - جاري الاستعادة...</p>
              </div>
            )}

            <Button color="warning" className="w-full font-bold text-white" size="lg" onPress={() => fileInputRef.current?.click()} isLoading={restoreStatus === 'loading'} startContent={<Upload className="h-4 w-4" />}>
              رفع ملف الباكب واستعادة البيانات
            </Button>

            {restoreStatus === 'success' && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <p className="text-xs font-bold text-emerald-700">تم استعادة البيانات بنجاح</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <Card className="shadow-sm mb-6 border border-slate-200">
          <CardBody className="p-4">
            <h3 className="font-extrabold text-slate-800 mb-3 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> نتائج العملية
            </h3>
            <div className="space-y-2">
              {uploadResults.map((r, i) => (
                <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg border ${r.status === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    {r.status === 'success' ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                    <span className="text-sm font-bold text-slate-700">{r.section}</span>
                  </div>
                  <span className={`text-xs font-bold ${r.status === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{r.message}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Export Format Selection */}
      <Card className="shadow-sm mb-4 border border-slate-100">
        <CardBody className="p-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">صيغة التصدير:</span>
            <button onClick={() => setExportFormat('json')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${exportFormat === 'json' ? 'bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-500/25' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'}`}>
              <FileJson className="h-3.5 w-3.5" /> JSON
            </button>
            <button onClick={() => setExportFormat('csv')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${exportFormat === 'csv' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/25' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}>
              <FileText className="h-3.5 w-3.5" /> CSV (Excel)
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Per-Section Management */}
      <h3 className="font-extrabold text-slate-800 text-lg mb-3">إدارة الأقسام</h3>
      {loading ? (
        <div className="flex items-center justify-center h-32"><Spinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.keys(SECTIONS) as SectionKey[]).map(key => {
            const section = SECTIONS[key]
            const count = sectionCounts[key] || 0
            return (
              <Card key={key} className="shadow-sm border border-slate-100 hover:shadow-md transition-all">
                <CardBody className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">{section.label}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{section.table}</p>
                    </div>
                    <Chip size="sm" variant="flat" color={count > 0 ? 'primary' : 'default'} className="font-bold">
                      {count} سجل
                    </Chip>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="flat" color="success" className="font-bold text-[11px]" startContent={<FileDown className="h-3 w-3" />} onPress={() => handleExportSection(key)} isDisabled={count === 0}>
                      تصدير
                    </Button>
                    <Button size="sm" variant="flat" color="primary" className="font-bold text-[11px]" startContent={<FileUp className="h-3 w-3" />} onPress={() => { setUploadSection(key); setTimeout(() => singleFileRef.current?.click(), 100) }}>
                      رفع ملف
                    </Button>
                    <Button size="sm" variant="flat" color="danger" className="font-bold text-[11px]" startContent={<Trash2 className="h-3 w-3" />} onPress={() => handleDeleteSection(key)} isDisabled={count === 0}>
                      حذف الكل
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* Template Files Info */}
      <Card className="shadow-sm mt-6 border-2 border-blue-100">
        <CardBody className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800">ملفات نموذجية للرفع</h3>
              <p className="text-xs text-slate-400">حمّل ملفات التيست لمعرفة الشكل المطلوب لكل قسم</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(Object.keys(SECTIONS) as SectionKey[]).map(key => {
              const section = SECTIONS[key]
              return (
                <div key={key} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="text-sm font-bold text-slate-700">{section.label}</p>
                    <p className="text-[10px] text-slate-400">الأعمدة: {section.headers.map(h => h.label).join(' | ')}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="light" color="primary" className="font-bold text-[10px]" onPress={() => downloadTemplate(key, 'csv')}>CSV</Button>
                    <Button size="sm" variant="light" color="secondary" className="font-bold text-[10px]" onPress={() => downloadTemplate(key, 'json')}>JSON</Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function downloadTemplate(key: keyof typeof SECTIONS, format: 'csv' | 'json') {
  const section = SECTIONS[key]
  const sampleData = getSampleData(key)
  
  if (format === 'csv') {
    const headerRow = section.headers.map(h => h.label).join(',')
    const dataRows = sampleData.map(row => section.headers.map(h => row[h.key] || '').join(','))
    const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `template_${section.table}.csv`; a.click()
    URL.revokeObjectURL(url)
  } else {
    const jsonContent = JSON.stringify(sampleData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `template_${section.table}.json`; a.click()
    URL.revokeObjectURL(url)
  }
}

function getSampleData(key: string): Record<string, string | number | boolean>[] {
  const samples: Record<string, Record<string, string | number | boolean>[]> = {
    employees: [
      { name: 'أحمد محمد', job_title: 'مهندس صيانة', department: 'الصيانة', phone: '01012345678', base_salary: 8000, is_active: true, notes: 'موظف نموذجي' },
      { name: 'سارة أحمد', job_title: 'موظفة كول سنتر', department: 'الكول سنتر', phone: '01098765432', base_salary: 4000, is_active: true, notes: '' },
    ],
    customers: [
      { name: 'شركة النور', phone: '01112233445', email: 'info@alnour.com', address: 'القاهرة - مدينة نصر', customer_type: 'شركة', request_type: 'صيانة', company_name: 'شركة النور للتجارة', device_brand: 'HP', device_name: 'LaserJet Pro', status: 'جديد', notes: '' },
      { name: 'محمد علي', phone: '01055667788', email: '', address: 'الجيزة - الهرم', customer_type: 'فرد', request_type: 'توريد', company_name: '', device_brand: 'Canon', device_name: 'imageRUNNER', status: 'جديد', notes: 'يريد 3 أجهزة' },
    ],
    inventory_items: [
      { name: 'حبر طابعة HP 85A', sku: 'HP-85A-001', category: 'أحبار', brand: 'HP', unit: 'قطعة', current_stock: 25, min_stock_level: 5, cost_price: 150, sell_price: 250 },
      { name: 'درام وحدة تصوير Canon', sku: 'CN-DRM-001', category: 'قطع غيار', brand: 'Canon', unit: 'قطعة', current_stock: 10, min_stock_level: 3, cost_price: 500, sell_price: 800 },
    ],
    suppliers: [
      { name: 'شركة التوريدات المتحدة', contact_person: 'أ. خالد', phone: '01122334455', email: 'sales@united.com', address: 'القاهرة - وسط البلد', notes: 'مورد أحبار' },
    ],
    purchases: [
      { item_id: 1, supplier_id: 1, quantity: 50, unit_cost: 150, total_cost: 7500, purchase_date: '2026-02-01', invoice_number: 'PUR-001', notes: 'توريد شهري' },
    ],
    expenses: [
      { expense_type: 'إيجار', category: 'مصروفات ثابتة', amount: 15000, description: 'إيجار المقر الشهري', expense_date: '2026-02-01' },
      { expense_type: 'كهرباء', category: 'مصروفات تشغيل', amount: 3000, description: 'فاتورة كهرباء فبراير', expense_date: '2026-02-15' },
    ],
    service_records: [
      { service_type: 'صيانة', customer_name: 'شركة النور', customer_phone: '01112233445', device_type: 'طابعة', device_brand: 'HP', device_model: 'LaserJet Pro M404', amount: 500, payment_method: 'كاش', service_date: '2026-02-10', notes: 'تغيير حبر وتنظيف' },
    ],
    call_records: [
      { customer_name: 'أحمد حسن', customer_phone: '01199887766', customer_address: 'القاهرة - المعادي', customer_type: 'فرد', request_type: 'صيانة', device_brand: 'HP', device_name: 'LaserJet', call_outcome: 'مهتم', call_date: '2026-02-15', notes: 'سيحضر الجهاز غداً' },
    ],
    follow_ups: [
      { customer_id: 1, employee_id: 1, follow_up_type: 'اتصال', status: 'تم', result: 'سيحضر الأسبوع القادم', follow_up_date: '2026-02-16', notes: '' },
    ],
    sales_activities: [
      { customer_id: 1, employee_id: 1, activity_type: 'عرض سعر', service_offered: 'صيانة طابعات', status: 'مفتوح', offered_amount: 5000, activity_date: '2026-02-15', notes: 'عقد صيانة سنوي' },
    ],
    device_receipts: [
      { customer_id: 1, device_brand: 'HP', device_name: 'LaserJet Pro', device_type: 'طابعة', device_model: 'M404dn', serial_number: 'VNB3T12345', condition_notes: 'خدوش بسيطة على الغطاء', fault_description: 'لا تطبع - ورق محشور', status: 'تم الاستلام', receipt_date: '2026-02-16' },
    ],
    incentives: [
      { employee_id: 1, incentive_type: 'حافز عميل', amount: 5, description: 'حافز وصول عميل - أحمد حسن', incentive_date: '2026-02-16', is_paid: false },
    ],
    payroll_records: [
      { employee_id: 1, period_month: 2, period_year: 2026, base_salary: 8000, bonus: 500, deductions: 0, net_paid: 8500, is_paid: false },
    ],
    invoices: [
      { invoice_number: 'INV-2026-001', customer_id: 1, invoice_type: 'صيانة', invoice_date: '2026-02-16', subtotal: 500, discount: 0, tax: 0, total_amount: 500, paid_amount: 500, status: 'مدفوعة' },
    ],
    transactions: [
      { transaction_date: '2026-02-16', type: 'إيراد', category: 'إيراد خدمات', amount: 500, description: 'إيراد صيانة طابعة', reference_type: 'service' },
      { transaction_date: '2026-02-01', type: 'مصروف', category: 'رواتب', amount: 8000, description: 'راتب شهر فبراير', reference_type: 'payroll' },
    ],
  }
  return samples[key] || []
}
