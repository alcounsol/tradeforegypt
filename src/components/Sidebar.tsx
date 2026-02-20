'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getAvailableSections, getCurrentUserProfile, signOut, UserRole } from '@/lib/auth'
import {
  LayoutDashboard, Package, ShoppingCart, Receipt, Wrench,
  Users, Wallet, UserCircle, Truck, FileBarChart, Settings,
  Phone, PhoneForwarded, TrendingUp, Gift, ClipboardList, ChevronDown, UserCheck,
  FileText, Calculator, Database, Menu, X, Home, LogOut, Shield
} from 'lucide-react'

interface NavSection {
  title: string
  items: Array<{
    href: string
    label: string
    icon: any
    color: string
  }>
}

const allNavSections: NavSection[] = [
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
    title: 'المالية',
    items: [
      { href: '/invoices', label: 'الفواتير', icon: FileText, color: 'bg-indigo-500' },
      { href: '/accounts', label: 'الحسابات المالية', icon: Calculator, color: 'bg-emerald-600' },
    ]
  },
  {
    title: 'أخرى',
    items: [
      { href: '/suppliers', label: 'الموردين', icon: Truck, color: 'bg-orange-500' },
      { href: '/reports', label: 'التقارير', icon: FileBarChart, color: 'bg-indigo-500' },
      { href: '/backup', label: 'النسخ الاحتياطي', icon: Database, color: 'bg-violet-500' },
      { href: '/admin', label: 'إدارة المستخدمين', icon: Shield, color: 'bg-red-500' },
    ]
  },
]

// Quick access items for mobile bottom bar
const mobileQuickItems = [
  { href: '/dashboard', label: 'الرئيسية', icon: Home },
  { href: '/customers', label: 'العملاء', icon: UserCircle },
  { href: '/services', label: 'الخدمات', icon: Wrench },
  { href: '/inventory', label: 'المخزون', icon: Package },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [mobileOpen, setMobileOpen] = useState(false)
  const [navSections, setNavSections] = useState<NavSection[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const profile = await getCurrentUserProfile()
      setUserProfile(profile)

      const availableSections = await getAvailableSections()
      
      // تصفية الأقسام والعناصر بناءً على الأقسام المتاحة
      const filteredSections = allNavSections
        .map(section => ({
          ...section,
          items: section.items.filter(item => 
            availableSections.includes(item.href.substring(1)) // إزالة الـ / من البداية
          )
        }))
        .filter(section => section.items.length > 0)

      setNavSections(filteredSections)
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (title: string) => {
    setCollapsed(prev => ({ ...prev, [title]: !prev[title] }))
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  if (loading) {
    return (
      <aside className="hidden lg:flex h-screen w-[260px] min-w-[260px] flex-col bg-white border-l border-gray-200 shadow-sm items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </aside>
    )
  }

  return (
    <>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden lg:flex h-screen w-[260px] min-w-[260px] flex-col bg-white border-l border-gray-200 shadow-sm">
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

        {/* User Info */}
        {userProfile && (
          <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
            <p className="text-xs font-semibold text-gray-700">{userProfile.full_name || userProfile.email}</p>
            <p className="text-[10px] text-gray-500 mt-1">
              {userProfile.role === 'admin' ? '👑 مسؤول' : `📋 ${userProfile.role}`}
            </p>
          </div>
        )}

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
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-red-500 transition-all hover:bg-red-50 hover:text-red-700"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100">
              <LogOut className="h-3.5 w-3.5 text-red-500" />
            </div>
            <span className="text-xs">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* ===== MOBILE TOP BAR ===== */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[9990] bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-md shadow-blue-500/20">
              <Package className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-xs font-extrabold text-gray-800 tracking-wide">TRADE FOR EGYPT</h1>
              <p className="text-[9px] text-gray-400 font-semibold">نظام إدارة متكامل</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ===== MOBILE DRAWER OVERLAY ===== */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[9995]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute top-0 right-0 bottom-0 w-[280px] bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-md">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-sm font-extrabold text-gray-800">القائمة</h1>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Navigation */}
            <nav className="px-3 py-3">
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

            {/* Drawer Footer */}
            <div className="border-t border-gray-100 px-3 py-3 mt-2">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-500 transition-all hover:bg-red-50 hover:text-red-700"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100">
                  <LogOut className="h-4 w-4 text-red-500" />
                </div>
                <span className="text-xs">تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MOBILE BOTTOM BAR ===== */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[9990] bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around px-2 py-1.5 pb-safe">
          {mobileQuickItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[60px] ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`text-[10px] font-bold ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{item.label}</span>
                {isActive && <div className="h-1 w-5 rounded-full bg-blue-500 mt-0.5" />}
              </Link>
            )
          })}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-gray-400 min-w-[60px]"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-bold">المزيد</span>
          </button>
        </div>
      </div>
    </>
  )
}
