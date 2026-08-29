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
    .select('status, lane, category, acquired_price, sold_price, fees, shipping_cost, acquired_at, sold_at, haul_id')
    .eq('created_by', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = Date.now()
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const ninetyDaysAgo = now - 90 * 86400000

  let capital = 0
  let profitMonth = 0
  let profitAllTime = 0
  let aging60 = 0
  let aging90 = 0
  let scouted = 0
  let acquired = 0
  const categoryMap: Record<string, { profit: number; cost: number; count: number }> = {}

  // window_90 cohort: items acquired in the trailing 90 days, grouped by haul.
  let cohortItems = 0
  let cohortSpend = 0
  let cohortProfit = 0
  let cohortSoldCost = 0
  const haulMap: Record<string, { profit: number; cost: number }> = {}

  for (const item of items ?? []) {
    if (item.acquired_at && new Date(item.acquired_at).getTime() >= ninetyDaysAgo) {
      cohortItems++
      cohortSpend += item.acquired_price ?? 0
      const haulKey = item.haul_id ?? null
      if (haulKey && !haulMap[haulKey]) haulMap[haulKey] = { profit: 0, cost: 0 }
      if (item.status === 'sold' && item.sold_price != null && item.acquired_price != null) {
        const itemProfit = item.sold_price - item.acquired_price - (item.fees ?? 0) - (item.shipping_cost ?? 0)
        cohortProfit += itemProfit
        cohortSoldCost += item.acquired_price
        if (haulKey) {
          haulMap[haulKey].profit += itemProfit
          haulMap[haulKey].cost += item.acquired_price
        }
      }
    }
  }

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

  const haulCount = Object.keys(haulMap).length
  const haulMargins = Object.values(haulMap).filter(h => h.cost > 0).map(h => (h.profit / h.cost) * 100)
  const avgHaulMargin = haulMargins.length > 0 ? haulMargins.reduce((a, b) => a + b, 0) / haulMargins.length : 0

  return NextResponse.json({
    capital_tied_up: capital,
    realized_profit_month: profitMonth,
    realized_profit_all_time: profitAllTime,
    aging_60: aging60,
    aging_90: aging90,
    scout_hit_rate: scoutHitRate,
    margin_by_category: marginByCategory,
    window_90: {
      totals: {
        items: cohortItems,
        spend: Math.round(cohortSpend * 100) / 100,
        profit: Math.round(cohortProfit * 100) / 100,
        margin_pct: cohortSoldCost > 0 ? Math.round((cohortProfit / cohortSoldCost) * 100) : 0,
      },
      per_haul: {
        items: haulCount > 0 ? Math.round((cohortItems / haulCount) * 10) / 10 : 0,
        spend: haulCount > 0 ? Math.round((cohortSpend / haulCount) * 100) / 100 : 0,
        profit: haulCount > 0 ? Math.round((cohortProfit / haulCount) * 100) / 100 : 0,
        margin_pct: Math.round(avgHaulMargin),
      },
      haul_count: haulCount,
    },
  })
}
