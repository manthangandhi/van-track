import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGPS } from '../hooks/useGPS'
import { usePermissions } from '../hooks/usePermissions'
import { usePunch } from '../hooks/usePunch'
import { useOfflineSync } from '../hooks/useOfflineSync'
import { supabase } from '../services/supabaseClient'
import { getPunchesForDay, computePunchDetails } from '../services/punchService'
import { savePunchOffline, addToSyncQueue } from '../services/offlineStore'
import { blobToBase64 } from '../services/imageService'
import { PunchCamera } from '../components/PunchCamera'
import { GPSDisplay } from '../components/GPSDisplay'
import { OfflineIndicator } from '../components/OfflineIndicator'
import { PunchSlot } from '../components/PunchSlot'
import { STRINGS } from '../utils/strings'
import { formatDate } from '../utils/helpers'

export default function EmployeeDashboard() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const { location, loading: gpsLoading, requestLocation, error: gpsError } = useGPS()
  const { cameraPermission, requestCameraPermission } = usePermissions()
  const { recordPunch } = usePunch()
  const { isOnline, isSyncing } = useOfflineSync(user?.id)

  const [punches, setPunches] = useState([])
  const [showCamera, setShowCamera] = useState(false)
  const [currentPunchType, setCurrentPunchType] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user && profile) {
      loadTodayPunches()
    }
  }, [user, profile])

  async function loadTodayPunches() {
    const today = new Date().toISOString().split('T')[0]
    const data = await getPunchesForDay(user.id, today)
    setPunches(data)
  }

  async function handlePunchClick(punchType) {
    setCurrentPunchType(punchType)
    if (!cameraPermission) {
      await requestCameraPermission()
    }
    setShowCamera(true)
  }

  async function handlePhotoCapture(photoBlob) {
    setShowCamera(false)
    setLoading(true)
    setError(null)

    try {
      // Request location
      const coords = await requestLocation()
      if (!coords) {
        throw new Error('Could not get location')
      }

      // Get user's site
      const { data: siteData } = await supabase
        .from('sites')
        .select('*')
        .eq('id', profile.assigned_site_id)
        .single()

      // Compute punch details
      const punchDetails = computePunchDetails(coords, siteData, false)

      // Try to upload online
      if (isOnline) {
        await recordPunch(
          user.id,
          currentPunchType,
          photoBlob,
          coords,
          siteData,
          false
        )
      } else {
        // Save offline
        const base64 = await blobToBase64(photoBlob)
        await savePunchOffline({
          type: 'punch',
          punchType: currentPunchType,
          photoUrl: base64,
          latitude: coords.latitude,
          longitude: coords.longitude,
          gpsAccuracy: coords.accuracy,
          deviceTimestamp: new Date().toISOString(),
        })
      }

      // Reload punches
      await loadTodayPunches()
    } catch (err) {
      setError(err.message || 'Failed to record punch')
    } finally {
      setLoading(false)
    }
  }

  if (!user || !profile) {
    return <div>{STRINGS.LOADING}...</div>
  }

  const todayPunches = punches.reduce((acc, p) => {
    acc[p.punch_type] = p
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-green-600">{STRINGS.APP_NAME}</h1>
            <p className="text-sm text-gray-600">Welcome, {profile.full_name}</p>
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded"
          >
            {STRINGS.LOGOUT}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <OfflineIndicator />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        {/* Today's date */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-bold text-gray-800">{STRINGS.TODAY_STATUS}</h2>
          <p className="text-sm text-gray-600">{formatDate(new Date())}</p>
        </div>

        {/* GPS Status */}
        <div className="mb-6">
          <GPSDisplay location={location} loading={gpsLoading} error={gpsError} />
        </div>

        {/* Punch Slots */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <PunchSlot
            punchType="check_in"
            punch={todayPunches['check_in']}
            onClick={() => handlePunchClick('check_in')}
            disabled={loading || !isOnline}
          />
          <PunchSlot
            punchType="midday"
            punch={todayPunches['midday']}
            onClick={() => handlePunchClick('midday')}
            disabled={loading || !todayPunches['check_in'] || !isOnline}
          />
          <PunchSlot
            punchType="check_out"
            punch={todayPunches['check_out']}
            onClick={() => handlePunchClick('check_out')}
            disabled={loading || !todayPunches['check_in'] || !isOnline}
          />
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/history')}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded"
          >
            📅 {STRINGS.HISTORY}
          </button>
        </div>

        {/* Sync Status */}
        {isSyncing && (
          <div className="mt-6 bg-blue-50 border border-blue-200 p-3 rounded text-center">
            <p className="text-blue-700">{STRINGS.UPLOADING}...</p>
          </div>
        )}
      </main>

      {/* Camera Modal */}
      {showCamera && (
        <PunchCamera
          onCapture={handlePhotoCapture}
          onClose={() => {
            setShowCamera(false)
            setCurrentPunchType(null)
          }}
        />
      )}
    </div>
  )
}
