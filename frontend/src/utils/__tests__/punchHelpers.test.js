import { describe, it, expect } from 'vitest'
import { hasValidCheckIn, blocksDuplicatePunch, isApprovedPunch } from '../punchHelpers'

describe('punchHelpers', () => {
  it('recognizes approved punches', () => {
    expect(isApprovedPunch({ status: 'approved' })).toBe(true)
    expect(isApprovedPunch({ status: 'flagged' })).toBe(false)
  })

  it('requires approved check-in for midday', () => {
    expect(hasValidCheckIn({ check_in: { status: 'flagged' } })).toBe(false)
    expect(hasValidCheckIn({ check_in: { status: 'auto_approved' } })).toBe(true)
  })

  it('allows retry after rejected punch', () => {
    expect(blocksDuplicatePunch({ status: 'rejected' })).toBe(false)
    expect(blocksDuplicatePunch({ status: 'flagged' })).toBe(true)
  })
})