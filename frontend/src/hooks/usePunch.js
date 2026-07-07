import { useState, useCallback } from 'react'
import { createPunch, uploadPunchPhoto, hasPunchToday } from '../services/punchService'
import { compressImage } from '../services/imageService'

export function usePunch() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const recordPunch = useCallback(
    async (employeeId, punchType, photoBlob, location, site, syncedLate = false) => {
      setLoading(true)
      setError(null)

      try {
        // Check if punch already exists
        if (punchType === 'check_in') {
          const alreadyExists = await hasPunchToday(employeeId, punchType)
          if (alreadyExists) {
            throw new Error('You already checked in today')
          }
        }

        // Compress image
        const compressedBlob = await compressImage(photoBlob, 480, 480, 0.7)

        // Upload photo
        const photoUrl = await uploadPunchPhoto(employeeId, compressedBlob, punchType)

        // Create punch record
        const punch = await createPunch({
          employee_id: employeeId,
          punch_type: punchType,
          photo_url: photoUrl,
          latitude: location.latitude,
          longitude: location.longitude,
          gps_accuracy_meters: location.accuracy,
          device_timestamp: new Date().toISOString(),
          synced_late: syncedLate,
        })

        setLoading(false)
        return { data: punch, error: null }
      } catch (err) {
        setError(err.message)
        setLoading(false)
        return { data: null, error: err }
      }
    },
    []
  )

  return {
    loading,
    error,
    recordPunch,
  }
}
