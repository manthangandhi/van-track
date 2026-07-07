import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../services/supabaseClient'
import { upsertSite } from '../services/sitesService'
import { SiteEditorShell } from '../components/SiteEditorShell'
import { STRINGS } from '../utils/strings'
import {
  isValidLatitude,
  isValidLongitude,
  parseCoordinatePair,
} from '../utils/geo'
import { AppShell } from '../components/ui/AppShell'
import { IconMapPin } from '../components/ui/Icons'

const DEFAULT_SITE = {
  name: '',
  latitude: 20.5937,
  longitude: 78.9629,
  radius_meters: 500,
  is_active: true,
}

export default function AdminSites() {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [panelMode, setPanelMode] = useState(null)
  const [formData, setFormData] = useState(DEFAULT_SITE)
  const [selectedSiteId, setSelectedSiteId] = useState(null)
  const [siteSearch, setSiteSearch] = useState('')
  const [pasteCoords, setPasteCoords] = useState('')
  const [formError, setFormError] = useState(null)
  const [showInactive, setShowInactive] = useState(true)
  useEffect(() => {
    loadSites()
  }, [])

  const filteredSites = useMemo(() => {
    const query = siteSearch.trim().toLowerCase()
    return sites.filter((site) => {
      if (!showInactive && site.is_active === false) return false
      if (!query) return true
      return (site.name || '').toLowerCase().includes(query)
    })
  }, [sites, siteSearch, showInactive])

  async function loadSites() {
    const { data } = await supabase.from('sites').select('*').order('name')
    setSites(data || [])
    setLoading(false)
  }

  function openCreate() {
    setPanelMode('create')
    setSelectedSiteId(null)
    setFormData(DEFAULT_SITE)
    setPasteCoords('')
    setFormError(null)
  }

  function openView(site) {
    setPanelMode('view')
    setSelectedSiteId(site.id)
    setFormData({
      id: site.id,
      name: site.name,
      latitude: Number(site.latitude),
      longitude: Number(site.longitude),
      radius_meters: site.radius_meters,
      is_active: site.is_active !== false,
    })
    setPasteCoords('')
    setFormError(null)
  }

  function openEdit() {
    setPanelMode('edit')
  }

  function closePanel() {
    setPanelMode(null)
    setSelectedSiteId(null)
    setFormData(DEFAULT_SITE)
    setFormError(null)
    setPasteCoords('')
  }

  function updateCoordinates({ latitude, longitude }) {
    setFormData((prev) => ({
      ...prev,
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
    }))
  }

  function handleCoordinateInput(field, rawValue) {
    if (rawValue === '' || rawValue === '-') {
      setFormData((prev) => ({ ...prev, [field]: rawValue }))
      return
    }
    const parsed = Number(rawValue)
    if (!Number.isNaN(parsed)) {
      setFormData((prev) => ({ ...prev, [field]: parsed }))
    }
  }

  function applyPastedCoordinates() {
    const parsed = parseCoordinatePair(pasteCoords)
    if (!parsed) {
      setFormError(STRINGS.COORDINATES_INVALID)
      return
    }
    setFormError(null)
    updateCoordinates(parsed)
    setPasteCoords(`${parsed.latitude}, ${parsed.longitude}`)
  }

  async function handleSave() {
    setFormError(null)
    if (!formData.name?.trim()) {
      setFormError(STRINGS.SITE_NAME_REQUIRED)
      return
    }
    if (!isValidLatitude(formData.latitude) || !isValidLongitude(formData.longitude)) {
      setFormError(STRINGS.COORDINATES_INVALID)
      return
    }

    const payload = {
      name: formData.name.trim(),
      latitude: Number(formData.latitude),
      longitude: Number(formData.longitude),
      radius_meters: Math.max(50, parseInt(formData.radius_meters, 10) || 500),
      is_active: formData.is_active !== false,
    }

    if (panelMode === 'edit' && formData.id) {
      const { data, error } = await upsertSite(payload, { id: formData.id })
      if (error) {
        setFormError(error.message)
        return
      }
      await loadSites()
      openView(data || { ...payload, id: formData.id })
    } else {
      const { data, error } = await upsertSite(payload)
      if (error) {
        setFormError(error.message)
        return
      }
      await loadSites()
      if (data) openView(data)
    }
  }

  async function handleDelete() {
    if (!formData.id || !window.confirm('Delete this site?')) return
    const { error } = await supabase.from('sites').delete().eq('id', formData.id)
    if (error) {
      setFormError(error.message)
      return
    }
    await loadSites()
    closePanel()
  }

  return (
    <AppShell
      title={STRINGS.SITES}
      backTo="/admin"
      maxWidth="max-w-[96rem]"
      headerActions={
        <button type="button" onClick={openCreate} className="btn-primary">
          + {STRINGS.ADD_SITE}
        </button>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-[18rem_1fr] gap-4 min-h-[calc(100vh-10rem)]">
        <div className="card p-4 xl:max-h-[calc(100vh-10rem)] flex flex-col">
          <h2 className="display-title text-base text-forest-900 mb-3">{STRINGS.SITES}</h2>
          <input
            type="search"
            value={siteSearch}
            onChange={(e) => setSiteSearch(e.target.value)}
            placeholder={STRINGS.SEARCH_SITES}
            className="input-field mb-2"
          />
          <label className="flex items-center gap-2 text-xs text-earth mb-3">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-forest-300"
            />
            {STRINGS.SHOW_INACTIVE}
          </label>
          {loading ? (
            <p className="text-sm text-earth">{STRINGS.LOADING}...</p>
          ) : filteredSites.length === 0 ? (
            <p className="text-sm text-earth">{STRINGS.NO_DATA}</p>
          ) : (
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
              {filteredSites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => openView(site)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition border ${
                    selectedSiteId === site.id
                      ? 'bg-forest-100 border-forest-400 shadow-soft'
                      : site.is_active === false
                        ? 'bg-forest-50/30 border-forest-100 opacity-75'
                        : 'bg-white border-forest-100 hover:border-forest-200 hover:bg-forest-50/50'
                  }`}
                >
                  <p className="font-semibold text-sm text-forest-900 flex items-center gap-2">
                    {site.name}
                    {site.is_active === false && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-600">
                        {STRINGS.INACTIVE}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-earth">{site.radius_meters}m · {Number(site.latitude).toFixed(4)}, {Number(site.longitude).toFixed(4)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-hidden min-h-[32rem] xl:min-h-0 flex flex-col">
          {panelMode ? (
            <>
              {panelMode === 'view' && (
                <div className="bg-forest-50 border-b border-forest-100 px-4 py-2 flex justify-end">
                  <button type="button" onClick={openEdit} className="btn-secondary text-sm">
                    {STRINGS.EDIT}
                  </button>
                </div>
              )}
              <div className="flex-1 min-h-0">
                <SiteEditorShell
                  mode={panelMode === 'edit' ? 'edit' : panelMode}
                  formData={formData}
                  setFormData={setFormData}
                  pasteCoords={pasteCoords}
                  setPasteCoords={setPasteCoords}
                  formError={formError}
                  onApplyPaste={applyPastedCoordinates}
                  onSave={handleSave}
                  onCancel={closePanel}
                  onDelete={panelMode === 'view' ? handleDelete : null}
                  updateCoordinates={updateCoordinates}
                  handleCoordinateInput={handleCoordinateInput}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-earth p-8">
              <IconMapPin className="w-12 h-12 text-forest-200 mb-3" />
              <p className="text-center max-w-sm">
                Select a site from the list or add a new one to manage location, geofence, and staff assignments.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}