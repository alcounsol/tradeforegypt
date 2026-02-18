'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import {
  LayoutDashboard, Package, ShoppingCart, Receipt, Wrench,
  Users, Wallet, UserCircle, Truck, FileBarChart, Settings, LogOut,
  Phone, PhoneForwarded, TrendingUp, Gift, ClipboardList, ChevronDown, ChevronLeft, UserCheck
} from 'lucide-react'

const navSections = [
  {
    title: 'الرئيسية',
    items: [
      { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, color: 'bg-blue-500' },
    ]
  },
  {
    title: 'إدارة العملاء',
    items: [
      { href: '/call-center', label: 'الكول سنتر', icon: Phone, color: 'bg-green-500' },
      { href: '/follow-up', label: 'المتابعة', icon: PhoneForwarded, color: 'bg-sky-500' },
      { href: '/sales', label: 'المبيعات', icon: TrendingUp, color: 'bg-purple-500' },
      { href: '/customers', label: 'العملاء', icon: UserCircle, color: 'bg-teal-500' },
      { href: '/reception', label: 'الاستقبال', icon: UserCheck, color: 'bg-pink-500' },
      { href: '/device-receipts', label: 'استلام الأجهزة', icon: ClipboardList, color: 'bg-lime-600' },
    ]
  },
  {
    title: 'العمليات',
    items: [
      { href: '/services', label: 'الخدمات والصيانة', icon: Wrench, color: 'bg-amber-500' },
      { href: '/inventory', label: 'المخزون', icon: Package, color: 'bg-emerald-500' },
      { href: '/purchases', label: 'المشتريات', icon: ShoppingCart, color: 'bg-cyan-500' },
      { href: '/expenses', label: 'المصروفات', icon: Receipt, color: 'bg-rose-500' },
    ]
  },
  {
    title: 'الموارد البشرية',
    items: [
      { href: '/employees', label: 'الموظفين', icon: Users, color: 'bg-violet-500' },
      { href: '/payroll', label: 'الرواتب', icon: Wallet, color: 'bg-pink-500' },
      { href: '/incentives', label: 'الحوافز', icon: Gift, color: 'bg-yellow-500' },
    ]
  },
  {
    title: 'أخرى',
    items: [
      { href: '/suppliers', label: 'الموردين', icon: Truck, color: 'bg-orange-500' },
      { href: '/reports', label: 'التقارير', icon: FileBarChart, color: 'bg-indigo-500' },
    ]
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleSection = (title: string) => {
    setCollapsed(prev => ({ ...prev, [title]: !prev[title] }))
  }

  return (
    <aside className="flex h-screen w-[260px] min-w-[260px] flex-col bg-white border-l border-gray-200 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/25">
          <Package className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-extrabold text-gray-800 tracking-wide">TRADE FOR EGYPT</h1>
          <p className="text-[10px] text-gray-400 font-semibold">نظام إدارة متكامل</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navSections.map((section) => (
          <div key={section.title} className="mb-2">
            <button
              onClick={() => toggleSection(section.title)}
              className="flex items-center justify-between w-full px-3 mb-1 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
            >
              <span>{section.title}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${collapsed[section.title] ? '-rotate-90' : ''}`} />
            </button>
            {!collapsed[section.title] && (
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                    >
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        isActive ? item.color : 'bg-gray-100'
                      }`}>
                        <item.icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <span className="text-xs">{item.label}</span>
                      {isActive && (
                        <div className="mr-auto h-1.5 w-1.5 rounded-full bg-blue-500" />
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 px-3 py-3 space-y-1">
        <Link href="/settings" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <Settings className="h-3.5 w-3.5 text-gray-500" />
          </div>
          <span className="text-xs">الإعدادات</span>
        </Link>
      </div>
    </aside>
  )
}
