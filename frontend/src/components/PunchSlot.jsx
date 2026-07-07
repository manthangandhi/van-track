import React from 'react'
import { STRINGS } from '../utils/strings'
import { FlagBadge } from './FlagBadge'
import { formatTime } from '../utils/helpers'

export function PunchSlot({ punch, punchType, onClick, disabled = false }) {
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

  const isDone = punch && punch.status !== 'rejected'
  const isLoading = false

  return (
    <div
      onClick={() => !disabled && onClick()}
      className={`border-2 rounded-lg p-4 cursor-pointer transition ${
        isDone
          ? 'border-green-500 bg-green-50 hover:bg-green-100'
          : 'border-gray-300 bg-white hover:bg-gray-50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-semibold text-gray-800">
          {icons[punchType]} {labels[punchType]}
        </span>
        {isDone && <span className="text-green-600 font-bold">✓</span>}
      </div>

      {punch ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            <strong>{STRINGS.TIME}:</strong> {formatTime(punch.server_timestamp)}
          </p>
          {punch.flag_reasons && punch.flag_reasons.length > 0 && (
            <FlagBadge flagReasons={punch.flag_reasons} compact />
          )}
          <p className="text-xs text-gray-500">{punch.status}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-500">{STRINGS.PENDING}</p>
      )}

      {isLoading && <p className="text-sm text-blue-600">{STRINGS.UPLOADING}</p>}
    </div>
  )
}
