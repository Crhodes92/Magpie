'use client'

import { useState } from 'react'

interface Props {
  itemId: string
  onSold: () => void
}

export default function SoldForm({ itemId, onSold }: Props) {
  const [open, setOpen] = useState(false)
  const [soldPrice, setSoldPrice] = useState('')
  const [fees, setFees] = useState('')
  const [shipping, setShipping] = useState('')
  const [soldAt, setSoldAt] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [ebayId, setEbayId] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch(`/api/items/${itemId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'sold',
        sold_price: parseFloat(soldPrice),
        fees: fees ? parseFloat(fees) : null,
        shipping_cost: shipping ? parseFloat(shipping) : null,
        sold_at: soldAt,
        ebay_item_id: ebayId || null,
      }),
    })
    setSaving(false)
    setOpen(false)
    onSold()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-green-700 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        Mark as sold
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="bg-zinc-800 rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-zinc-200">Record sale</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Sold price *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={soldPrice}
            onChange={e => setSoldPrice(e.target.value)}
            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Fees</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={fees}
            onChange={e => setFees(e.target.value)}
            placeholder="eBay + PayPal"
            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Shipping cost</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={shipping}
            onChange={e => setShipping(e.target.value)}
            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Sold date *</label>
          <input
            type="date"
            required
            value={soldAt}
            onChange={e => setSoldAt(e.target.value)}
            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-zinc-400 mb-1 block">eBay item ID</label>
          <input
            type="text"
            value={ebayId}
            onChange={e => setEbayId(e.target.value)}
            placeholder="123456789012"
            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Record sale'}
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
