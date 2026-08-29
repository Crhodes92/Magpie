import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MOCK_ITEMS, MOCK_HAULS } from '@/lib/mock-data'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const lane = searchParams.get('lane')

  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    let items = id === 'ungrouped' ? MOCK_ITEMS.filter(i => !i.haul_id) : MOCK_ITEMS.filter(i => i.haul_id === id)
    if (status) items = items.filter(i => i.status === status)
    if (lane) items = items.filter(i => i.lane === lane)
    const haul = id === 'ungrouped' ? { id: 'ungrouped', name: 'Ungrouped', started_at: null, ended_at: null, notes: null } : MOCK_HAULS.find(h => h.id === id)
    if (!haul) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ...haul, items })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let haul: { id: string; name: string; started_at: string | null; ended_at: string | null; notes: string | null }
  if (id === 'ungrouped') {
    haul = { id: 'ungrouped', name: 'Ungrouped', started_at: null, ended_at: null, notes: null }
  } else {
    const { data, error } = await supabase
      .from('hauls')
      .select('id, name, started_at, ended_at, notes')
      .eq('id', id)
      .eq('created_by', user.id)
      .single()
    if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    haul = data
  }

  let itemsQuery = supabase
    .from('items')
    .select('*, card_details(*), item_photos(id, url, is_primary)')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })
  itemsQuery = id === 'ungrouped' ? itemsQuery.is('haul_id', null) : itemsQuery.eq('haul_id', id)
  if (status) itemsQuery = itemsQuery.eq('status', status)
  if (lane) itemsQuery = itemsQuery.eq('lane', lane)

  const { data: items, error: itemsError } = await itemsQuery
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  return NextResponse.json({ ...haul, items })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const body = await req.json()
    const haul = MOCK_HAULS.find(h => h.id === id) ?? {}
    return NextResponse.json({ ...haul, ...body })
  }

  if (id === 'ungrouped') return NextResponse.json({ error: 'Ungrouped is not an editable haul' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, notes } = body
  const patch: Record<string, unknown> = {}
  if (name !== undefined) patch.name = name
  if (notes !== undefined) patch.notes = notes

  const { data, error } = await supabase
    .from('hauls')
    .update(patch)
    .eq('id', id)
    .eq('created_by', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
