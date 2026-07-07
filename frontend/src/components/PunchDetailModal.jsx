import React, { useEffect, useState } from 'react'
import { MapViewer } from './MapViewer'
import { FlagBadge } from './FlagBadge'
import { CaptureMetadataPanel } from './CaptureMetadataPanel'
import { getSignedPhotoUrl } from '../services/punchService'
import { STRINGS } from '../utils/strings'

export function PunchDetailModal({ punch, onClose }) {
  const [photoUrl, setPhotoUrl] = useState(null)

  useEffect(() => {
    if (!punch?.photo_url) {
      setPhotoUrl(null)
      return
    }

    let cancelled = false
    getSignedPhotoUrl(punch.photo_url).then((url) => {
      if (!cancelled) setPhotoUrl(url)
    })

    return () => {
      cancelled = true
    }
  }, [punch?.photo_url])

  if (!punch) return null

  const site = punch.profiles?.sites
  const punchLabels = {
    check_in: STRINGS.CHECK_IN,
    midday: STRINGS.MIDDAY,
    check_out: STRINGS.CHECK_OUT,
  }

  return (
    <div className="fixed inset-0 bg-forest-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-elevated">
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-forest-100 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="display-title text-lg">
              {punch.profiles?.full_name || STRINGS.EMPLOYEE}
            </h2>
            <p className="text-sm text-earth">
              {punchLabels[punch.punch_type] || punch.punch_type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost text-2xl leading-none px-2"
            aria-label={STRINGS.CLOSE}
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-950 overflow-hidden">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Punch selfie"
                className="w-full max-h-[28rem] object-contain bg-gray-950"
              />
            ) : (
              <div className="bg-gray-100 h-48 flex items-center justify-center text-gray-500">
                {STRINGS.LOADING}
              </div>
            )}
          </div>

          <CaptureMetadataPanel
            punchType={punchLabels[punch.punch_type] || punch.punch_type}
            timestamp={punch.server_timestamp || punch.device_timestamp}
            latitude={Number(punch.latitude)}
            longitude={Number(punch.longitude)}
            accuracy={punch.gps_accuracy_meters}
            employeeName={punch.profiles?.full_name}
            siteName={site?.name}
          />

          {punch.flag_reasons?.length > 0 && (
            <FlagBadge flagReasons={punch.flag_reasons} />
          )}

          <MapViewer
            latitude={Number(punch.latitude)}
            longitude={Number(punch.longitude)}
            siteLatitude={site ? Number(site.latitude) : undefined}
            siteLongitude={site ? Number(site.longitude) : undefined}
            siteRadius={site?.radius_meters}
            title={STRINGS.SITE_LOCATION}
          />

          <div className="card-flat p-4 grid grid-cols-2 gap-3 text-sm">
            <p>
              <span className="block text-xs uppercase tracking-wide text-earth">
                {STRINGS.DISTANCE_FROM_SITE}
              </span>
              <span className="font-medium text-forest-900">
                {punch.distance_from_site_meters != null
                  ? `${(punch.distance_from_site_meters / 1000).toFixed(2)} km`
                  : '—'}
              </span>
            </p>
            <p>
              <span className="block text-xs uppercase tracking-wide text-earth">
                {STRINGS.STATUS}
              </span>
              <span className="font-medium text-forest-900">{punch.status}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}