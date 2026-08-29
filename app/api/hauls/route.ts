import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MOCK_ITEMS, MOCK_HAULS } from '@/lib/mock-data'

interface HaulSummary {
  id: string
  name: string
  started_at: string | null
  ended_at: string | null
  item_count: number
  spend: number
  profit: number
  est_value_low: number
  est_value_high: number
  cover_photos: string[]
}

function summarize(
  id: string,
  name: string,
  started_at: string | null,
  ended_at: string | null,
  items: Array<{
    acquired_price: number | null
    sold_price: number | null
    fees: number | null
    shipping_cost: number | null
    est_value_low: number | null
    est_value_high: number | null
    item_photos?: { url: string; is_primary: boolean }[]
  }>
): HaulSummary {
  let spend = 0, profit = 0, estLow = 0, estHigh = 0
  const cover_photos: string[] = []
  for (const item of items) {
    if (item.acquired_price != null) spend += item.acquired_price
    if (item.sold_price != null && item.acquired_price != null) {
      profit += item.sold_price - item.acquired_price - (item.fees ?? 0) - (item.shipping_cost ?? 0)
    }
    if (item.est_value_low != null) estLow += item.est_value_low
    if (item.est_value_high != null) estHigh += item.est_value_high
    if (cover_photos.length < 3) {
      const photo = item.item_photos?.find(p => p.is_primary) ?? item.item_photos?.[0]
      if (photo) cover_photos.push(photo.url)
    }
  }
  return { id, name, started_at, ended_at, item_count: items.length, spend, profit, est_value_low: estLow, est_value_high: estHigh, cover_photos }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const lane = searchParams.get('lane')

  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    let items = [...MOCK_ITEMS]
    if (status) items = items.filter(i => i.status === status)
    if (lane) items = items.filter(i => i.lane === lane)
    const grouped = MOCK_HAULS
      .map(h => summarize(h.id, h.name, h.started_at, h.ended_at, items.filter(i => i.haul_id === h.id).map(i => ({ ...i, item_photos: i.photos }))))
      .filter(h => h.item_count > 0)
    const ungroupedItems = items.filter(i => !i.haul_id).map(i => ({ ...i, item_photos: i.photos }))
    const ungrouped = ungroupedItems.length > 0 ? summarize('ungrouped', 'Ungrouped', null, null, ungroupedItems) : null
    return NextResponse.json({ hauls: grouped, ungrouped })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: hauls, error: haulsError } = await supabase
    .from('hauls')
    .select('id, name, started_at, ended_at')
    .eq('created_by', user.id)
    .order('started_at', { ascending: false })
  if (haulsError) return NextResponse.json({ error: haulsError.message }, { status: 500 })

  let itemsQuery = supabase
    .from('items')
    .select('haul_id, acquired_price, sold_price, fees, shipping_cost, est_value_low, est_value_high, item_photos(url, is_primary)')
    .eq('created_by', user.id)
  if (status) itemsQuery = itemsQuery.eq('status', status)
  if (lane) itemsQuery = itemsQuery.eq('lane', lane)

  const { data: items, error: itemsError } = await itemsQuery
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  const byHaul = new Map<string, typeof items>()
  const ungroupedItems: typeof items = []
  for (const item of items ?? []) {
    if (!item.haul_id) { ungroupedItems.push(item); continue }
    if (!byHaul.has(item.haul_id)) byHaul.set(item.haul_id, [])
    byHaul.get(item.haul_id)!.push(item)
  }

  const summaries = (hauls ?? [])
    .map(h => summarize(h.id, h.name, h.started_at, h.ended_at, byHaul.get(h.id) ?? []))
    .filter(h => h.item_count > 0)

  const ungrouped = ungroupedItems.length > 0 ? summarize('ungrouped', 'Ungrouped', null, null, ungroupedItems) : null

  return NextResponse.json({ hauls: summaries, ungrouped })
}
