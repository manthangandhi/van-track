import React from 'react'
import { STRINGS } from '../utils/strings'
import { FlagBadge } from './FlagBadge'
import { formatTime } from '../utils/helpers'
import { PunchTypeIcon, IconCheck } from './ui/Icons'

export function PunchSlot({ punch, punchType, onClick, disabled = false }) {
  const labels = {
    check_in: STRINGS.CHECK_IN,
    midday: STRINGS.MIDDAY,
    check_out: STRINGS.CHECK_OUT,
  }

  const isDone = punch && punch.status !== 'rejected'

  return (
    <div
      onClick={() => !disabled && onClick()}
      className={`card p-5 cursor-pointer transition-all duration-200 ${
        isDone
          ? 'border-forest-300 bg-forest-50/80 hover:shadow-card'
          : 'hover:border-forest-200 hover:shadow-soft'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-display font-semibold text-forest-900 flex items-center gap-2">
          <PunchTypeIcon type={punchType} className="w-5 h-5 text-forest-600" />
          {labels[punchType]}
        </span>
        {isDone && (
          <span className="stat-pill bg-forest-100 text-forest-700 border border-forest-200 flex items-center gap-1">
            <IconCheck className="w-3.5 h-3.5" />
            Done
          </span>
        )}
      </div>

      {punch ? (
        <div className="space-y-2">
          <p className="text-sm text-earth">
            <strong className="text-forest-800">{STRINGS.TIME}:</strong>{' '}
            {formatTime(punch.server_timestamp)}
          </p>
          {punch.flag_reasons && punch.flag_reasons.length > 0 && (
            <FlagBadge flagReasons={punch.flag_reasons} compact />
          )}
          <p className="text-xs text-earth capitalize">{punch.status}</p>
        </div>
      ) : (
        <p className="text-sm text-earth">{STRINGS.PENDING}</p>
      )}
    </div>
  )
}