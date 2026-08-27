import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: items, error } = await supabase
    .from('items')
    .select(`*, card_details(*)`)
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const headers = [
    'id', 'status', 'lane', 'title', 'category', 'brand', 'model',
    'condition_note', 'ai_confidence', 'est_value_low', 'est_value_high',
    'max_bid', 'acquired_price', 'acquired_at', 'acquired_source',
    'storage_location', 'listed_price', 'listed_at', 'ebay_item_id',
    'sold_price', 'sold_at', 'fees', 'shipping_cost', 'notes',
    'profit', 'days_held', 'created_at',
    'card_set_name', 'card_number', 'card_name', 'card_printing',
    'card_language', 'is_graded', 'grader', 'grade',
  ]

  const rows = items.map(item => {
    const profit = item.sold_price != null && item.acquired_price != null
      ? item.sold_price - item.acquired_price - (item.fees ?? 0) - (item.shipping_cost ?? 0)
      : ''
    const daysHeld = item.acquired_at
      ? Math.floor((Date.now() - new Date(item.acquired_at).getTime()) / 86400000)
      : ''
    const cd = item.card_details
    return [
      item.id, item.status, item.lane, item.title ?? '', item.category ?? '',
      item.brand ?? '', item.model ?? '', item.condition_note ?? '',
      item.ai_confidence ?? '', item.est_value_low ?? '', item.est_value_high ?? '',
      item.max_bid ?? '', item.acquired_price ?? '', item.acquired_at ?? '',
      item.acquired_source ?? '', item.storage_location ?? '',
      item.listed_price ?? '', item.listed_at ?? '', item.ebay_item_id ?? '',
      item.sold_price ?? '', item.sold_at ?? '', item.fees ?? '',
      item.shipping_cost ?? '', item.notes ?? '', profit, daysHeld, item.created_at,
      cd?.set_name ?? '', cd?.card_number ?? '', cd?.card_name ?? '',
      cd?.printing ?? '', cd?.language ?? '', cd?.is_graded ?? '',
      cd?.grader ?? '', cd?.grade ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`)
  })

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="reseller-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
