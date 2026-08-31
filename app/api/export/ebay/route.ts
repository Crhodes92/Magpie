import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status') ?? 'acquired'

  const { data: profile } = await supabase
    .from('profiles')
    .select('ebay_ship_from_location, ebay_ship_from_country, ebay_payment_policy, ebay_shipping_policy, ebay_return_policy')
    .eq('id', user.id)
    .maybeSingle()

  const { data: items, error } = await supabase
    .from('items')
    .select(`*, card_details(*), item_photos(url, is_primary)`)
    .eq('created_by', user.id)
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const headers = [
    'Action', 'CustomLabel', 'Category', 'Title', 'Description',
    'ConditionID', 'ConditionNote', 'Format', 'Duration', 'StartPrice', 'Quantity',
    'Location', 'Country', 'PaymentProfileName', 'ShippingProfileName', 'ReturnProfileName',
    'PicURL', 'C:Brand', 'C:Set', 'C:Card Number', 'C:Card Name', 'C:Language', 'C:Printing', 'C:Grader', 'C:Grade',
  ]

  const rows = (items ?? []).map(item => {
    const cd = item.card_details
    const photos: { url: string; is_primary: boolean }[] = item.item_photos ?? []
    const picUrl = photos.length > 0
      ? [...photos].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)).map(p => p.url).join('|')
      : ''
    const description = [item.condition_note, item.notes].filter(Boolean).join(' — ') || item.title || ''
    const startPrice = item.listed_price ?? item.est_value_high ?? item.est_value_low ?? ''

    return [
      'Add', item.id, item.ebay_category_id ?? '', (item.title ?? '').slice(0, 80), description,
      item.ebay_condition_id ?? '', item.condition_note ?? '', 'FixedPrice', 'GTC', startPrice, 1,
      profile?.ebay_ship_from_location ?? '', profile?.ebay_ship_from_country ?? 'US',
      profile?.ebay_payment_policy ?? '', profile?.ebay_shipping_policy ?? '', profile?.ebay_return_policy ?? '',
      picUrl,
      item.brand ?? '', cd?.set_name ?? '', cd?.card_number ?? '', cd?.card_name ?? '',
      cd?.language ?? '', cd?.printing ?? '', cd?.grader ?? '', cd?.grade ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`)
  })

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="magpie-ebay-listings-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
