'use client'

import { useState } from 'react'
import type { Comp } from '@/types'

interface Props {
  itemId: string
  onAdded: (comp: Comp) => void
}

const inputClass = "w-full bg-white border-2 border-black rounded-lg px-3 py-2 text-black text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"

export default function CompLogger({ itemId, onAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState('')
  const [soldAt, setSoldAt] = useState('')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/comps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: itemId,
        source: 'ebay_sold',
        price: parseFloat(price),
        condition: condition || null,
        sold_at: soldAt || null,
        url: url || null,
      }),
    })
    if (res.ok) {
      const comp = await res.json()
      onAdded(comp)
      setPrice('')
      setCondition('')
      setSoldAt('')
      setUrl('')
      setOpen(false)
    }
    setSaving(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-yellow-600 hover:text-black font-medium transition-colors">
        + Log a comp
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="bg-gray-50 border-2 border-black rounded-xl p-4 space-y-3">
      <p className="text-sm font-bold text-black">Log sold comp</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-medium">Price *</label>
          <input type="number" step="0.01" min="0" required value={price} onChange={e => setPrice(e.target.value)} placeholder="12.50" className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-medium">Condition</label>
          <input type="text" value={condition} onChange={e => setCondition(e.target.value)} placeholder="NM, LP, …" className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-medium">Sold date</label>
          <input type="date" value={soldAt} onChange={e => setSoldAt(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-medium">eBay URL</label>
          <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className={inputClass} />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-yellow-400 text-black border-2 border-black text-sm font-bold py-2 rounded-lg shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save comp'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-black transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}
