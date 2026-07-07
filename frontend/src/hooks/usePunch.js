import { useState, useCallback } from 'react'
import { createPunch, uploadPunchPhoto, hasPunchToday } from '../services/punchService'
import { compressImage, stampImageWithMetadata } from '../services/imageService'
import { verifyFaceMatch } from '../services/faceService'
import { addToSyncQueue, isOnline } from '../services/syncQueue'
import { STRINGS } from '../utils/strings'

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function isNetworkError(err) {
  const message = String(err?.message || '').toLowerCase()
  return (
    !navigator.onLine ||
    message.includes('failed to fetch') ||
    message.includes('network') ||
    err?.name === 'TypeError'
  )
}

export function usePunch() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const recordPunch = useCallback(
    async ({
      employeeId,
      punchType,
      photoBlob,
      location,
      referenceDescriptor,
      punchLabel,
      employeeName,
      siteName,
      syncedLate = false,
    }) => {
      setLoading(true)
      setError(null)

      try {
        const alreadyExists = await hasPunchToday(employeeId, punchType)
        if (alreadyExists) {
          throw new Error(`You already recorded ${punchType.replace('_', ' ')} today`)
        }

        if (!referenceDescriptor?.length) {
          throw new Error(STRINGS.REFERENCE_SELFIE_REQUIRED)
        }

        const deviceTimestamp = new Date()

        let faceMatchScore = null
        let clientFlags = []

        try {
          const faceResult = await verifyFaceMatch(referenceDescriptor, photoBlob)
          faceMatchScore = faceResult.matchScore
          if (!faceResult.isMatch) {
            clientFlags.push('face_mismatch')
          }
        } catch (faceErr) {
          if (faceErr.message === 'NO_FACE_DETECTED') {
            clientFlags.push('no_face_detected')
          } else {
            throw faceErr
          }
        }

        const compressedBlob = await compressImage(photoBlob, 640, 640, 0.88)
        const stampedBlob = await stampImageWithMetadata(compressedBlob, {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: deviceTimestamp,
          label: punchLabel,
          employeeName,
          siteName,
        })

        if (!isOnline()) {
          const photoUrl = await blobToDataUrl(stampedBlob)
          await addToSyncQueue({
            type: 'punch',
            employeeId,
            punchType,
            photoUrl,
            latitude: location.latitude,
            longitude: location.longitude,
            gpsAccuracy: location.accuracy,
            deviceTimestamp: deviceTimestamp.toISOString(),
            faceMatchScore,
            clientFlags,
          })

          setLoading(false)
          return {
            data: { offline: true, punch_type: punchType },
            error: null,
            faceMatchScore,
            clientFlags,
            offline: true,
          }
        }

        let photoUrl
        try {
          photoUrl = await uploadPunchPhoto(employeeId, stampedBlob, punchType)
        } catch (uploadErr) {
          if (!isNetworkError(uploadErr)) throw uploadErr
          const dataUrl = await blobToDataUrl(stampedBlob)
          await addToSyncQueue({
            type: 'punch',
            employeeId,
            punchType,
            photoUrl: dataUrl,
            latitude: location.latitude,
            longitude: location.longitude,
            gpsAccuracy: location.accuracy,
            deviceTimestamp: deviceTimestamp.toISOString(),
            faceMatchScore,
            clientFlags,
          })
          setLoading(false)
          return {
            data: { offline: true, punch_type: punchType },
            error: null,
            faceMatchScore,
            clientFlags,
            offline: true,
          }
        }

        const punch = await createPunch({
          employee_id: employeeId,
          punch_type: punchType,
          photo_url: photoUrl,
          latitude: location.latitude,
          longitude: location.longitude,
          gps_accuracy_meters: location.accuracy,
          device_timestamp: deviceTimestamp.toISOString(),
          synced_late: syncedLate,
          face_match_score: faceMatchScore,
          client_flags: clientFlags,
        })

        setLoading(false)
        return { data: punch, error: null, faceMatchScore, clientFlags }
      } catch (err) {
        const message =
          err.message === 'NO_FACE_DETECTED' ? STRINGS.NO_FACE_DETECTED : err.message
        setError(message)
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