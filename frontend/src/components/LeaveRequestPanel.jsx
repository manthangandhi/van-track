import React, { useState, useEffect } from 'react'
import { createLeaveRequest, getLeaveRequests, LEAVE_TYPES } from '../services/workforceService'
import { STRINGS } from '../utils/strings'
import { formatDate } from '../utils/helpers'

export function LeaveRequestPanel({ employeeId }) {
  const [requests, setRequests] = useState([])
  const [form, setForm] = useState({ start_date: '', end_date: '', leave_type: 'annual', reason: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    getLeaveRequests({ employeeId })
      .then(setRequests)
      .catch((err) => setError(err.message || STRINGS.SERVER_ERROR))
      .finally(() => setLoading(false))
  }, [employeeId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.end_date < form.start_date) {
      setError(STRINGS.INVALID_DATE_RANGE)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createLeaveRequest({ employee_id: employeeId, ...form })
      setForm({ start_date: '', end_date: '', leave_type: 'annual', reason: '' })
      setRequests(await getLeaveRequests({ employeeId }))
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label-field">{STRINGS.FROM}</label>
          <input type="date" required className="input-field" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
        </div>
        <div>
          <label className="label-field">{STRINGS.TO}</label>
          <input type="date" required className="input-field" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
        </div>
        <div>
          <label className="label-field">{STRINGS.LEAVE_TYPE}</label>
          <select className="input-field" value={form.leave_type} onChange={(e) => setForm((f) => ({ ...f, leave_type: e.target.value }))}>
            {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label-field">{STRINGS.REASON}</label>
          <input className="input-field" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
        </div>
        <button type="submit" disabled={saving} className="btn-primary sm:col-span-2">{saving ? STRINGS.LOADING : STRINGS.REQUEST_LEAVE}</button>
        {error && <p className="text-red-600 text-sm sm:col-span-2">{error}</p>}
      </form>
      {loading ? (
        <p className="text-earth text-sm">{STRINGS.LOADING}...</p>
      ) : requests.length === 0 ? (
        <p className="text-earth text-sm">{STRINGS.NO_DATA}</p>
      ) : (
        requests.map((r) => (
          <div key={r.id} className="card-flat p-3 text-sm flex justify-between">
            <span>{formatDate(r.start_date)} – {formatDate(r.end_date)} ({r.leave_type})</span>
            <span className="text-earth">{r.status}</span>
          </div>
        ))
      )}
    </div>
  )
}