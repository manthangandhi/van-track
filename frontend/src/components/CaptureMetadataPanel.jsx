import React from 'react'
import {
  buildStampMetadata,
  getAccuracyTier,
} from '../utils/imageStampFormat'

const TONE_STYLES = {
  good: 'text-forest-700 bg-forest-50 border-forest-200',
  warn: 'text-amber-700 bg-amber-50 border-amber-200',
  bad: 'text-red-700 bg-red-50 border-red-200',
  muted: 'text-earth bg-cream border-forest-100',
}

export function CaptureMetadataPanel({
  punchType,
  timestamp,
  latitude,
  longitude,
  accuracy,
  employeeName,
  siteName,
  appName = 'VanTrack',
}) {
  const metadata = buildStampMetadata({
    label: punchType,
    timestamp: timestamp || new Date(),
    latitude,
    longitude,
    accuracy,
    employeeName,
    siteName,
    appName,
  })
  const accuracyTier = getAccuracyTier(accuracy)

  return (
    <div className="card overflow-hidden bg-gradient-to-br from-forest-50/60 to-white">
      <div className="px-4 py-3 border-b border-forest-100 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-forest-600">
            {metadata.appName}
          </p>
          <p className="display-title text-base">{metadata.title}</p>
          <p className="text-sm text-earth">{metadata.subtitle}</p>
        </div>
        <span
          className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${TONE_STYLES[accuracyTier.tone]}`}
        >
          {accuracyTier.label}
        </span>
      </div>

      <dl className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {metadata.rows.map((row) => (
          <div key={row.key} className={row.key === 'location' ? 'sm:col-span-2' : ''}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-forest-700/80">
              {row.label}
            </dt>
            <dd className="text-sm font-medium text-forest-900 mt-0.5 leading-snug">{row.value}</dd>
          </div>
        ))}
      </dl>

      {metadata.footer && (
        <div className="px-4 py-2.5 border-t border-forest-100 bg-white/70 text-sm text-earth">
          {metadata.footer}
        </div>
      )}
    </div>
  )
}