import { getSyncQueue, removeFromSyncQueue, addToSyncQueue } from './offlineStore'
import { createPunch, uploadPunchPhoto } from './punchService'

export { addToSyncQueue, getSyncQueue } from './offlineStore'

let syncing = false

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

/**
 * Process sync queue when online
 */
export async function processSyncQueue(employeeId) {
  if (syncing) {
    return { synced: 0, failed: 0, skipped: true }
  }

  const queue = await getSyncQueue()
  if (queue.length === 0) {
    return { synced: 0, failed: 0 }
  }

  syncing = true
  let synced = 0
  let failed = 0

  try {
    for (const item of queue) {
      try {
        if (item.type !== 'punch') continue

        const ownerId = item.employeeId || employeeId
        if (!ownerId) {
          failed++
          continue
        }

        let photoUrl = item.photoUrl
        if (photoUrl?.startsWith('data:')) {
          const blob = base64ToBlob(photoUrl)
          photoUrl = await uploadPunchPhoto(ownerId, blob, item.punchType)
        }

        if (!photoUrl) {
          failed++
          continue
        }

        await createPunch({
          employee_id: ownerId,
          punch_type: item.punchType,
          photo_url: photoUrl,
          latitude: item.latitude,
          longitude: item.longitude,
          gps_accuracy_meters: item.gpsAccuracy,
          device_timestamp: item.deviceTimestamp,
          synced_late: true,
          face_match_score: item.faceMatchScore ?? null,
          client_flags: item.clientFlags ?? [],
        })

        await removeFromSyncQueue(item.id)
        synced++
      } catch (error) {
        console.error('Error syncing punch:', error)
        failed++
      }
    }
  } finally {
    syncing = false
  }

  return { synced, failed }
}

export function monitorConnectivity(onlineCallback, offlineCallback) {
  const handleOnline = () => {
    onlineCallback()
  }

  const handleOffline = () => {
    offlineCallback()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

export function isOnline() {
  return navigator.onLine
}