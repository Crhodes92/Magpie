import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const itemId = formData.get('item_id') as string | null
  const isPrimary = formData.get('is_primary') === 'true'

  if (!file || !itemId) {
    return NextResponse.json({ error: 'file and item_id are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}/${itemId}/${Date.now()}.${ext}`

  const { error: uploadError } = await admin.storage
    .from('item-photos')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = admin.storage.from('item-photos').getPublicUrl(path)

  if (isPrimary) {
    await supabase
      .from('item_photos')
      .update({ is_primary: false })
      .eq('item_id', itemId)
  }

  const { data: photo, error: photoError } = await supabase
    .from('item_photos')
    .insert({ item_id: itemId, url: urlData.publicUrl, is_primary: isPrimary })
    .select()
    .single()

  if (photoError) return NextResponse.json({ error: photoError.message }, { status: 500 })
  return NextResponse.json(photo, { status: 201 })
}
