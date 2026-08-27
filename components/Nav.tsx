'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Camera, Package, LayoutDashboard, LogOut } from 'lucide-react'
import clsx from 'clsx'

const links = [
  { href: '/scout', label: 'Scout', icon: Camera },
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
      <header className="hidden sm:flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <span className="font-bold text-white text-lg">Reseller</span>
        <nav className="flex gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <button onClick={signOut} className="text-zinc-500 hover:text-zinc-300 transition-colors" title="Sign out">
          <LogOut size={18} />
        </button>
      </header>

      {/* Bottom tab bar for mobile */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-zinc-900 border-t border-zinc-800 flex">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
              pathname.startsWith(href) ? 'text-white' : 'text-zinc-500'
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
