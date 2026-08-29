import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MOCK_ITEMS } from '@/lib/mock-data'

export async function GET() {
  if (process.env.NEXT_PUBLIC_DEMO === 'true') {
    const tags = [...new Set(MOCK_ITEMS.flatMap(i => i.tags ?? []))].sort()
    return NextResponse.json({ tags })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('items')
    .select('tags')
    .eq('created_by', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tags = [...new Set((data ?? []).flatMap(row => row.tags ?? []))].sort()
  return NextResponse.json({ tags })
}
