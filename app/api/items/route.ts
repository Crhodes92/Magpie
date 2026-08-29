import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MOCK_ITEMS } from '@/lib/mock-data'
import { resolveHaulId } from '@/lib/hauls'

export async function GET(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const { searchParams } = req.nextUrl
    let items = [...MOCK_ITEMS]
    const status = searchParams.get('status')
    const lane = searchParams.get('lane')
    const q = searchParams.get('q')
    if (status) items = items.filter(i => i.status === status)
    if (lane) items = items.filter(i => i.lane === lane)
    if (q) items = items.filter(i => i.title?.toLowerCase().includes(q.toLowerCase()))
    return NextResponse.json(items)
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const lane = searchParams.get('lane')
  const category = searchParams.get('category')
  const search = searchParams.get('q')

  let query = supabase
    .from('items')
    .select(`
      *,
      card_details(*),
      item_photos(id, url, is_primary)
    `)
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (lane) query = query.eq('lane', lane)
  if (category) query = query.eq('category', category)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const body = await req.json()
    return NextResponse.json({ id: `mock-${Date.now()}`, ...body, created_by: 'demo', created_at: new Date().toISOString() }, { status: 201 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const { card_details: cardDetailsInput, ...itemFields } = body

  // Only items landing from continuous Scout capture get auto-clustered into
  // a haul — a manually-added Intake item (status starts 'acquired') stays
  // ungrouped unless the user assigns it to a haul by hand later.
  if (itemFields.status === 'scouted' && !itemFields.haul_id) {
    itemFields.haul_id = await resolveHaulId(
      supabase, user.id, itemFields.lat ?? null, itemFields.lng ?? null
    )
  }

  const { data: item, error: itemError } = await supabase
    .from('items')
    .insert({ ...itemFields, created_by: user.id })
    .select()
    .single()

  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 })

  if (item.lane === 'card' && cardDetailsInput) {
    const { error: cdError } = await supabase
      .from('card_details')
      .insert({ ...cardDetailsInput, item_id: item.id })
    if (cdError) console.error('[items POST] card_details error:', cdError.message)
  }

  return NextResponse.json(item, { status: 201 })
}
