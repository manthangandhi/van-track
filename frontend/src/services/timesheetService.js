import { supabase } from './supabaseClient'

/**
 * Compute attendance days for an employee over a date range
 * @param {string} employeeId - Employee UUID
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Promise<Array>} Attendance records by day
 */
export async function getAttendanceDays(employeeId, startDate, endDate, options = {}) {
  const { siteId = null, status = null } = options

  const { data, error } = await supabase
    .from('attendance_days')
    .select('*, profiles(full_name, assigned_site_id, sites(id, name))')
    .eq('employee_id', employeeId)
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .order('work_date', { ascending: false })

  if (error) {
    console.error('Error fetching attendance days:', error)
    return []
  }

  let records = data || []

  if (siteId) {
    records = await filterRecordsBySiteAssignment(records, [siteId])
  }

  if (status) {
    records = records.filter((r) => r.day_status === status)
  }

  return records
}

/**
 * Summarize employee attendance for a filtered period
 */
export function summarizeEmployeeAttendance(records) {
  return records.reduce(
    (acc, record) => {
      acc.totalHours += record.hours_worked || 0
      acc.totalDays += 1
      switch (record.day_status) {
        case 'full':
          acc.fullDays += 1
          break
        case 'half':
          acc.halfDays += 1
          break
        case 'short':
          acc.shortDays += 1
          break
        case 'absent':
          acc.absentDays += 1
          break
        case 'pending':
          acc.pendingDays += 1
          break
        default:
          break
      }
      if (record.day_flag_reasons?.includes('missing_midday')) {
        acc.missingMidday += 1
      }
      return acc
    },
    {
      totalHours: 0,
      totalDays: 0,
      fullDays: 0,
      halfDays: 0,
      shortDays: 0,
      absentDays: 0,
      pendingDays: 0,
      missingMidday: 0,
    }
  )
}

/**
 * Export personal timesheet rows to CSV
 */
export function generateEmployeeCSV(records) {
  const headers = ['Date', 'Site', 'Status', 'Hours', 'Flags']
  let csv = headers.join(',') + '\n'

  records.forEach((record) => {
    const row = [
      record.work_date,
      `"${record.profiles?.sites?.name || '—'}"`,
      record.day_status,
      (record.hours_worked || 0).toFixed(2),
      `"${(record.day_flag_reasons || []).join('; ')}"`,
    ]
    csv += row.join(',') + '\n'
  })

  return csv
}

/**
 * Generate timesheet data for export
 * @param {Array<string>} employeeIds - Employee UUIDs to include (null = all)
 * @param {Array<string>} siteIds - Site IDs to filter (null = all)
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Promise<Array>} Timesheet records with aggregated data
 */
export async function generateTimesheet(employeeIds, siteIds, startDate, endDate) {
  let query = supabase
    .from('attendance_days')
    .select('*, profiles(full_name, phone, assigned_site_id)')
    .gte('work_date', startDate)
    .lte('work_date', endDate)

  if (employeeIds && employeeIds.length > 0) {
    query = query.in('employee_id', employeeIds)
  }

  const { data, error } = await query.order('work_date', { ascending: true })

  if (error) {
    console.error('Error generating timesheet:', error)
    return []
  }

  if (siteIds && siteIds.length > 0) {
    return await filterRecordsBySiteAssignment(data, siteIds)
  }

  return data
}

export async function filterRecordsBySiteAssignment(records, siteIds) {
  if (!records.length) return records

  const dates = records.map((r) => r.work_date)
  const minDate = dates.reduce((a, b) => (a < b ? a : b))
  const maxDate = dates.reduce((a, b) => (a > b ? a : b))

  const { data: assignments, error } = await supabase
    .from('site_assignments')
    .select('employee_id, site_id, start_date, end_date')
    .in('site_id', siteIds)
    .lte('start_date', maxDate)
    .or(`end_date.is.null,end_date.gte.${minDate}`)

  if (error) {
    console.error('Assignment filter error:', error)
    return records
  }

  if (!assignments?.length) return []

  return records.filter((record) =>
    assignments.some(
      (a) =>
        a.employee_id === record.employee_id &&
        siteIds.includes(a.site_id) &&
        a.start_date <= record.work_date &&
        (!a.end_date || a.end_date >= record.work_date)
    )
  )
}

/**
 * Aggregate timesheet data by employee
 * @param {Array} timesheetData - Raw timesheet data
 * @returns {Array} Aggregated data per employee
 */
export function aggregateTimesheetByEmployee(timesheetData) {
  const aggregated = {}

  timesheetData.forEach((record) => {
    const empId = record.employee_id
    if (!aggregated[empId]) {
      aggregated[empId] = {
        employeeId: empId,
        fullName: record.profiles?.full_name || 'Unknown',
        phone: record.profiles?.phone || '',
        totalHours: 0,
        totalDays: 0,
        fullDays: 0,
        halfDays: 0,
        shortDays: 0,
        absentDays: 0,
        pendingDays: 0,
        missingMiddayDays: 0,
        records: [],
      }
    }

    aggregated[empId].records.push(record)
    aggregated[empId].totalHours += record.hours_worked || 0

    if (record.day_flag_reasons?.includes('missing_midday')) {
      aggregated[empId].missingMiddayDays += 1
    }
    aggregated[empId].totalDays += 1

    switch (record.day_status) {
      case 'full':
        aggregated[empId].fullDays += 1
        break
      case 'half':
        aggregated[empId].halfDays += 1
        break
      case 'short':
        aggregated[empId].shortDays += 1
        break
      case 'absent':
        aggregated[empId].absentDays += 1
        break
      case 'pending':
        aggregated[empId].pendingDays += 1
        break
      default:
        break
    }
  })

  return Object.values(aggregated)
}

/**
 * Aggregate timesheet data by day
 * @param {Array} timesheetData - Raw timesheet data
 * @returns {Array} Aggregated data per day
 */
export function aggregateTimesheetByDay(timesheetData) {
  const aggregated = {}

  timesheetData.forEach((record) => {
    const date = record.work_date
    if (!aggregated[date]) {
      aggregated[date] = {
        date,
        employees: [],
        totalHours: 0,
        avgHours: 0,
      }
    }

    aggregated[date].employees.push({
      id: record.employee_id,
      name: record.profiles?.full_name || 'Unknown',
      hours: record.hours_worked || 0,
      status: record.day_status,
    })
    aggregated[date].totalHours += record.hours_worked || 0
  })

  // Calculate averages
  Object.values(aggregated).forEach((day) => {
    day.avgHours = day.employees.length > 0 ? day.totalHours / day.employees.length : 0
  })

  return Object.values(aggregated).sort((a, b) => new Date(a.date) - new Date(b.date))
}

/**
 * Export timesheet to CSV format
 * @param {Array} timesheetData - Aggregated timesheet data
 * @returns {string} CSV content
 */
export function generateCSV(timesheetData) {
  const headers = [
    'Employee ID',
    'Full Name',
    'Phone',
    'Total Hours',
    'Total Days',
    'Full Days',
    'Half Days',
    'Short Days',
    'Absent Days',
    'Missing Midday Days',
  ]

  let csv = headers.join(',') + '\n'

  timesheetData.forEach((emp) => {
    const row = [
      emp.employeeId,
      `"${emp.fullName}"`,
      `"${emp.phone}"`,
      emp.totalHours.toFixed(2),
      emp.totalDays,
      emp.fullDays,
      emp.halfDays,
      emp.shortDays,
      emp.absentDays,
      emp.missingMiddayDays || 0,
    ]
    csv += row.join(',') + '\n'
  })

  return csv
}

/**
 * Export timesheet to XLSX format (using SheetJS)
 * @param {Array} timesheetData - Aggregated timesheet data
 * @param {string} fileName - Output file name
 */
export async function generateXLSX(timesheetData, fileName = 'timesheet.xlsx') {
  const XLSX = await import('xlsx')

  const formattedData = timesheetData.map((emp) => ({
    'Employee ID': emp.employeeId,
    'Full Name': emp.fullName,
    Phone: emp.phone,
    'Total Hours': emp.totalHours.toFixed(2),
    'Total Days': emp.totalDays,
    'Full Days': emp.fullDays,
    'Half Days': emp.halfDays,
    'Short Days': emp.shortDays,
    'Absent Days': emp.absentDays,
    'Missing Midday Days': emp.missingMiddayDays || 0,
  }))

  const worksheet = XLSX.utils.json_to_sheet(formattedData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Timesheet')

  XLSX.writeFile(workbook, fileName)
}
