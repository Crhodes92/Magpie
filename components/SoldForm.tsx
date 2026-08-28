'use client'

import { useState } from 'react'

interface Props {
  itemId: string
  onSold: () => void
}

const inputClass = "w-full bg-white border-2 border-black rounded-lg px-3 py-2 text-black text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"

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
        className="w-full bg-green-400 text-black border-2 border-black text-sm font-bold py-3 rounded-xl shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
      >
        Mark as sold
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white border-2 border-black rounded-xl p-4 space-y-3 shadow-[4px_4px_0_0_#000]">
      <p className="text-sm font-bold text-black">Record sale</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-medium">Sold price *</label>
          <input type="number" step="0.01" min="0" required value={soldPrice} onChange={e => setSoldPrice(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-medium">Fees</label>
          <input type="number" step="0.01" min="0" value={fees} onChange={e => setFees(e.target.value)} placeholder="eBay + PayPal" className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-medium">Shipping cost</label>
          <input type="number" step="0.01" min="0" value={shipping} onChange={e => setShipping(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-medium">Sold date *</label>
          <input type="date" required value={soldAt} onChange={e => setSoldAt(e.target.value)} className={inputClass} />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block font-medium">eBay item ID</label>
          <input type="text" value={ebayId} onChange={e => setEbayId(e.target.value)} placeholder="123456789012" className={inputClass} />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-green-400 text-black border-2 border-black text-sm font-bold py-2 rounded-lg shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Record sale'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-black transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}
