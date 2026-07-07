import { describe, expect, it, vi } from 'vitest'
import { formatCreateEmployeeError, parseCreateEmployeeError } from '../../services/employeeService'
import { STRINGS } from '../strings'

describe('employeeService errors', () => {
  it('maps missing edge function to deploy message', () => {
    expect(formatCreateEmployeeError({ message: 'Failed to send a request to the edge function' })).toBe(
      STRINGS.CREATE_EMPLOYEE_FUNCTION_MISSING
    )
  })

  it('maps CORS failures to deploy message', () => {
    expect(formatCreateEmployeeError({ message: 'CORS policy blocked' })).toBe(
      STRINGS.CREATE_EMPLOYEE_FUNCTION_MISSING
    )
  })

  it('parses edge function JSON error body', async () => {
    const error = {
      message: 'Edge Function returned a non-2xx status code',
      context: {
        json: vi.fn().mockResolvedValue({ error: 'An account with this email already exists' }),
      },
    }

    await expect(parseCreateEmployeeError(error)).resolves.toBe('An account with this email already exists')
  })

  it('falls back when error body cannot be parsed', async () => {
    const error = {
      message: 'Something else',
      context: { json: vi.fn().mockRejectedValue(new Error('bad json')) },
    }

    await expect(parseCreateEmployeeError(error)).resolves.toBe('Something else')
  })
})