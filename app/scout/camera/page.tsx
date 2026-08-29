'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Camera, CheckCircle2, Loader2, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react'
import ConfidenceBadge from '@/components/ConfidenceBadge'
import type { IdentifyResponse } from '@/types'
import { computeMaxBid, DEFAULT_MAX_BID_PCT } from '@/lib/max-bid'

type ItemPhase = 'identifying' | 'saving' | 'saved' | 'error'

interface QueueItem {
  id: string
  blob: Blob
  previewUrl: string
  phase: ItemPhase
  result: IdentifyResponse | null
  errorMsg: string | null
  savedItemId: string | null
  haulId: string | null
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

function getLocation(): Promise<{ lat: number | null; lng: number | null }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ lat: null, lng: null })
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: null, lng: null }),
      { timeout: 8000, maximumAge: 300_000 }
    )
  })
}

export default function ScoutCameraPage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [maxBidPct, setMaxBidPct] = useState<number>(DEFAULT_MAX_BID_PCT)
  const inputRef = useRef<HTMLInputElement>(null)
  const locationRef = useRef<Promise<{ lat: number | null; lng: number | null }> | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setMaxBidPct(d.max_bid_pct ?? DEFAULT_MAX_BID_PCT)).catch(() => {})
  }, [])

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }, [])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (inputRef.current) inputRef.current.value = ''

    // Kick off geolocation once per session, reused by every capture in it.
    if (!locationRef.current) locationRef.current = getLocation()

    const blob = await resizeImage(file)
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setQueue(prev => [...prev, {
      id, blob, previewUrl: URL.createObjectURL(blob),
      phase: 'identifying', result: null, errorMsg: null, savedItemId: null, haulId: null,
    }])

    try {
      const fd = new FormData()
      fd.append('image', blob, 'photo.jpg')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)
      const res = await fetch('/api/identify', { method: 'POST', body: fd, signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) { const { error } = await res.json(); throw new Error(error ?? 'Identification failed') }
      const result: IdentifyResponse = await res.json()
      updateItem(id, { phase: 'saving', result })

      const { lat, lng } = await locationRef.current
      const maxBid = computeMaxBid(result.est_value_low, result.confidence, maxBidPct)

      const saveBody: Record<string, unknown> = {
        status: 'scouted',
        lane: result.lane, title: result.title, category: result.category,
        brand: result.brand ?? null, model: result.model ?? null,
        condition_note: result.condition_note ?? null,
        ai_identification: result, ai_confidence: result.confidence,
        est_value_low: result.est_value_low ?? null, est_value_high: result.est_value_high ?? null,
        max_bid: maxBid, lat, lng,
      }
      if (result.lane === 'card' && result.card_details) saveBody.card_details = result.card_details

      const saveRes = await fetch('/api/items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(saveBody),
      })
      if (!saveRes.ok) throw new Error('Failed to save item')
      const saved = await saveRes.json()

      const uploadFd = new FormData()
      uploadFd.append('file', blob, 'scout-photo.jpg')
      uploadFd.append('item_id', saved.id)
      uploadFd.append('is_primary', 'true')
      fetch('/api/upload', { method: 'POST', body: uploadFd }).catch(() => {})

      updateItem(id, { phase: 'saved', savedItemId: saved.id, haulId: saved.haul_id ?? null })
    } catch (err) {
      updateItem(id, { phase: 'error', errorMsg: err instanceof Error ? err.message : 'Failed' })
    }
  }

  const saved = queue.filter(i => i.phase === 'saved')
  const currentHaulId = [...queue].reverse().find(i => i.haulId)?.haulId ?? null

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-0">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/scout" className="text-gray-400 hover:text-black transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center justify-between flex-1">
            <h1 className="text-2xl font-black text-black">Scout</h1>
            {queue.length > 0 && <span className="text-gray-400 text-sm font-medium">{saved.length} captured</span>}
          </div>
        </div>
        <p className="text-gray-500 text-sm mb-5 pl-8">Keep shooting — every photo auto-queues, decisions happen at checkout</p>

        <label className="block cursor-pointer mb-5">
          <input ref={inputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleFile} />
          <div className="flex items-center justify-center gap-3 bg-white border-2 border-dashed border-black rounded-2xl py-8 hover:bg-yellow-50 transition-colors">
            <Camera size={24} className="text-gray-400" />
            <span className="text-black font-bold text-sm">{queue.length === 0 ? 'Take first photo' : 'Take another photo'}</span>
          </div>
        </label>

        {queue.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[...queue].reverse().map(item => (
              <div key={item.id} className="relative bg-white border-2 border-black rounded-xl overflow-hidden shadow-[3px_3px_0_0_#000]">
                <img src={item.previewUrl} alt="" className="w-full aspect-square object-cover" />
                <div className="p-2 space-y-1">
                  {item.phase === 'identifying' && (
                    <div className="flex items-center gap-1 text-gray-500 text-xs"><Loader2 size={12} className="animate-spin text-yellow-500" /> Identifying…</div>
                  )}
                  {item.phase === 'saving' && (
                    <div className="flex items-center gap-1 text-gray-500 text-xs"><Loader2 size={12} className="animate-spin text-yellow-500" /> Saving…</div>
                  )}
                  {item.phase === 'error' && (
                    <div className="flex items-start gap-1 text-red-600 text-xs"><AlertTriangle size={12} className="shrink-0 mt-0.5" /> {item.errorMsg}</div>
                  )}
                  {item.phase === 'saved' && item.result && (
                    <>
                      <p className="text-black text-xs font-bold leading-snug line-clamp-2">{item.result.title}</p>
                      <div className="flex items-center justify-between">
                        <ConfidenceBadge confidence={item.result.confidence} />
                        <CheckCircle2 size={14} className="text-green-500" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {saved.length > 0 && (
          <Link
            href={currentHaulId ? `/hauls/checkout/${currentHaulId}` : '/hauls'}
            className="flex items-center justify-center gap-2 w-full bg-yellow-400 border-2 border-black text-black font-bold py-4 rounded-xl shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
          >
            Checkout ({saved.length} {saved.length === 1 ? 'item' : 'items'})
            <ArrowRight size={18} />
          </Link>
        )}
      </div>
    </div>
  )
}
