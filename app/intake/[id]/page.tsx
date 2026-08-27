'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Camera, Star, Loader2 } from 'lucide-react'
import type { Item, ItemLane } from '@/types'

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

interface PhotoPreview {
  url: string
  blob: Blob
  isPrimary: boolean
}

type Mode = 'new' | 'edit'

export default function IntakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const isNew = id === 'new'
  const router = useRouter()

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  // Core fields
  const [lane, setLane] = useState<ItemLane>('general')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [conditionNote, setConditionNote] = useState('')
  const [acquiredPrice, setAcquiredPrice] = useState('')
  const [acquiredAt, setAcquiredAt] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [acquiredSource, setAcquiredSource] = useState('')
  const [storageLocation, setStorageLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('acquired')

  // Card fields
  const [setName, setSetName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [language, setLanguage] = useState('EN')
  const [printing, setPrinting] = useState('')
  const [isGraded, setIsGraded] = useState(false)
  const [grader, setGrader] = useState('')
  const [grade, setGrade] = useState('')

  // Photos
  const [pendingPhotos, setPendingPhotos] = useState<PhotoPreview[]>([])
  const [existingPhotos, setExistingPhotos] = useState<{ id: string; url: string; is_primary: boolean }[]>([])

  function applyItem(item: Item) {
    setLane(item.lane ?? 'general')
    setTitle(item.title ?? '')
    setCategory(item.category ?? '')
    setBrand(item.brand ?? '')
    setModel(item.model ?? '')
    setConditionNote(item.condition_note ?? '')
    setAcquiredPrice(item.acquired_price?.toString() ?? '')
    if (item.acquired_at) setAcquiredAt(item.acquired_at)
    setAcquiredSource(item.acquired_source ?? '')
    setStorageLocation(item.storage_location ?? '')
    setNotes(item.notes ?? '')
    setStatus(item.status ?? 'acquired')
    if (item.card_details) {
      setSetName(item.card_details.set_name ?? '')
      setCardNumber(item.card_details.card_number ?? '')
      setCardName(item.card_details.card_name ?? '')
      setLanguage(item.card_details.language ?? 'EN')
      setPrinting(item.card_details.printing ?? '')
      setIsGraded(item.card_details.is_graded)
      setGrader(item.card_details.grader ?? '')
      setGrade(item.card_details.grade?.toString() ?? '')
    }
    const photos = (item as Item & { item_photos?: typeof item.photos }).item_photos ?? item.photos ?? []
    setExistingPhotos(photos)
  }

  useEffect(() => {
    if (isNew) return

    // Use scout result stored in sessionStorage for instant prefill
    const prefillJson = sessionStorage.getItem('scout-prefill')
    if (prefillJson) {
      try {
        const { itemId, result, photoDataUrl } = JSON.parse(prefillJson) as { itemId: string; result: import('@/types').IdentifyResponse; photoDataUrl?: string }
        if (itemId === id) {
          sessionStorage.removeItem('scout-prefill')
          applyItem({
            id,
            status: 'acquired',
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
            max_bid: null,
            acquired_price: null,
            acquired_at: null,
            acquired_source: null,
            storage_location: null,
            listed_price: null,
            listed_at: null,
            ebay_item_id: null,
            sold_price: null,
            sold_at: null,
            fees: null,
            shipping_cost: null,
            notes: null,
            created_by: '',
            created_at: '',
            card_details: result.card_details ? {
              item_id: id,
              set_name: result.card_details.set_name ?? null,
              set_code: result.card_details.set_code ?? null,
              card_number: result.card_details.card_number ?? null,
              card_name: result.card_details.card_name ?? null,
              language: result.card_details.language ?? 'EN',
              printing: result.card_details.printing ?? null,
              is_graded: false,
              grader: null,
              grade: null,
            } : null,
          })
          // Load the scout photo directly (stored in sessionStorage to survive navigation)
          if (photoDataUrl) {
            fetch(photoDataUrl)
              .then(r => r.blob())
              .then(blob => setPendingPhotos([{ url: URL.createObjectURL(blob), blob, isPrimary: true }]))
              .catch(() => {})
          }
          setLoading(false)
          return
        }
      } catch {}
    }

    // Fallback: fetch from API (for editing existing items)
    fetch(`/api/items/${id}`)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
      .then((item: Item) => {
        applyItem(item)
        setLoading(false)
      })
      .catch(err => {
        console.error('[intake] fetch failed:', err)
        setLoading(false)
      })
  }, [id, isNew])

  async function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const previews: PhotoPreview[] = await Promise.all(
      files.map(async (f, i) => {
        const blob = await resizeImage(f)
        return { url: URL.createObjectURL(blob), blob, isPrimary: pendingPhotos.length === 0 && i === 0 }
      })
    )
    setPendingPhotos(prev => [...prev, ...previews])
    e.target.value = ''
  }

  function setPrimary(index: number) {
    setPendingPhotos(prev => prev.map((p, i) => ({ ...p, isPrimary: i === index })))
  }

  async function uploadPhotos(itemId: string) {
    for (const photo of pendingPhotos) {
      const fd = new FormData()
      fd.append('file', photo.blob, 'photo.jpg')
      fd.append('item_id', itemId)
      fd.append('is_primary', photo.isPrimary ? 'true' : 'false')
      await fetch('/api/upload', { method: 'POST', body: fd })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const body: Record<string, unknown> = {
      lane,
      title: title || null,
      category: category || null,
      brand: brand || null,
      model: model || null,
      condition_note: conditionNote || null,
      acquired_price: acquiredPrice ? parseFloat(acquiredPrice) : null,
      acquired_at: acquiredAt || null,
      acquired_source: acquiredSource || null,
      storage_location: storageLocation || null,
      notes: notes || null,
      status,
    }

    if (lane === 'card') {
      body.card_details = {
        set_name: setName || null,
        card_number: cardNumber || null,
        card_name: cardName || null,
        language: language || 'EN',
        printing: printing || null,
        is_graded: isGraded,
        grader: isGraded && grader ? grader : null,
        grade: isGraded && grade ? parseFloat(grade) : null,
      }
    }

    let itemId = isNew ? null : id
    if (isNew) {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const item = await res.json()
        itemId = item.id
      }
    } else {
      await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }

    if (itemId && pendingPhotos.length > 0) {
      setUploadingPhotos(true)
      await uploadPhotos(itemId)
      setUploadingPhotos(false)
    }

    setSaving(false)
    router.push(itemId ? `/inventory/${itemId}` : '/inventory')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const inputClass = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
  const labelClass = "block text-xs text-zinc-400 mb-1"

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 sm:pb-8">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href={isNew ? '/inventory' : `/inventory/${id}`} className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-white">{isNew ? 'Add item' : 'Edit item'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Lane toggle */}
          <div>
            <label className={labelClass}>Lane</label>
            <div className="flex rounded-lg overflow-hidden border border-zinc-700">
              {(['general', 'card'] as ItemLane[]).map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLane(l)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${lane === l ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                >
                  {l === 'card' ? 'Trading Card' : 'General'}
                </button>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className={labelClass}>Photos</label>
            <div className="flex gap-2 flex-wrap">
              {existingPhotos.map(p => (
                <div key={p.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-700">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  {p.is_primary && <span className="absolute bottom-0 inset-x-0 text-center text-xs bg-blue-600/80 text-white py-0.5">Primary</span>}
                </div>
              ))}
              {pendingPhotos.map((p, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-700">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPrimary(i)}
                    className="absolute top-1 right-1 text-yellow-400 hover:text-yellow-300"
                    title="Set as primary"
                  >
                    <Star size={14} fill={p.isPrimary ? 'currentColor' : 'none'} />
                  </button>
                  {p.isPrimary && <span className="absolute bottom-0 inset-x-0 text-center text-xs bg-blue-600/80 text-white py-0.5">Primary</span>}
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex flex-col items-center justify-center cursor-pointer transition-colors">
                <Camera size={18} className="text-zinc-500" />
                <span className="text-xs text-zinc-500 mt-1">Add</span>
                <input type="file" accept="image/*" multiple className="sr-only" onChange={addPhotos} />
              </label>
            </div>
          </div>

          {/* Core fields */}
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Charizard Base Set Holo"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Category</label>
                <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Pokemon Card" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Condition</label>
                <input type="text" value={conditionNote} onChange={e => setConditionNote(e.target.value)} placeholder="NM, light wear…" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Brand</label>
                <input type="text" value={brand} onChange={e => setBrand(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Model</label>
                <input type="text" value={model} onChange={e => setModel(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Card details */}
          {lane === 'card' && (
            <div className="space-y-3 border border-zinc-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Card details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Card name</label>
                  <input type="text" value={cardName} onChange={e => setCardName(e.target.value)} placeholder="Charizard" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Set name</label>
                  <input type="text" value={setName} onChange={e => setSetName(e.target.value)} placeholder="Base Set" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Card number</label>
                  <input type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="4/102" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Printing</label>
                  <input type="text" value={printing} onChange={e => setPrinting(e.target.value)} placeholder="Holo, 1st Edition…" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Language</label>
                  <select value={language} onChange={e => setLanguage(e.target.value)} className={inputClass}>
                    <option value="EN">English</option>
                    <option value="JP">Japanese</option>
                    <option value="DE">German</option>
                    <option value="FR">French</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <input
                    id="graded"
                    type="checkbox"
                    checked={isGraded}
                    onChange={e => setIsGraded(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="graded" className="text-sm text-zinc-300">Graded</label>
                </div>
                {isGraded && (
                  <>
                    <div>
                      <label className={labelClass}>Grader</label>
                      <select value={grader} onChange={e => setGrader(e.target.value)} className={inputClass}>
                        <option value="">Select…</option>
                        <option value="PSA">PSA</option>
                        <option value="BGS">BGS</option>
                        <option value="CGC">CGC</option>
                        <option value="SGC">SGC</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Grade</label>
                      <input type="number" min="1" max="10" step="0.5" value={grade} onChange={e => setGrade(e.target.value)} placeholder="9" className={inputClass} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Acquisition */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Acquisition</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Cost paid *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                  <input type="number" step="0.01" min="0" value={acquiredPrice} onChange={e => setAcquiredPrice(e.target.value)} className={`${inputClass} pl-7`} placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Date</label>
                <input type="date" value={acquiredAt} onChange={e => setAcquiredAt(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Source</label>
                <input type="text" value={acquiredSource} onChange={e => setAcquiredSource(e.target.value)} placeholder="Garage sale, estate…" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Storage location</label>
                <input type="text" value={storageLocation} onChange={e => setStorageLocation(e.target.value)} placeholder="Bin 4" className={inputClass} />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} placeholder="Any extra notes…" />
          </div>

          <button
            type="submit"
            disabled={saving || uploadingPhotos}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving || uploadingPhotos ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {uploadingPhotos ? 'Uploading photos…' : 'Saving…'}
              </>
            ) : (
              isNew ? 'Add to inventory' : 'Save changes'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
