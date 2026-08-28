'use client'

import Link from 'next/link'
import { ArrowLeft, Barcode } from 'lucide-react'

export default function BarcodePage() {
  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-0">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/scout" className="text-gray-400 hover:text-black transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-black leading-none">Barcode Scan</h1>
            <p className="text-gray-500 text-sm mt-0.5">UPC → instant product lookup</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-200 rounded-2xl py-20 px-8 text-center">
          <div className="bg-gray-100 border-2 border-gray-200 rounded-2xl w-20 h-20 flex items-center justify-center mb-4">
            <Barcode size={36} className="text-gray-300" />
          </div>
          <p className="text-black font-black text-lg mb-1">Coming soon</p>
          <p className="text-gray-400 text-sm leading-relaxed">
            Scan any UPC barcode to instantly pull product info and recent sold prices — no photo needed.
          </p>
        </div>
      </div>
    </div>
  )
}
