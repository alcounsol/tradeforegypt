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
  ChevronLeft,
  Settings,
  LogOut
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
    <aside className="w-80 bg-[#0f172a] text-slate-400 min-h-screen sticky top-0 flex flex-col z-20 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.3)]">
      {/* Logo Section */}
      <div className="p-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 bg-gradient-to-tr from-sky-400 to-sky-600 rounded-2xl flex items-center justify-center shadow-xl shadow-sky-500/20 rotate-3">
            <Building className="text-white h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter">TRADE FOR</h1>
            <div className="text-sky-500 font-black text-xs tracking-[0.3em] -mt-1">EGYPT</div>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-6 overflow-y-auto custom-scrollbar pb-10">
        <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-6 px-4">القائمة الرئيسية</div>
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 group ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-2xl shadow-sky-500/40 translate-x-[-4px]'
                      : 'hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <item.icon className={`h-5 w-5 transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-slate-500 group-hover:text-sky-400 group-hover:rotate-12'}`} />
                    <span className={`font-bold text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}>{item.label}</span>
                  </div>
                  {isActive && <ChevronLeft className="h-4 w-4 animate-pulse" />}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-10 pt-10 border-t border-slate-800/50">
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-6 px-4">النظام</div>
          <ul className="space-y-2">
            <li>
              <button className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all group">
                <Settings className="h-5 w-5 group-hover:rotate-90 transition-transform duration-500" />
                <span className="font-bold text-sm">الإعدادات</span>
              </button>
            </li>
            <li>
              <button className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-400 transition-all group">
                <LogOut className="h-5 w-5 group-hover:translate-x-[-4px] transition-transform" />
                <span className="font-bold text-sm">تسجيل الخروج</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="p-8 bg-slate-900/50 border-t border-slate-800/50">
        <div className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-[1.5rem] border border-slate-700/30">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-black text-lg shadow-inner">
              A
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-[#0f172a]"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-white">أحمد محمد</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">المدير العام</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
