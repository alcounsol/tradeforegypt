'use client'

import { ReactNode } from 'react'
import { Card, CardBody, Spinner } from '@nextui-org/react'
import { Download } from 'lucide-react'

// Column definition
export interface TableColumn<T> {
  key: string
  label: string
  align?: 'right' | 'center' | 'left'
  width?: string
  sortable?: boolean
  render?: (item: T, index: number) => ReactNode
}

// Table props
interface DataTableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyIcon?: ReactNode
  emptyText?: string
  emptySubText?: string
  keyField?: string
  onRowClick?: (item: T) => void
  rowClassName?: (item: T) => string
  showIndex?: boolean
  footer?: ReactNode
  onExport?: () => void
  exportLabel?: string
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyIcon,
  emptyText = 'لا توجد بيانات',
  emptySubText,
  keyField = 'id',
  onRowClick,
  rowClassName,
  showIndex = false,
  footer,
  onExport,
  exportLabel = 'تصدير CSV',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <Card className="shadow-md border border-slate-100">
        <CardBody className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </CardBody>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="shadow-md border border-slate-100">
        <CardBody className="flex flex-col items-center justify-center py-16 text-slate-400">
          {emptyIcon}
          <p className="font-bold text-lg mt-4">{emptyText}</p>
          {emptySubText && <p className="text-sm mt-1">{emptySubText}</p>}
        </CardBody>
      </Card>
    )
  }

  const allColumns = showIndex
    ? [{ key: '__index__', label: '#', align: 'right' as const, width: '50px' }, ...columns]
    : columns

  return (
    <Card className="shadow-md border border-slate-100">
      {onExport && (
        <div className="flex items-center justify-end px-4 pt-3 pb-1">
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            {exportLabel}
          </button>
        </div>
      )}
      <CardBody className="p-0 overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
          <thead>
            <tr className="bg-gradient-to-l from-slate-50 to-slate-100 border-b-2 border-slate-200">
              {allColumns.map((col) => (
                <th
                  key={col.key}
                  className={`p-3 font-extrabold text-slate-600 text-xs whitespace-nowrap ${
                    col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr
                key={item[keyField] ?? idx}
                className={`border-b border-slate-100 transition-all hover:bg-blue-50/30 ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${rowClassName ? rowClassName(item) : ''}`}
                onClick={() => onRowClick?.(item)}
              >
                {allColumns.map((col) => {
                  if (col.key === '__index__') {
                    return (
                      <td key="__index__" className="p-3 text-xs font-bold text-slate-400 text-right">
                        {idx + 1}
                      </td>
                    )
                  }
                  const originalCol = columns.find(c => c.key === col.key)!
                  return (
                    <td
                      key={col.key}
                      className={`p-3 ${
                        col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'
                      }`}
                    >
                      {originalCol.render
                        ? originalCol.render(item, idx)
                        : (item[col.key] ?? '-')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          {footer && (
            <tfoot>
              {footer}
            </tfoot>
          )}
        </table>
      </CardBody>
    </Card>
  )
}

// Status badge component for consistent status display
export function StatusBadge({ label, color, dotColor }: { label: string; color: string; dotColor?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${color}`}>
      {dotColor && <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />}
      {label}
    </span>
  )
}

// Category badge component
export function CategoryBadge({ label, bgColor = 'bg-blue-50', textColor = 'text-blue-600', borderColor = 'border-blue-100' }: {
  label: string; bgColor?: string; textColor?: string; borderColor?: string
}) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md ${bgColor} ${textColor} text-xs font-bold border ${borderColor}`}>
      {label}
    </span>
  )
}

// Amount display component
export function AmountDisplay({ amount, color = 'text-emerald-600', prefix }: { amount: string; color?: string; prefix?: string }) {
  return (
    <span className={`font-extrabold ${color} text-sm`}>
      {prefix}{amount}
    </span>
  )
}
