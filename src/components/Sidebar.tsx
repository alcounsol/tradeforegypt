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
    <aside className="w-72 bg-slate-900 text-slate-300 min-h-screen sticky top-0 flex flex-col border-l border-slate-800 shadow-2xl">
      <div className="p-8 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Building className="text-white h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Trade For Egypt</h1>
        </div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">نظام الإدارة المتكامل</p>
      </div>
      
      <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-400'}`} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  {isActive && <ChevronLeft className="h-4 w-4" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-6 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-white font-bold">
            A
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">المدير العام</span>
            <span className="text-xs text-slate-500">متصل الآن</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
