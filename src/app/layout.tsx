import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'Trade For Egypt - نظام الإدارة',
  description: 'نظام إدارة متكامل لشركة تريد فور إيجيبت',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-tajawal antialiased">
        <Providers>
          <div className="flex h-screen overflow-hidden" dir="rtl">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-gradient-to-bl from-slate-50 via-blue-50/30 to-slate-100 p-6 lg:p-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
