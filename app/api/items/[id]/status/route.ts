import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MOCK_ITEMS } from '@/lib/mock-data'
import type { ItemStatus } from '@/types'

const VALID_STATUSES: ItemStatus[] = ['scouted', 'passed', 'acquired', 'listed', 'sold', 'scrapped']

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
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
  const { status, ...extraFields } = body

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('items')
    .update({ status, ...extraFields })
    .eq('id', id)
    .eq('created_by', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
