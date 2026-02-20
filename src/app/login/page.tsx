'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth'
import { Input, Button, Card, CardBody, CardHeader, Spinner } from '@nextui-org/react'
import { Mail, Lock, AlertCircle, Package } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email || !password) {
        setError('يرجى إدخال البريد الإلكتروني وكلمة المرور')
        setLoading(false)
        return
      }

      await signIn(email, password)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول. يرجى التحقق من بيانات الدخول.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-cyan-50 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/25">
              <Package className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-800 tracking-wide">TRADE FOR EGYPT</h1>
              <p className="text-xs text-gray-500 font-semibold">نظام إدارة متكامل</p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl">
          <CardHeader className="flex flex-col gap-3 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800">تسجيل الدخول</h2>
            <p className="text-sm text-gray-600">أدخل بيانات الدخول الخاصة بك</p>
          </CardHeader>

          <CardBody className="gap-6 p-8">
            {/* Error Message */}
            {error && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">البريد الإلكتروني</label>
                <Input
                  type="email"
                  placeholder="example@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  startContent={<Mail className="h-4 w-4 text-gray-400" />}
                  classNames={{
                    input: 'text-right',
                    inputWrapper: 'border-gray-200',
                  }}
                />
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">كلمة المرور</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  startContent={<Lock className="h-4 w-4 text-gray-400" />}
                  classNames={{
                    input: 'text-right',
                    inputWrapper: 'border-gray-200',
                  }}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-base h-12 rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" color="current" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  'تسجيل الدخول'
                )}
              </Button>
            </form>

            {/* Footer Info */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                نظام محمي. يتم تسجيل جميع محاولات الدخول.
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Demo Credentials (for development only) */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-semibold text-blue-900 mb-2">📝 بيانات تجريبية (للتطوير فقط):</p>
          <div className="text-xs text-blue-800 space-y-1">
            <p><strong>البريد:</strong> admin@tradeforegypt.com</p>
            <p><strong>كلمة المرور:</strong> Admin@123</p>
          </div>
        </div>
      </div>
    </div>
  )
}
