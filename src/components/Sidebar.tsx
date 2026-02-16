'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Package, ShoppingCart, Receipt, Wrench,
  Users, Wallet, UserCircle, Truck, FileBarChart, Settings, LogOut
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, color: 'bg-blue-500' },
  { href: '/inventory', label: 'المخزون', icon: Package, color: 'bg-emerald-500' },
  { href: '/purchases', label: 'المشتريات', icon: ShoppingCart, color: 'bg-cyan-500' },
  { href: '/expenses', label: 'المصروفات', icon: Receipt, color: 'bg-rose-500' },
  { href: '/services', label: 'الخدمات', icon: Wrench, color: 'bg-amber-500' },
  { href: '/employees', label: 'الموظفين', icon: Users, color: 'bg-violet-500' },
  { href: '/payroll', label: 'الرواتب', icon: Wallet, color: 'bg-pink-500' },
  { href: '/customers', label: 'العملاء', icon: UserCircle, color: 'bg-teal-500' },
  { href: '/suppliers', label: 'الموردين', icon: Truck, color: 'bg-orange-500' },
  { href: '/reports', label: 'التقارير', icon: FileBarChart, color: 'bg-indigo-500' },
]

export default function Sidebar() {
  const pathname = usePathname()

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
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">القائمة الرئيسية</p>
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isActive ? item.color : 'bg-gray-100'
                }`}>
                  <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                </div>
                <span>{item.label}</span>
                {isActive && (
                  <div className="mr-auto h-2 w-2 rounded-full bg-blue-500" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 px-3 py-3 space-y-1">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <Settings className="h-4 w-4 text-gray-500" />
          </div>
          <span>الإعدادات</span>
        </button>
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-500 transition-all hover:bg-red-50">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50">
            <LogOut className="h-4 w-4 text-red-500" />
          </div>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  )
}
