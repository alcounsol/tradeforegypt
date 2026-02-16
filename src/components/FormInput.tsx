'use client'

interface FormInputProps {
  label: string
  value: string | number
  onChange: (value: string) => void
  type?: 'text' | 'number' | 'email' | 'tel' | 'date'
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

export default function FormInput({ label, value, onChange, type = 'text', placeholder, required, disabled }: FormInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-bold text-gray-700">
        {label}
        {required && <span className="text-red-500 mr-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        disabled={disabled}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50 disabled:text-gray-400"
        dir="rtl"
      />
    </div>
  )
}

interface FormTextareaProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

export function FormTextarea({ label, value, onChange, placeholder, rows = 3 }: FormTextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-bold text-gray-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        rows={rows}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
        dir="rtl"
      />
    </div>
  )
}

interface FormSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}

export function FormSelect({ label, value, onChange, options, placeholder }: FormSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-bold text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
        dir="rtl"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
