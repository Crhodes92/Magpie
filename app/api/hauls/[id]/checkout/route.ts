import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }
type Decision = { item_id: string; bought: boolean; price?: number | null }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params

  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const { decisions } = await req.json() as { decisions: Decision[] }
    return NextResponse.json({ settled: decisions.length })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { decisions } = await req.json() as { decisions: Decision[] }
  if (!Array.isArray(decisions) || decisions.length === 0) {
    return NextResponse.json({ error: 'decisions must be a non-empty array' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const results: { item_id: string; ok: boolean }[] = []

  for (const { item_id, bought, price } of decisions) {
    // Confirm the item belongs to this user and this haul before touching it.
    const { data: item, error: findError } = await supabase
      .from('items')
      .select('id, haul_id, status')
      .eq('id', item_id)
      .eq('created_by', user.id)
      .single()

    const belongsToHaul = id === 'ungrouped' ? item?.haul_id == null : item?.haul_id === id
    if (findError || !item || !belongsToHaul || item.status !== 'scouted') {
      results.push({ item_id, ok: false })
      continue
    }

    const patch = bought
      ? { status: 'acquired', acquired_price: price ?? 0, acquired_at: now }
      : { status: 'passed' }

    const { error: updateError } = await supabase.from('items').update(patch).eq('id', item_id)
    results.push({ item_id, ok: !updateError })
  }

  return NextResponse.json({ settled: results.filter(r => r.ok).length, results })
}
