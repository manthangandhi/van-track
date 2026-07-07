import React from 'react'
import { STRINGS } from '../utils/strings'
import { IconFlag } from './ui/Icons'

const FLAG_LABELS = {
  outside_geofence: STRINGS.FLAG_OUTSIDE_GEOFENCE,
  poor_gps_accuracy: STRINGS.FLAG_POOR_GPS,
  time_mismatch: STRINGS.FLAG_TIME_MISMATCH,
  synced_late: STRINGS.FLAG_SYNCED_LATE,
  missing_midday: STRINGS.FLAG_NO_MIDDAY,
  no_check_in: STRINGS.FLAG_NO_CHECK_IN,
  face_mismatch: STRINGS.FLAG_FACE_MISMATCH,
  no_face_detected: STRINGS.FLAG_NO_FACE_DETECTED,
  no_active_assignment: STRINGS.FLAG_NO_ACTIVE_ASSIGNMENT,
  outside_assigned_site: STRINGS.FLAG_OUTSIDE_ASSIGNED_SITE,
}

export function FlagBadge({ flagReasons, compact = false }) {
  if (!flagReasons || flagReasons.length === 0) return null

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
        <IconFlag className="w-3 h-3" />
        {flagReasons.length}
      </span>
    )
  }

  return (
    <div className="flex flex-wrap gap-1">
      {flagReasons.map((reason) => (
        <span
          key={reason}
          className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200"
        >
          <IconFlag className="w-3 h-3" />
          {FLAG_LABELS[reason] || reason}
        </span>
      ))}
    </div>
  )
}