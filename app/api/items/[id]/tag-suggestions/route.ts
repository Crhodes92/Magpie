import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

interface SiblingMatch {
  id: string
  title: string | null
  status: string
  storage_location: string | null
  haul_id: string | null
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    return NextResponse.json({ suggestions: [] })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: target, error: targetError } = await supabase
    .from('items')
    .select('id, lane, card_details(set_name, card_name)')
    .eq('id', id)
    .eq('created_by', user.id)
    .single()

  if (targetError || !target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const cardDetails = Array.isArray(target.card_details) ? target.card_details[0] : target.card_details
  const setName = cardDetails?.set_name?.trim()

  // v1: card lane only, matched on set_name — card_name/general-lane matching is fuzzier and a later iteration.
  if (target.lane !== 'card' || !setName) {
    return NextResponse.json({ suggestions: [] })
  }

  const { data: siblings, error: siblingsError } = await supabase
    .from('items')
    .select('id, title, status, storage_location, haul_id, tags, card_details!inner(set_name)')
    .eq('created_by', user.id)
    .neq('id', id)
    .in('status', ['acquired', 'listed', 'sold'])
    .ilike('card_details.set_name', setName)

  if (siblingsError) return NextResponse.json({ error: siblingsError.message }, { status: 500 })
  if (!siblings || siblings.length === 0) return NextResponse.json({ suggestions: [] })

  const { data: allItems, error: vocabError } = await supabase
    .from('items')
    .select('tags')
    .eq('created_by', user.id)

  if (vocabError) return NextResponse.json({ error: vocabError.message }, { status: 500 })

  const vocabulary = [...new Set((allItems ?? []).flatMap(row => row.tags ?? []))]
  const existingMatch = vocabulary.find(t => t.toLowerCase() === setName.toLowerCase())

  const matches: SiblingMatch[] = siblings.map(s => ({
    id: s.id,
    title: s.title,
    status: s.status,
    storage_location: s.storage_location,
    haul_id: s.haul_id,
  }))

  return NextResponse.json({
    suggestions: [{
      tag: existingMatch ?? setName,
      existing: existingMatch != null,
      matches,
    }],
  })
}
