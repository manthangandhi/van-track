import React from 'react'
import { STRINGS } from '../../utils/strings'

export function StatusToggle({ active, onChange, activeHint, inactiveHint }) {
  return (
    <div className="rounded-xl border border-forest-100 bg-forest-50/40 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-forest-900">
            {active ? STRINGS.ACTIVE : STRINGS.INACTIVE}
          </p>
          <p className="text-xs text-earth mt-0.5">
            {active ? activeHint : inactiveHint}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={() => onChange(!active)}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
            active ? 'bg-forest-600' : 'bg-forest-200'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
              active ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  )
}