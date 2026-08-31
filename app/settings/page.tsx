'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Sliders, Check, AlertTriangle, Tag } from 'lucide-react'
import { DEFAULT_MAX_BID_PCT, MAX_BID_PCT_MIN, MAX_BID_PCT_MAX } from '@/lib/max-bid'

const inputClass = "w-full bg-white border-2 border-black rounded-lg px-3 py-2.5 text-black text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
const labelClass = "block text-xs text-gray-500 mb-1 font-medium"

export default function SettingsPage() {
  const [pct, setPct] = useState<number>(DEFAULT_MAX_BID_PCT)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [shipFromLocation, setShipFromLocation] = useState('')
  const [shipFromCountry, setShipFromCountry] = useState('US')
  const [paymentPolicy, setPaymentPolicy] = useState('')
  const [shippingPolicy, setShippingPolicy] = useState('')
  const [returnPolicy, setReturnPolicy] = useState('')
  const [ebaySaving, setEbaySaving] = useState(false)
  const [ebaySaved, setEbaySaved] = useState(false)
  const [ebayError, setEbayError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(async r => {
        const body = await r.json()
        if (!r.ok) throw new Error(body?.error ?? `Failed to load settings (${r.status})`)
        setPct(body.max_bid_pct ?? DEFAULT_MAX_BID_PCT)
        setShipFromLocation(body.ebay_ship_from_location ?? '')
        setShipFromCountry(body.ebay_ship_from_country ?? 'US')
        setPaymentPolicy(body.ebay_payment_policy ?? '')
        setShippingPolicy(body.ebay_shipping_policy ?? '')
        setReturnPolicy(body.ebay_return_policy ?? '')
      })
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  async function saveEbaySettings(e: React.FormEvent) {
    e.preventDefault()
    setEbaySaving(true)
    setEbayError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ebay_ship_from_location: shipFromLocation,
          ebay_ship_from_country: shipFromCountry,
          ebay_payment_policy: paymentPolicy,
          ebay_shipping_policy: shippingPolicy,
          ebay_return_policy: returnPolicy,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error ?? `Failed to save (${res.status})`)
      setEbaySaved(true)
      setTimeout(() => setEbaySaved(false), 1500)
    } catch (err) {
      setEbayError(err instanceof Error ? err.message : 'Failed to save')
    }
    setEbaySaving(false)
  }

  const save = useCallback((value: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ max_bid_pct: value }),
        })
        const body = await res.json()
        if (!res.ok) throw new Error(body?.error ?? `Failed to save (${res.status})`)
        setSaveError(null)
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to save')
      }
    }, 400)
  }, [])

  function handleChange(value: number) {
    setPct(value)
    save(value)
  }

  const range = MAX_BID_PCT_MAX - MAX_BID_PCT_MIN
  const fillPct = ((pct - MAX_BID_PCT_MIN) / range) * 100

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

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-0">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-black text-black mb-1">Settings</h1>
        <p className="text-gray-500 text-sm mb-6">Tune how Magpie sizes its offers</p>

        <div className="bg-white border-2 border-black rounded-xl p-5 shadow-[4px_4px_0_0_#000]">
          <div className="flex items-center gap-2 mb-1">
            <Sliders size={16} className="text-gray-500" />
            <p className="text-sm font-bold text-black">Max bid percentage</p>
          </div>
          <p className="text-gray-400 text-xs mb-5">
            Scout suggests a max bid as this share of the AI&apos;s low sold-comp estimate. Lower is a safer offer with more margin; higher gets closer to what the item&apos;s actually worth.
          </p>

          <div className="flex items-baseline justify-between mb-2">
            <span className="text-3xl font-black text-black">{pct}%</span>
            {saved && (
              <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                <Check size={13} /> Saved
              </span>
            )}
            {saveError && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                <AlertTriangle size={13} /> {saveError}
              </span>
            )}
          </div>

          <div className="relative h-3 rounded-full mb-2" style={{ background: 'linear-gradient(90deg, #22c55e 0%, #facc15 50%, #ef4444 100%)' }}>
            <div
              className="absolute top-1/2 w-6 h-6 bg-white border-[3px] border-black rounded-full shadow-[2px_2px_0_0_#000] -translate-y-1/2 -translate-x-1/2 pointer-events-none"
              style={{ left: `${fillPct}%` }}
            />
            <input
              type="range"
              min={MAX_BID_PCT_MIN}
              max={MAX_BID_PCT_MAX}
              step={1}
              value={pct}
              onChange={e => handleChange(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Max bid percentage"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 font-medium">
            <span>{MAX_BID_PCT_MIN}% · safer offer</span>
            <span>{MAX_BID_PCT_MAX}% · thinner margin</span>
          </div>
        </div>

        <form onSubmit={saveEbaySettings} className="bg-white border-2 border-black rounded-xl p-5 shadow-[4px_4px_0_0_#000] mt-5">
          <div className="flex items-center gap-2 mb-1">
            <Tag size={16} className="text-gray-500" />
            <p className="text-sm font-bold text-black">eBay listing defaults</p>
          </div>
          <p className="text-gray-400 text-xs mb-5">
            Used to fill in the eBay bulk-listing CSV export. Policy names must match business policies already set up in your own eBay Seller Hub account.
          </p>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Ship-from location</label>
                <input type="text" value={shipFromLocation} onChange={e => setShipFromLocation(e.target.value)} placeholder="Topeka,Kansas" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Ship-from country</label>
                <input type="text" value={shipFromCountry} onChange={e => setShipFromCountry(e.target.value.toUpperCase())} placeholder="US" maxLength={2} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Payment policy name</label>
              <input type="text" value={paymentPolicy} onChange={e => setPaymentPolicy(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Shipping policy name</label>
              <input type="text" value={shippingPolicy} onChange={e => setShippingPolicy(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Return policy name</label>
              <input type="text" value={returnPolicy} onChange={e => setReturnPolicy(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              type="submit"
              disabled={ebaySaving}
              className="bg-yellow-400 text-black border-2 border-black text-sm font-bold px-4 py-2 rounded-lg shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-50"
            >
              {ebaySaving ? 'Saving…' : 'Save'}
            </button>
            {ebaySaved && (
              <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                <Check size={13} /> Saved
              </span>
            )}
            {ebayError && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                <AlertTriangle size={13} /> {ebayError}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
