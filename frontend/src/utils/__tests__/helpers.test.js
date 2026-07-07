import { describe, it, expect } from 'vitest'
import { getLocalDateKey, getDayBoundsISO } from '../helpers'

describe('date helpers', () => {
  it('formats local date key', () => {
    const date = new Date(2026, 6, 7, 23, 30)
    expect(getLocalDateKey(date)).toBe('2026-07-07')
  })

  it('returns ISO bounds for a local calendar day', () => {
    const { start, end } = getDayBoundsISO('2026-07-07')
    expect(new Date(start).getDate()).toBe(7)
    expect(new Date(end).getDate()).toBe(7)
  })
})