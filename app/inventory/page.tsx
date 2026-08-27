'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, Filter, Download, Plus, Package } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import type { Item, ItemStatus, ItemLane } from '@/types'

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'scouted', label: 'Scouted' },
  { value: 'acquired', label: 'Acquired' },
  { value: 'listed', label: 'Listed' },
  { value: 'sold', label: 'Sold' },
  { value: 'passed', label: 'Passed' },
  { value: 'scrapped', label: 'Scrapped' },
]

function dealBorder(item: Item): string {
  if (item.acquired_price == null || item.est_value_low == null) return 'border-zinc-700'
  const ratio = item.acquired_price / item.est_value_low
  if (ratio <= 0.5) return 'border-green-500'
  if (ratio <= 0.75) return 'border-yellow-500'
  return 'border-red-500'
}

function dealLabel(item: Item): string | null {
  if (item.acquired_price == null || item.est_value_low == null) return null
  const ratio = item.acquired_price / item.est_value_low
  if (ratio <= 0.5) return 'Great deal'
  if (ratio <= 0.75) return 'Fair'
  return 'Tight margin'
}

function profit(item: Item): number | null {
  if (item.status !== 'sold' || item.sold_price == null || item.acquired_price == null) return null
  return item.sold_price - item.acquired_price - (item.fees ?? 0) - (item.shipping_cost ?? 0)
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('acquired')
  const [laneFilter, setLaneFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (laneFilter) params.set('lane', laneFilter)
    if (debouncedSearch) params.set('q', debouncedSearch)
    const res = await fetch(`/api/items?${params}`)
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }, [statusFilter, laneFilter, debouncedSearch])

  useEffect(() => { fetchItems() }, [fetchItems])

  const primaryPhoto = (item: Item) =>
    (item as Item & { item_photos?: Item['photos'] }).item_photos?.find(p => p.is_primary)
    ?? (item as Item & { item_photos?: Item['photos'] }).item_photos?.[0]
    ?? item.photos?.find(p => p.is_primary)
    ?? item.photos?.[0]

  return (
    <div className="min-h-screen bg-zinc-950 pb-20 sm:pb-0">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Inventory</h1>
          <div className="flex gap-2">
            <a
              href="/api/export"
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm px-3 py-2 bg-zinc-800 rounded-lg transition-colors"
            >
              <Download size={14} />
              Export
            </a>
            <Link
              href="/intake/new"
              className="flex items-center gap-1.5 text-white text-sm px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
              <Plus size={14} />
              Add item
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-5 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={laneFilter}
            onChange={e => setLaneFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All lanes</option>
            <option value="card">Cards</option>
            <option value="general">General</option>
          </select>
        </div>

        {/* Legend */}
        <div className="flex gap-3 mb-5 text-xs text-zinc-500 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Great deal (&lt;50% of est)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />Fair (50–75%)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Tight (&gt;75%)</span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-zinc-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <Filter size={32} className="mx-auto mb-3 opacity-40" />
            <p>No items match these filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map(item => {
              const photo = primaryPhoto(item)
              const p = profit(item)
              const label = dealLabel(item)
              return (
                <Link
                  key={item.id}
                  href={`/inventory/${item.id}`}
                  className={`group flex flex-col bg-zinc-900 rounded-xl border-2 overflow-hidden transition-all hover:brightness-110 ${dealBorder(item)}`}
                >
                  {/* Photo */}
                  <div className="aspect-square bg-zinc-800 overflow-hidden">
                    {photo ? (
                      <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={28} className="text-zinc-600" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5 flex flex-col gap-1 flex-1">
                    <p className="text-white text-xs font-medium leading-snug line-clamp-2">{item.title ?? 'Untitled'}</p>

                    <div className="mt-auto space-y-0.5">
                      {item.acquired_price != null && (
                        <p className="text-zinc-300 text-xs">Paid <span className="font-semibold">${item.acquired_price.toFixed(2)}</span></p>
                      )}
                      {item.est_value_low != null && item.status !== 'sold' && (
                        <p className="text-zinc-500 text-xs">Est ${item.est_value_low}–{item.est_value_high ?? '?'}</p>
                      )}
                      {p != null && (
                        <p className={`text-xs font-semibold ${p >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {p >= 0 ? '+' : ''}${p.toFixed(2)} profit
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        <StatusBadge status={item.status as ItemStatus} />
                        {label && <span className="text-zinc-600 text-xs">{label}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
