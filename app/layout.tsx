import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import Nav from '@/components/Nav'
import './globals.css'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Reseller',
  description: 'Scout, intake, and track your resale inventory',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Reseller' },
}

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-zinc-950 antialiased">
        <Nav />
        <main className="sm:pt-0">{children}</main>
      </body>
    </html>
  )
}
