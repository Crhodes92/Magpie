import type { createClient } from '@/lib/supabase/server'
import type { Item } from '@/types'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

interface SetSiblingRow {
  id: string
}

/**
 * Tags a newly-created item automatically: always the item's category, plus
 * — for card-lane items with a matched set (see find_set_siblings in
 * schema.sql) — the set name, reusing an existing tag from the user's
 * vocabulary if one already covers it rather than creating a near-duplicate.
 */
export async function resolveAutoTags(
  supabase: SupabaseServerClient,
  userId: string,
  item: Pick<Item, 'id' | 'lane' | 'category' | 'tags'>
): Promise<string[]> {
  const tags = new Set(item.tags ?? [])
  if (item.category) tags.add(item.category.trim())

  if (item.lane === 'card') {
    const { data: siblings } = await supabase.rpc('find_set_siblings', { p_item_id: item.id })

    if (siblings && (siblings as SetSiblingRow[]).length > 0) {
      const { data: cardDetails } = await supabase
        .from('card_details')
        .select('set_name')
        .eq('item_id', item.id)
        .single()

      const setName = cardDetails?.set_name?.trim()
      if (setName) {
        const { data: allItems } = await supabase.from('items').select('tags').eq('created_by', userId)
        const vocabulary = [...new Set((allItems ?? []).flatMap(row => row.tags ?? []))]
        const existing = vocabulary.find(t => t.toLowerCase() === setName.toLowerCase())
        tags.add(existing ?? setName)
      }
    }
  }

  return [...tags]
}
