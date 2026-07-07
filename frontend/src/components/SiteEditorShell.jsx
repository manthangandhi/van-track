import React from 'react'
import { MapPicker } from './MapPicker'
import { LocationSearch } from './LocationSearch'
import { MetricsStrip } from './ui/MetricsStrip'
import { STRINGS } from '../utils/strings'
import { formatDecimalCoordinates } from '../utils/imageStampFormat'
import { IconMapPin } from './ui/Icons'
import { StatusToggle } from './ui/StatusToggle'

export function SiteEditorShell({
  mode,
  formData,
  setFormData,
  pasteCoords,
  setPasteCoords,
  formError,
  onApplyPaste,
  onSave,
  onCancel,
  onDelete,
  updateCoordinates,
  handleCoordinateInput,
}) {
  const isView = mode === 'view'
  const isCreate = mode === 'create'
  const title = isCreate ? STRINGS.ADD_SITE : isView ? formData.name : STRINGS.EDIT

  const metrics = [
    {
      label: STRINGS.STATUS,
      value: formData.is_active !== false ? STRINGS.ACTIVE : STRINGS.INACTIVE,
      accent: formData.is_active !== false ? 'text-forest-700' : 'text-red-600',
    },
    { label: STRINGS.RADIUS, value: `${formData.radius_meters || 500} ${STRINGS.METERS}` },
    { label: STRINGS.LATITUDE, value: Number(formData.latitude).toFixed(6) },
    { label: STRINGS.LONGITUDE, value: Number(formData.longitude).toFixed(6) },
    {
      label: STRINGS.DECIMAL_COORDINATES,
      value: formatDecimalCoordinates(formData.latitude, formData.longitude),
    },
  ]

  return (
    <div className="flex flex-col h-full min-h-0 bg-cream">
      <div className="bg-white border-b border-forest-100 px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h2 className="display-title text-lg text-forest-900 flex items-center gap-2">
            <IconMapPin className="w-5 h-5 text-forest-600" />
            {title}
          </h2>
          <p className="text-sm text-earth">
            {isView ? STRINGS.SITE_DETAIL_HINT : STRINGS.PIN_LOCATION}
          </p>
        </div>
        <div className="flex gap-2">
          {isView && onDelete && (
            <button type="button" onClick={onDelete} className="btn-danger">
              {STRINGS.DELETE}
            </button>
          )}
          {!isView && (
            <button type="button" onClick={onSave} className="btn-primary">
              {STRINGS.SAVE}
            </button>
          )}
          <button type="button" onClick={onCancel} className="btn-secondary">
            {isView ? STRINGS.CLOSE : STRINGS.CANCEL}
          </button>
        </div>
      </div>

      <div className="px-4 py-3 shrink-0">
        <MetricsStrip items={metrics} />
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <aside className="lg:w-[22rem] xl:w-96 shrink-0 border-b lg:border-b-0 lg:border-r border-forest-100 bg-white overflow-y-auto">
          <div className="p-4 space-y-4">
            {isView && (
              <div className="rounded-lg bg-forest-50 border border-forest-100 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-earth mb-1">{STRINGS.SITE_NAME}</p>
                <p className="font-display font-semibold text-lg text-forest-900">{formData.name}</p>
                <p className="text-xs text-earth mt-2">{STRINGS.SITE_DETAIL_HINT}</p>
              </div>
            )}
            {!isView && (
              <>
                <div>
                  <label className="label-field">{STRINGS.SITE_NAME}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <LocationSearch onSelect={updateCoordinates} />
                <div>
                  <label className="label-field">{STRINGS.PASTE_COORDINATES}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pasteCoords}
                      onChange={(e) => setPasteCoords(e.target.value)}
                      placeholder="20.5937, 78.9629"
                      className="input-field flex-1"
                    />
                    <button type="button" onClick={onApplyPaste} className="btn-secondary shrink-0">
                      {STRINGS.APPLY}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-field">{STRINGS.LATITUDE}</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => handleCoordinateInput('latitude', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">{STRINGS.LONGITUDE}</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => handleCoordinateInput('longitude', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label className="label-field">{STRINGS.RADIUS}</label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={formData.radius_meters}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        radius_meters: parseInt(e.target.value, 10) || 500,
                      })
                    }
                    className="input-field"
                  />
                </div>
                <StatusToggle
                  active={formData.is_active !== false}
                  onChange={(is_active) => setFormData({ ...formData, is_active })}
                  activeHint={STRINGS.SITE_ACTIVE}
                  inactiveHint={STRINGS.SITE_INACTIVE}
                />
                {formError && <div className="alert-error">{formError}</div>}
              </>
            )}

          </div>
        </aside>

        <div className="flex-1 min-h-0 p-3 lg:p-4">
          <div className="h-full min-h-[40vh] lg:min-h-0 rounded-xl border border-forest-100 overflow-hidden bg-white">
            <MapPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              radius={formData.radius_meters}
              onChange={updateCoordinates}
              interactive={!isView}
              mapClassName="h-full w-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}