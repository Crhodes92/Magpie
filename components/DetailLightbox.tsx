'use client'

import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface DetailLightboxProps<T> {
  items: T[]
  /** Index into `items` to open at; null closes it. Navigation between items is handled internally. */
  openIndex: number | null
  onClose: () => void
  renderPhoto: (item: T) => React.ReactNode
  renderDetails: (item: T) => React.ReactNode
}

export default function DetailLightbox<T>({ items, openIndex, onClose, renderPhoto, renderDetails }: DetailLightboxProps<T>) {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [prevOpenIndex, setPrevOpenIndex] = useState<number | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartX = useRef<number | null>(null)

  // Mirror `openIndex` into local state as it changes — done during render
  // (React's documented pattern for adjusting state in response to a prop
  // change) rather than in an effect, since it must land before paint.
  if (openIndex !== prevOpenIndex) {
    setPrevOpenIndex(openIndex)
    if (openIndex != null) {
      setCurrentIndex(openIndex)
      setVisible(false)
    }
  }

  // The actual side effects — starting the entrance transition and, on
  // close, delaying the unmount until the exit transition finishes.
  useEffect(() => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
    if (openIndex != null) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(raf)
    }
    if (currentIndex != null) {
      closeTimerRef.current = setTimeout(() => setCurrentIndex(null), 200)
      return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex])

  function move(delta: number) {
    setCurrentIndex(idx => {
      if (idx == null) return idx
      const next = idx + delta
      return next >= 0 && next < items.length ? next : idx
    })
  }

  useEffect(() => {
    if (currentIndex == null) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') move(-1)
      else if (e.key === 'ArrowRight') move(1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, items.length, onClose])

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) > 50) move(delta < 0 ? 1 : -1)
  }

  if (currentIndex == null) return null
  const item = items[currentIndex]
  if (!item) return null

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-[1px] flex items-center justify-center p-4 transition-opacity duration-200 ease-out motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-md bg-white rounded-2xl border-2 border-black shadow-[6px_6px_0_0_#000] overflow-hidden max-h-[88vh] flex flex-col transition-all duration-200 ease-out motion-reduce:transition-none ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2.5 right-2.5 z-10 bg-white/90 border-2 border-black rounded-full p-1.5 hover:bg-white transition-colors"
        >
          <X size={16} />
        </button>

        {currentIndex > 0 && (
          <button
            onClick={() => move(-1)}
            aria-label="Previous item"
            className="absolute left-2 top-[35%] -translate-y-1/2 z-10 bg-white/90 border-2 border-black rounded-full p-1.5 hover:bg-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {currentIndex < items.length - 1 && (
          <button
            onClick={() => move(1)}
            aria-label="Next item"
            className="absolute right-2 top-[35%] -translate-y-1/2 z-10 bg-white/90 border-2 border-black rounded-full p-1.5 hover:bg-white transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        )}

        <div className="aspect-square bg-gray-100 shrink-0" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {renderPhoto(item)}
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {renderDetails(item)}
        </div>
      </div>
    </div>
  )
}
