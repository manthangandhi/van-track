import { supabase } from './supabaseClient'
import { getDailyStats } from './punchService'
import { filterRecordsBySiteAssignment } from './timesheetService'
import { getLocalDateKey } from '../utils/helpers'

export async function getAdminOverview() {
  const today = getLocalDateKey()

  const [
    { count: employeeCount },
    { count: siteCount },
    { count: flaggedCount },
    todayStats,
    { data: weekData },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'employee')
      .eq('is_active', true),
    supabase.from('sites').select('*', { count: 'exact', head: true }),
    supabase
      .from('punches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'flagged'),
    getDailyStats(today),
    supabase
      .from('attendance_days')
      .select('work_date, day_status, hours_worked, employee_id, profiles(assigned_site_id, sites(name))')
      .gte('work_date', addDaysISO(today, -6))
      .lte('work_date', today),
  ])

  const activeToday = todayStats.checkedInCount || 0
  const attendanceRate =
    employeeCount > 0 ? Math.round((activeToday / employeeCount) * 100) : 0

  return {
    employeeCount: employeeCount || 0,
    siteCount: siteCount || 0,
    flaggedCount: flaggedCount || 0,
    activeToday,
    attendanceRate,
    todayStats,
  }
}

export async function getAttendanceInsights(startDate, endDate, siteId = null) {
  let query = supabase
    .from('attendance_days')
    .select('work_date, day_status, hours_worked, day_flag_reasons, employee_id, profiles(full_name, assigned_site_id, sites(id, name))')
    .gte('work_date', startDate)
    .lte('work_date', endDate)

  const { data, error } = await query.order('work_date', { ascending: true })

  if (error) {
    console.error('Insights error:', error)
    return { byDay: [], bySite: [], byEmployee: [], totals: null, error: error.message }
  }

  let records = data || []
  if (siteId) {
    records = await filterRecordsBySiteAssignment(records, [siteId])
  }

  const byDayMap = {}
  const bySiteMap = {}
  const byEmployeeMap = {}

  records.forEach((record) => {
    const date = record.work_date
    const siteName = record.profiles?.sites?.name || 'Unassigned'
    const empId = record.employee_id
    const empName = record.profiles?.full_name || 'Unknown'
    const hours = record.hours_worked || 0
    const status = record.day_status

    if (!byDayMap[date]) {
      byDayMap[date] = { date, totalHours: 0, present: 0, absent: 0, flagged: 0, employees: new Set() }
    }
    byDayMap[date].totalHours += hours
    byDayMap[date].employees.add(empId)
    if (status === 'absent') byDayMap[date].absent += 1
    else if (status !== 'pending') byDayMap[date].present += 1

    if (!bySiteMap[siteName]) {
      bySiteMap[siteName] = { siteName, totalHours: 0, fullDays: 0, halfDays: 0, shortDays: 0, absentDays: 0, employees: new Set() }
    }
    bySiteMap[siteName].totalHours += hours
    bySiteMap[siteName].employees.add(empId)
    if (status === 'full') bySiteMap[siteName].fullDays += 1
    else if (status === 'half') bySiteMap[siteName].halfDays += 1
    else if (status === 'short') bySiteMap[siteName].shortDays += 1
    else if (status === 'absent') bySiteMap[siteName].absentDays += 1

    if (!byEmployeeMap[empId]) {
      byEmployeeMap[empId] = {
        employeeId: empId,
        fullName: empName,
        siteName,
        totalHours: 0,
        fullDays: 0,
        halfDays: 0,
        shortDays: 0,
        absentDays: 0,
        missingMidday: 0,
      }
    }
    byEmployeeMap[empId].totalHours += hours
    if (status === 'full') byEmployeeMap[empId].fullDays += 1
    else if (status === 'half') byEmployeeMap[empId].halfDays += 1
    else if (status === 'short') byEmployeeMap[empId].shortDays += 1
    else if (status === 'absent') byEmployeeMap[empId].absentDays += 1
    if (record.day_flag_reasons?.includes('missing_midday')) {
      byEmployeeMap[empId].missingMidday += 1
    }
  })

  const byDay = Object.values(byDayMap)
    .map((d) => ({
      date: d.date,
      totalHours: d.totalHours,
      present: d.present,
      absent: d.absent,
      headcount: d.employees.size,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  const bySite = Object.values(bySiteMap)
    .map((s) => ({ ...s, employeeCount: s.employees.size }))
    .sort((a, b) => b.totalHours - a.totalHours)

  const byEmployee = Object.values(byEmployeeMap).sort((a, b) => b.totalHours - a.totalHours)

  const totals = records.reduce(
    (acc, r) => {
      acc.totalHours += r.hours_worked || 0
      acc.totalDays += 1
      if (r.day_status === 'full') acc.fullDays += 1
      else if (r.day_status === 'half') acc.halfDays += 1
      else if (r.day_status === 'short') acc.shortDays += 1
      else if (r.day_status === 'absent') acc.absentDays += 1
      return acc
    },
    { totalHours: 0, totalDays: 0, fullDays: 0, halfDays: 0, shortDays: 0, absentDays: 0 }
  )

  return { byDay, bySite, byEmployee, totals }
}

function addDaysISO(isoDate, days) {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}