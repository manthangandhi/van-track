import { supabase } from './supabaseClient'
import { haversineDistance } from '../utils/geo'

/**
 * Upload punch (selfie) to Supabase Storage
 * @param {string} employeeId - Employee UUID
 * @param {Blob} photoBlob - Compressed photo blob
 * @param {string} punchType - 'check_in' | 'midday' | 'check_out'
 * @returns {Promise<string>} Signed URL of uploaded photo
 */
export async function uploadPunchPhoto(employeeId, photoBlob, punchType) {
  const fileName = `${punchType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
  const filePath = `${employeeId}/${fileName}`

  const { data, error } = await supabase.storage.from('punch-photos').upload(filePath, photoBlob, {
    contentType: 'image/jpeg',
    upsert: false,
  })

  if (error) {
    console.error('Photo upload error:', error)
    throw error
  }

  // Get signed URL (valid for 7 days)
  const { data: signedData, error: signError } = await supabase.storage
    .from('punch-photos')
    .createSignedUrl(data.path, 604800) // 7 days

  if (signError) {
    throw signError
  }

  return signedData.signedUrl
}

/**
 * Create a punch record in Supabase
 * @param {Object} punch - Punch data
 * @returns {Promise<Object>} Created punch record
 */
export async function createPunch(punch) {
  const { data, error } = await supabase.from('punches').insert([punch]).select()

  if (error) {
    console.error('Punch creation error:', error)
    throw error
  }

  return data[0]
}

/**
 * Get punches for a specific employee on a date
 * @param {string} employeeId - Employee UUID
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of punch records
 */
export async function getPunchesForDay(employeeId, date) {
  const startOfDay = new Date(date + 'T00:00:00Z')
  const endOfDay = new Date(date + 'T23:59:59Z')

  const { data, error } = await supabase
    .from('punches')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('server_timestamp', startOfDay.toISOString())
    .lte('server_timestamp', endOfDay.toISOString())
    .order('server_timestamp', { ascending: true })

  if (error) {
    console.error('Error fetching punches:', error)
    return []
  }

  return data
}

/**
 * Get all punches for employee (limited by date range)
 * @param {string} employeeId - Employee UUID
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Promise<Array>} Array of punch records
 */
export async function getPunchesForDateRange(employeeId, startDate, endDate) {
  const { data, error } = await supabase
    .from('punches')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('server_timestamp', startDate)
    .lte('server_timestamp', endDate)
    .order('server_timestamp', { ascending: false })

  if (error) {
    console.error('Error fetching punches:', error)
    return []
  }

  return data
}

/**
 * Get flagged punches (for admin review)
 * @returns {Promise<Array>} Array of flagged punches
 */
export async function getFlaggedPunches() {
  const { data, error } = await supabase
    .from('punches')
    .select('*, profiles(full_name, phone)')
    .eq('status', 'flagged')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching flagged punches:', error)
    return []
  }

  return data
}

/**
 * Update punch status (approve/reject)
 * @param {string} punchId - Punch UUID
 * @param {string} status - 'approved' | 'rejected'
 * @param {string} comment - Admin comment
 * @returns {Promise<Object>} Updated punch record
 */
export async function updatePunchStatus(punchId, status, comment = '') {
  const { data, error } = await supabase
    .from('punches')
    .update({
      status,
      admin_comment: comment,
      updated_at: new Date().toISOString(),
    })
    .eq('id', punchId)
    .select()

  if (error) {
    throw error
  }

  return data[0]
}

/**
 * Check if employee already has a punch of a certain type today
 * @param {string} employeeId - Employee UUID
 * @param {string} punchType - Punch type to check
 * @returns {Promise<boolean>} True if punch already exists
 */
export async function hasPunchToday(employeeId, punchType) {
  const today = new Date().toISOString().split('T')[0]
  const punches = await getPunchesForDay(employeeId, today)
  return punches.some(
    (p) =>
      p.punch_type === punchType &&
      (p.status === 'auto_approved' || p.status === 'approved')
  )
}

/**
 * Compute punch details and flags
 * @param {Object} location - {latitude, longitude, accuracy}
 * @param {Object} site - Site record with lat/lon/radius
 * @param {boolean} syncedLate - Whether punch is syncing offline data
 * @returns {Object} Computed data with flags
 */
export function computePunchDetails(location, site, syncedLate = false) {
  let flagReasons = []
  let distance = null

  // Compute distance from site
  if (site) {
    distance = haversineDistance(location.latitude, location.longitude, site.latitude, site.longitude)

    if (distance > site.radius_meters) {
      flagReasons.push('outside_geofence')
    }
  }

  // GPS accuracy check
  if (location.accuracy && location.accuracy > 100) {
    flagReasons.push('poor_gps_accuracy')
  }

  // Synced late
  if (syncedLate) {
    flagReasons.push('synced_late')
  }

  return {
    distance,
    flagReasons,
    shouldFlag: flagReasons.length > 0,
  }
}

/**
 * Get punch statistics for admin dashboard
 * @param {string} date - ISO date string
 * @returns {Promise<Object>} Statistics
 */
export async function getDailyStats(date) {
  const startOfDay = new Date(date + 'T00:00:00Z').toISOString()
  const endOfDay = new Date(date + 'T23:59:59Z').toISOString()

  const { data: punches, error } = await supabase
    .from('punches')
    .select('employee_id, punch_type, status')
    .gte('server_timestamp', startOfDay)
    .lte('server_timestamp', endOfDay)

  if (error) {
    console.error('Error fetching stats:', error)
    return {}
  }

  const stats = {
    totalPunches: punches.length,
    checkedIn: new Set(),
    middayDone: new Set(),
    checkedOut: new Set(),
    flagged: new Set(),
  }

  punches.forEach((punch) => {
    if (punch.status === 'flagged') {
      stats.flagged.add(punch.employee_id)
    }
    switch (punch.punch_type) {
      case 'check_in':
        stats.checkedIn.add(punch.employee_id)
        break
      case 'midday':
        stats.middayDone.add(punch.employee_id)
        break
      case 'check_out':
        stats.checkedOut.add(punch.employee_id)
        break
      default:
        break
    }
  })

  return {
    totalPunches: stats.totalPunches,
    checkedInCount: stats.checkedIn.size,
    middayDoneCount: stats.middayDone.size,
    checkedOutCount: stats.checkedOut.size,
    flaggedCount: stats.flagged.size,
  }
}
