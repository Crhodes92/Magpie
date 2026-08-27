import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { IdentifyResponse } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const IDENTIFY_SYSTEM = `You are an expert at identifying items for resale — primarily trading cards (Pokémon, MTG, sports cards) and electronics/tools.

Analyze the photo and return ONLY a JSON object. No markdown, no explanation, just JSON.

Required fields:
- lane: "card" or "general"
- title: human-readable item name suitable as an eBay search seed (concise, specific)
- category: e.g. "Pokemon Card", "Sports Card", "GPU", "Power Tool", "Video Game", etc.
- ebay_query: optimized search string for eBay completed listings — include set/series, specific model, condition signals. For graded cards include the grade.
- confidence: 0.0–1.0 float. Use 0.5+ only if you are reasonably certain. Return 0.3 or lower if the image is unclear, blurry, or the item is ambiguous.
- reasoning: 1–2 sentences explaining your identification and confidence level.
- est_value_low: your best estimate of the low end of recent sold prices in USD (number, not string). Base this on your training data for this specific item and condition. If you truly have no basis, omit it.
- est_value_high: your best estimate of the high end of recent sold prices in USD (number). Should reflect realistic eBay sold range, not asking price.

Optional fields (include only when visible and confident):
- brand: manufacturer name
- model: specific model/series identifier
- condition_note: brief condition observation ("creasing visible", "looks NM", "display model only")

Card lane additional fields (under card_details key):
- set_name: full set name
- set_code: 3-4 letter code if visible
- card_number: e.g. "4/102"
- card_name: name printed on the card
- language: "EN" | "JP" | other
- printing: "Normal" | "Holo" | "Reverse Holo" | "1st Edition" | "Shadowless" | "Gold" | etc.

If you genuinely cannot identify the item, return confidence ≤ 0.2 and set title to "Unknown item — photograph label or front more clearly".

Do not hallucinate specific card numbers or set names if you are not sure. It is better to be vague and low-confidence than specific and wrong.
For est_value fields: these are rough guidance only — the user will check eBay sold comps to confirm. A reasonable ballpark is better than nothing; omit only if you have truly no basis.`

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO !== 'true') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let imageBase64: string
  let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null
    if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    imageBase64 = buffer.toString('base64')
    const mt = file.type as typeof mediaType
    mediaType = (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mt))
      ? mt : 'image/jpeg'
  } catch {
    return NextResponse.json({ error: 'Failed to read image' }, { status: 400 })
  }

  let identification: IdentifyResponse

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      system: IDENTIFY_SYSTEM,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          { type: 'text', text: 'Identify this item for resale.' },
        ],
      }],
    })

    const text = message.content.find(b => b.type === 'text')?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    identification = JSON.parse(jsonMatch[0]) as IdentifyResponse

    console.log(`[identify] tokens: ${message.usage.input_tokens}in ${message.usage.output_tokens}out, confidence: ${identification.confidence}`)
  } catch (err) {
    console.error('[identify] Anthropic error:', err)
    return NextResponse.json({ error: 'Identification failed — try again' }, { status: 502 })
  }

  return NextResponse.json(identification)
}
