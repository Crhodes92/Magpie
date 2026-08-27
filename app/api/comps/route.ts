import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const body = await req.json()
    return NextResponse.json({ id: `mock-comp-${Date.now()}`, ...body, source: 'ebay_sold', captured_at: new Date().toISOString() }, { status: 201 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { item_id, source = 'manual', price, condition, sold_at, url } = body

  if (!item_id || !price) {
    return NextResponse.json({ error: 'item_id and price are required' }, { status: 400 })
  }

  // Verify the item belongs to this user
  const { error: ownerError } = await supabase
    .from('items')
    .select('id')
    .eq('id', item_id)
    .eq('created_by', user.id)
    .single()
  if (ownerError) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('comps')
    .insert({ item_id, source, price, condition, sold_at, url })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
