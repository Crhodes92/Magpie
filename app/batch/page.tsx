'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Camera, CheckCircle, XCircle, Loader2, AlertTriangle, ExternalLink, ArrowRight } from 'lucide-react'
import ConfidenceBadge from '@/components/ConfidenceBadge'
import type { IdentifyResponse } from '@/types'

type ItemPhase = 'identifying' | 'ready' | 'error'
type Decision = 'buy' | 'pass' | null

interface QueueItem {
  id: string
  blob: Blob
  previewUrl: string
  phase: ItemPhase
  result: IdentifyResponse | null
  errorMsg: string | null
  decision: Decision
  savedItemId: string | null
}

function buildEbayUrl(query: string) {
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1&_sop=13`
}

function resizeImage(file: File, maxPx = 1600): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.85)
    }
    img.src = url
  })
}

export default function BatchPage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }, [])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (inputRef.current) inputRef.current.value = ''

    const blob = await resizeImage(file)
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const newItem: QueueItem = {
      id,
      blob,
      previewUrl: URL.createObjectURL(blob),
      phase: 'identifying',
      result: null,
      errorMsg: null,
      decision: null,
      savedItemId: null,
    }

    setQueue(prev => [...prev, newItem])
    setFocusedId(prev => prev ?? id)

    try {
      const fd = new FormData()
      fd.append('image', blob, 'photo.jpg')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)
      const res = await fetch('/api/identify', { method: 'POST', body: fd, signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? 'Identification failed')
      }
      const result: IdentifyResponse = await res.json()
      updateItem(id, { phase: 'ready', result })
      setFocusedId(prev => prev === null ? id : prev)
    } catch (err) {
      updateItem(id, { phase: 'error', errorMsg: err instanceof Error ? err.message : 'Failed' })
    }
  }

  async function decide(id: string, decision: 'buy' | 'pass') {
    const item = queue.find(i => i.id === id)
    if (!item?.result) return

    setSaving(prev => new Set(prev).add(id))

    const body: Record<string, unknown> = {
      status: decision === 'buy' ? 'acquired' : 'passed',
      lane: item.result.lane,
      title: item.result.title,
      category: item.result.category,
      brand: item.result.brand ?? null,
      model: item.result.model ?? null,
      condition_note: item.result.condition_note ?? null,
      ai_identification: item.result,
      ai_confidence: item.result.confidence,
      est_value_low: item.result.est_value_low ?? null,
      est_value_high: item.result.est_value_high ?? null,
      max_bid: item.result.confidence >= 0.6 && item.result.est_value_low
        ? Math.round(item.result.est_value_low * 0.4 * 100) / 100
        : null,
    }
    if (item.result.lane === 'card' && item.result.card_details) {
      body.card_details = item.result.card_details
    }

    let savedItemId: string | null = null
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const saved = await res.json()
        savedItemId = saved.id
        if (decision === 'buy' && savedItemId) {
          const fd = new FormData()
          fd.append('file', item.blob, 'batch-photo.jpg')
          fd.append('item_id', savedItemId)
          fd.append('is_primary', 'true')
          fetch('/api/upload', { method: 'POST', body: fd }).catch(() => {})
        }
      }
    } catch {}

    updateItem(id, { decision, savedItemId })
    setSaving(prev => { const s = new Set(prev); s.delete(id); return s })

    setQueue(prev => {
      const undecided = prev.filter(i => i.id !== id && i.decision === null && i.phase === 'ready')
      if (undecided.length > 0) {
        setFocusedId(undecided[0].id)
      } else {
        const anyPending = prev.some(i => i.id !== id && i.phase === 'identifying')
        if (!anyPending) setFocusedId(null)
      }
      return prev
    })
  }

  const focused = queue.find(i => i.id === focusedId)
  const decided = queue.filter(i => i.decision !== null)
  const pending = queue.filter(i => i.decision === null)
  const bought = decided.filter(i => i.decision === 'buy')
  const allDecided = queue.length > 0 && pending.length === 0

  if (done || allDecided) {
    return (
      <div className="min-h-screen bg-white pb-20 sm:pb-0">
        <div className="max-w-lg mx-auto px-4 py-6">
          <h1 className="text-2xl font-black text-black mb-1">Batch done</h1>
          <p className="text-gray-500 text-sm mb-6">
            {bought.length} bought · {decided.filter(i => i.decision === 'pass').length} passed
          </p>

          {bought.length > 0 && (
            <div className="space-y-2 mb-6">
              <p className="text-xs font-black text-black uppercase tracking-wide mb-3">Buying</p>
              {bought.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-white border-2 border-black rounded-xl p-3 shadow-[3px_3px_0_0_#000]">
                  <img src={item.previewUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 border-2 border-black" />
                  <div className="flex-1 min-w-0">
                    <p className="text-black text-sm font-bold truncate">{item.result?.title ?? 'Item'}</p>
                    {item.result?.est_value_low != null && (
                      <p className="text-gray-400 text-xs">Est ${item.result.est_value_low}–{item.result.est_value_high ?? '?'}</p>
                    )}
                  </div>
                  {item.savedItemId && (
                    <Link
                      href={`/intake/${item.savedItemId}`}
                      className="shrink-0 flex items-center gap-1 text-yellow-600 text-xs font-bold hover:text-black transition-colors"
                    >
                      Intake <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setQueue([]); setFocusedId(null); setDone(false) }}
              className="flex-1 bg-white border-2 border-black text-black font-bold py-3 rounded-xl shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
            >
              Scan more
            </button>
            <Link
              href="/inventory"
              className="flex-1 flex items-center justify-center bg-yellow-400 border-2 border-black text-black font-bold py-3 rounded-xl shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
            >
              View inventory
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-0">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-black text-black">Batch Scan</h1>
          {queue.length > 0 && (
            <span className="text-gray-400 text-sm font-medium">{decided.length}/{queue.length} done</span>
          )}
        </div>
        <p className="text-gray-500 text-sm mb-5">Tap to add photos · decisions queue up automatically</p>

        {/* Camera trigger */}
        <label className="block cursor-pointer mb-5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleFile}
          />
          <div className="flex items-center justify-center gap-3 bg-white border-2 border-dashed border-black rounded-2xl py-5 hover:bg-yellow-50 transition-colors">
            <Camera size={22} className="text-gray-400" />
            <span className="text-black font-bold text-sm">
              {queue.length === 0 ? 'Take first photo' : 'Add another photo'}
            </span>
          </div>
        </label>

        {/* Focused item */}
        {focused && (
          <div className="bg-white border-2 border-black rounded-2xl overflow-hidden mb-4 shadow-[4px_4px_0_0_#000]">
            <img src={focused.previewUrl} alt="" className="w-full object-cover max-h-56" />
            <div className="p-4 space-y-3">
              {focused.phase === 'identifying' && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 size={16} className="animate-spin text-yellow-500" />
                  Identifying…
                </div>
              )}
              {focused.phase === 'error' && (
                <div className="flex items-start gap-2 bg-red-50 border-2 border-red-500 rounded-lg px-3 py-2">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm font-medium">{focused.errorMsg}</p>
                </div>
              )}
              {focused.phase === 'ready' && focused.result && (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-black font-black leading-snug">{focused.result.title}</h2>
                    <ConfidenceBadge confidence={focused.result.confidence} />
                  </div>
                  {focused.result.category && (
                    <p className="text-gray-500 text-sm">
                      {focused.result.category}
                      {focused.result.brand ? ` · ${focused.result.brand}` : ''}
                    </p>
                  )}
                  {focused.result.condition_note && (
                    <p className="text-gray-500 text-sm italic">{focused.result.condition_note}</p>
                  )}
                  {focused.result.confidence < 0.6 && (
                    <div className="flex items-start gap-2 bg-yellow-50 border-2 border-yellow-400 rounded-lg px-3 py-2">
                      <AlertTriangle size={14} className="text-yellow-600 shrink-0 mt-0.5" />
                      <p className="text-yellow-800 text-xs font-medium">Low confidence — verify before buying</p>
                    </div>
                  )}
                  {(focused.result.est_value_low != null || focused.result.est_value_high != null) && (
                    <div className="bg-yellow-50 border-2 border-black rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-0.5">AI estimate</p>
                      <p className="text-black font-black">
                        ${focused.result.est_value_low ?? '?'} – ${focused.result.est_value_high ?? '?'}
                      </p>
                      {focused.result.confidence >= 0.6 && focused.result.est_value_low != null && (
                        <p className="text-yellow-600 text-sm font-bold mt-0.5">
                          Max bid: ${(focused.result.est_value_low * 0.4).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                  <a
                    href={buildEbayUrl(focused.result.ebay_query)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full bg-white border-2 border-black rounded-lg px-3 py-2.5 hover:bg-yellow-50 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <span className="text-black text-sm font-bold">View sold comps on eBay</span>
                    <ExternalLink size={13} className="text-gray-400" />
                  </a>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={() => decide(focused.id, 'pass')}
                      disabled={saving.has(focused.id)}
                      className="flex items-center justify-center gap-2 bg-white border-2 border-black text-black font-bold py-3.5 rounded-xl shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all disabled:opacity-50"
                    >
                      {saving.has(focused.id) ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={18} className="text-red-500" />}
                      Pass
                    </button>
                    <button
                      onClick={() => decide(focused.id, 'buy')}
                      disabled={saving.has(focused.id)}
                      className="flex items-center justify-center gap-2 bg-green-400 border-2 border-black text-black font-bold py-3.5 rounded-xl shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all disabled:opacity-50"
                    >
                      {saving.has(focused.id) ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={18} />}
                      Buy
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Queue strip */}
        {queue.length > 1 && (
          <div className="space-y-1">
            <p className="text-xs font-black text-black uppercase tracking-wide mb-2">Queue</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {queue.filter(i => i.id !== focusedId).map(item => (
                <button
                  key={item.id}
                  onClick={() => item.phase === 'ready' && item.decision === null && setFocusedId(item.id)}
                  className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    item.decision === 'buy' ? 'border-green-500 opacity-50' :
                    item.decision === 'pass' ? 'border-gray-300 opacity-30' :
                    item.phase === 'ready' ? 'border-yellow-400 cursor-pointer shadow-[2px_2px_0_0_#facc15]' :
                    'border-black'
                  }`}
                >
                  <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                  {item.phase === 'identifying' && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <Loader2 size={16} className="text-yellow-500 animate-spin" />
                    </div>
                  )}
                  {item.decision === 'buy' && (
                    <div className="absolute inset-0 bg-green-400/30 flex items-center justify-center">
                      <CheckCircle size={16} className="text-green-700" />
                    </div>
                  )}
                  {item.decision === 'pass' && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <XCircle size={16} className="text-gray-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Finish early */}
        {decided.length > 0 && pending.length > 0 && (
          <button
            onClick={() => setDone(true)}
            className="w-full mt-4 text-gray-400 hover:text-black text-sm py-2 transition-colors font-medium"
          >
            Finish early ({decided.length} decided)
          </button>
        )}
      </div>
    </div>
  )
}
