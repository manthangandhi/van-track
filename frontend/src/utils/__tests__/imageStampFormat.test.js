import { describe, it, expect } from 'vitest'
import {
  formatStampCoordinates,
  formatDecimalCoordinates,
  formatStampAccuracy,
  getAccuracyTier,
  buildStampMetadata,
} from '../imageStampFormat'

describe('imageStampFormat', () => {
  it('formats coordinates in descriptive DMS', () => {
    const result = formatStampCoordinates(20.5937, 78.9629)
    expect(result).toContain('N')
    expect(result).toContain('E')
    expect(result).toContain('°')
  })

  it('formats decimal coordinates with hemisphere labels', () => {
    expect(formatDecimalCoordinates(20.5937, 78.9629)).toBe('20.593700° N, 78.962900° E')
  })

  it('maps accuracy to readable tiers', () => {
    expect(getAccuracyTier(12).label).toBe('Excellent')
    expect(getAccuracyTier(80).label).toBe('Fair')
    expect(formatStampAccuracy(12)).toBe('±12 meters · Excellent')
  })

  it('builds structured stamp metadata', () => {
    const metadata = buildStampMetadata({
      label: 'Check In',
      timestamp: new Date('2026-07-08T09:15:30+05:30'),
      latitude: 20.5937,
      longitude: 78.9629,
      accuracy: 15,
      employeeName: 'Rajesh Kumar',
      siteName: 'Pench Gate',
    })

    expect(metadata.title).toBe('Check In')
    expect(metadata.rows.length).toBeGreaterThan(3)
    expect(metadata.footer).toContain('Rajesh Kumar')
    expect(metadata.footer).toContain('Pench Gate')
  })
})