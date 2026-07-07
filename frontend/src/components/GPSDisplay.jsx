import React from 'react'
import { STRINGS } from '../utils/strings'
import { IconMapPin } from './ui/Icons'

export function GPSDisplay({ location, loading, error }) {
  if (loading) {
    return (
      <div className="card-flat p-4 text-center text-forest-700 text-sm font-medium">
        {STRINGS.LOADING}...
      </div>
    )
  }

  if (error) {
    return <div className="alert-error">{error}</div>
  }

  if (!location) {
    return (
      <div className="card-flat p-4 text-center text-earth text-sm">
        {STRINGS.GPS_ACCURACY}: --
      </div>
    )
  }

  const accuracy = Math.round(location.accuracy)
  const accuracyStatus =
    accuracy <= 50 ? 'excellent' : accuracy <= 100 ? 'good' : accuracy <= 200 ? 'fair' : 'poor'
  const statusColor = {
    excellent: 'text-forest-700 bg-forest-50 border-forest-200',
    good: 'text-forest-700 bg-forest-50 border-forest-200',
    fair: 'text-amber-700 bg-amber-50 border-amber-200',
    poor: 'text-red-700 bg-red-50 border-red-200',
  }[accuracyStatus]

  return (
    <div className="card-flat p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-forest-800">{STRINGS.GPS_ACCURACY}</span>
        <span className={`stat-pill border ${statusColor}`}>
          {accuracy} {STRINGS.METERS}
        </span>
      </div>
      <div className="text-xs text-earth space-y-1">
        <p className="flex items-center gap-1.5">
          <IconMapPin className="w-3.5 h-3.5 text-forest-500 shrink-0" />
          Lat: {location.latitude.toFixed(6)}
        </p>
        <p className="flex items-center gap-1.5">
          <IconMapPin className="w-3.5 h-3.5 text-forest-500 shrink-0" />
          Lon: {location.longitude.toFixed(6)}
        </p>
      </div>
      {accuracy > 100 && <p className="text-xs text-red-600 mt-2">{STRINGS.POOR_GPS}</p>}
    </div>
  )
}