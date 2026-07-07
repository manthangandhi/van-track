import { describe, expect, it } from 'vitest'
import { needsPrivacyConsent } from '../../services/privacyService'

describe('needsPrivacyConsent', () => {
  it('returns false when consent matches current policy version', () => {
    const profile = {
      privacy_consent_at: '2026-07-01T10:00:00Z',
      privacy_consent_version: '1.0',
    }
    expect(needsPrivacyConsent(profile, { privacy_policy_version: '1.0' })).toBe(false)
  })

  it('returns true when consent is missing', () => {
    expect(needsPrivacyConsent({ privacy_consent_version: null }, { privacy_policy_version: '1.0' })).toBe(true)
  })

  it('returns true when policy version changed', () => {
    const profile = {
      privacy_consent_at: '2026-07-01T10:00:00Z',
      privacy_consent_version: '1.0',
    }
    expect(needsPrivacyConsent(profile, { privacy_policy_version: '1.1' })).toBe(true)
  })

  it('returns false when profile is null', () => {
    expect(needsPrivacyConsent(null, { privacy_policy_version: '1.0' })).toBe(false)
  })
})