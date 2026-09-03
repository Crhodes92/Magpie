import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export const CLUSTER_DISTANCE_MILES = 2
export const CLUSTER_TIME_HOURS = 3

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function defaultHaulName(when: Date): string {
  return when.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/**
 * Best-effort reverse geocode via OpenStreetMap's public Nominatim API (free,
 * no key, but rate-limited and not for heavy/commercial use — swap for a
 * paid geocoder like Google/Mapbox if volume grows). Usually resolves to a
 * street or neighborhood name, not a specific business, unless that exact
 * spot happens to be tagged as a POI in OSM's data. Never throws — returns
 * null on any failure so callers can fall back to a plain timestamp name.
 */
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`,
      { headers: { 'User-Agent': 'Magpie-ResellerApp/1.0 (personal use)' }, signal: controller.signal }
    )
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json()
    const address = data.address ?? {}
    // Prefer a specific venue/place tag over `name`, which is just whichever
    // OSM feature the exact point falls on (often a road, even in a named
    // shopping district) — a shop/amenity tag is a more useful haul name.
    return address.shop || address.amenity || address.tourism || address.leisure
      || address.commercial || address.office || data.name
      || address.suburb || address.neighbourhood || address.road || address.city || address.town || null
  } catch {
    return null
  }
}

function pluralize(word: string, count: number): string {
  if (count === 1) return word
  return word.endsWith('s') ? word : `${word}s`
}

/** Summarizes a haul's items into a short phrase like "3 Pokemon Cards" or "Cards & Tools". */
export function summarizeItemCategories(items: { category: string | null }[]): string {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = item.category?.trim() || 'item'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])

  if (sorted.length === 1) {
    const [category, count] = sorted[0]
    return `${count} ${pluralize(category, count)}`
  }
  if (sorted.length === 2) {
    return `${pluralize(sorted[0][0], 2)} & ${pluralize(sorted[1][0], 2)}`
  }
  const total = items.length
  return `${total} items`
}

/**
 * Recomputes an auto-named haul's name from its current location_label +
 * item contents. No-ops if the user has manually renamed the haul
 * (name_is_auto = false). Best-effort — failures are logged, not thrown,
 * since this runs as a side effect of saving an item and shouldn't block it.
 */
export async function refreshHaulName(supabase: SupabaseServerClient, haulId: string): Promise<void> {
  const { data: haul } = await supabase
    .from('hauls')
    .select('name_is_auto, location_label')
    .eq('id', haulId)
    .single()

  if (!haul || !haul.name_is_auto) return

  const { data: items } = await supabase
    .from('items')
    .select('category')
    .eq('haul_id', haulId)

  if (!items || items.length === 0) return

  const itemSummary = summarizeItemCategories(items)
  const name = haul.location_label ? `${haul.location_label} — ${itemSummary}` : itemSummary

  const { error } = await supabase.from('hauls').update({ name }).eq('id', haulId)
  if (error) console.error('[refreshHaulName] update error:', error.message)
}

/**
 * Decides which haul a newly-captured item belongs to: the same haul as the
 * user's most recently captured item if within CLUSTER_DISTANCE_MILES (when
 * both have coordinates) or CLUSTER_TIME_HOURS (fallback), otherwise a new one.
 */
export async function resolveHaulId(
  supabase: SupabaseServerClient,
  userId: string,
  lat: number | null,
  lng: number | null,
  now: Date = new Date()
): Promise<string> {
  const { data: last } = await supabase
    .from('items')
    .select('haul_id, lat, lng, created_at')
    .eq('created_by', userId)
    .not('haul_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let sameHaul = false
  if (last?.haul_id) {
    if (last.lat != null && last.lng != null && lat != null && lng != null) {
      sameHaul = haversineMiles(last.lat, last.lng, lat, lng) <= CLUSTER_DISTANCE_MILES
    } else {
      const hoursSince = (now.getTime() - new Date(last.created_at).getTime()) / 3_600_000
      sameHaul = hoursSince <= CLUSTER_TIME_HOURS
    }
  }

  if (sameHaul && last?.haul_id) {
    await supabase.from('hauls').update({ ended_at: now.toISOString() }).eq('id', last.haul_id)
    return last.haul_id
  }

  const locationLabel = lat != null && lng != null ? await reverseGeocode(lat, lng) : null

  const { data: haul, error } = await supabase
    .from('hauls')
    .insert({
      created_by: userId,
      name: locationLabel ?? defaultHaulName(now),
      location_label: locationLabel,
      lat, lng,
      started_at: now.toISOString(),
      ended_at: now.toISOString(),
    })
    .select('id')
    .single()

  if (error || !haul) throw new Error(error?.message ?? 'Failed to create haul')
  return haul.id
}
