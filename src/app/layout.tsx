import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: 'Trade For Egypt - نظام الإدارة',
  description: 'نظام إدارة متكامل لشركة تريد فور إيجيبت',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-cairo antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
