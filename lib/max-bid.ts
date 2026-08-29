export const DEFAULT_MAX_BID_PCT = 40
export const MAX_BID_PCT_MIN = 10
export const MAX_BID_PCT_MAX = 70
export const MAX_BID_CONFIDENCE_THRESHOLD = 0.6

export function computeMaxBid(
  estValueLow: number | null | undefined,
  confidence: number,
  maxBidPct: number = DEFAULT_MAX_BID_PCT
): number | null {
  if (confidence < MAX_BID_CONFIDENCE_THRESHOLD || estValueLow == null) return null
  return Math.round(estValueLow * (maxBidPct / 100) * 100) / 100
}
