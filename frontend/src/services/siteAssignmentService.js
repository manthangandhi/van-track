import { supabase } from './supabaseClient'
import { isSiteActive } from './sitesService'
import { getLocalDateKey } from '../utils/helpers'

// site_assignments has two FKs to profiles (employee_id, created_by) — must disambiguate embeds
const EMPLOYEE_PROFILE = 'profiles!employee_id'

const ACTIVE_SITE_FIELDS = 'id, name, latitude, longitude, radius_meters'
const ACTIVE_SITE_FIELDS_WITH_STATUS = `${ACTIVE_SITE_FIELDS}, is_active`

async function queryActiveAssignments(employeeId, date, includeSiteIsActive) {
  const siteFields = includeSiteIsActive ? ACTIVE_SITE_FIELDS_WITH_STATUS : ACTIVE_SITE_FIELDS
  return supabase
    .from('site_assignments')
    .select(`*, sites!inner(${siteFields})`)
    .eq('employee_id', employeeId)
    .lte('start_date', date)
    .or(`end_date.is.null,end_date.gte.${date}`)
    .order('start_date', { ascending: false })
}

export function assignmentStatus(assignment, refDate = getLocalDateKey()) {
  if (assignment.start_date > refDate) return 'upcoming'
  if (assignment.end_date && assignment.end_date < refDate) return 'expired'
  return 'active'
}

export async function getActiveAssignments(employeeId, date) {
  let { data, error } = await queryActiveAssignments(employeeId, date, true)

  if (error?.code === '42703' && String(error.message || '').includes('is_active')) {
    ;({ data, error } = await queryActiveAssignments(employeeId, date, false))
  }

  if (error) {
    console.error('Active assignments error:', error)
    throw error
  }

  return (data || []).filter((assignment) => isSiteActive(assignment.sites))
}

export async function endOpenAssignments(employeeId, endDate) {
  const { data, error } = await supabase
    .from('site_assignments')
    .select('id')
    .eq('employee_id', employeeId)
    .is('end_date', null)

  if (error) throw error

  for (const row of data || []) {
    await updateSiteAssignment(row.id, { end_date: endDate })
  }
}

export async function getAssignmentsForSite(siteId, { startDate, endDate } = {}) {
  let query = supabase
    .from('site_assignments')
    .select(`*, ${EMPLOYEE_PROFILE}(id, full_name, phone, is_active)`)
    .eq('site_id', siteId)
    .order('start_date', { ascending: false })

  if (startDate) {
    query = query.or(`end_date.is.null,end_date.gte.${startDate}`)
  }
  if (endDate) {
    query = query.lte('start_date', endDate)
  }

  const { data, error } = await query
  if (error) {
    console.error('Site assignments error:', error)
    return []
  }
  return data || []
}

export async function getAssignmentsForEmployee(employeeId, { startDate, endDate } = {}) {
  let query = supabase
    .from('site_assignments')
    .select('*, sites(id, name)')
    .eq('employee_id', employeeId)
    .order('start_date', { ascending: false })

  if (startDate) {
    query = query.or(`end_date.is.null,end_date.gte.${startDate}`)
  }
  if (endDate) {
    query = query.lte('start_date', endDate)
  }

  const { data, error } = await query
  if (error) {
    console.error('Employee assignments error:', error)
    throw error
  }
  return data || []
}

export async function getAssignmentReport({ employeeIds, siteIds, startDate, endDate } = {}) {
  let query = supabase
    .from('site_assignments')
    .select(`*, ${EMPLOYEE_PROFILE}(id, full_name, phone), sites(id, name)`)
    .order('start_date', { ascending: true })

  if (employeeIds?.length) {
    query = query.in('employee_id', employeeIds)
  }
  if (siteIds?.length) {
    query = query.in('site_id', siteIds)
  }
  if (startDate) {
    query = query.or(`end_date.is.null,end_date.gte.${startDate}`)
  }
  if (endDate) {
    query = query.lte('start_date', endDate)
  }

  const { data, error } = await query
  if (error) {
    console.error('Assignment report error:', error)
    return []
  }
  return data || []
}

export async function createSiteAssignment({
  employeeId,
  siteId,
  startDate,
  endDate = null,
  notes = null,
  createdBy = null,
  syncProfileSite = true,
}) {
  const { data, error } = await supabase
    .from('site_assignments')
    .insert([
      {
        employee_id: employeeId,
        site_id: siteId,
        start_date: startDate,
        end_date: endDate || null,
        notes,
        created_by: createdBy,
      },
    ])
    .select()
    .single()

  if (error) throw error

  if (syncProfileSite) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ assigned_site_id: siteId, updated_at: new Date().toISOString() })
      .eq('id', employeeId)

    if (profileError) throw profileError
  }

  return data
}

export async function updateSiteAssignment(id, updates) {
  const { data, error } = await supabase
    .from('site_assignments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteSiteAssignment(id) {
  const { error } = await supabase.from('site_assignments').delete().eq('id', id)
  if (error) throw error
}

export function generateAssignmentCSV(rows) {
  const headers = ['Employee', 'Site', 'Start Date', 'End Date', 'Status', 'Notes']
  let csv = headers.join(',') + '\n'
  const today = new Date().toISOString().split('T')[0]

  rows.forEach((row) => {
    const status = assignmentStatus(row, today)
    csv += [
      `"${row.profiles?.full_name || ''}"`,
      `"${row.sites?.name || ''}"`,
      row.start_date,
      row.end_date || 'Ongoing',
      status,
      `"${row.notes || ''}"`,
    ].join(',') + '\n'
  })

  return csv
}