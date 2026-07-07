import { supabase } from './supabaseClient'

export const LEAVE_TYPES = ['sick', 'annual', 'field_off', 'other']

export async function getHolidays(startDate, endDate) {
  let q = supabase.from('holidays').select('*, sites(name)').order('holiday_date')
  if (startDate) q = q.gte('holiday_date', startDate)
  if (endDate) q = q.lte('holiday_date', endDate)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createHoliday({ holiday_date, name, site_id = null }) {
  const { data, error } = await supabase
    .from('holidays')
    .insert({ holiday_date, name, site_id: site_id || null, created_by: (await supabase.auth.getUser()).data.user?.id })
    .select('*, sites(name)')
    .single()
  if (error) throw error
  return data
}

export async function deleteHoliday(id) {
  const { error } = await supabase.from('holidays').delete().eq('id', id)
  if (error) throw error
}

export async function getLeaveRequests({ status = null, employeeId = null } = {}) {
  let q = supabase
    .from('leave_requests')
    .select('*, employee:profiles!employee_id(full_name)')
    .order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  if (employeeId) q = q.eq('employee_id', employeeId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createLeaveRequest({ employee_id, start_date, end_date, leave_type, reason }) {
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({ employee_id, start_date, end_date, leave_type, reason: reason || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function reviewLeaveRequest(id, status, admin_comment = '') {
  const { data: user } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('leave_requests')
    .update({
      status,
      admin_comment,
      reviewed_by: user.user?.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function getApprovedLeaves(employeeId, startDate, endDate) {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('start_date, end_date')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .lte('start_date', endDate)
    .gte('end_date', startDate)
  if (error) throw error
  return data || []
}

export async function isOnApprovedLeave(employeeId, date) {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .lte('start_date', date)
    .gte('end_date', date)
    .limit(1)
  if (error) throw error
  return (data || []).length > 0
}

export async function getApprovedLeaveEmployeeIds(date) {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('employee_id')
    .eq('status', 'approved')
    .lte('start_date', date)
    .gte('end_date', date)
  if (error) throw error
  return new Set((data || []).map((r) => r.employee_id))
}

function dateInRange(date, start, end) {
  return date >= start && date <= end
}

export async function enrichAttendanceRecords(records, employeeId, siteId = null) {
  if (!records.length) return records
  const dates = records.map((r) => r.work_date)
  const startDate = dates.reduce((a, b) => (a < b ? a : b))
  const endDate = dates.reduce((a, b) => (a > b ? a : b))

  const [leaves, holidays] = await Promise.all([
    getApprovedLeaves(employeeId, startDate, endDate),
    getHolidays(startDate, endDate),
  ])

  const holidayDates = new Set(
    holidays
      .filter((h) => !h.site_id || !siteId || h.site_id === siteId)
      .map((h) => h.holiday_date)
  )

  return records.map((record) => {
    if (record.day_status !== 'absent') return record
    const onLeave = leaves.some((l) =>
      dateInRange(record.work_date, l.start_date, l.end_date)
    )
    if (onLeave) return { ...record, day_status: 'on_leave' }
    if (holidayDates.has(record.work_date)) return { ...record, day_status: 'holiday' }
    return record
  })
}