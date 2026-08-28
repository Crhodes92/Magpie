'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Camera, Layers, Package, LayoutDashboard, LogOut } from 'lucide-react'
import clsx from 'clsx'

const links = [
  { href: '/scout', label: 'Scout', icon: Camera },
  { href: '/batch', label: 'Batch', icon: Layers },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

export default function Nav() {
  const pathname = usePathname()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <>
      {/* Top bar for desktop */}
      <header className="hidden sm:flex items-center justify-between px-6 py-3 bg-white border-b-2 border-black">
        <span className="font-black text-black text-lg tracking-tight">
          Magpie<span className="text-yellow-400">.</span>
        </span>
        <nav className="flex gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border-2',
                pathname.startsWith(href)
                  ? 'bg-yellow-400 text-black border-black shadow-[2px_2px_0_0_#000]'
                  : 'text-gray-600 hover:text-black border-transparent hover:border-black hover:bg-gray-50'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <button onClick={signOut} className="text-gray-400 hover:text-black transition-colors" title="Sign out">
          <LogOut size={18} />
        </button>
      </header>

      {/* Bottom tab bar for mobile */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t-2 border-black flex">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
              pathname.startsWith(href) ? 'text-yellow-500' : 'text-gray-400'
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  )
}
