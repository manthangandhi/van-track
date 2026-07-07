import { supabase } from './supabaseClient'
import { STRINGS } from '../utils/strings'

export function formatCreateEmployeeError(error) {
  const message = (error?.message || '').toLowerCase()
  if (
    message.includes('not found') ||
    message.includes('failed to send a request to the edge function') ||
    message.includes('cors') ||
    message.includes('err_failed')
  ) {
    return STRINGS.CREATE_EMPLOYEE_FUNCTION_MISSING
  }
  return error?.message || STRINGS.SERVER_ERROR
}

export async function parseCreateEmployeeError(error) {
  if (error?.context?.json) {
    try {
      const body = await error.context.json()
      if (body?.error) return body.error
    } catch {
      // fall through to generic formatter
    }
  }
  return formatCreateEmployeeError(error)
}

/**
 * Create an employee account (admin only — requires deployed create-employee Edge Function)
 */
export async function createEmployee({
  email,
  password,
  full_name,
  phone,
  assigned_site_id,
  mandatory_daily_hours = 8,
  is_active = true,
}) {
  const { data, error } = await supabase.functions.invoke('create-employee', {
    body: {
      email,
      password,
      full_name,
      phone: phone || null,
      assigned_site_id: assigned_site_id || null,
      mandatory_daily_hours,
      is_active,
    },
  })

  if (error) {
    throw new Error(await parseCreateEmployeeError(error))
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  if (!data?.user) {
    throw new Error(STRINGS.SERVER_ERROR)
  }

  return data.user
}