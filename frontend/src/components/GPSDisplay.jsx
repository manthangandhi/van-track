import React from 'react'
import { STRINGS } from '../utils/strings'

export function GPSDisplay({ location, loading, error }) {
  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
        <p className="text-blue-700">{STRINGS.LOADING}...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-3">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    )
  }

  if (!location) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
        <p className="text-gray-600 text-sm">{STRINGS.GPS_ACCURACY}: --</p>
      </div>
    )
  }

  const accuracy = Math.round(location.accuracy)
  const accuracyStatus =
    accuracy <= 50 ? 'excellent' : accuracy <= 100 ? 'good' : accuracy <= 200 ? 'fair' : 'poor'
  const statusColor = {
    excellent: 'text-green-700',
    good: 'text-green-700',
    fair: 'text-yellow-700',
    poor: 'text-red-700',
  }[accuracyStatus]

  return (
    <div className="bg-blue-50 border border-blue-200 rounded p-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-gray-700">{STRINGS.GPS_ACCURACY}</span>
        <span className={`font-bold ${statusColor}`}>{accuracy} {STRINGS.METERS}</span>
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <p>📍 Lat: {location.latitude.toFixed(6)}</p>
        <p>📍 Lon: {location.longitude.toFixed(6)}</p>
      </div>
      {accuracy > 100 && (
        <p className="text-xs text-red-600 mt-2">{STRINGS.POOR_GPS}</p>
      )}
    </div>
  )
}
