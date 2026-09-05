import { describe, it, expect } from 'vitest'
import { haversineMiles, summarizeItemCategories, CLUSTER_DISTANCE_MILES } from './hauls'

describe('haversineMiles', () => {
  it('returns 0 for the same point', () => {
    expect(haversineMiles(40.7580, -73.9855, 40.7580, -73.9855)).toBe(0)
  })

  it('is symmetric', () => {
    const a = [40.7580, -73.9855] as const
    const b = [34.0522, -118.2437] as const
    expect(haversineMiles(...a, ...b)).toBeCloseTo(haversineMiles(...b, ...a), 6)
  })

  it('orders distances correctly (closer pair < farther pair)', () => {
    const nyc = [40.7580, -73.9855] as const
    const nearby = [40.7610, -73.9840] as const // a few blocks away
    const la = [34.0522, -118.2437] as const
    const near = haversineMiles(...nyc, ...nearby)
    const far = haversineMiles(...nyc, ...la)
    expect(near).toBeLessThan(far)
  })

  it('keeps two nearby points within the clustering threshold', () => {
    const nyc = [40.7580, -73.9855] as const
    const nearby = [40.7610, -73.9840] as const
    expect(haversineMiles(...nyc, ...nearby)).toBeLessThan(CLUSTER_DISTANCE_MILES)
  })

  it('puts two far-apart points outside the clustering threshold', () => {
    const nyc = [40.7580, -73.9855] as const
    const la = [34.0522, -118.2437] as const
    expect(haversineMiles(...nyc, ...la)).toBeGreaterThan(CLUSTER_DISTANCE_MILES)
  })
})

describe('summarizeItemCategories', () => {
  it('summarizes a single item', () => {
    expect(summarizeItemCategories([{ category: 'Pokemon Card' }])).toBe('1 Pokemon Card')
  })

  it('pluralizes a single repeated category', () => {
    expect(summarizeItemCategories([
      { category: 'Pokemon Card' }, { category: 'Pokemon Card' }, { category: 'Pokemon Card' },
    ])).toBe('3 Pokemon Cards')
  })

  it('does not double-pluralize a category already ending in s', () => {
    expect(summarizeItemCategories([{ category: 'GPU' }, { category: 'GPU' }])).toBe('2 GPUs')
  })

  it('joins exactly two distinct categories with &', () => {
    expect(summarizeItemCategories([
      { category: 'Pokemon Card' }, { category: 'Pokemon Card' }, { category: 'Power Tool' },
    ])).toBe('Pokemon Cards & Power Tools')
  })

  it('falls back to a plain item count for three or more distinct categories', () => {
    expect(summarizeItemCategories([
      { category: 'Pokemon Card' }, { category: 'Power Tool' }, { category: 'Video Game' },
    ])).toBe('3 items')
  })

  it('treats a null category as "item"', () => {
    expect(summarizeItemCategories([{ category: null }, { category: null }])).toBe('2 items')
  })

  it('returns a zero-item summary for an empty list', () => {
    expect(summarizeItemCategories([])).toBe('0 items')
  })
})
