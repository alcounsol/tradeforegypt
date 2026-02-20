import { supabase } from './supabase'
import { Session, User } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'call_center' | 'follow_up' | 'sales' | 'maintenance' | 'reception' | 'hr' | 'finance'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

// الحصول على الجلسة الحالية
export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// الحصول على المستخدم الحالي
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// الحصول على ملف تعريف المستخدم الحالي
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data as UserProfile
}

// التحقق من دور المستخدم
export async function getUserRole(): Promise<UserRole | null> {
  const profile = await getCurrentUserProfile()
  return profile?.role || null
}

// التحقق من صلاحية المستخدم للوصول إلى قسم معين
export async function hasAccessToSection(requiredRole: UserRole | UserRole[]): Promise<boolean> {
  const role = await getUserRole()
  if (!role) return false

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  return roles.includes(role) || role === 'admin'
}

// تسجيل الدخول
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

// تسجيل مستخدم جديد
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

// تسجيل الخروج
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error(error.message)
  }
}

// تحديث ملف التعريف
export async function updateUserProfile(updates: Partial<UserProfile>) {
  const user = await getCurrentUser()
  if (!user) throw new Error('No user logged in')

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as UserProfile
}

// الحصول على قائمة المستخدمين (للمسؤول فقط)
export async function getAllUsers(): Promise<UserProfile[]> {
  const role = await getUserRole()
  if (role !== 'admin') {
    throw new Error('Only admins can view all users')
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data as UserProfile[]
}

// تحديث دور المستخدم (للمسؤول فقط)
export async function updateUserRole(userId: string, newRole: UserRole) {
  const role = await getUserRole()
  if (role !== 'admin') {
    throw new Error('Only admins can update user roles')
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as UserProfile
}

// تعطيل/تفعيل مستخدم (للمسؤول فقط)
export async function toggleUserActive(userId: string, isActive: boolean) {
  const role = await getUserRole()
  if (role !== 'admin') {
    throw new Error('Only admins can toggle user status')
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as UserProfile
}

// حذف مستخدم (للمسؤول فقط)
export async function deleteUser(userId: string) {
  const role = await getUserRole()
  if (role !== 'admin') {
    throw new Error('Only admins can delete users')
  }

  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) {
    throw new Error(error.message)
  }
}

// الحصول على الأقسام المتاحة للمستخدم
export async function getAvailableSections(): Promise<string[]> {
  const role = await getUserRole()
  if (!role) return []

  const sectionMap: Record<UserRole, string[]> = {
    admin: [
      'dashboard',
      'call-center',
      'follow-up',
      'sales',
      'customers',
      'reception',
      'device-receipts',
      'services',
      'inventory',
      'purchases',
      'expenses',
      'employees',
      'payroll',
      'incentives',
      'invoices',
      'accounts',
      'suppliers',
      'reports',
      'backup',
    ],
    call_center: [
      'dashboard',
      'call-center',
      'customers',
      'reception',
    ],
    follow_up: [
      'dashboard',
      'follow-up',
      'customers',
      'device-receipts',
    ],
    sales: [
      'dashboard',
      'sales',
      'customers',
      'invoices',
    ],
    maintenance: [
      'dashboard',
      'services',
      'inventory',
      'device-receipts',
    ],
    reception: [
      'dashboard',
      'reception',
      'device-receipts',
      'customers',
    ],
    hr: [
      'dashboard',
      'employees',
      'payroll',
      'incentives',
    ],
    finance: [
      'dashboard',
      'invoices',
      'accounts',
      'expenses',
      'reports',
    ],
  }

  return sectionMap[role] || []
}
