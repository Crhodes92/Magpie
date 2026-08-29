'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, Filter, Download, Plus, Package, ArrowLeft, ArrowRight } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import type { Item, ItemStatus } from '@/types'

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'scouted', label: 'Scouted' },
  { value: 'acquired', label: 'Acquired' },
  { value: 'listed', label: 'Listed' },
  { value: 'sold', label: 'Sold' },
  { value: 'passed', label: 'Passed' },
  { value: 'scrapped', label: 'Scrapped' },
]

interface HaulSummary {
  id: string
  name: string
  started_at: string | null
  ended_at: string | null
  item_count: number
  spend: number
  profit: number
  est_value_low: number
  est_value_high: number
  cover_photos: string[]
}

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

function relativeDate(iso: string | null): string {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ItemTile({ item }: { item: Item }) {
  const photo = (item as Item & { item_photos?: Item['photos'] }).item_photos?.find(p => p.is_primary)
    ?? (item as Item & { item_photos?: Item['photos'] }).item_photos?.[0]
    ?? item.photos?.find(p => p.is_primary)
    ?? item.photos?.[0]
  const p = profit(item)
  const label = dealLabel(item)
  return (
    <Link
      href={`/hauls/${item.id}`}
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
}

function AlbumTile({ haul, onOpen }: { haul: HaulSummary; onOpen: () => void }) {
  const soldSomething = haul.profit !== 0
  const financialLine = soldSomething
    ? `$${haul.spend.toFixed(0)} spent · ${haul.profit >= 0 ? '+' : ''}$${haul.profit.toFixed(0)} so far`
    : haul.est_value_low > 0
      ? `$${haul.spend.toFixed(0)} spent · est $${haul.est_value_low.toFixed(0)}–${haul.est_value_high.toFixed(0)}`
      : `$${haul.spend.toFixed(0)} spent`

  return (
    <button
      onClick={onOpen}
      className="text-left bg-white border-2 border-black rounded-2xl p-3 shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
    >
      <div className="relative h-24 mb-3">
        {haul.cover_photos.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <Package size={24} className="text-gray-300" />
          </div>
        ) : (
          haul.cover_photos.slice(0, 3).map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="absolute w-20 h-20 object-cover rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000]"
              style={{
                left: `${i * 22}px`,
                top: `${i % 2 === 0 ? 0 : 4}px`,
                transform: `rotate(${(i - 1) * 6}deg)`,
                zIndex: 3 - i,
              }}
            />
          ))
        )}
      </div>
      <p className="text-black font-black text-sm leading-snug truncate">{haul.name}</p>
      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mt-0.5">
        <span>{relativeDate(haul.started_at)}</span>
        <span>·</span>
        <span>{haul.item_count} {haul.item_count === 1 ? 'item' : 'items'}</span>
      </div>
      <p className="text-black text-xs font-bold mt-1.5">{financialLine}</p>
    </button>
  )
}

function HaulsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const openHaulId = searchParams.get('haul')

  const [statusFilter, setStatusFilter] = useState<string>('acquired')
  const [laneFilter, setLaneFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [hauls, setHauls] = useState<HaulSummary[]>([])
  const [ungrouped, setUngrouped] = useState<HaulSummary | null>(null)
  const [flatItems, setFlatItems] = useState<Item[]>([])
  const [openHaul, setOpenHaul] = useState<(HaulSummary & { items: Item[] }) | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const filterParams = useCallback(() => {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (laneFilter) params.set('lane', laneFilter)
    return params
  }, [statusFilter, laneFilter])

  const load = useCallback(async () => {
    setLoading(true)
    if (debouncedSearch) {
      const params = filterParams()
      params.set('q', debouncedSearch)
      const res = await fetch(`/api/items?${params}`)
      if (res.ok) setFlatItems(await res.json())
    } else if (openHaulId) {
      const params = filterParams()
      const res = await fetch(`/api/hauls/${openHaulId}?${params}`)
      if (res.ok) setOpenHaul(await res.json())
    } else {
      const params = filterParams()
      const res = await fetch(`/api/hauls?${params}`)
      if (res.ok) {
        const data = await res.json()
        setHauls(data.hauls ?? [])
        setUngrouped(data.ungrouped ?? null)
      }
    }
    setLoading(false)
  }, [debouncedSearch, openHaulId, filterParams])

  useEffect(() => { load() }, [load])

  const selectClass = "bg-white border-2 border-black rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-yellow-400"

  const pendingCheckout = openHaul?.items.filter(i => i.status === 'scouted').length ?? 0

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-0">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          {openHaul ? (
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/hauls')} className="text-gray-400 hover:text-black transition-colors">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-2xl font-black text-black">{openHaul.name}</h1>
            </div>
          ) : (
            <h1 className="text-2xl font-black text-black">Hauls</h1>
          )}
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

        {/* Haul financial summary */}
        {openHaul && (
          <div className="bg-white border-2 border-black rounded-xl p-4 mb-5 shadow-[4px_4px_0_0_#000]">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-gray-500 text-xs mb-1 font-medium">Spent</p>
                <p className="text-black font-black">${(openHaul.spend ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1 font-medium">Est. value</p>
                <p className="text-black font-black">
                  {openHaul.est_value_low != null ? `$${openHaul.est_value_low.toFixed(0)}–${(openHaul.est_value_high ?? openHaul.est_value_low).toFixed(0)}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1 font-medium">Profit so far</p>
                <p className={`font-black ${(openHaul.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(openHaul.profit ?? 0) >= 0 ? '+' : ''}${(openHaul.profit ?? 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {pendingCheckout > 0 && openHaulId && (
          <Link
            href={`/hauls/checkout/${openHaulId}`}
            className="flex items-center justify-between w-full bg-yellow-400 border-2 border-black text-black font-bold px-4 py-3 rounded-xl mb-5 shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
          >
            Finish checkout ({pendingCheckout} pending)
            <ArrowRight size={16} />
          </Link>
        )}

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

        {!debouncedSearch && !openHaul && (
          <div className="flex gap-3 mb-5 text-xs text-gray-500 flex-wrap font-medium">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Great deal (&lt;50%)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />Fair (50–75%)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Tight (&gt;75%)</span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-gray-100 rounded-xl animate-pulse border-2 border-gray-200" />
            ))}
          </div>
        ) : debouncedSearch ? (
          flatItems.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Filter size={32} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No items match &quot;{debouncedSearch}&quot;</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {flatItems.map(item => <ItemTile key={item.id} item={item} />)}
            </div>
          )
        ) : openHaul ? (
          openHaul.items.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Filter size={32} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No items match these filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {openHaul.items.map(item => <ItemTile key={item.id} item={item} />)}
            </div>
          )
        ) : hauls.length === 0 && !ungrouped ? (
          <div className="text-center py-16 text-gray-400">
            <Package size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hauls match these filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {hauls.map(h => (
              <AlbumTile key={h.id} haul={h} onOpen={() => router.push(`/hauls?haul=${h.id}`)} />
            ))}
            {ungrouped && (
              <div className="opacity-80">
                <AlbumTile haul={ungrouped} onOpen={() => router.push('/hauls?haul=ungrouped')} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function HaulsPage() {
  return (
    <Suspense fallback={null}>
      <HaulsPageInner />
    </Suspense>
  )
}
