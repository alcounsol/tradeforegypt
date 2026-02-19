'use client'

import { Plus, LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle: string
  icon: LucideIcon
  iconBg?: string
  buttonLabel?: string
  onButtonClick?: () => void
  buttonColor?: string
  children?: React.ReactNode
}

export default function PageHeader({ title, subtitle, icon: Icon, iconBg = 'from-blue-500 to-blue-600', buttonLabel, onButtonClick, buttonColor, children }: PageHeaderProps) {
  const btnGradient = buttonColor || iconBg

  return (
    <div className="mb-4 sm:mb-6 lg:mb-8 w-full">
      {/* Row: Title on right, Actions on left (RTL) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full">
        {/* Title Section */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br ${iconBg} shadow-lg shadow-blue-500/20 shrink-0`}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-slate-800">{title}</h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">{subtitle}</p>
          </div>
        </div>

        {/* Spacer - hidden on mobile */}
        <div className="hidden sm:block flex-1" />

        {/* Actions Section */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap w-full sm:w-auto">
          {children}
          {buttonLabel && onButtonClick && (
            <button
              onClick={onButtonClick}
              className={`group relative flex items-center gap-2 h-9 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-gradient-to-l ${btnGradient} text-white text-xs sm:text-sm font-bold overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md whitespace-nowrap`}
            >
              <span className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/20 to-white/0 translate-x-full group-hover:-translate-x-full transition-transform duration-700" />
              <span className="relative flex items-center justify-center h-5 w-5 sm:h-6 sm:w-6 rounded-lg bg-white/20 backdrop-blur-sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              </span>
              <span className="relative">{buttonLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
