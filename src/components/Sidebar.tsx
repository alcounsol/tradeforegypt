'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Tooltip } from '@nextui-org/react'
import {
  LayoutDashboard, Package, ShoppingCart, Receipt, Wrench,
  Users, Wallet, UserCircle, Truck, FileBarChart, Settings, LogOut
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, color: 'text-blue-400' },
  { href: '/inventory', label: 'المخزون', icon: Package, color: 'text-emerald-400' },
  { href: '/purchases', label: 'المشتريات', icon: ShoppingCart, color: 'text-cyan-400' },
  { href: '/expenses', label: 'المصروفات', icon: Receipt, color: 'text-rose-400' },
  { href: '/services', label: 'الخدمات', icon: Wrench, color: 'text-amber-400' },
  { href: '/employees', label: 'الموظفين', icon: Users, color: 'text-violet-400' },
  { href: '/payroll', label: 'الرواتب', icon: Wallet, color: 'text-pink-400' },
  { href: '/customers', label: 'العملاء', icon: UserCircle, color: 'text-teal-400' },
  { href: '/suppliers', label: 'الموردين', icon: Truck, color: 'text-orange-400' },
  { href: '/reports', label: 'التقارير', icon: FileBarChart, color: 'text-indigo-400' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed right-0 top-0 z-50 flex h-screen w-[260px] flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/30">
          <Package className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-extrabold text-white tracking-wide">TRADE FOR EGYPT</h1>
          <p className="text-[10px] text-slate-400 font-medium">نظام إدارة متكامل</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-3 mb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">القائمة الرئيسية</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Tooltip key={item.href} content={item.label} placement="left" delay={500}>
              <Link
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-white/10 text-white shadow-lg shadow-black/10 backdrop-blur-sm'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-400 shadow-md shadow-blue-500/30'
                    : 'bg-white/5 group-hover:bg-white/10'
                }`}>
                  <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : item.color}`} />
                </div>
                <span>{item.label}</span>
                {isActive && (
                  <div className="mr-auto h-2 w-2 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50" />
                )}
              </Link>
            </Tooltip>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-3 py-3 space-y-1">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition-all hover:bg-white/5 hover:text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
            <Settings className="h-4 w-4 text-slate-400" />
          </div>
          <span>الإعدادات</span>
        </button>
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-400 transition-all hover:bg-rose-500/10">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
            <LogOut className="h-4 w-4 text-rose-400" />
          </div>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  )
}
