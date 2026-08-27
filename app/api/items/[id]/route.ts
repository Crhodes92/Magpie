import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MOCK_ITEMS } from '@/lib/mock-data'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const item = MOCK_ITEMS.find(i => i.id === id)
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(item)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('items')
    .select(`*, card_details(*), item_photos(*), comps(*)`)
    .eq('id', id)
    .eq('created_by', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const body = await req.json()
    const item = MOCK_ITEMS.find(i => i.id === id) ?? {}
    return NextResponse.json({ ...item, ...body })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { card_details: cardDetailsInput, ...itemFields } = body

  const { data: item, error: itemError } = await supabase
    .from('items')
    .update(itemFields)
    .eq('id', id)
    .eq('created_by', user.id)
    .select()
    .single()

  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 })

  if (cardDetailsInput !== undefined) {
    const { error: cdError } = await supabase
      .from('card_details')
      .upsert({ ...cardDetailsInput, item_id: id })
    if (cdError) console.error('[items PATCH] card_details error:', cdError.message)
  }

  return NextResponse.json(item)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    return new NextResponse(null, { status: 204 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
