import { supabase } from './supabaseClient'

/**
 * Compute attendance days for an employee over a date range
 * @param {string} employeeId - Employee UUID
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Promise<Array>} Attendance records by day
 */
export async function getAttendanceDays(employeeId, startDate, endDate) {
  const { data, error } = await supabase
    .from('attendance_days')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .order('work_date', { ascending: false })

  if (error) {
    console.error('Error fetching attendance days:', error)
    return []
  }

  return data
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

  // Filter by site if needed
  if (siteIds && siteIds.length > 0) {
    return data.filter((record) => siteIds.includes(record.profiles?.assigned_site_id))
  }

  return data
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
        records: [],
      }
    }

    aggregated[empId].records.push(record)
    aggregated[empId].totalHours += record.hours_worked || 0
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
  }))

  const worksheet = XLSX.utils.json_to_sheet(formattedData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Timesheet')

  XLSX.writeFile(workbook, fileName)
}
