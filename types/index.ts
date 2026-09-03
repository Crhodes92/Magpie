export type ItemStatus = 'scouted' | 'passed' | 'acquired' | 'listed' | 'sold' | 'scrapped'
export type ItemLane = 'card' | 'general'

export interface Item {
  id: string
  status: ItemStatus
  lane: ItemLane
  title: string | null
  category: string | null
  brand: string | null
  model: string | null
  condition_note: string | null
  ai_identification: AiIdentification | null
  ai_confidence: number | null
  est_value_low: number | null
  est_value_high: number | null
  max_bid: number | null
  haul_id: string | null
  lat: number | null
  lng: number | null
  acquired_price: number | null
  acquired_at: string | null
  acquired_source: string | null
  storage_location: string | null
  listed_price: number | null
  listed_at: string | null
  ebay_item_id: string | null
  ebay_category_id?: string | null
  ebay_condition_id?: number | null
  sold_price: number | null
  sold_at: string | null
  fees: number | null
  shipping_cost: number | null
  notes: string | null
  tags?: string[]
  created_by: string
  created_at: string
  card_details?: CardDetails | null
  photos?: ItemPhoto[]
  comps?: Comp[]
}

export interface AiIdentification {
  lane: ItemLane
  title: string
  category: string
  brand?: string
  model?: string
  card_details?: {
    set_name?: string
    set_code?: string
    card_number?: string
    card_name?: string
    language?: string
    printing?: string
  }
  condition_note?: string
  ebay_query: string
  confidence: number
  reasoning: string
}

export interface CardDetails {
  item_id: string
  set_name: string | null
  set_code: string | null
  card_number: string | null
  card_name: string | null
  language: string | null
  printing: string | null
  is_graded: boolean
  grader: string | null
  grade: number | null
}

export interface ItemPhoto {
  id: string
  item_id: string
  url: string
  is_primary: boolean
  created_at: string
}

export interface Comp {
  id: string
  item_id: string
  source: 'ebay_sold' | 'tcgplayer' | 'pricecharting' | 'manual'
  price: number
  condition: string | null
  sold_at: string | null
  url: string | null
  captured_at: string
}

export interface IdentifyResponse {
  lane: ItemLane
  title: string
  category: string
  brand?: string
  model?: string
  card_details?: {
    set_name?: string
    set_code?: string
    card_number?: string
    card_name?: string
    language?: string
    printing?: string
  }
  condition_note?: string
  ebay_query: string
  confidence: number
  reasoning: string
  est_value_low?: number
  est_value_high?: number
  error?: string
}

export interface DashboardStats {
  capital_tied_up: number
  realized_profit_month: number
  realized_profit_all_time: number
  aging_60: number
  aging_90: number
  scout_hit_rate: number
  margin_by_category: { category: string; margin: number; count: number }[]
  window_90: WindowStats
}

export interface WindowStats {
  totals: { items: number; spend: number; profit: number; margin_pct: number }
  per_haul: { items: number; spend: number; profit: number; margin_pct: number }
  haul_count: number
}

export interface Haul {
  id: string
  created_by: string
  name: string
  location_label?: string | null
  name_is_auto?: boolean
  ended?: boolean
  lat: number | null
  lng: number | null
  started_at: string
  ended_at: string
  notes: string | null
  created_at: string
  items?: Item[]
}

export interface Profile {
  id: string
  max_bid_pct: number
  ebay_ship_from_location: string | null
  ebay_ship_from_country: string
  ebay_payment_policy: string | null
  ebay_shipping_policy: string | null
  ebay_return_policy: string | null
  created_at: string
}
