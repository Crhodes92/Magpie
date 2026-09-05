'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Camera, Star, Loader2, X } from 'lucide-react'
import { useToast } from '@/components/Toast'
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

const EBAY_CONDITIONS = [
  { id: '1000', label: 'New' },
  { id: '1500', label: 'New other' },
  { id: '2000', label: 'Manufacturer refurbished' },
  { id: '3000', label: 'Used' },
  { id: '4000', label: 'Very Good' },
  { id: '5000', label: 'Good' },
  { id: '6000', label: 'Acceptable' },
  { id: '7000', label: 'For parts or not working' },
]

interface PhotoPreview {
  url: string
  blob: Blob
  isPrimary: boolean
}

export default function IntakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const isNew = id === 'new'
  const router = useRouter()
  const showToast = useToast()

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

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
  const [ebayCategoryId, setEbayCategoryId] = useState('')
  const [ebayConditionId, setEbayConditionId] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [tagVocabulary, setTagVocabulary] = useState<string[]>([])

  const [setName, setSetName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [language, setLanguage] = useState('EN')
  const [printing, setPrinting] = useState('')
  const [isGraded, setIsGraded] = useState(false)
  const [grader, setGrader] = useState('')
  const [grade, setGrade] = useState('')

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
    setTags(item.tags ?? [])
    setEbayCategoryId(item.ebay_category_id ?? '')
    setEbayConditionId(item.ebay_condition_id?.toString() ?? '')
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

    fetch(`/api/items/${id}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then((item: Item) => { applyItem(item); setLoading(false) })
      .catch(err => { console.error('[intake] fetch failed:', err); setLoading(false) })
  }, [id, isNew])

  useEffect(() => {
    fetch('/api/tags')
      .then(r => r.json())
      .then(d => setTagVocabulary(d.tags ?? []))
      .catch(() => {})
  }, [])

  function addTag(tag: string) {
    const trimmed = tag.trim()
    if (!trimmed) return
    setTags(prev => prev.some(t => t.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed])
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

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
      tags,
      ebay_category_id: ebayCategoryId || null,
      ebay_condition_id: ebayConditionId ? parseInt(ebayConditionId, 10) : null,
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
    try {
      if (isNew) {
        const res = await fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const resBody = await res.json()
        if (!res.ok) throw new Error(resBody?.error ?? `Failed to save (${res.status})`)
        itemId = resBody.id
      } else {
        const res = await fetch(`/api/items/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        if (!res.ok) {
          const resBody = await res.json()
          throw new Error(resBody?.error ?? `Failed to save (${res.status})`)
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save item', 'error')
      setSaving(false)
      return
    }

    if (itemId && pendingPhotos.length > 0) {
      setUploadingPhotos(true)
      await uploadPhotos(itemId)
      setUploadingPhotos(false)
    }

    setSaving(false)
    showToast(isNew ? 'Item added' : 'Item updated', 'success')
    router.push(itemId ? `/items/${itemId}` : '/hauls')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const inputClass = "w-full bg-white border-2 border-black rounded-lg px-3 py-2.5 text-black text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
  const labelClass = "block text-xs text-gray-500 mb-1 font-medium"

  return (
    <div className="min-h-screen bg-white pb-24 sm:pb-8">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href={isNew ? '/hauls' : `/items/${id}`} className="text-gray-400 hover:text-black transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black text-black">{isNew ? 'Add item' : 'Edit item'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Lane toggle */}
          <div>
            <label className={labelClass}>Lane</label>
            <div className="flex rounded-xl overflow-hidden border-2 border-black">
              {(['general', 'card'] as ItemLane[]).map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLane(l)}
                  className={`flex-1 py-2.5 text-sm font-bold transition-colors ${lane === l ? 'bg-yellow-400 text-black' : 'bg-white text-gray-400 hover:text-black'}`}
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
                <div key={p.id} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-black">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  {p.is_primary && <span className="absolute bottom-0 inset-x-0 text-center text-xs bg-yellow-400 text-black font-bold py-0.5">Primary</span>}
                </div>
              ))}
              {pendingPhotos.map((p, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-black">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPrimary(i)}
                    className="absolute top-1 right-1 text-yellow-500 hover:text-yellow-400"
                    title="Set as primary"
                  >
                    <Star size={14} fill={p.isPrimary ? 'currentColor' : 'none'} />
                  </button>
                  {p.isPrimary && <span className="absolute bottom-0 inset-x-0 text-center text-xs bg-yellow-400 text-black font-bold py-0.5">Primary</span>}
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-black hover:bg-yellow-50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                <Camera size={18} className="text-gray-400" />
                <span className="text-xs text-gray-400 mt-1 font-medium">Add</span>
                <input type="file" accept="image/*" multiple className="sr-only" onChange={addPhotos} />
              </label>
            </div>
          </div>

          {/* Core fields */}
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Charizard Base Set Holo" className={inputClass} />
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
            <div className="space-y-3 border-2 border-black rounded-xl p-4 bg-yellow-50">
              <p className="text-xs font-black text-black uppercase tracking-wide">Card details</p>
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
                    className="w-4 h-4 rounded border-2 border-black bg-white text-yellow-400 focus:ring-yellow-400"
                  />
                  <label htmlFor="graded" className="text-sm text-black font-medium">Graded</label>
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
            <p className="text-xs font-black text-black uppercase tracking-wide">Acquisition</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Cost paid *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
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

          {/* eBay listing */}
          <div className="space-y-3">
            <p className="text-xs font-black text-black uppercase tracking-wide">eBay listing</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>eBay category ID</label>
                <input type="text" value={ebayCategoryId} onChange={e => setEbayCategoryId(e.target.value)} placeholder="e.g. 183454" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Condition</label>
                <select value={ebayConditionId} onChange={e => setEbayConditionId(e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  {EBAY_CONDITIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-400">Find the category ID via eBay&apos;s category search — needed for the eBay CSV export.</p>
          </div>

          {/* Tags */}
          <div>
            <label className={labelClass}>Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-yellow-100 border-2 border-black rounded-full pl-3 pr-2 py-1 text-xs font-bold text-black">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-black/50 hover:text-black">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              list="tag-vocabulary"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addTag(tagInput)
                }
              }}
              onBlur={() => addTag(tagInput)}
              placeholder="Add a tag, press Enter…"
              className={inputClass}
            />
            <datalist id="tag-vocabulary">
              {tagVocabulary.map(t => <option key={t} value={t} />)}
            </datalist>
            <p className="text-xs text-gray-400 mt-1">Category and matching card sets are tagged automatically — add anything else here.</p>
          </div>

          <button
            type="submit"
            disabled={saving || uploadingPhotos}
            className="w-full bg-yellow-400 text-black border-2 border-black font-black py-3.5 rounded-xl shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
