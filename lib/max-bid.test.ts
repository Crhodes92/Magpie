import { describe, it, expect } from 'vitest'
import { computeMaxBid, DEFAULT_MAX_BID_PCT, MAX_BID_CONFIDENCE_THRESHOLD } from './max-bid'

describe('computeMaxBid', () => {
  it('returns null when confidence is below the threshold', () => {
    expect(computeMaxBid(100, MAX_BID_CONFIDENCE_THRESHOLD - 0.01, 40)).toBeNull()
  })

  it('returns a value right at the confidence threshold', () => {
    expect(computeMaxBid(100, MAX_BID_CONFIDENCE_THRESHOLD, 40)).toBe(40)
  })

  it('returns null when est_value_low is null or undefined', () => {
    expect(computeMaxBid(null, 0.9, 40)).toBeNull()
    expect(computeMaxBid(undefined, 0.9, 40)).toBeNull()
  })

  it('computes the percentage of est_value_low', () => {
    expect(computeMaxBid(100, 0.9, 40)).toBe(40)
    expect(computeMaxBid(200, 0.9, 25)).toBe(50)
  })

  it('rounds to the nearest cent', () => {
    // 33.333 * 0.5 = 16.6665 -> rounds to 16.67
    expect(computeMaxBid(33.333, 0.9, 50)).toBe(16.67)
  })

  it('uses DEFAULT_MAX_BID_PCT when maxBidPct is omitted', () => {
    expect(computeMaxBid(100, 0.9)).toBe(DEFAULT_MAX_BID_PCT)
  })

  it('never returns a negative bid for a positive est_value_low', () => {
    expect(computeMaxBid(50, 1, 10)).toBeGreaterThan(0)
  })
})
