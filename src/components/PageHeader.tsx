'use client'

import { Button } from '@nextui-org/react'
import { Plus, LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle: string
  icon: LucideIcon
  iconColor?: string
  buttonLabel?: string
  onButtonClick?: () => void
  children?: React.ReactNode
}

export default function PageHeader({ title, subtitle, icon: Icon, iconColor = 'text-blue-500', buttonLabel, onButtonClick, children }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${iconColor === 'text-blue-500' ? 'from-blue-500/20 to-cyan-500/20' : iconColor === 'text-emerald-500' ? 'from-emerald-500/20 to-green-500/20' : iconColor === 'text-rose-500' ? 'from-rose-500/20 to-pink-500/20' : iconColor === 'text-amber-500' ? 'from-amber-500/20 to-yellow-500/20' : iconColor === 'text-violet-500' ? 'from-violet-500/20 to-purple-500/20' : iconColor === 'text-cyan-500' ? 'from-cyan-500/20 to-blue-500/20' : iconColor === 'text-pink-500' ? 'from-pink-500/20 to-rose-500/20' : iconColor === 'text-teal-500' ? 'from-teal-500/20 to-emerald-500/20' : iconColor === 'text-orange-500' ? 'from-orange-500/20 to-amber-500/20' : iconColor === 'text-indigo-500' ? 'from-indigo-500/20 to-blue-500/20' : 'from-blue-500/20 to-cyan-500/20'}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500 font-medium">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {children}
          {buttonLabel && onButtonClick && (
            <Button color="primary" variant="shadow" startContent={<Plus className="h-4 w-4" />} onPress={onButtonClick} className="font-bold">
              {buttonLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
