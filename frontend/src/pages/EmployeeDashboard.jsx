import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGPS } from '../hooks/useGPS'
import { usePermissions } from '../hooks/usePermissions'
import { usePunch } from '../hooks/usePunch'
import { useOfflineSync } from '../hooks/useOfflineSync'
import { getTodayPunchesIncludingQueued } from '../services/punchService'
import { loadFaceModels } from '../services/faceService'
import { PunchCamera } from '../components/PunchCamera'
import { GPSDisplay } from '../components/GPSDisplay'
import { OfflineIndicator } from '../components/OfflineIndicator'
import { PunchSlot } from '../components/PunchSlot'
import { InstallPrompt } from '../components/InstallPrompt'
import { ReferenceSelfieSetup } from '../components/ReferenceSelfieSetup'
import { AppShell } from '../components/ui/AppShell'
import { IconCalendar, IconMapPin } from '../components/ui/Icons'
import { getActiveAssignments } from '../services/siteAssignmentService'
import { STRINGS } from '../utils/strings'
import { formatDate, getLocalDateKey } from '../utils/helpers'
import { blocksDuplicatePunch, hasValidCheckIn } from '../utils/punchHelpers'
import { AppTour } from '../components/AppTour'
import { useAppTour } from '../hooks/useAppTour'
import { EMPLOYEE_TOUR_STEPS } from '../config/tourSteps'
import { isOnApprovedLeave } from '../services/workforceService'

const PUNCH_LABELS = {
  check_in: STRINGS.CHECK_IN,
  midday: STRINGS.MIDDAY,
  check_out: STRINGS.CHECK_OUT,
}

export default function EmployeeDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const shortcutHandled = useRef(false)
  const { user, profile, signOut } = useAuth()
  const { location, loading: gpsLoading, requestLocation, error: gpsError } = useGPS()
  const { cameraPermission, requestCameraPermission } = usePermissions()
  const { recordPunch } = usePunch()
  const { isSyncing, syncError } = useOfflineSync(user?.id)
  const { isOpen: tourOpen, stepIndex, skipTour, replayTour, goNext, goBack } = useAppTour(
    user?.id,
    'employee'
  )

  const [punches, setPunches] = useState([])
  const [showCamera, setShowCamera] = useState(false)
  const [currentPunchType, setCurrentPunchType] = useState(null)
  const [loading, setLoading] = useState(false)
  const [punchesLoaded, setPunchesLoaded] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [activeAssignments, setActiveAssignments] = useState([])
  const [assignmentsError, setAssignmentsError] = useState(null)
  const [onLeaveToday, setOnLeaveToday] = useState(false)

  const hasReferenceSelfie = Boolean(
    profile?.reference_selfie_url &&
      Array.isArray(profile?.face_descriptor) &&
      profile.face_descriptor.length > 0
  )

  const hasActiveAssignment = activeAssignments.length > 0
  const canPunch =
    profile?.is_active &&
    hasReferenceSelfie &&
    hasActiveAssignment &&
    !assignmentsError &&
    !onLeaveToday &&
    punchesLoaded

  useEffect(() => {
    loadFaceModels().catch(() => {})
  }, [])

  useEffect(() => {
    if (user && profile) {
      loadTodayPunches()
      loadActiveAssignments()
      isOnApprovedLeave(user.id, getLocalDateKey())
        .then(setOnLeaveToday)
        .catch(() => setOnLeaveToday(true))
    }
  }, [user, profile])

  async function loadActiveAssignments() {
    try {
      const today = getLocalDateKey()
      const data = await getActiveAssignments(user.id, today)
      setActiveAssignments(data)
      setAssignmentsError(null)
    } catch (err) {
      setActiveAssignments([])
      setAssignmentsError(err.message || STRINGS.SERVER_ERROR)
    }
  }

  useEffect(() => {
    if (
      shortcutHandled.current ||
      !canPunch ||
      loading
    ) {
      return
    }

    const action = searchParams.get('action')
    const todayPunches = punches.reduce((acc, p) => {
      acc[p.punch_type] = p
      return acc
    }, {})

    if (action === 'check_in' && !blocksDuplicatePunch(todayPunches.check_in)) {
      shortcutHandled.current = true
      handlePunchClick('check_in')
    }
  }, [searchParams, punches, canPunch, loading])

  async function loadTodayPunches() {
    const today = getLocalDateKey()
    const data = await getTodayPunchesIncludingQueued(user.id, today)
    setPunches(data)
    setPunchesLoaded(true)
  }

  async function handlePunchClick(punchType) {
    if (!canPunch) {
      if (assignmentsError) {
        setError(assignmentsError)
      } else if (!hasActiveAssignment) {
        setError(STRINGS.NO_ACTIVE_ASSIGNMENT)
      }
      return
    }

    if (cameraPermission === 'denied') {
      setError(STRINGS.CAMERA_DENIED)
      return
    }

    setCurrentPunchType(punchType)
    setInfo(null)
    setError(null)

    if (cameraPermission !== 'granted') {
      const granted = await requestCameraPermission()
      if (!granted) {
        setError(STRINGS.CAMERA_DENIED)
        return
      }
    }

    setShowCamera(true)
  }

  async function handlePhotoCapture(photoBlob) {
    setShowCamera(false)
    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      const coords = await requestLocation()
      if (!coords) {
        throw new Error(STRINGS.LOCATION_REQUIRED)
      }

      const today = getLocalDateKey()
      const assignments = await getActiveAssignments(user.id, today)
      if (assignments.length === 0) {
        throw new Error(STRINGS.NO_ACTIVE_ASSIGNMENT)
      }

      const primarySite = assignments[0]?.sites

      const result = await recordPunch({
        employeeId: user.id,
        punchType: currentPunchType,
        photoBlob,
        location: coords,
        referenceDescriptor: profile.face_descriptor,
        punchLabel: PUNCH_LABELS[currentPunchType],
        employeeName: profile.full_name,
        siteName: primarySite?.name,
      })

      if (result.error) {
        throw result.error
      }

      if (result.offline) {
        setInfo(STRINGS.OFFLINE_SAVED)
      } else if (result.clientFlags?.includes('face_mismatch')) {
        setInfo(STRINGS.FACE_MISMATCH_RECORDED)
      } else if (result.clientFlags?.includes('no_face_detected')) {
        setInfo(STRINGS.NO_FACE_FLAGGED)
      } else {
        setInfo(STRINGS.PUNCH_SUCCESS)
      }

      await loadTodayPunches()
    } catch (err) {
      setError(err.message || STRINGS.PUNCH_ERROR)
    } finally {
      setLoading(false)
      setCurrentPunchType(null)
    }
  }

  if (!user || !profile) {
    return null
  }

  if (!profile.is_active) {
    return (
      <div className="page-shell flex items-center justify-center p-4">
        <div className="card p-8 max-w-md text-center shadow-elevated">
          <h1 className="display-title text-xl text-red-700 mb-2">{STRINGS.INACTIVE_ACCOUNT}</h1>
          <p className="text-earth mb-6">{STRINGS.INACTIVE_ACCOUNT_MSG}</p>
          <button type="button" onClick={signOut} className="btn-secondary">
            {STRINGS.LOGOUT}
          </button>
        </div>
      </div>
    )
  }

  if (!hasReferenceSelfie) {
    return <ReferenceSelfieSetup />
  }

  const todayPunches = punches.reduce((acc, p) => {
    acc[p.punch_type] = p
    return acc
  }, {})

  const validCheckIn = hasValidCheckIn(todayPunches)
  const slotsDisabled = loading || !canPunch

  return (
    <AppShell
      showBrand
      maxWidth="max-w-4xl"
      headerActions={
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={replayTour}
            className="btn-ghost text-sm py-1.5 px-2"
            title={STRINGS.TOUR_REPLAY}
          >
            {STRINGS.TOUR_REPLAY}
          </button>
          <span className="hidden sm:block text-sm text-earth">{profile.full_name}</span>
          <button type="button" onClick={signOut} className="btn-danger">
            {STRINGS.LOGOUT}
          </button>
        </div>
      }
    >
      <InstallPrompt />
      <OfflineIndicator />

      {error && <div className="alert-error mb-4">{error}</div>}
      {syncError && <div className="alert-error mb-4">{syncError}</div>}
      {info && <div className="alert-success mb-4">{info}</div>}
      {assignmentsError && <div className="alert-error mb-4">{assignmentsError}</div>}
      {onLeaveToday && <div className="alert-success mb-4">{STRINGS.ON_LEAVE_TODAY}</div>}

      <div className="card p-5 mb-6">
        <p className="section-label">{STRINGS.TODAY_STATUS}</p>
        <h2 className="display-title text-xl">{formatDate(new Date())}</h2>
      </div>

      {!hasActiveAssignment && !assignmentsError ? (
        <div className="alert-warning mb-4">{STRINGS.NO_ACTIVE_ASSIGNMENT}</div>
      ) : hasActiveAssignment ? (
        <div className="rounded-xl border border-forest-100 bg-white px-4 py-3 mb-4">
          <p className="section-label mb-2 flex items-center gap-1.5">
            <IconMapPin className="w-3.5 h-3.5" />
            {STRINGS.ACTIVE_ASSIGNMENTS}
          </p>
          <div className="flex flex-wrap gap-2">
            {activeAssignments.map((a) => (
              <span
                key={a.id}
                className="text-sm font-medium text-forest-800 bg-forest-50 border border-forest-100 px-3 py-1 rounded-full"
              >
                {a.sites?.name}
                {a.end_date ? ` · until ${formatDate(a.end_date)}` : ` · ${STRINGS.ONGOING}`}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-6">
        <GPSDisplay location={location} loading={gpsLoading} error={gpsError} />
      </div>

      <p className="text-xs text-earth mb-4">{STRINGS.PUNCH_STAMP_HINT}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <PunchSlot
          punchType="check_in"
          punch={todayPunches['check_in']}
          onClick={() => handlePunchClick('check_in')}
          disabled={slotsDisabled || blocksDuplicatePunch(todayPunches['check_in'])}
        />
        <PunchSlot
          punchType="midday"
          punch={todayPunches['midday']}
          onClick={() => handlePunchClick('midday')}
          disabled={slotsDisabled || !validCheckIn || blocksDuplicatePunch(todayPunches['midday'])}
        />
        <PunchSlot
          punchType="check_out"
          punch={todayPunches['check_out']}
          onClick={() => handlePunchClick('check_out')}
          disabled={slotsDisabled || !validCheckIn || blocksDuplicatePunch(todayPunches['check_out'])}
        />
      </div>

      <button
        type="button"
        onClick={() => navigate('/history')}
        className="btn-secondary w-full py-3 flex items-center justify-center gap-2"
      >
        <IconCalendar className="w-5 h-5" />
        {STRINGS.MY_TIMESHEET}
      </button>

      {isSyncing && (
        <div className="mt-6 card-flat p-4 text-center text-forest-700 text-sm font-medium">
          {STRINGS.UPLOADING}...
        </div>
      )}

      {tourOpen && (
        <AppTour
          steps={EMPLOYEE_TOUR_STEPS}
          stepIndex={stepIndex}
          onNext={() => goNext(EMPLOYEE_TOUR_STEPS.length)}
          onBack={goBack}
          onSkip={skipTour}
          isLastStep={stepIndex === EMPLOYEE_TOUR_STEPS.length - 1}
        />
      )}

      {showCamera && (
        <PunchCamera
          onCapture={handlePhotoCapture}
          onClose={() => {
            setShowCamera(false)
            setCurrentPunchType(null)
          }}
          title={PUNCH_LABELS[currentPunchType] || STRINGS.TAKE_SELFIE}
        />
      )}
    </AppShell>
  )
}