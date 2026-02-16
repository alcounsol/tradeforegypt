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
        className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl bg-gray-50/50 text-gray-800 font-medium
          focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20
          disabled:bg-gray-100 disabled:text-gray-400
          transition-all duration-200 placeholder:text-gray-400"
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
  required?: boolean
}

export function FormSelect({ label, value, onChange, options, placeholder, required }: FormSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-bold text-gray-700">
        {label}
        {required && <span className="text-red-500 mr-1">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl bg-gray-50/50 text-gray-800 font-medium
          focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20
          transition-all duration-200 appearance-none cursor-pointer"
        dir="rtl"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
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
        className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl bg-gray-50/50 text-gray-800 font-medium
          focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20
          transition-all duration-200 placeholder:text-gray-400 resize-none"
        dir="rtl"
      />
    </div>
  )
}

interface FormCheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function FormCheckbox({ label, checked, onChange }: FormCheckboxProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-1">
      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ${
        checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
      }`}>
        {checked && (
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <span className="text-sm font-bold text-gray-700">{label}</span>
    </label>
  )
}
