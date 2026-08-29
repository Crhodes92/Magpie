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

  const { data: haul, error } = await supabase
    .from('hauls')
    .insert({
      created_by: userId,
      name: defaultHaulName(now),
      lat, lng,
      started_at: now.toISOString(),
      ended_at: now.toISOString(),
    })
    .select('id')
    .single()

  if (error || !haul) throw new Error(error?.message ?? 'Failed to create haul')
  return haul.id
}
