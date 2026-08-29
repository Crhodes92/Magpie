'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Sliders, Check, AlertTriangle } from 'lucide-react'
import { DEFAULT_MAX_BID_PCT, MAX_BID_PCT_MIN, MAX_BID_PCT_MAX } from '@/lib/max-bid'

export default function SettingsPage() {
  const [pct, setPct] = useState<number>(DEFAULT_MAX_BID_PCT)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(async r => {
        const body = await r.json()
        if (!r.ok) throw new Error(body?.error ?? `Failed to load settings (${r.status})`)
        setPct(body.max_bid_pct ?? DEFAULT_MAX_BID_PCT)
      })
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

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
      </div>
    </div>
  )
}
