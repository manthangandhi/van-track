import { supabase } from './supabaseClient'

export function isSiteActive(site) {
  return site?.is_active !== false
}

export function filterActiveSites(sites) {
  return (sites || []).filter(isSiteActive)
}

function isMissingSiteIsActiveColumn(error) {
  return error?.code === '42703' && String(error.message || '').includes('is_active')
}

export function stripSiteIsActiveColumn(select) {
  return select.replace(/,?\s*is_active/g, '').replace(/^\s*,\s*/, '').trim() || '*'
}

export async function selectSites(columns = '*', options = {}) {
  let query = supabase.from('sites').select(columns)
  if (options.orderByName !== false) {
    query = query.order('name')
  }
  const result = await query
  if (isMissingSiteIsActiveColumn(result.error)) {
    const fallback = stripSiteIsActiveColumn(columns)
    let retry = supabase.from('sites').select(fallback)
    if (options.orderByName !== false) {
      retry = retry.order('name')
    }
    return retry
  }
  return result
}

export async function upsertSite(payload, { id } = {}) {
  const attempt = async (data) => {
    if (id) {
      return supabase.from('sites').update(data).eq('id', id).select().single()
    }
    return supabase.from('sites').insert([data]).select().single()
  }

  let result = await attempt(payload)
  if (isMissingSiteIsActiveColumn(result.error) && 'is_active' in payload) {
    const { is_active: _ignored, ...withoutActive } = payload
    result = await attempt(withoutActive)
  }
  return result
}