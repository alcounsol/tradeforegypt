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
  FileText
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
    <aside className="w-64 bg-white shadow-lg min-h-screen">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-sky-600">Trade For Egypt</h1>
        <p className="text-sm text-gray-500">نظام الحسابات اليومية</p>
      </div>
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-sky-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
