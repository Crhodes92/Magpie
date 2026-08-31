import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MOCK_PROFILE } from '@/lib/mock-data'
import { DEFAULT_MAX_BID_PCT, MAX_BID_PCT_MIN, MAX_BID_PCT_MAX } from '@/lib/max-bid'

export async function GET() {
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    return NextResponse.json(MOCK_PROFILE)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (data) return NextResponse.json(data)

  // No row yet — report the default without creating one; PATCH creates on first write.
  return NextResponse.json({ id: user.id, max_bid_pct: DEFAULT_MAX_BID_PCT, created_at: new Date().toISOString() })
}

export async function PATCH(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const body = await req.json()
    return NextResponse.json({ ...MOCK_PROFILE, ...body })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const patch: Record<string, unknown> = { id: user.id }

  if (body.max_bid_pct !== undefined) {
    const maxBidPct = Number(body.max_bid_pct)
    if (!Number.isFinite(maxBidPct) || maxBidPct < MAX_BID_PCT_MIN || maxBidPct > MAX_BID_PCT_MAX) {
      return NextResponse.json({ error: `max_bid_pct must be between ${MAX_BID_PCT_MIN} and ${MAX_BID_PCT_MAX}` }, { status: 400 })
    }
    patch.max_bid_pct = maxBidPct
  }

  for (const field of ['ebay_ship_from_location', 'ebay_ship_from_country', 'ebay_payment_policy', 'ebay_shipping_policy', 'ebay_return_policy'] as const) {
    if (body[field] !== undefined) patch[field] = body[field] || null
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(patch)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
