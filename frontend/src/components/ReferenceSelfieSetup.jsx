import React, { useState, useEffect, useCallback } from 'react'
import { loadFaceModels } from '../services/faceService'
import { useAuth } from '../hooks/useAuth'
import { useGPS } from '../hooks/useGPS'
import { usePermissions } from '../hooks/usePermissions'
import { PunchCamera } from './PunchCamera'
import { GPSDisplay } from './GPSDisplay'
import { BrandMark } from './ui/BrandMark'
import { supabase } from '../services/supabaseClient'
import { saveEmployeeReferenceSelfie } from '../services/punchService'
import { stampImageWithMetadata, compressImage } from '../services/imageService'
import { extractFaceDescriptor } from '../services/faceService'
import { STRINGS } from '../utils/strings'
import { PrivacyConsent } from './PrivacyConsent'
import { getOrgSettings, needsPrivacyConsent } from '../services/privacyService'

export function ReferenceSelfieSetup() {
  const { user, profile, refreshProfile } = useAuth()
  const { location, loading: gpsLoading, requestLocation, error: gpsError } = useGPS()
  const { cameraPermission, requestCameraPermission } = usePermissions()
  const [showCamera, setShowCamera] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [settings, setSettings] = useState(null)
  const [consentReady, setConsentReady] = useState(false)

  const refreshConsent = useCallback(async () => {
    const s = await getOrgSettings().catch(() => null)
    setSettings(s)
    setConsentReady(!needsPrivacyConsent(profile, s))
  }, [profile])

  useEffect(() => {
    loadFaceModels().catch(() => {})
    refreshConsent()
  }, [refreshConsent])

  if (!consentReady) {
    return <PrivacyConsent settings={settings} onAccepted={() => refreshProfile().then(refreshConsent)} />
  }

  async function openCamera() {
    setError(null)
    if (!cameraPermission) {
      await requestCameraPermission()
    }
    setShowCamera(true)
  }

  async function handleCapture(photoBlob) {
    setShowCamera(false)
    setSaving(true)
    setError(null)

    try {
      const coords = await requestLocation()
      if (!coords) {
        throw new Error(STRINGS.LOCATION_REQUIRED)
      }

      const capturedAt = new Date()
      let siteName = null
      if (profile?.assigned_site_id) {
        const { data: site } = await supabase
          .from('sites')
          .select('name')
          .eq('id', profile.assigned_site_id)
          .maybeSingle()
        siteName = site?.name ?? null
      }

      const descriptor = await extractFaceDescriptor(photoBlob)
      const compressed = await compressImage(photoBlob, 640, 640, 0.88)
      const stampedBlob = await stampImageWithMetadata(compressed, {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        timestamp: capturedAt,
        label: STRINGS.REFERENCE_SELFIE,
        employeeName: profile?.full_name,
        siteName,
      })

      await saveEmployeeReferenceSelfie(user.id, stampedBlob, descriptor)
      await refreshProfile()
    } catch (err) {
      if (err.message === 'NO_FACE_DETECTED') {
        setError(STRINGS.NO_FACE_DETECTED)
      } else {
        setError(err.message || STRINGS.REFERENCE_SELFIE_FAILED)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-shell flex items-center justify-center p-4">
      <div className="card p-8 max-w-lg w-full shadow-elevated">
        <div className="flex justify-center mb-6">
          <BrandMark size="md" showTagline />
        </div>
        <h1 className="display-title text-2xl text-center mb-2">
          {STRINGS.REFERENCE_SELFIE_SETUP}
        </h1>
        <p className="text-earth text-center mb-6">{STRINGS.REFERENCE_SELFIE_SETUP_HINT}</p>

        <div className="mb-4">
          <GPSDisplay location={location} loading={gpsLoading} error={gpsError} />
        </div>

        {error && <div className="alert-error mb-4">{error}</div>}

        <button
          type="button"
          onClick={openCamera}
          disabled={saving}
          className="btn-primary w-full py-3"
        >
          {saving ? STRINGS.UPLOADING : `📷 ${STRINGS.CAPTURE_REFERENCE_SELFIE}`}
        </button>

        <p className="text-xs text-earth mt-4 text-center">{STRINGS.REFERENCE_SELFIE_STAMP_HINT}</p>
      </div>

      {showCamera && (
        <PunchCamera
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
          title={STRINGS.REFERENCE_SELFIE}
        />
      )}
    </div>
  )
}