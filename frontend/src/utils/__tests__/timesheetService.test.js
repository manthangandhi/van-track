import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '../../services/supabaseClient'
import { filterRecordsBySiteAssignment } from '../../services/timesheetService'

describe('filterRecordsBySiteAssignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when assignment query fails', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
    }
    supabase.from.mockReturnValue(chain)

    const records = [{ employee_id: 'e1', work_date: '2026-07-01' }]

    await expect(filterRecordsBySiteAssignment(records, ['site-1'])).rejects.toEqual({
      message: 'db error',
    })
  })

  it('returns empty list when no assignments match filter', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    supabase.from.mockReturnValue(chain)

    const records = [{ employee_id: 'e1', work_date: '2026-07-01' }]
    await expect(filterRecordsBySiteAssignment(records, ['site-1'])).resolves.toEqual([])
  })
})