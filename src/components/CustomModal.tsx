'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface CustomModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function CustomModal({ isOpen, onClose, title, children, footer, size = 'lg' }: CustomModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center sm:p-4"
      style={{ top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" style={{ top: 0, left: 0, right: 0, bottom: 0 }} />
      
      {/* Dialog - slides up on mobile, centered on desktop */}
      <div className={`relative w-full ${sizeClasses[size]} bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl animate-in fade-in sm:zoom-in-95 slide-in-from-bottom duration-200 max-h-[90vh] sm:max-h-[85vh] flex flex-col`} dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 shrink-0">
          <h2 className="text-base sm:text-lg font-extrabold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-400 transition-all duration-200 hover:bg-red-50 hover:text-red-500 hover:rotate-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50/50 sm:rounded-b-3xl shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
