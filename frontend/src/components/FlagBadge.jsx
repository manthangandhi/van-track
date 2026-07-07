import React from 'react'
import { STRINGS } from '../utils/strings'

const FLAG_MESSAGES = {
  outside_geofence: STRINGS.FLAG_OUTSIDE_GEOFENCE,
  poor_gps_accuracy: STRINGS.FLAG_POOR_GPS,
  device_time_mismatch: STRINGS.FLAG_TIME_MISMATCH,
  synced_late: STRINGS.FLAG_SYNCED_LATE,
  no_check_in: STRINGS.FLAG_NO_CHECK_IN,
  no_midday: STRINGS.FLAG_NO_MIDDAY,
}

export function FlagBadge({ flagReasons = [], compact = false }) {
  if (!flagReasons || flagReasons.length === 0) {
    return null
  }

  if (compact) {
    return (
      <span className="inline-block bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded">
        🚩 {flagReasons.length} flag{flagReasons.length > 1 ? 's' : ''}
      </span>
    )
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded p-3">
      <h3 className="font-semibold text-red-700 mb-2">🚩 {STRINGS.WARNING}</h3>
      <ul className="space-y-1">
        {flagReasons.map((flag, idx) => (
          <li key={idx} className="text-sm text-red-600">
            • {FLAG_MESSAGES[flag] || flag}
          </li>
        ))}
      </ul>
    </div>
  )
}
