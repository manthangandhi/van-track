import { getSyncQueue, removeFromSyncQueue, addToSyncQueue } from './offlineStore'
import { createPunch, uploadPunchPhoto } from './punchService'

/**
 * Process sync queue when online
 * Uploads offline punches and syncs with server
 */
export async function processSyncQueue(employeeId) {
  const queue = await getSyncQueue()

  if (queue.length === 0) {
    return { synced: 0, failed: 0 }
  }

  let synced = 0
  let failed = 0

  for (const item of queue) {
    try {
      if (item.type === 'punch') {
        // Re-upload photo if stored as base64
        let photoUrl = item.photoUrl
        if (item.photoUrl.startsWith('data:')) {
          const blob = base64ToBlob(item.photoUrl)
          photoUrl = await uploadPunchPhoto(employeeId, blob, item.punchType)
        }

        // Create punch on server
        await createPunch({
          employee_id: employeeId,
          punch_type: item.punchType,
          photo_url: photoUrl,
          latitude: item.latitude,
          longitude: item.longitude,
          gps_accuracy_meters: item.gpsAccuracy,
          device_timestamp: item.deviceTimestamp,
          synced_late: true, // Mark as synced late
        })

        await removeFromSyncQueue(item.id)
        synced++
      }
    } catch (error) {
      console.error('Error syncing punch:', error)
      failed++
    }
  }

  return { synced, failed }
}

/**
 * Monitor online/offline status and trigger sync when online
 */
export function monitorConnectivity(onlineCallback, offlineCallback) {
  const handleOnline = () => {
    console.log('Back online, syncing punches...')
    onlineCallback()
  }

  const handleOffline = () => {
    console.log('Went offline')
    offlineCallback()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

/**
 * Check if device is currently online
 * @returns {boolean}
 */
export function isOnline() {
  return navigator.onLine
}

// Import from imageService
function base64ToBlob(base64) {
  const parts = base64.split(',')
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const bstr = atob(parts[1])
  const n = bstr.length
  const u8arr = new Uint8Array(n)

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i)
  }

  return new Blob([u8arr], { type: mime })
}
