import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { MapViewer } from '../components/MapViewer'
import { STRINGS } from '../utils/strings'

export default function AdminSites() {
  const navigate = useNavigate()
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    latitude: 20.5937,
    longitude: 78.9629,
    radius_meters: 500,
  })
  const [selectedSite, setSelectedSite] = useState(null)

  useEffect(() => {
    loadSites()
  }, [])

  async function loadSites() {
    const { data } = await supabase.from('sites').select('*').order('name')
    setSites(data || [])
    setLoading(false)
  }

  async function handleSave() {
    if (editingId) {
      await supabase.from('sites').update(formData).eq('id', editingId)
    } else {
      await supabase.from('sites').insert([formData])
    }
    await loadSites()
    setShowForm(false)
    setEditingId(null)
    setFormData({
      name: '',
      latitude: 20.5937,
      longitude: 78.9629,
      radius_meters: 500,
    })
  }

  async function handleDelete(siteId) {
    if (window.confirm('Delete this site?')) {
      await supabase.from('sites').delete().eq('id', siteId)
      await loadSites()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">{STRINGS.SITES}</h1>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded"
          >
            {STRINGS.BACK}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <button
          onClick={() => {
            setShowForm(true)
            setEditingId(null)
            setFormData({
              name: '',
              latitude: 20.5937,
              longitude: 78.9629,
              radius_meters: 500,
            })
          }}
          className="mb-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded"
        >
          + {STRINGS.ADD_SITE}
        </button>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                {editingId ? STRINGS.EDIT : STRINGS.ADD_SITE}
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Site Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="number"
                  placeholder={STRINGS.LATITUDE}
                  step="0.0001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="number"
                  placeholder={STRINGS.LONGITUDE}
                  step="0.0001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="number"
                  placeholder={STRINGS.RADIUS}
                  value={formData.radius_meters}
                  onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded"
                  >
                    {STRINGS.SAVE}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded"
                  >
                    {STRINGS.CANCEL}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Sites</h2>
              {loading ? (
                <p>{STRINGS.LOADING}...</p>
              ) : sites.length === 0 ? (
                <p className="text-gray-600">{STRINGS.NO_DATA}</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {sites.map((site) => (
                    <button
                      key={site.id}
                      onClick={() => setSelectedSite(site)}
                      className={`w-full text-left px-3 py-2 rounded transition ${
                        selectedSite?.id === site.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <p className="font-semibold text-sm">{site.name}</p>
                      <p className="text-xs text-gray-600">{site.radius_meters}m radius</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2">
            {selectedSite ? (
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                <h2 className="text-lg font-bold text-gray-800">{selectedSite.name}</h2>
                <MapViewer
                  latitude={selectedSite.latitude}
                  longitude={selectedSite.longitude}
                  siteLatitude={selectedSite.latitude}
                  siteLongitude={selectedSite.longitude}
                  siteRadius={selectedSite.radius_meters}
                  title="Site Location"
                />
                <div className="bg-gray-50 rounded p-3 space-y-2 text-sm">
                  <p>
                    <strong>Latitude:</strong> {selectedSite.latitude}
                  </p>
                  <p>
                    <strong>Longitude:</strong> {selectedSite.longitude}
                  </p>
                  <p>
                    <strong>Radius:</strong> {selectedSite.radius_meters} meters
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEditingId(selectedSite.id)
                      setFormData(selectedSite)
                      setShowForm(true)
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded"
                  >
                    {STRINGS.EDIT}
                  </button>
                  <button
                    onClick={() => handleDelete(selectedSite.id)}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded"
                  >
                    {STRINGS.DELETE}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                Select a site to view details
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
