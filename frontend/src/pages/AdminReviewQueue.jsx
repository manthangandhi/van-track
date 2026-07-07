import React, { useState, useEffect } from 'react'
import { getFlaggedPunches, updatePunchStatus, enrichPunchesWithSignedUrls } from '../services/punchService'
import { MapViewer } from '../components/MapViewer'
import { FlagBadge } from '../components/FlagBadge'
import { CaptureMetadataPanel } from '../components/CaptureMetadataPanel'
import { STRINGS } from '../utils/strings'
import { formatDateTime } from '../utils/helpers'
import { AppShell } from '../components/ui/AppShell'
import { IconFlag } from '../components/ui/Icons'

const PUNCH_LABELS = {
  check_in: STRINGS.CHECK_IN,
  midday: STRINGS.MIDDAY,
  check_out: STRINGS.CHECK_OUT,
}

export default function AdminReviewQueue() {
  const [flaggedPunches, setFlaggedPunches] = useState([])
  const [selectedPunch, setSelectedPunch] = useState(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadFlaggedPunches()
  }, [])

  async function loadFlaggedPunches() {
    setLoading(true)
    const data = await getFlaggedPunches()
    const enriched = await enrichPunchesWithSignedUrls(data)
    setFlaggedPunches(enriched)
    setLoading(false)
  }

  async function handleApprove(punchId) {
    setProcessing(true)
    setActionError(null)
    try {
      await updatePunchStatus(punchId, 'approved', comment)
      setComment('')
      setSelectedPunch(null)
      await loadFlaggedPunches()
    } catch (err) {
      setActionError(err.message || STRINGS.SERVER_ERROR)
    } finally {
      setProcessing(false)
    }
  }

  async function handleReject(punchId) {
    setProcessing(true)
    setActionError(null)
    try {
      await updatePunchStatus(punchId, 'rejected', comment)
      setComment('')
      setSelectedPunch(null)
      await loadFlaggedPunches()
    } catch (err) {
      setActionError(err.message || STRINGS.SERVER_ERROR)
    } finally {
      setProcessing(false)
    }
  }

  function selectPunch(punch) {
    setSelectedPunch(punch)
    setComment('')
  }

  const site = selectedPunch?.sites || selectedPunch?.profiles?.sites

  return (
    <AppShell title={STRINGS.REVIEW_QUEUE} backTo="/admin" maxWidth="max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card p-4">
            <h2 className="display-title text-lg text-forest-900 mb-4 flex items-center gap-2">
              <IconFlag className="w-5 h-5 text-red-600" />
              {flaggedPunches.length} Flagged
            </h2>
            {loading ? (
              <p>{STRINGS.LOADING}...</p>
            ) : flaggedPunches.length === 0 ? (
              <p className="text-earth">{STRINGS.NO_DATA}</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {flaggedPunches.map((punch) => (
                  <button
                    key={punch.id}
                    onClick={() => selectPunch(punch)}
                    className={`w-full text-left px-3 py-2 rounded transition ${
                      selectedPunch?.id === punch.id
                        ? 'bg-forest-100 border-2 border-forest-500'
                        : 'bg-forest-50/50 hover:bg-forest-50 border border-forest-100'
                    }`}
                  >
                    <p className="font-semibold text-sm">{punch.profiles?.full_name}</p>
                    <p className="text-xs text-earth">{PUNCH_LABELS[punch.punch_type] || punch.punch_type}</p>
                    <p className="text-xs text-earth/80">{formatDateTime(punch.server_timestamp)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedPunch ? (
            <div className="card p-6 space-y-4">
              <h2 className="display-title text-lg text-forest-900">
                {selectedPunch.profiles?.full_name}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="label-field mb-2">{STRINGS.REFERENCE_SELFIE}</p>
                  {selectedPunch.signed_reference_selfie_url ? (
                    <img
                      src={selectedPunch.signed_reference_selfie_url}
                      alt="Reference selfie"
                      className="w-full max-h-80 object-contain rounded border border-forest-100 bg-forest-950"
                    />
                  ) : (
                    <div className="card-flat h-48 flex items-center justify-center text-earth text-sm">
                      {STRINGS.NO_REFERENCE_SELFIE}
                    </div>
                  )}
                </div>
                <div>
                  <p className="label-field mb-2">{STRINGS.PUNCH_PHOTO}</p>
                  {selectedPunch.signed_photo_url ? (
                    <img
                      src={selectedPunch.signed_photo_url}
                      alt="Punch"
                      className="w-full max-h-80 object-contain rounded border border-forest-100 bg-forest-950"
                    />
                  ) : (
                    <div className="card-flat h-48 flex items-center justify-center text-earth text-sm">
                      {STRINGS.NO_DATA}
                    </div>
                  )}
                </div>
              </div>

              <CaptureMetadataPanel
                punchType={PUNCH_LABELS[selectedPunch.punch_type] || selectedPunch.punch_type}
                timestamp={selectedPunch.server_timestamp || selectedPunch.device_timestamp}
                latitude={Number(selectedPunch.latitude)}
                longitude={Number(selectedPunch.longitude)}
                accuracy={selectedPunch.gps_accuracy_meters}
                employeeName={selectedPunch.profiles?.full_name}
                siteName={site?.name}
              />

              {selectedPunch.flag_reasons?.length > 0 && (
                <FlagBadge flagReasons={selectedPunch.flag_reasons} />
              )}

              <MapViewer
                latitude={Number(selectedPunch.latitude)}
                longitude={Number(selectedPunch.longitude)}
                siteLatitude={site ? Number(site.latitude) : undefined}
                siteLongitude={site ? Number(site.longitude) : undefined}
                siteRadius={site?.radius_meters}
                title={STRINGS.SITE_LOCATION}
              />

              <div className="card-flat p-3 grid grid-cols-2 gap-3 text-sm">
                <p>
                  <span className="block text-xs uppercase tracking-wide text-earth">
                    {STRINGS.DISTANCE_FROM_SITE}
                  </span>
                  <span className="font-medium text-forest-900">
                    {selectedPunch.distance_from_site_meters != null
                      ? `${(selectedPunch.distance_from_site_meters / 1000).toFixed(2)} km`
                      : '—'}
                  </span>
                </p>
                {selectedPunch.face_match_score != null && (
                  <p>
                    <span className="block text-xs uppercase tracking-wide text-earth">
                      {STRINGS.FACE_MATCH_SCORE}
                    </span>
                    <span className="font-medium text-forest-900">
                      {selectedPunch.face_match_score}%
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="label-field">{STRINGS.COMMENT}</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="input-field"
                  rows="3"
                  placeholder="Add a comment..."
                />
              </div>

              {actionError && <div className="alert-error">{actionError}</div>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleApprove(selectedPunch.id)}
                  disabled={processing}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  ✓ {STRINGS.APPROVE}
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(selectedPunch.id)}
                  disabled={processing}
                  className="btn-danger flex-1 disabled:opacity-50"
                >
                  ✗ {STRINGS.REJECT}
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-6 text-center text-earth">
              Select a punch to review
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}