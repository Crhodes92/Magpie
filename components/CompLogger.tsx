'use client'

import { useState } from 'react'
import type { Comp } from '@/types'

interface Props {
  itemId: string
  onAdded: (comp: Comp) => void
}

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
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        + Log a comp
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="bg-zinc-800 rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-zinc-200">Log sold comp</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Price *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="12.50"
            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Condition</label>
          <input
            type="text"
            value={condition}
            onChange={e => setCondition(e.target.value)}
            placeholder="NM, LP, …"
            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Sold date</label>
          <input
            type="date"
            value={soldAt}
            onChange={e => setSoldAt(e.target.value)}
            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">eBay URL</label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://…"
            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Save comp'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
