'use client'

import { Button } from '@nextui-org/react'
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
    <div className="mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${iconBg} shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">{title}</h1>
            <p className="text-sm text-slate-400 font-medium">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {children}
          {buttonLabel && onButtonClick && (
            <Button
              color="primary"
              variant="shadow"
              size="md"
              startContent={<Plus className="h-4 w-4" />}
              onPress={onButtonClick}
              className="font-bold text-sm"
            >
              {buttonLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
