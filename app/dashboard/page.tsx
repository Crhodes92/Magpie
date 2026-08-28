'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Download, TrendingUp, Clock, Target } from 'lucide-react'
import type { DashboardStats } from '@/types'

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: 'green' | 'red' | 'yellow' }) {
  const valueColor = accent === 'green' ? 'text-green-600' : accent === 'red' ? 'text-red-600' : accent === 'yellow' ? 'text-yellow-600' : 'text-black'
  return (
    <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0_0_#000]">
      <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-black ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!stats) return null

  const hitRatePct = Math.round(stats.scout_hit_rate * 100)

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-0">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-black">Dashboard</h1>
          <a
            href="/api/export"
            className="flex items-center gap-1.5 text-gray-500 hover:text-black text-sm px-3 py-2 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <Download size={14} />
            Export CSV
          </a>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard label="Capital tied up" value={`$${stats.capital_tied_up.toFixed(2)}`} sub="acquired + listed" />
          <StatCard
            label="Profit this month"
            value={`${stats.realized_profit_month >= 0 ? '+' : ''}$${stats.realized_profit_month.toFixed(2)}`}
            accent={stats.realized_profit_month >= 0 ? 'green' : 'red'}
          />
          <StatCard
            label="All-time profit"
            value={`${stats.realized_profit_all_time >= 0 ? '+' : ''}$${stats.realized_profit_all_time.toFixed(2)}`}
            accent={stats.realized_profit_all_time >= 0 ? 'green' : 'red'}
          />
          <StatCard
            label="Scout hit rate"
            value={`${hitRatePct}%`}
            sub="scouted → acquired"
            accent={hitRatePct >= 50 ? 'green' : hitRatePct >= 25 ? 'yellow' : 'red'}
          />
        </div>

        {/* Aging */}
        <div className="bg-white border-2 border-black rounded-xl p-4 mb-4 shadow-[4px_4px_0_0_#000]">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-gray-500" />
            <p className="text-sm font-bold text-black">Aging inventory</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1 font-medium">&gt;60 days held</p>
              <p className={`text-xl font-black ${stats.aging_60 > 0 ? 'text-yellow-600' : 'text-gray-300'}`}>
                {stats.aging_60} {stats.aging_60 === 1 ? 'item' : 'items'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1 font-medium">&gt;90 days held</p>
              <p className={`text-xl font-black ${stats.aging_90 > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                {stats.aging_90} {stats.aging_90 === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          {stats.aging_60 > 0 && (
            <Link href="/inventory?status=acquired" className="block mt-3 text-sm text-yellow-600 hover:text-black font-bold transition-colors">
              View acquired inventory →
            </Link>
          )}
        </div>

        {/* Margin by category */}
        {stats.margin_by_category.length > 0 && (
          <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0_0_#000]">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-gray-500" />
              <p className="text-sm font-bold text-black">Margin by category</p>
              <span className="text-xs text-gray-400 ml-auto">sold items only</span>
            </div>
            <div className="space-y-2.5">
              {stats.margin_by_category.map(cat => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-black font-medium">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{cat.count} sold</span>
                      <span className={`text-sm font-black ${cat.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {cat.margin >= 0 ? '+' : ''}{cat.margin}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 border border-black">
                    <div
                      className={`h-2 rounded-full transition-all ${cat.margin >= 0 ? 'bg-green-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(100, Math.abs(cat.margin))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.margin_by_category.length === 0 && (
          <div className="bg-white border-2 border-black rounded-xl p-8 text-center shadow-[4px_4px_0_0_#000]">
            <Target size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-400 font-medium">No sold items yet — margin by category will appear here</p>
          </div>
        )}
      </div>
    </div>
  )
}
