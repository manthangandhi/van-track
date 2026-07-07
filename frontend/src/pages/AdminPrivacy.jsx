import React, { useState, useEffect } from 'react'
import {
  getOrgSettings,
  updateOrgSettings,
  getErasureRequests,
  reviewErasureRequest,
  completeDataErasure,
  runPhotoRetentionPurge,
  setLegalHold,
} from '../services/privacyService'
import { STRINGS } from '../utils/strings'
import { formatDateTime } from '../utils/helpers'
import { AppShell } from '../components/ui/AppShell'

export default function AdminPrivacy() {
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState({})
  const [requests, setRequests] = useState([])
  const [comments, setComments] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [s, r] = await Promise.all([getOrgSettings(), getErasureRequests()])
      setSettings(s)
      setForm({
        photo_retention_days: s?.photo_retention_days ?? 365,
        privacy_policy_version: s?.privacy_policy_version ?? '1.0',
        data_controller_name: s?.data_controller_name ?? '',
        data_controller_email: s?.data_controller_email ?? '',
      })
      setRequests(r)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function saveSettings(e) {
    e.preventDefault()
    setError(null)
    try {
      await updateOrgSettings({
        photo_retention_days: Number(form.photo_retention_days),
        privacy_policy_version: form.privacy_policy_version,
        data_controller_name: form.data_controller_name || null,
        data_controller_email: form.data_controller_email || null,
      })
      setInfo(STRINGS.PRIVACY_SETTINGS_SAVED)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handlePurge() {
    if (!window.confirm(STRINGS.PRIVACY_PURGE_CONFIRM)) return
    try {
      const result = await runPhotoRetentionPurge()
      setInfo(STRINGS.PRIVACY_PURGE_DONE.replace('{n}', String(result?.purged_punches ?? 0)))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleReview(id, status) {
    try {
      await reviewErasureRequest(id, status, comments[id] || '')
      if (status === 'approved') {
        await completeDataErasure(id)
      }
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AppShell title={STRINGS.PRIVACY_COMPLIANCE} backTo="/admin" maxWidth="max-w-4xl">
      {error && <div className="alert-error mb-4">{error}</div>}
      {info && <div className="alert-success mb-4">{info}</div>}

      <form onSubmit={saveSettings} className="card p-6 mb-6 space-y-4">
        <h2 className="display-title text-lg">{STRINGS.PRIVACY_SETTINGS}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">{STRINGS.PHOTO_RETENTION_DAYS}</label>
            <input type="number" min={30} className="input-field" value={form.photo_retention_days ?? ''} onChange={(e) => setForm((f) => ({ ...f, photo_retention_days: e.target.value }))} />
          </div>
          <div>
            <label className="label-field">{STRINGS.PRIVACY_POLICY_VERSION}</label>
            <input className="input-field" value={form.privacy_policy_version ?? ''} onChange={(e) => setForm((f) => ({ ...f, privacy_policy_version: e.target.value }))} />
          </div>
          <div>
            <label className="label-field">{STRINGS.DATA_CONTROLLER}</label>
            <input className="input-field" value={form.data_controller_name ?? ''} onChange={(e) => setForm((f) => ({ ...f, data_controller_name: e.target.value }))} />
          </div>
          <div>
            <label className="label-field">{STRINGS.DATA_CONTROLLER_EMAIL}</label>
            <input type="email" className="input-field" value={form.data_controller_email ?? ''} onChange={(e) => setForm((f) => ({ ...f, data_controller_email: e.target.value }))} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>{STRINGS.SAVE}</button>
          <button type="button" className="btn-secondary" onClick={handlePurge}>{STRINGS.RUN_RETENTION_PURGE}</button>
        </div>
        <p className="text-xs text-earth">{STRINGS.PRIVACY_PURGE_HINT}</p>
      </form>

      <div className="card p-6">
        <h2 className="display-title text-lg mb-4">{STRINGS.ERASURE_REQUESTS}</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-earth">{STRINGS.NO_ERASURE_REQUESTS}</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="card-flat p-4">
                <p className="font-medium">{r.employee?.full_name}</p>
                <p className="text-sm text-earth">{formatDateTime(r.created_at)} · {r.status}</p>
                {r.reason && <p className="text-sm mt-1">{r.reason}</p>}
                {r.employee?.legal_hold && <p className="text-xs text-amber-700 mt-1">{STRINGS.LEGAL_HOLD_ACTIVE}</p>}
                {r.status === 'pending' && !r.employee?.legal_hold && (
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input className="input-field flex-1 text-sm" placeholder={STRINGS.ADMIN_COMMENT} value={comments[r.id] || ''} onChange={(e) => setComments((c) => ({ ...c, [r.id]: e.target.value }))} />
                    <button type="button" className="btn-primary text-sm" onClick={() => handleReview(r.id, 'approved')}>{STRINGS.APPROVE_ERASURE}</button>
                    <button type="button" className="btn-danger text-sm" onClick={() => handleReview(r.id, 'rejected')}>{STRINGS.REJECT}</button>
                  </div>
                )}
                {r.status === 'pending' && r.employee?.legal_hold && (
                  <button type="button" className="btn-ghost text-sm mt-2" onClick={() => setLegalHold(r.employee_id, false).then(load)}>
                    {STRINGS.REMOVE_LEGAL_HOLD}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}