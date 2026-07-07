import { supabase } from './supabaseClient'
import { haversineDistance, normalizeGpsAccuracy } from '../utils/geo'
import { getLocalDateKey, getDayBoundsISO } from '../utils/helpers'
import { getSyncQueue } from './offlineStore'
import { blocksDuplicatePunch } from '../utils/punchHelpers'

const PHOTO_BUCKET = 'punch-photos'
const SIGNED_URL_TTL = 3600

/**
 * Extract storage path from a path or legacy signed URL
 */
export function getStoragePath(photoUrlOrPath) {
  if (!photoUrlOrPath) return null
  if (!photoUrlOrPath.startsWith('http')) return photoUrlOrPath

  const match = photoUrlOrPath.match(/punch-photos\/([^?]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Resolve a storage path (or legacy signed URL) to a fresh signed URL
 */
export async function getSignedPhotoUrl(photoUrlOrPath) {
  if (!photoUrlOrPath) return null

  const path = getStoragePath(photoUrlOrPath)
  if (!path) {
    return photoUrlOrPath.startsWith('http') ? photoUrlOrPath : null
  }

  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL)

  if (error) {
    console.error('Signed URL error:', error)
    return null
  }

  return data.signedUrl
}

/**
 * Attach fresh signed URLs to punch records for display
 */
export async function enrichPunchesWithSignedUrls(punches) {
  return Promise.all(
    punches.map(async (punch) => {
      const referencePath = punch.profiles?.reference_selfie_url
      return {
        ...punch,
        signed_photo_url: await getSignedPhotoUrl(punch.photo_url),
        signed_reference_selfie_url: referencePath
          ? await getSignedPhotoUrl(referencePath)
          : null,
      }
    })
  )
}

/**
 * Upload punch (selfie) to Supabase Storage
 * @returns {Promise<string>} Storage path (not a signed URL)
 */
export async function uploadPunchPhoto(employeeId, photoBlob, punchType) {
  const fileName = `${punchType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`
  const filePath = `${employeeId}/${fileName}`

  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).upload(filePath, photoBlob, {
    contentType: 'image/jpeg',
    upsert: false,
  })

  if (error) {
    console.error('Photo upload error:', error)
    throw error
  }

  return data.path
}

/**
 * Upload reference selfie during admin enrollment
 */
/**
 * Save employee reference selfie + face descriptor (first-login enrollment)
 */
export async function saveEmployeeReferenceSelfie(employeeId, photoBlob, faceDescriptor) {
  const path = await uploadReferenceSelfie(employeeId, photoBlob)

  const { data: rpcData, error: rpcError } = await supabase.rpc('enroll_reference_selfie', {
    p_photo_path: path,
    p_face_descriptor: faceDescriptor,
  })

  const rpcMissing =
    rpcError?.code === 'PGRST202' ||
    rpcError?.message?.includes('Could not find the function') ||
    rpcError?.message?.includes('does not exist')

  if (!rpcError && rpcData?.reference_selfie_url && rpcData?.face_descriptor) {
    return rpcData
  }

  if (rpcError && !rpcMissing) {
    throw rpcError
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      reference_selfie_url: path,
      face_descriptor: faceDescriptor,
      reference_selfie_enrolled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', employeeId)
    .select('id, reference_selfie_url, face_descriptor, reference_selfie_enrolled_at')
    .single()

  if (error) {
    throw error
  }

  if (!data?.reference_selfie_url || !data?.face_descriptor) {
    throw new Error('PROFILE_UPDATE_FAILED')
  }

  return data
}

export async function uploadReferenceSelfie(employeeId, photoBlob) {
  const filePath = `${employeeId}/reference_${Date.now()}.jpg`

  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).upload(filePath, photoBlob, {
    contentType: 'image/jpeg',
    upsert: true,
  })

  if (error) {
    console.error('Reference selfie upload error:', error)
    throw error
  }

  return data.path
}

/**
 * Create a punch record in Supabase
 * @param {Object} punch - Punch data
 * @returns {Promise<Object>} Created punch record
 */
export async function createPunch(punch) {
  const payload = {
    ...punch,
    gps_accuracy_meters: normalizeGpsAccuracy(punch.gps_accuracy_meters),
  }

  const { data, error } = await supabase.from('punches').insert([payload]).select()

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
  const dateKey = getLocalDateKey(date)
  const { start, end } = getDayBoundsISO(dateKey)

  const { data, error } = await supabase
    .from('punches')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('server_timestamp', start)
    .lte('server_timestamp', end)
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
  const { start } = getDayBoundsISO(getLocalDateKey(startDate))
  const { end } = getDayBoundsISO(getLocalDateKey(endDate))

  const { data, error } = await supabase
    .from('punches')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('server_timestamp', start)
    .lte('server_timestamp', end)
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
    .select(
      '*, profiles(full_name, phone, reference_selfie_url), sites!site_id(name, latitude, longitude, radius_meters)'
    )
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

  if (!data?.length) {
    throw new Error('Punch not found or not authorized')
  }

  return data[0]
}

/**
 * Queued offline punches for a calendar day (not yet synced to server).
 */
export async function getQueuedPunchesForDay(employeeId, dateKey = getLocalDateKey()) {
  const queue = await getSyncQueue()
  return queue.filter(
    (item) =>
      item.type === 'punch' &&
      item.employeeId === employeeId &&
      item.deviceTimestamp &&
      getLocalDateKey(item.deviceTimestamp) === dateKey
  )
}

/** Merge server punches with queued offline punches for dashboard display. */
export async function getTodayPunchesIncludingQueued(employeeId, dateKey = getLocalDateKey()) {
  const [serverPunches, queued] = await Promise.all([
    getPunchesForDay(employeeId, dateKey),
    getQueuedPunchesForDay(employeeId, dateKey),
  ])

  const queuedTypes = new Set(queued.map((item) => item.punchType))
  const merged = serverPunches.filter((punch) => !queuedTypes.has(punch.punch_type))

  for (const item of queued) {
    merged.push({
      id: `queued-${item.id}`,
      punch_type: item.punchType,
      status: 'pending',
      server_timestamp: item.deviceTimestamp,
      offline: true,
    })
  }

  return merged.sort(
    (a, b) => new Date(a.server_timestamp).getTime() - new Date(b.server_timestamp).getTime()
  )
}

/**
 * Check if employee already has a punch of a certain type today
 * @param {string} employeeId - Employee UUID
 * @param {string} punchType - Punch type to check
 * @returns {Promise<boolean>} True if punch already exists
 */
export async function hasPunchToday(employeeId, punchType) {
  const today = getLocalDateKey()
  const [punches, queued] = await Promise.all([
    getPunchesForDay(employeeId, today),
    getQueuedPunchesForDay(employeeId, today),
  ])

  if (punches.some((p) => p.punch_type === punchType && blocksDuplicatePunch(p))) {
    return true
  }

  return queued.some((item) => item.punchType === punchType)
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
  const accuracyMeters = normalizeGpsAccuracy(location.accuracy)
  if (accuracyMeters != null && accuracyMeters > 100) {
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
 * Get all punches for a date, grouped by employee
 */
export async function getTodayPunchesByEmployee(date) {
  const dateKey = getLocalDateKey(date)
  const { start, end } = getDayBoundsISO(dateKey)

  const { data, error } = await supabase
    .from('punches')
    .select(`
      *,
      profiles (full_name, assigned_site_id),
      sites!site_id (name, latitude, longitude, radius_meters)
    `)
    .gte('server_timestamp', start)
    .lte('server_timestamp', end)
    .order('server_timestamp', { ascending: true })

  if (error) {
    console.error('Error fetching today punches:', error)
    return {}
  }

  const byEmployee = {}
  for (const punch of data || []) {
    if (!byEmployee[punch.employee_id]) {
      byEmployee[punch.employee_id] = {}
    }
    byEmployee[punch.employee_id][punch.punch_type] = punch
  }

  return byEmployee
}

/**
 * Get punch statistics for admin dashboard
 * @param {string} date - ISO date string
 * @returns {Promise<Object>} Statistics
 */
export async function getDailyStats(date) {
  const dateKey = getLocalDateKey(date)
  const { start, end } = getDayBoundsISO(dateKey)

  const { data: punches, error } = await supabase
    .from('punches')
    .select('employee_id, punch_type, status')
    .gte('server_timestamp', start)
    .lte('server_timestamp', end)

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
