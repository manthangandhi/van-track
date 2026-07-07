import { describe, it, expect } from 'vitest'
import {
  haversineDistance,
  isWithinGeofence,
  normalizeGpsAccuracy,
  formatCoordinates,
  isValidLatitude,
  isValidLongitude,
  parseCoordinatePair,
} from '../geo'

describe('normalizeGpsAccuracy', () => {
  it('rounds floats to integers', () => {
    expect(normalizeGpsAccuracy(95.666)).toBe(96)
  })

  it('returns null for invalid values', () => {
    expect(normalizeGpsAccuracy(null)).toBeNull()
    expect(normalizeGpsAccuracy('bad')).toBeNull()
  })
})

describe('haversineDistance', () => {
  it('returns zero for identical points', () => {
    expect(haversineDistance(20, 78, 20, 78)).toBe(0)
  })

  it('returns a positive distance for separated points', () => {
    const distance = haversineDistance(20, 78, 21, 79)
    expect(distance).toBeGreaterThan(100000)
  })
})

describe('isWithinGeofence', () => {
  it('detects points inside radius', () => {
    expect(isWithinGeofence(20, 78, 20, 78, 500)).toBe(true)
  })

  it('detects points outside radius', () => {
    expect(isWithinGeofence(21, 79, 20, 78, 500)).toBe(false)
  })
})

describe('formatCoordinates', () => {
  it('formats to six decimal places', () => {
    expect(formatCoordinates(20.5937, 78.9629)).toBe('20.593700, 78.962900')
  })
})

describe('coordinate validation', () => {
  it('validates latitude and longitude ranges', () => {
    expect(isValidLatitude(20.5)).toBe(true)
    expect(isValidLatitude(95)).toBe(false)
    expect(isValidLongitude(78.9)).toBe(true)
    expect(isValidLongitude(190)).toBe(false)
  })

  it('parses pasted coordinate pairs', () => {
    expect(parseCoordinatePair('20.5937, 78.9629')).toEqual({
      latitude: 20.5937,
      longitude: 78.9629,
    })
    expect(parseCoordinatePair('invalid')).toBeNull()
  })
})