import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import Nav from '@/components/Nav'
import './globals.css'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Magpie',
  description: 'Scout, intake, and track your resale inventory',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Magpie' },
  icons: { apple: '/Logo.png' },
}

export const viewport: Viewport = {
  themeColor: '#FFCC00',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-white antialiased">
        <Nav />
        <main className="sm:pt-0">{children}</main>
      </body>
    </html>
  )
}
