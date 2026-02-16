'use client'

import { Plus, LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle: string
  icon: LucideIcon
  iconBg?: string
  buttonLabel?: string
  onButtonClick?: () => void
  children?: React.ReactNode
}

export default function PageHeader({ title, subtitle, icon: Icon, iconBg = 'from-blue-500 to-blue-600', buttonLabel, onButtonClick, children }: PageHeaderProps) {
  return (
    <div className="mb-6 w-full">
      {/* Row: Title on right, Actions on left (RTL) */}
      <div className="flex items-center gap-4 w-full">
        {/* Title Section - right side in RTL */}
        <div className="flex items-center gap-3 shrink-0">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${iconBg} shadow-lg shrink-0`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 whitespace-nowrap">{title}</h1>
            <p className="text-xs text-slate-400 font-medium whitespace-nowrap">{subtitle}</p>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions Section - left side in RTL */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {children}
          {buttonLabel && onButtonClick && (
            <button
              onClick={onButtonClick}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              {buttonLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
