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
  if (item.acquired_price == null || item.est_value_low == null) return 'border-gray-300'
  const ratio = item.acquired_price / item.est_value_low
  if (ratio <= 0.5) return 'border-green-500'
  if (ratio <= 0.75) return 'border-yellow-400'
  return 'border-red-500'
}

function dealShadow(item: Item): string {
  if (item.acquired_price == null || item.est_value_low == null) return 'shadow-[4px_4px_0_0_#d1d5db]'
  const ratio = item.acquired_price / item.est_value_low
  if (ratio <= 0.5) return 'shadow-[4px_4px_0_0_#22c55e]'
  if (ratio <= 0.75) return 'shadow-[4px_4px_0_0_#facc15]'
  return 'shadow-[4px_4px_0_0_#ef4444]'
}

function dealLabel(item: Item): string | null {
  if (item.acquired_price == null || item.est_value_low == null) return null
  const ratio = item.acquired_price / item.est_value_low
  if (ratio <= 0.5) return 'Great deal'
  if (ratio <= 0.75) return 'Fair'
  return 'Tight'
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

  const selectClass = "bg-white border-2 border-black rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-yellow-400"

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-0">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-black">Inventory</h1>
          <div className="flex gap-2">
            <a
              href="/api/export"
              className="flex items-center gap-1.5 text-gray-500 hover:text-black text-sm px-3 py-2 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <Download size={14} />
              Export
            </a>
            <Link
              href="/intake/new"
              className="flex items-center gap-1.5 text-black text-sm px-3 py-2 bg-yellow-400 border-2 border-black rounded-lg font-bold shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              <Plus size={14} />
              Add item
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-5 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 pr-3 py-2 bg-white border-2 border-black rounded-lg text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 w-40"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClass}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={laneFilter} onChange={e => setLaneFilter(e.target.value)} className={selectClass}>
            <option value="">All lanes</option>
            <option value="card">Cards</option>
            <option value="general">General</option>
          </select>
        </div>

        {/* Legend */}
        <div className="flex gap-3 mb-5 text-xs text-gray-500 flex-wrap font-medium">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Great deal (&lt;50%)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />Fair (50–75%)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Tight (&gt;75%)</span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-gray-100 rounded-xl animate-pulse border-2 border-gray-200" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Filter size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No items match these filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {items.map(item => {
              const photo = primaryPhoto(item)
              const p = profit(item)
              const label = dealLabel(item)
              return (
                <Link
                  key={item.id}
                  href={`/inventory/${item.id}`}
                  className={`group flex flex-col bg-white rounded-xl border-2 overflow-hidden transition-all hover:brightness-95 ${dealBorder(item)} ${dealShadow(item)}`}
                >
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    {photo ? (
                      <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={28} className="text-gray-300" />
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 flex flex-col gap-1 flex-1">
                    <p className="text-black text-xs font-bold leading-snug line-clamp-2">{item.title ?? 'Untitled'}</p>
                    <div className="mt-auto space-y-0.5">
                      {item.acquired_price != null && (
                        <p className="text-black text-xs">Paid <span className="font-black">${item.acquired_price.toFixed(2)}</span></p>
                      )}
                      {item.est_value_low != null && item.status !== 'sold' && (
                        <p className="text-gray-400 text-xs">Est ${item.est_value_low}–{item.est_value_high ?? '?'}</p>
                      )}
                      {p != null && (
                        <p className={`text-xs font-black ${p >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {p >= 0 ? '+' : ''}${p.toFixed(2)}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        <StatusBadge status={item.status as ItemStatus} />
                        {label && <span className="text-gray-400 text-xs">{label}</span>}
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
