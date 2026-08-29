'use client'

import { useState, useEffect, useMemo, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Package, CheckCircle2 } from 'lucide-react'
import type { Item } from '@/types'
import { MAX_BID_CONFIDENCE_THRESHOLD } from '@/lib/max-bid'

interface Row {
  item: Item
  checked: boolean
  price: number
  lowConfidence: boolean
}

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: haulId } = use(params)
  const router = useRouter()
  const [haulName, setHaulName] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/hauls/${haulId}?status=scouted`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error ?? `Failed to load haul (${r.status})`)
        setHaulName(data.name ?? 'Haul')
        const items: Item[] = data.items ?? []
        setRows(items.map(item => {
          const lowConfidence = (item.ai_confidence ?? 0) < MAX_BID_CONFIDENCE_THRESHOLD || item.max_bid == null
          return { item, checked: true, price: lowConfidence ? 0 : (item.max_bid ?? 0), lowConfidence }
        }))
      })
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Failed to load haul'))
      .finally(() => setLoading(false))
  }, [haulId])

  const total = useMemo(
    () => rows.filter(r => r.checked).reduce((sum, r) => sum + r.price, 0),
    [rows]
  )

  function setItemPrice(itemId: string, price: number) {
    setRows(prev => prev.map(r => r.item.id === itemId ? { ...r, price: Math.max(0, price) } : r))
  }

  function toggleChecked(itemId: string) {
    setRows(prev => prev.map(r => r.item.id === itemId ? { ...r, checked: !r.checked } : r))
  }

  function setTotal(newTotal: number) {
    const clamped = Math.max(0, newTotal)
    const oldTotal = total
    setRows(prev => {
      const checkedCount = prev.filter(r => r.checked).length
      if (checkedCount === 0) return prev
      if (oldTotal <= 0) {
        // Nothing to scale from — split evenly instead.
        const even = Math.round((clamped / checkedCount) * 100) / 100
        return prev.map(r => r.checked ? { ...r, price: even } : r)
      }
      const factor = clamped / oldTotal
      return prev.map(r => r.checked ? { ...r, price: Math.round(r.price * factor * 100) / 100 } : r)
    })
  }

  async function confirm() {
    setSubmitting(true)
    setSubmitError(null)
    const decisions = rows.map(r => ({ item_id: r.item.id, bought: r.checked, price: r.checked ? r.price : null }))
    try {
      const res = await fetch(`/api/hauls/${haulId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error ?? `Checkout failed (${res.status})`)
      router.push(`/hauls?haul=${haulId}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Checkout failed')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-red-50 border-2 border-red-500 rounded-xl px-4 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm font-medium">{loadError}</p>
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="min-h-screen bg-white pb-20 sm:pb-0">
        <div className="max-w-lg mx-auto px-4 py-6 text-center py-16">
          <Package size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 font-medium mb-4">Nothing pending checkout in this haul</p>
          <Link href="/hauls" className="text-yellow-600 font-bold text-sm">Back to hauls →</Link>
        </div>
      </div>
    )
  }

  const checkedCount = rows.filter(r => r.checked).length

  return (
    <div className="min-h-screen bg-white pb-32 sm:pb-6">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/hauls" className="text-gray-400 hover:text-black transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black text-black">Checkout — {haulName}</h1>
        </div>
        <p className="text-gray-500 text-sm mb-5 pl-8">Adjust the total for the whole pile, or nudge one item at a time</p>

        {/* Total */}
        <div className="bg-yellow-50 border-2 border-black rounded-xl p-4 mb-5 shadow-[4px_4px_0_0_#000]">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">Offer total · {checkedCount} of {rows.length} bought</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black text-black">$</span>
            <input
              type="number"
              step={1}
              min={0}
              value={Math.round(total)}
              onChange={e => setTotal(Number(e.target.value))}
              className="text-3xl font-black text-black bg-transparent border-b-2 border-black w-32 focus:outline-none"
            />
          </div>
        </div>

        {/* Items */}
        <div className="space-y-3 mb-6">
          {rows.map(row => {
            const photo = (row.item as Item & { item_photos?: Item['photos'] }).item_photos?.[0] ?? row.item.photos?.[0]
            return (
              <div
                key={row.item.id}
                className={`flex items-center gap-3 bg-white border-2 border-black rounded-xl p-3 shadow-[3px_3px_0_0_#000] transition-opacity ${!row.checked ? 'opacity-40' : ''}`}
              >
                <button
                  onClick={() => toggleChecked(row.item.id)}
                  className={`shrink-0 w-6 h-6 rounded-md border-2 border-black flex items-center justify-center ${row.checked ? 'bg-green-400' : 'bg-white'}`}
                  aria-label={row.checked ? 'Mark not bought' : 'Mark bought'}
                >
                  {row.checked && <CheckCircle2 size={16} className="text-black" />}
                </button>
                <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-black shrink-0 bg-gray-100">
                  {photo ? <img src={photo.url} alt="" className="w-full h-full object-cover" /> : (
                    <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-gray-300" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-black text-sm font-bold truncate">{row.item.title ?? 'Untitled'}</p>
                  {row.lowConfidence ? (
                    <p className="flex items-center gap-1 text-yellow-600 text-xs font-medium">
                      <AlertTriangle size={11} /> Verify manually
                    </p>
                  ) : row.item.est_value_low != null && (
                    <p className="text-gray-400 text-xs">Est ${row.item.est_value_low}–{row.item.est_value_high ?? '?'}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-black font-black">$</span>
                  <input
                    type="number"
                    step={1}
                    min={0}
                    value={Math.round(row.price)}
                    disabled={!row.checked}
                    onChange={e => setItemPrice(row.item.id, Number(e.target.value))}
                    className="w-16 text-black font-black bg-gray-50 border-2 border-black rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirm bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t-2 border-black p-4 sm:static sm:border-0 sm:p-0 sm:max-w-lg sm:mx-auto sm:px-4">
        {submitError && (
          <div className="flex items-start gap-2 bg-red-50 border-2 border-red-500 rounded-lg px-3 py-2 mb-3">
            <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-700 text-xs font-medium">{submitError}</p>
          </div>
        )}
        <button
          onClick={confirm}
          disabled={submitting}
          className="w-full bg-yellow-400 border-2 border-black text-black font-bold py-4 rounded-xl shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all disabled:opacity-50"
        >
          {submitting ? 'Settling…' : `Confirm — $${Math.round(total)} for ${checkedCount} ${checkedCount === 1 ? 'item' : 'items'}`}
        </button>
      </div>
    </div>
  )
}
