import { describe, it, expect } from 'vitest'
import { compareFaceDescriptors } from '../faceMath'

describe('compareFaceDescriptors', () => {
  it('scores identical descriptors as a strong match', () => {
    const descriptor = Array.from({ length: 128 }, (_, i) => i / 128)
    const result = compareFaceDescriptors(descriptor, descriptor)
    expect(result.isMatch).toBe(true)
    expect(result.matchScore).toBeGreaterThan(90)
  })

  it('flags very different descriptors as mismatches', () => {
    const reference = Array.from({ length: 128 }, () => 0)
    const punch = Array.from({ length: 128 }, () => 1)
    const result = compareFaceDescriptors(reference, punch)
    expect(result.isMatch).toBe(false)
    expect(result.matchScore).toBeLessThan(50)
  })
})