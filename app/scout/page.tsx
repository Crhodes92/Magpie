'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, AlertTriangle, ExternalLink, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import ConfidenceBadge from '@/components/ConfidenceBadge'
import type { IdentifyResponse } from '@/types'

type Phase = 'idle' | 'loading' | 'result' | 'error'

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

export default function ScoutPage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<IdentifyResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setPhase('loading')
    setResult(null)
    setPhotoBlob(null)

    try {
      const blob = await resizeImage(file)
      setPhotoBlob(blob)
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

      const data: IdentifyResponse = await res.json()
      setResult(data)
      setPhase('result')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('error')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDecision(buy: boolean) {
    if (!result) return
    setSaving(true)

    const body: Record<string, unknown> = {
      status: buy ? 'acquired' : 'passed',
      lane: result.lane,
      title: result.title,
      category: result.category,
      brand: result.brand ?? null,
      model: result.model ?? null,
      condition_note: result.condition_note ?? null,
      ai_identification: result,
      ai_confidence: result.confidence,
      est_value_low: result.est_value_low ?? null,
      est_value_high: result.est_value_high ?? null,
      max_bid: result.confidence >= 0.6 && result.est_value_low
        ? Math.round(result.est_value_low * 0.4 * 100) / 100
        : null,
    }

    if (result.lane === 'card' && result.card_details) {
      body.card_details = result.card_details
    }

    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok && buy) {
      const item = await res.json()
      const prefill: Record<string, unknown> = { itemId: item.id, result }
      if (photoBlob) {
        prefill.photoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(photoBlob)
        })
      }
      sessionStorage.setItem('scout-prefill', JSON.stringify(prefill))
      router.push(`/intake/${item.id}`)
    } else {
      setPhase('idle')
      setPreview(null)
      setResult(null)
    }
    setSaving(false)
  }

  const lowConfidence = result && result.confidence < 0.6

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-0">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-black text-black mb-1">Scout</h1>
        <p className="text-gray-500 text-sm mb-6">Photo → identity + comp price in under 30s</p>

        {/* Camera trigger */}
        {phase === 'idle' && (
          <label className="block cursor-pointer">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handleFile}
            />
            <div className="flex flex-col items-center justify-center gap-4 bg-white border-2 border-dashed border-black rounded-2xl py-16 hover:bg-yellow-50 transition-colors">
              <Camera size={48} className="text-gray-400" />
              <div className="text-center">
                <p className="text-black font-bold">Take a photo</p>
                <p className="text-gray-400 text-sm mt-1">or tap to pick from camera roll</p>
              </div>
            </div>
          </label>
        )}

        {/* Loading */}
        {phase === 'loading' && (
          <div className="space-y-4">
            {preview && (
              <img src={preview} alt="" className="w-full rounded-xl object-cover max-h-64 border-2 border-black" />
            )}
            <div className="flex items-center gap-3 bg-white border-2 border-black rounded-xl px-4 py-4 shadow-[4px_4px_0_0_#000]">
              <Loader2 size={20} className="text-yellow-500 animate-spin shrink-0" />
              <span className="text-black text-sm font-medium">Identifying item…</span>
            </div>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="space-y-4">
            <div className="bg-red-50 border-2 border-red-500 rounded-xl px-4 py-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm font-medium">{errorMsg}</p>
            </div>
            <button
              onClick={() => { setPhase('idle'); setPreview(null) }}
              className="w-full bg-white border-2 border-black text-black font-bold py-3 rounded-xl shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
            >
              Try again
            </button>
          </div>
        )}

        {/* Result */}
        {phase === 'result' && result && (
          <div className="space-y-4">
            {preview && (
              <img src={preview} alt="" className="w-full rounded-xl object-cover max-h-64 border-2 border-black" />
            )}

            <div className="bg-white border-2 border-black rounded-xl p-4 space-y-3 shadow-[4px_4px_0_0_#000]">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-black font-bold leading-snug">{result.title}</h2>
                <ConfidenceBadge confidence={result.confidence} />
              </div>

              {result.category && (
                <p className="text-gray-500 text-sm">{result.category}{result.brand ? ` · ${result.brand}` : ''}{result.model ? ` ${result.model}` : ''}</p>
              )}

              {result.condition_note && (
                <p className="text-gray-500 text-sm italic">{result.condition_note}</p>
              )}

              {lowConfidence && (
                <div className="flex items-start gap-2 bg-yellow-50 border-2 border-yellow-400 rounded-lg px-3 py-2">
                  <AlertTriangle size={14} className="text-yellow-600 shrink-0 mt-0.5" />
                  <p className="text-yellow-800 text-xs font-medium">Low confidence — verify before buying. No max bid suggested.</p>
                </div>
              )}

              {result.lane === 'card' && result.card_details && (
                <div className="bg-gray-50 border-2 border-black rounded-lg px-3 py-2 text-sm space-y-0.5">
                  {result.card_details.card_name && <p><span className="text-gray-400">Card:</span> <span className="text-black font-medium">{result.card_details.card_name}</span></p>}
                  {result.card_details.set_name && <p><span className="text-gray-400">Set:</span> <span className="text-black font-medium">{result.card_details.set_name}</span></p>}
                  {result.card_details.card_number && <p><span className="text-gray-400">Number:</span> <span className="text-black font-medium">{result.card_details.card_number}</span></p>}
                  {result.card_details.printing && <p><span className="text-gray-400">Printing:</span> <span className="text-black font-medium">{result.card_details.printing}</span></p>}
                  {result.card_details.language && <p><span className="text-gray-400">Language:</span> <span className="text-black font-medium">{result.card_details.language}</span></p>}
                </div>
              )}

              {(result.est_value_low != null || result.est_value_high != null) && (
                <div className="bg-yellow-50 border-2 border-black rounded-lg px-3 py-2 space-y-1">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">AI estimate · verify on eBay</p>
                  <p className="text-black font-black text-xl">
                    {result.est_value_low != null ? `$${result.est_value_low}` : '?'}
                    {' – '}
                    {result.est_value_high != null ? `$${result.est_value_high}` : '?'}
                    <span className="text-gray-400 font-normal text-sm ml-1">sold range</span>
                  </p>
                  {!lowConfidence && result.est_value_low != null && (
                    <p className="text-black text-sm font-bold">Max bid: <span className="text-yellow-600">${(result.est_value_low * 0.4).toFixed(2)}</span></p>
                  )}
                </div>
              )}

              <a
                href={buildEbayUrl(result.ebay_query)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full bg-white border-2 border-black rounded-lg px-3 py-2.5 hover:bg-yellow-50 transition-colors"
              >
                <span className="text-black text-sm font-bold">View sold comps on eBay</span>
                <ExternalLink size={14} className="text-gray-400" />
              </a>

              <p className="text-gray-400 text-xs">{result.reasoning}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleDecision(false)}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-white border-2 border-black text-black font-bold py-4 rounded-xl shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all disabled:opacity-50"
              >
                <XCircle size={18} className="text-red-500" />
                Pass
              </button>
              <button
                onClick={() => handleDecision(true)}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-green-400 border-2 border-black text-black font-bold py-4 rounded-xl shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                Buy
              </button>
            </div>

            <button
              onClick={() => { setPhase('idle'); setPreview(null); setResult(null) }}
              className="w-full text-gray-400 hover:text-black text-sm py-2 transition-colors"
            >
              Scan another
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
