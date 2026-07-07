import { normalizeGpsAccuracy } from './geo'

const STAMP_TIMEZONE = 'Asia/Kolkata'

export function formatStampDate(date) {
  const value = typeof date === 'string' ? new Date(date) : date
  return value.toLocaleDateString('en-IN', {
    timeZone: STAMP_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatStampTime(date) {
  const value = typeof date === 'string' ? new Date(date) : date
  const time = value.toLocaleTimeString('en-IN', {
    timeZone: STAMP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
  return `${time} IST`
}

function toDmsComponent(degrees, isLatitude) {
  const absolute = Math.abs(degrees)
  const wholeDegrees = Math.floor(absolute)
  const minutesFloat = (absolute - wholeDegrees) * 60
  const minutes = Math.floor(minutesFloat)
  const seconds = (minutesFloat - minutes) * 60
  const direction = isLatitude
    ? degrees >= 0
      ? 'N'
      : 'S'
    : degrees >= 0
      ? 'E'
      : 'W'

  return `${wholeDegrees}°${String(minutes).padStart(2, '0')}'${seconds.toFixed(1).padStart(4, '0')}" ${direction}`
}

export function formatStampCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null) {
    return 'Location unavailable'
  }

  return `${toDmsComponent(latitude, true)}  ·  ${toDmsComponent(longitude, false)}`
}

export function formatDecimalCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null) {
    return '—'
  }

  const latSuffix = latitude >= 0 ? 'N' : 'S'
  const lonSuffix = longitude >= 0 ? 'E' : 'W'
  return `${Math.abs(latitude).toFixed(6)}° ${latSuffix}, ${Math.abs(longitude).toFixed(6)}° ${lonSuffix}`
}

export function getAccuracyTier(accuracyMeters) {
  const meters = normalizeGpsAccuracy(accuracyMeters)
  if (meters == null) {
    return { label: 'Unknown', tone: 'muted' }
  }
  if (meters <= 20) return { label: 'Excellent', tone: 'good' }
  if (meters <= 50) return { label: 'Good', tone: 'good' }
  if (meters <= 100) return { label: 'Fair', tone: 'warn' }
  return { label: 'Poor', tone: 'bad' }
}

export function formatStampAccuracy(accuracyMeters) {
  const meters = normalizeGpsAccuracy(accuracyMeters)
  const tier = getAccuracyTier(accuracyMeters)

  if (meters == null) {
    return 'GPS accuracy unavailable'
  }

  return `±${meters} meters · ${tier.label}`
}

export function buildStampMetadata({
  label,
  timestamp = new Date(),
  latitude,
  longitude,
  accuracy,
  employeeName,
  siteName,
  appName = 'VanTrack',
}) {
  const capturedAt = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const rows = [
    { key: 'date', label: 'Date', value: formatStampDate(capturedAt) },
    { key: 'time', label: 'Time', value: formatStampTime(capturedAt) },
    { key: 'location', label: 'GPS Location', value: formatStampCoordinates(latitude, longitude) },
    {
      key: 'decimal',
      label: 'Coordinates',
      value: formatDecimalCoordinates(latitude, longitude),
    },
    { key: 'accuracy', label: 'Location Accuracy', value: formatStampAccuracy(accuracy) },
  ]

  const footerParts = [employeeName, siteName].filter(Boolean)

  return {
    appName,
    title: label || 'Attendance Capture',
    subtitle: 'Verified attendance record',
    rows,
    footer: footerParts.length > 0 ? footerParts.join('  ·  ') : null,
    capturedAtIso: capturedAt.toISOString(),
  }
}