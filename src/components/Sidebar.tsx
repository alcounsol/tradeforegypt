'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Package, ShoppingCart, Receipt, Wrench,
  Users, Wallet, UserCircle, Truck, FileBarChart, Settings, LogOut
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, gradient: 'from-blue-500 to-blue-600' },
  { href: '/inventory', label: 'المخزون', icon: Package, gradient: 'from-emerald-500 to-emerald-600' },
  { href: '/purchases', label: 'المشتريات', icon: ShoppingCart, gradient: 'from-cyan-500 to-cyan-600' },
  { href: '/expenses', label: 'المصروفات', icon: Receipt, gradient: 'from-rose-500 to-rose-600' },
  { href: '/services', label: 'الخدمات', icon: Wrench, gradient: 'from-amber-500 to-amber-600' },
  { href: '/employees', label: 'الموظفين', icon: Users, gradient: 'from-violet-500 to-violet-600' },
  { href: '/payroll', label: 'الرواتب', icon: Wallet, gradient: 'from-pink-500 to-pink-600' },
  { href: '/customers', label: 'العملاء', icon: UserCircle, gradient: 'from-teal-500 to-teal-600' },
  { href: '/suppliers', label: 'الموردين', icon: Truck, gradient: 'from-orange-500 to-orange-600' },
  { href: '/reports', label: 'التقارير', icon: FileBarChart, gradient: 'from-indigo-500 to-indigo-600' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed right-0 top-0 z-50 flex h-screen w-[250px] flex-col border-l border-slate-200/80 bg-white shadow-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/25">
          <Package className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-extrabold text-slate-800 tracking-wide">TRADE FOR EGYPT</h1>
          <p className="text-[10px] text-slate-400 font-semibold">نظام إدارة متكامل</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-3 mb-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">القائمة الرئيسية</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-l from-blue-50 to-blue-100/80 text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                isActive
                  ? `bg-gradient-to-br ${item.gradient} shadow-md`
                  : 'bg-slate-100 group-hover:bg-slate-200'
              }`}>
                <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-600'}`} />
              </div>
              <span className="truncate">{item.label}</span>
              {isActive && (
                <div className="mr-auto h-1.5 w-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 px-3 py-3 space-y-0.5">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <Settings className="h-4 w-4 text-slate-500" />
          </div>
          <span>الإعدادات</span>
        </button>
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold text-red-500 transition-all hover:bg-red-50">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50">
            <LogOut className="h-4 w-4 text-red-500" />
          </div>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  )
}
