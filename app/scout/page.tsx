'use client'

import Link from 'next/link'
import { Camera, Barcode, ChevronRight } from 'lucide-react'

const tools = [
  {
    href: '/scout/camera',
    icon: Camera,
    label: 'Scout',
    description: 'Snap photos as fast as you find items — each one auto-queues for AI identification. Decide what to buy at checkout.',
    available: true,
    accent: 'bg-yellow-400',
  },
  {
    href: '/scout/barcode',
    icon: Barcode,
    label: 'Barcode Scan',
    description: 'Scan a UPC barcode for instant product lookup and market pricing.',
    available: false,
    accent: 'bg-gray-100',
  },
]

export default function ScoutHubPage() {
  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-0">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-black text-black mb-1">Scout</h1>
        <p className="text-gray-500 text-sm mb-6">Choose your scanning tool</p>

        <div className="space-y-3">
          {tools.map(({ href, icon: Icon, label, description, available, accent }) => (
            available ? (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-4 bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all group"
              >
                <div className={`${accent} border-2 border-black rounded-xl w-14 h-14 flex items-center justify-center shrink-0`}>
                  <Icon size={26} className="text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-black font-black text-base">{label}</p>
                  <p className="text-gray-500 text-sm mt-0.5 leading-snug">{description}</p>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-black transition-colors shrink-0" />
              </Link>
            ) : (
              <div
                key={href}
                className="flex items-center gap-4 bg-white border-2 border-gray-200 rounded-2xl p-4"
              >
                <div className={`${accent} border-2 border-gray-200 rounded-xl w-14 h-14 flex items-center justify-center shrink-0`}>
                  <Icon size={26} className="text-gray-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-gray-400 font-black text-base">{label}</p>
                    <span className="text-xs font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full border border-gray-200">
                      Coming soon
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-0.5 leading-snug">{description}</p>
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  )
}
