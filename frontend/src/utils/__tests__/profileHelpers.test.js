import { describe, expect, it } from 'vitest'
import { hasEnrolledReferenceSelfie, normalizeFaceDescriptor } from '../profileHelpers'

describe('profileHelpers', () => {
  it('accepts array face descriptors', () => {
    const profile = {
      reference_selfie_url: 'user/ref.jpg',
      face_descriptor: [0.1, 0.2],
    }
    expect(hasEnrolledReferenceSelfie(profile)).toBe(true)
  })

  it('accepts JSONB-like numeric-key descriptors', () => {
    const descriptor = { 0: 0.1, 1: 0.2, length: 2 }
    expect(normalizeFaceDescriptor(descriptor)).toEqual([0.1, 0.2])
    expect(
      hasEnrolledReferenceSelfie({
        reference_selfie_url: 'user/ref.jpg',
        face_descriptor: descriptor,
      })
    ).toBe(true)
  })

  it('accepts plain numeric-key objects without length', () => {
    const descriptor = { 0: 0.1, 1: 0.2 }
    expect(normalizeFaceDescriptor(descriptor)).toEqual([0.1, 0.2])
    expect(
      hasEnrolledReferenceSelfie({
        reference_selfie_url: 'user/ref.jpg',
        face_descriptor: descriptor,
      })
    ).toBe(true)
  })

  it('returns false when selfie path or descriptor missing', () => {
    expect(hasEnrolledReferenceSelfie({ reference_selfie_url: 'x.jpg' })).toBe(false)
    expect(hasEnrolledReferenceSelfie({ face_descriptor: [1] })).toBe(false)
    expect(hasEnrolledReferenceSelfie(null)).toBe(false)
  })
})