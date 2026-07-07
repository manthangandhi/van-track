import React from 'react'
import { STRINGS } from '../utils/strings'
import { FlagBadge } from './FlagBadge'
import { formatTime } from '../utils/helpers'
import { PunchTypeIcon } from './ui/Icons'

export function TimelineView({ punches }) {
  if (!punches || punches.length === 0) {
    return <p className="text-earth text-sm">{STRINGS.NO_DATA}</p>
  }

  const labels = {
    check_in: STRINGS.CHECK_IN,
    midday: STRINGS.MIDDAY,
    check_out: STRINGS.CHECK_OUT,
  }

  return (
    <div className="space-y-3">
      {punches.map((punch) => (
        <div
          key={punch.id}
          className={`card-flat p-3 flex items-start gap-3 ${
            punch.status === 'flagged' ? 'border-red-200 bg-red-50/50' : ''
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-forest-50 flex items-center justify-center text-forest-600 shrink-0">
            <PunchTypeIcon type={punch.punch_type} className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-sm text-forest-900">
                {labels[punch.punch_type] || punch.punch_type}
              </p>
              <p className="text-sm text-earth">{formatTime(punch.server_timestamp)}</p>
            </div>
            {punch.flag_reasons && punch.flag_reasons.length > 0 && (
              <div className="mt-1">
                <FlagBadge flagReasons={punch.flag_reasons} compact />
              </div>
            )}
            <p className="text-xs text-earth capitalize mt-1">{punch.status}</p>
          </div>
        </div>
      ))}
    </div>
  )
}