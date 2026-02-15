import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  Wrench,
  Users,
  Wallet,
  UserCircle,
  Building,
  FileText,
  Settings,
  LogOut,
  ChevronLeft
} from 'lucide-react'

const menuItems = [
  { href: '/', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { href: '/inventory', icon: Package, label: 'المخزون' },
  { href: '/purchases', icon: ShoppingCart, label: 'المشتريات' },
  { href: '/expenses', icon: Receipt, label: 'المصروفات' },
  { href: '/services', icon: Wrench, label: 'الخدمات' },
  { href: '/employees', icon: Users, label: 'الموظفين' },
  { href: '/payroll', icon: Wallet, label: 'الرواتب' },
  { href: '/customers', icon: UserCircle, label: 'العملاء' },
  { href: '/suppliers', icon: Building, label: 'الموردين' },
  { href: '/reports', icon: FileText, label: 'التقارير' },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside
      className="w-[280px] min-h-screen sticky top-0 flex flex-col z-20 text-slate-400"
      style={{
        background: 'linear-gradient(180deg, #0c1222 0%, #111d35 50%, #0f172a 100%)',
      }}
    >
      {/* Logo Section */}
      <div className="px-7 pt-8 pb-6">
        <div className="flex items-center gap-3.5">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
          >
            <Building className="text-white h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-tight leading-none">
              TRADE FOR EGYPT
            </h1>
            <div className="text-[10px] font-bold text-sky-400/80 tracking-[0.15em] mt-0.5">
              نظام إدارة متكامل
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 h-px bg-gradient-to-l from-transparent via-slate-700/50 to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 px-4 pt-6 pb-4 overflow-y-auto custom-scrollbar">
        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em] mb-3 px-3">
          القائمة الرئيسية
        </div>
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'text-white shadow-lg'
                      : 'hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                  style={
                    isActive
                      ? {
                          background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                          boxShadow: '0 4px 15px rgba(14, 165, 233, 0.35)',
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={`h-[18px] w-[18px] transition-all duration-200 ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-500 group-hover:text-sky-400'
                      }`}
                    />
                    <span
                      className={`font-semibold text-[13px] ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  {isActive && <ChevronLeft className="h-3.5 w-3.5 text-white/70" />}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* System Section */}
        <div className="mt-8 pt-6 border-t border-slate-800/60">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em] mb-3 px-3">
            النظام
          </div>
          <ul className="space-y-1">
            <li>
              <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 transition-all group">
                <Settings className="h-[18px] w-[18px] text-slate-500 group-hover:text-sky-400 group-hover:rotate-90 transition-all duration-500" />
                <span className="font-semibold text-[13px]">الإعدادات</span>
              </button>
            </li>
            <li>
              <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-rose-400/60 hover:bg-rose-500/10 hover:text-rose-400 transition-all group">
                <LogOut className="h-[18px] w-[18px] group-hover:translate-x-[-3px] transition-transform" />
                <span className="font-semibold text-[13px]">تسجيل الخروج</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-800/60">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-slate-700/30">
          <div className="relative">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-inner"
              style={{ background: 'linear-gradient(135deg, #475569, #334155)' }}
            >
              A
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0f172a]" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-white truncate">أدمن</span>
            <span className="text-[10px] font-semibold text-slate-500 truncate">
              المدير العام
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
