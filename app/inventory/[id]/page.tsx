'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, ExternalLink, Trash2 } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import ConfidenceBadge from '@/components/ConfidenceBadge'
import CompLogger from '@/components/CompLogger'
import SoldForm from '@/components/SoldForm'
import type { Item, ItemStatus, Comp } from '@/types'

function buildEbayUrl(query: string) {
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1&_sop=13`
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null
  return (
    <div>
      <dt className="text-xs text-zinc-500 mb-0.5">{label}</dt>
      <dd className="text-zinc-200 text-sm">{value}</dd>
    </div>
  )
}

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [item, setItem] = useState<Item | null>(null)
  const [comps, setComps] = useState<Comp[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  async function load() {
    const res = await fetch(`/api/items/${id}`)
    if (res.ok) {
      const data: Item = await res.json()
      setItem(data)
      setComps(data.comps ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function setStatus(status: string, extra?: Record<string, unknown>) {
    await fetch(`/api/items/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extra }),
    })
    load()
  }

  async function deleteItem() {
    if (!confirm('Delete this item?')) return
    await fetch(`/api/items/${id}`, { method: 'DELETE' })
    router.push('/inventory')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!item) return <div className="p-8 text-zinc-400">Item not found</div>

  const profit = item.status === 'sold' && item.sold_price != null && item.acquired_price != null
    ? item.sold_price - item.acquired_price - (item.fees ?? 0) - (item.shipping_cost ?? 0)
    : null

  const daysHeld = item.acquired_at
    ? Math.floor((
        (item.sold_at ? new Date(item.sold_at) : new Date()).getTime()
        - new Date(item.acquired_at).getTime()
      ) / 86400000)
    : null

  const ebayQuery = item.ai_identification?.ebay_query ?? item.title ?? ''

  const primaryPhoto = item.photos?.find(p => p.is_primary) ?? item.photos?.[0]
  const otherPhotos = item.photos?.filter(p => p !== primaryPhoto) ?? []

  return (
    <div className="min-h-screen bg-zinc-950 pb-20 sm:pb-0">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/inventory" className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex gap-2">
            <Link
              href={`/intake/${id}`}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm px-3 py-1.5 bg-zinc-800 rounded-lg transition-colors"
            >
              <Edit size={14} />
              Edit
            </Link>
            <button
              onClick={deleteItem}
              className="text-zinc-600 hover:text-red-400 px-2 py-1.5 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Photos */}
        {primaryPhoto && (
          <img src={primaryPhoto.url} alt="" className="w-full rounded-xl object-cover max-h-72 mb-3" />
        )}
        {otherPhotos.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {otherPhotos.map(p => (
              <img key={p.id} src={p.url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
            ))}
          </div>
        )}

        {/* Title + status */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <h1 className="text-xl font-bold text-white leading-snug">{item.title ?? 'Untitled'}</h1>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={item.status as ItemStatus} />
            {item.ai_confidence != null && <ConfidenceBadge confidence={item.ai_confidence} />}
          </div>
        </div>

        {/* Financials bar */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-zinc-900 rounded-xl p-3 text-center">
            <p className="text-zinc-500 text-xs mb-1">Cost</p>
            <p className="text-white font-semibold">{item.acquired_price != null ? `$${item.acquired_price.toFixed(2)}` : '—'}</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 text-center">
            <p className="text-zinc-500 text-xs mb-1">{item.status === 'sold' ? 'Sold' : 'Est. value'}</p>
            <p className="text-white font-semibold">
              {item.status === 'sold'
                ? item.sold_price != null ? `$${item.sold_price.toFixed(2)}` : '—'
                : item.est_value_low != null ? `$${item.est_value_low.toFixed(2)}` : '—'}
            </p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 text-center">
            <p className="text-zinc-500 text-xs mb-1">{item.status === 'sold' ? 'Profit' : 'Days held'}</p>
            {item.status === 'sold' ? (
              <p className={`font-semibold ${profit != null && profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {profit != null ? `${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}` : '—'}
              </p>
            ) : (
              <p className={`font-semibold ${daysHeld != null && daysHeld > 90 ? 'text-red-400' : daysHeld != null && daysHeld > 60 ? 'text-yellow-400' : 'text-white'}`}>
                {daysHeld != null ? `${daysHeld}d` : '—'}
              </p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="bg-zinc-900 rounded-xl p-4 mb-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Category" value={item.category} />
            <Field label="Brand / Model" value={[item.brand, item.model].filter(Boolean).join(' ')} />
            <Field label="Condition" value={item.condition_note} />
            <Field label="Lane" value={item.lane} />
            <Field label="Source" value={item.acquired_source} />
            <Field label="Acquired" value={item.acquired_at ?? undefined} />
            <Field label="Storage" value={item.storage_location} />
            {item.max_bid != null && <Field label="Max bid (AI)" value={`$${item.max_bid.toFixed(2)}`} />}
            {item.ebay_item_id && <Field label="eBay ID" value={item.ebay_item_id} />}
          </dl>
          {item.notes && (
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 mb-1">Notes</p>
              <p className="text-zinc-300 text-sm whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}
        </div>

        {/* Card details */}
        {item.card_details && (
          <div className="bg-zinc-900 rounded-xl p-4 mb-4">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Card details</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Card name" value={item.card_details.card_name} />
              <Field label="Set" value={item.card_details.set_name} />
              <Field label="Number" value={item.card_details.card_number} />
              <Field label="Printing" value={item.card_details.printing} />
              <Field label="Language" value={item.card_details.language} />
              {item.card_details.is_graded && (
                <Field label="Grade" value={`${item.card_details.grader ?? ''} ${item.card_details.grade ?? ''}`} />
              )}
            </dl>
          </div>
        )}

        {/* eBay comps link */}
        {ebayQuery && (
          <a
            href={buildEbayUrl(ebayQuery)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full bg-blue-950/50 hover:bg-blue-900/50 border border-blue-800/50 rounded-xl px-4 py-3 mb-4 transition-colors"
          >
            <span className="text-blue-300 font-medium">View eBay sold comps</span>
            <ExternalLink size={16} className="text-blue-400" />
          </a>
        )}

        {/* Comps */}
        <div className="bg-zinc-900 rounded-xl p-4 mb-4 space-y-3">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Comps logged</p>
          {comps.length === 0 ? (
            <p className="text-zinc-600 text-sm">No comps yet</p>
          ) : (
            <div className="space-y-2">
              {comps.map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-white font-medium">${c.price.toFixed(2)}</span>
                    {c.condition && <span className="text-zinc-500 ml-1">· {c.condition}</span>}
                    {c.sold_at && <span className="text-zinc-500 ml-1">· {c.sold_at}</span>}
                  </div>
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-300">
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
          <CompLogger itemId={id} onAdded={c => setComps(prev => [...prev, c])} />
        </div>

        {/* Status actions */}
        <div className="space-y-2">
          {item.status === 'acquired' && (
            <>
              <button
                onClick={() => setStatus('listed')}
                className="w-full bg-purple-700 hover:bg-purple-600 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Mark as listed
              </button>
              <SoldForm itemId={id} onSold={load} />
            </>
          )}
          {item.status === 'listed' && <SoldForm itemId={id} onSold={load} />}
          {item.status === 'acquired' && (
            <button
              onClick={() => setStatus('scrapped')}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-medium py-3 rounded-xl transition-colors"
            >
              Scrap
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
