'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Download, TrendingUp, DollarSign, Clock, Target } from 'lucide-react'
import type { DashboardStats } from '@/types'

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: 'green' | 'red' | 'yellow' }) {
  const valueColor = accent === 'green' ? 'text-green-400' : accent === 'red' ? 'text-red-400' : accent === 'yellow' ? 'text-yellow-400' : 'text-white'
  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!stats) return null

  const hitRatePct = Math.round(stats.scout_hit_rate * 100)

  return (
    <div className="min-h-screen bg-zinc-950 pb-20 sm:pb-0">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <a
            href="/api/export"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm px-3 py-2 bg-zinc-800 rounded-lg transition-colors"
          >
            <Download size={14} />
            Export CSV
          </a>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard
            label="Capital tied up"
            value={`$${stats.capital_tied_up.toFixed(2)}`}
            sub="acquired + listed"
          />
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
        <div className="bg-zinc-900 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-zinc-400" />
            <p className="text-sm font-medium text-zinc-300">Aging inventory</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-zinc-500 mb-1">&gt;60 days held</p>
              <p className={`text-xl font-bold ${stats.aging_60 > 0 ? 'text-yellow-400' : 'text-zinc-600'}`}>
                {stats.aging_60} {stats.aging_60 === 1 ? 'item' : 'items'}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">&gt;90 days held</p>
              <p className={`text-xl font-bold ${stats.aging_90 > 0 ? 'text-red-400' : 'text-zinc-600'}`}>
                {stats.aging_90} {stats.aging_90 === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          {stats.aging_60 > 0 && (
            <Link
              href="/inventory?status=acquired"
              className="block mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              View acquired inventory →
            </Link>
          )}
        </div>

        {/* Margin by category */}
        {stats.margin_by_category.length > 0 && (
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-zinc-400" />
              <p className="text-sm font-medium text-zinc-300">Margin by category</p>
              <span className="text-xs text-zinc-600 ml-auto">sold items only</span>
            </div>
            <div className="space-y-2.5">
              {stats.margin_by_category.map(cat => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-300">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">{cat.count} sold</span>
                      <span className={`text-sm font-semibold ${cat.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {cat.margin >= 0 ? '+' : ''}{cat.margin}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${cat.margin >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, Math.abs(cat.margin))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.margin_by_category.length === 0 && (
          <div className="bg-zinc-900 rounded-xl p-8 text-center text-zinc-500">
            <Target size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No sold items yet — margin by category will appear here</p>
          </div>
        )}
      </div>
    </div>
  )
}
