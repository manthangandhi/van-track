import React from 'react'
import { STRINGS } from '../utils/strings'
import { formatTime } from '../utils/helpers'

export function TimelineView({ punches = [] }) {
  const punchOrder = ['check_in', 'midday', 'check_out']
  const sortedPunches = [...punches].sort((a, b) => punchOrder.indexOf(a.punch_type) - punchOrder.indexOf(b.punch_type))

  const labels = {
    check_in: STRINGS.CHECK_IN,
    midday: STRINGS.MIDDAY,
    check_out: STRINGS.CHECK_OUT,
  }

  const icons = {
    check_in: '🔓',
    midday: '☀️',
    check_out: '🔒',
  }

  if (sortedPunches.length === 0) {
    return <p className="text-gray-500 text-center py-4">{STRINGS.NO_DATA}</p>
  }

  return (
    <div className="space-y-4">
      {sortedPunches.map((punch, idx) => (
        <div key={punch.id} className="flex gap-4">
          {/* Timeline connector */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm ${
              punch.status === 'rejected'
                ? 'border-red-400 bg-red-50 text-red-600'
                : punch.status === 'approved'
                ? 'border-green-500 bg-green-100'
                : 'border-blue-400 bg-blue-50'
            }`}>
              {icons[punch.punch_type]}
            </div>
            {idx < sortedPunches.length - 1 && <div className="w-1 h-8 bg-gray-300 mt-2" />}
          </div>

          {/* Content */}
          <div className="pb-4">
            <h3 className="font-semibold text-gray-800">{labels[punch.punch_type]}</h3>
            <p className="text-sm text-gray-600">{formatTime(punch.server_timestamp)}</p>
            <p className="text-xs text-gray-500 mt-1">
              📍 {(punch.distance_from_site_meters / 1000).toFixed(2)} km from site
            </p>
            <p className="text-xs text-gray-500">
              📡 Accuracy: {punch.gps_accuracy_meters}m
            </p>
            {punch.status === 'flagged' && punch.flag_reasons && (
              <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                <p className="text-xs font-semibold text-red-600">Flagged:</p>
                <ul className="text-xs text-red-600 space-y-1">
                  {punch.flag_reasons.map((flag) => (
                    <li key={flag}>• {flag}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
