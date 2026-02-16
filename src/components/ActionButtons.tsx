'use client'

import { LucideIcon } from 'lucide-react'

interface ActionButtonProps {
  label: string
  onClick: () => void
  icon?: LucideIcon
  variant?: 'primary' | 'success' | 'danger' | 'secondary' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

const variantStyles = {
  primary: 'bg-gradient-to-l from-blue-600 to-blue-500 hover:shadow-blue-500/30 text-white',
  success: 'bg-gradient-to-l from-emerald-600 to-emerald-500 hover:shadow-emerald-500/30 text-white',
  danger: 'bg-gradient-to-l from-rose-600 to-rose-500 hover:shadow-rose-500/30 text-white',
  secondary: 'bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-gray-200/50 text-gray-700',
  warning: 'bg-gradient-to-l from-amber-500 to-yellow-500 hover:shadow-amber-500/30 text-white',
}

const sizeStyles = {
  sm: 'h-9 px-4 text-xs gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-2xl',
  lg: 'h-12 px-7 text-base gap-2.5 rounded-2xl',
}

export function ActionButton({ label, onClick, icon: Icon, variant = 'primary', size = 'md', disabled = false }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex items-center font-bold overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {/* Shine effect for gradient buttons */}
      {variant !== 'secondary' && (
        <span className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/20 to-white/0 translate-x-full group-hover:-translate-x-full transition-transform duration-700" />
      )}
      {Icon && (
        <span className={`relative flex items-center justify-center ${size === 'sm' ? 'h-5 w-5 rounded-md' : 'h-6 w-6 rounded-lg'} ${variant === 'secondary' ? 'bg-gray-100' : 'bg-white/20'}`}>
          <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        </span>
      )}
      <span className="relative">{label}</span>
    </button>
  )
}

// Modal footer buttons
interface ModalButtonProps {
  label: string
  onClick: () => void
  variant?: 'submit' | 'cancel'
  color?: string
  disabled?: boolean
}

export function ModalSubmitButton({ label, onClick, color = 'from-blue-600 to-blue-500', disabled = false }: ModalButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex items-center justify-center gap-2 h-11 px-7 rounded-2xl bg-gradient-to-l ${color} text-white text-sm font-bold overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
    >
      <span className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/20 to-white/0 translate-x-full group-hover:-translate-x-full transition-transform duration-700" />
      <span className="relative">{label}</span>
    </button>
  )
}

export function ModalCancelButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center h-11 px-7 rounded-2xl text-sm font-bold text-gray-600 bg-gray-100 border border-gray-200 transition-all duration-200 hover:bg-gray-200 hover:border-gray-300 hover:text-gray-700 active:bg-gray-250"
    >
      {label}
    </button>
  )
}

// Export CSV button
export function ExportButton({ label, onClick, icon: Icon }: { label: string; onClick: () => void; icon: LucideIcon }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex items-center gap-2 h-11 px-6 rounded-2xl bg-gradient-to-l from-emerald-600 to-green-500 text-white text-sm font-bold overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md whitespace-nowrap"
    >
      <span className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/20 to-white/0 translate-x-full group-hover:-translate-x-full transition-transform duration-700" />
      <span className="relative flex items-center justify-center h-6 w-6 rounded-lg bg-white/20">
        <Icon className="h-4 w-4" />
      </span>
      <span className="relative">{label}</span>
    </button>
  )
}

// Styled select/dropdown
export function StyledSelect({ value, onChange, options, minWidth = '100px' }: {
  value: string | number
  onChange: (value: string) => void
  options: { value: string | number; label: string }[]
  minWidth?: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 px-4 pe-10 rounded-2xl border-2 border-gray-200 bg-white text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer appearance-none transition-all duration-200 hover:border-gray-300 hover:shadow-sm"
        style={{ minWidth }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {/* Custom dropdown arrow */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}

// Search input
export function SearchInput({ value, onChange, placeholder = 'بحث...' }: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative group">
      <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-60 pr-10 pl-4 rounded-2xl border-2 border-gray-200 bg-white text-sm font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 hover:border-gray-300 hover:shadow-sm"
      />
    </div>
  )
}
