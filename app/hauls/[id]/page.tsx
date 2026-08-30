'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, ExternalLink, Trash2 } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import ConfidenceBadge from '@/components/ConfidenceBadge'
import ItemTags from '@/components/ItemTags'
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
      <dt className="text-xs text-gray-500 mb-0.5 font-medium">{label}</dt>
      <dd className="text-black text-sm font-medium">{value}</dd>
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
    router.push('/hauls')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!item) return <div className="p-8 text-gray-400 font-medium">Item not found</div>

  const profit = item.status === 'sold' && item.sold_price != null && item.acquired_price != null
    ? item.sold_price - item.acquired_price - (item.fees ?? 0) - (item.shipping_cost ?? 0)
    : null

  const daysHeld = item.acquired_at
    ? Math.floor(((item.sold_at ? new Date(item.sold_at) : new Date()).getTime() - new Date(item.acquired_at).getTime()) / 86400000)
    : null

  const ebayQuery = item.ai_identification?.ebay_query ?? item.title ?? ''

  const photos = (item as Item & { item_photos?: Item['photos'] }).item_photos ?? item.photos ?? []
  const primaryPhoto = photos.find(p => p.is_primary) ?? photos[0]
  const otherPhotos = photos.filter(p => p !== primaryPhoto)

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-0">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/hauls" className="text-gray-400 hover:text-black transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex gap-2">
            <Link
              href={`/intake/${id}`}
              className="flex items-center gap-1.5 text-black text-sm px-3 py-1.5 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-medium"
            >
              <Edit size={14} />
              Edit
            </Link>
            <button onClick={deleteItem} className="text-gray-300 hover:text-red-500 px-2 py-1.5 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Photos */}
        {primaryPhoto && (
          <div className="relative group mb-3">
            <img src={primaryPhoto.url} alt="" className="w-full rounded-xl object-cover max-h-72 border-2 border-black" />
            <ItemTags tags={item.tags} />
          </div>
        )}
        {otherPhotos.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {otherPhotos.map(p => (
              <img key={p.id} src={p.url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0 border-2 border-black" />
            ))}
          </div>
        )}

        {/* Title + status */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <h1 className="text-xl font-black text-black leading-snug">{item.title ?? 'Untitled'}</h1>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={item.status as ItemStatus} />
            {item.ai_confidence != null && <ConfidenceBadge confidence={item.ai_confidence} />}
          </div>
        </div>

        {/* Financials bar */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Cost', value: item.acquired_price != null ? `$${item.acquired_price.toFixed(2)}` : '—', color: 'text-black' },
            {
              label: item.status === 'sold' ? 'Sold' : 'Est. value',
              value: item.status === 'sold'
                ? item.sold_price != null ? `$${item.sold_price.toFixed(2)}` : '—'
                : item.est_value_low != null ? `$${item.est_value_low.toFixed(2)}` : '—',
              color: 'text-black'
            },
            {
              label: item.status === 'sold' ? 'Profit' : 'Days held',
              value: item.status === 'sold'
                ? profit != null ? `${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}` : '—'
                : daysHeld != null ? `${daysHeld}d` : '—',
              color: item.status === 'sold'
                ? profit != null && profit >= 0 ? 'text-green-600' : 'text-red-600'
                : daysHeld != null && daysHeld > 90 ? 'text-red-600' : daysHeld != null && daysHeld > 60 ? 'text-yellow-600' : 'text-black'
            }
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border-2 border-black rounded-xl p-3 text-center shadow-[3px_3px_0_0_#000]">
              <p className="text-gray-500 text-xs mb-1 font-medium">{label}</p>
              <p className={`font-black text-sm ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Details */}
        <div className="bg-white border-2 border-black rounded-xl p-4 mb-4 shadow-[4px_4px_0_0_#000]">
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
            <div className="mt-3 pt-3 border-t-2 border-black">
              <p className="text-xs text-gray-500 mb-1 font-medium">Notes</p>
              <p className="text-black text-sm whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}
        </div>

        {/* Card details */}
        {item.card_details && (
          <div className="bg-white border-2 border-black rounded-xl p-4 mb-4 shadow-[4px_4px_0_0_#000]">
            <p className="text-xs font-black text-black uppercase tracking-wide mb-3">Card details</p>
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
            className="flex items-center justify-between w-full bg-white border-2 border-black rounded-xl px-4 py-3 mb-4 shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
          >
            <span className="text-black font-bold">View eBay sold comps</span>
            <ExternalLink size={16} className="text-gray-400" />
          </a>
        )}

        {/* Comps */}
        <div className="bg-white border-2 border-black rounded-xl p-4 mb-4 space-y-3 shadow-[4px_4px_0_0_#000]">
          <p className="text-xs font-black text-black uppercase tracking-wide">Comps logged</p>
          {comps.length === 0 ? (
            <p className="text-gray-400 text-sm">No comps yet</p>
          ) : (
            <div className="space-y-2">
              {comps.map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-black font-bold">${c.price.toFixed(2)}</span>
                    {c.condition && <span className="text-gray-400 ml-1">· {c.condition}</span>}
                    {c.sold_at && <span className="text-gray-400 ml-1">· {c.sold_at}</span>}
                  </div>
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black">
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
                className="w-full bg-yellow-400 text-black border-2 border-black font-bold py-3 rounded-xl shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
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
              className="w-full bg-white text-gray-500 border-2 border-black font-medium py-3 rounded-xl shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
            >
              Scrap
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
