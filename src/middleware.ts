import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // المسارات التي لا تحتاج مصادقة
  const publicPaths = ['/login', '/signup', '/api/auth']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  // إنشاء عميل Supabase
  const response = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res: response })

  // الحصول على الجلسة
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // إذا كان المستخدم يحاول الوصول إلى مسار محمي بدون تسجيل دخول
  if (!session && !isPublicPath) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  // إذا كان المستخدم مسجل دخول ويحاول الوصول إلى صفحة تسجيل الدخول
  if (session && pathname === '/login') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
