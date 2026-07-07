import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { getFlaggedPunches, updatePunchStatus } from '../services/punchService'
import { MapViewer } from '../components/MapViewer'
import { FlagBadge } from '../components/FlagBadge'
import { STRINGS } from '../utils/strings'
import { formatDateTime } from '../utils/helpers'

export default function AdminReviewQueue() {
  const navigate = useNavigate()
  const [flaggedPunches, setFlaggedPunches] = useState([])
  const [selectedPunch, setSelectedPunch] = useState(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFlaggedPunches()
  }, [])

  async function loadFlaggedPunches() {
    setLoading(true)
    const data = await getFlaggedPunches()
    setFlaggedPunches(data)
    setLoading(false)
  }

  async function handleApprove(punchId) {
    await updatePunchStatus(punchId, 'approved', comment)
    setComment('')
    setSelectedPunch(null)
    await loadFlaggedPunches()
  }

  async function handleReject(punchId) {
    await updatePunchStatus(punchId, 'rejected', comment)
    setComment('')
    setSelectedPunch(null)
    await loadFlaggedPunches()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">{STRINGS.REVIEW_QUEUE}</h1>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded"
          >
            {STRINGS.BACK}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                🚩 {flaggedPunches.length} Flagged
              </h2>
              {loading ? (
                <p>{STRINGS.LOADING}...</p>
              ) : flaggedPunches.length === 0 ? (
                <p className="text-gray-600">{STRINGS.NO_DATA}</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {flaggedPunches.map((punch) => (
                    <button
                      key={punch.id}
                      onClick={() => {
                        setSelectedPunch(punch)
                        setComment('')
                      }}
                      className={`w-full text-left px-3 py-2 rounded transition ${
                        selectedPunch?.id === punch.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <p className="font-semibold text-sm">{punch.profiles?.full_name}</p>
                      <p className="text-xs text-gray-600">{punch.punch_type}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(punch.server_timestamp)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2">
            {selectedPunch ? (
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 className="text-lg font-bold text-gray-800">
                  {selectedPunch.profiles?.full_name}
                </h2>

                {/* Photo */}
                {selectedPunch.photo_url && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Photo</p>
                    <img
                      src={selectedPunch.photo_url}
                      alt="Punch"
                      className="w-full max-h-80 object-cover rounded"
                    />
                  </div>
                )}

                {/* Flags */}
                {selectedPunch.flag_reasons && selectedPunch.flag_reasons.length > 0 && (
                  <FlagBadge flagReasons={selectedPunch.flag_reasons} />
                )}

                {/* Map */}
                <MapViewer
                  latitude={selectedPunch.latitude}
                  longitude={selectedPunch.longitude}
                  siteLatitude={selectedPunch.site_latitude}
                  siteLongitude={selectedPunch.site_longitude}
                  siteRadius={selectedPunch.site_radius}
                  title="Punch Location"
                />

                {/* Details */}
                <div className="bg-gray-50 rounded p-3 space-y-2 text-sm">
                  <p>
                    <strong>Time:</strong> {formatDateTime(selectedPunch.server_timestamp)}
                  </p>
                  <p>
                    <strong>Accuracy:</strong> {selectedPunch.gps_accuracy_meters}m
                  </p>
                  <p>
                    <strong>Distance:</strong>{' '}
                    {(selectedPunch.distance_from_site_meters / 1000).toFixed(2)} km
                  </p>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {STRINGS.COMMENT}
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows="3"
                    placeholder="Add a comment..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(selectedPunch.id)}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded"
                  >
                    ✓ {STRINGS.APPROVE}
                  </button>
                  <button
                    onClick={() => handleReject(selectedPunch.id)}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded"
                  >
                    ✗ {STRINGS.REJECT}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                Select a punch to review
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
