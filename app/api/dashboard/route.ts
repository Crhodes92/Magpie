import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MOCK_DASHBOARD } from '@/lib/mock-data'

export async function GET() {
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    return NextResponse.json(MOCK_DASHBOARD)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: items, error } = await supabase
    .from('items')
    .select('status, lane, category, acquired_price, sold_price, fees, shipping_cost, acquired_at, sold_at')
    .eq('created_by', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = Date.now()
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  let capital = 0
  let profitMonth = 0
  let profitAllTime = 0
  let aging60 = 0
  let aging90 = 0
  let scouted = 0
  let acquired = 0
  const categoryMap: Record<string, { profit: number; cost: number; count: number }> = {}

  for (const item of items ?? []) {
    if (['acquired', 'listed'].includes(item.status)) {
      capital += item.acquired_price ?? 0
    }
    if (item.status === 'scouted') scouted++
    if (['acquired', 'listed', 'sold', 'scrapped'].includes(item.status)) acquired++

    if (item.status === 'sold' && item.sold_price != null && item.acquired_price != null) {
      const profit = item.sold_price - item.acquired_price - (item.fees ?? 0) - (item.shipping_cost ?? 0)
      profitAllTime += profit
      if (item.sold_at && new Date(item.sold_at) >= startOfMonth) {
        profitMonth += profit
      }
      const cat = item.category ?? 'Uncategorized'
      if (!categoryMap[cat]) categoryMap[cat] = { profit: 0, cost: 0, count: 0 }
      categoryMap[cat].profit += profit
      categoryMap[cat].cost += item.acquired_price
      categoryMap[cat].count++
    }

    if (['acquired', 'listed'].includes(item.status) && item.acquired_at) {
      const daysHeld = Math.floor((now - new Date(item.acquired_at).getTime()) / 86400000)
      if (daysHeld >= 60) aging60++
      if (daysHeld >= 90) aging90++
    }
  }

  const scoutHitRate = (scouted + acquired) > 0 ? acquired / (scouted + acquired) : 0

  const marginByCategory = Object.entries(categoryMap).map(([category, { profit, cost, count }]) => ({
    category,
    margin: cost > 0 ? Math.round((profit / cost) * 100) : 0,
    count,
  })).sort((a, b) => b.margin - a.margin)

  return NextResponse.json({
    capital_tied_up: capital,
    realized_profit_month: profitMonth,
    realized_profit_all_time: profitAllTime,
    aging_60: aging60,
    aging_90: aging90,
    scout_hit_rate: scoutHitRate,
    margin_by_category: marginByCategory,
  })
}
