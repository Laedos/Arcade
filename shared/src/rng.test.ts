import { describe, expect, it } from 'vitest'
import { mulberry32 } from './rng'

describe('mulberry32', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 100; i++) {
      const value = a()
      expect(value).toBe(b())
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('gives a different sequence for a different seed', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)

    expect(Array.from({ length: 5 }, a)).not.toEqual(Array.from({ length: 5 }, b))
  })
})
