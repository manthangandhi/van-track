import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import {
  getHolidays,
  createHoliday,
  deleteHoliday,
  getLeaveRequests,
  reviewLeaveRequest,
  LEAVE_TYPES,
} from '../services/workforceService'
import { STRINGS } from '../utils/strings'
import { formatDate } from '../utils/helpers'
import { AppShell } from '../components/ui/AppShell'

const TABS = ['leave', 'holidays']

export default function AdminWorkforce() {
  const [tab, setTab] = useState('leave')
  const [sites, setSites] = useState([])
  const [holidays, setHolidays] = useState([])
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [holidayForm, setHolidayForm] = useState({ holiday_date: '', name: '', site_id: '' })
  const [reviewComment, setReviewComment] = useState({})

  useEffect(() => {
    supabase.from('sites').select('id, name').order('name').then(({ data }) => setSites(data || []))
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [h, l] = await Promise.all([getHolidays(), getLeaveRequests()])
      setHolidays(h)
      setLeaves(l)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function handleAddHoliday(e) {
    e.preventDefault()
    try {
      await createHoliday({
        holiday_date: holidayForm.holiday_date,
        name: holidayForm.name,
        site_id: holidayForm.site_id || null,
      })
      setHolidayForm({ holiday_date: '', name: '', site_id: '' })
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleReview(id, status) {
    try {
      await reviewLeaveRequest(id, status, reviewComment[id] || '')
      setReviewComment((c) => ({ ...c, [id]: '' }))
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  const pending = leaves.filter((l) => l.status === 'pending')

  return (
    <AppShell title={STRINGS.WORKFORCE} backTo="/admin" maxWidth="max-w-6xl">
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={tab === t ? 'btn-primary text-sm' : 'btn-ghost text-sm'}
          >
            {t === 'leave' ? `${STRINGS.LEAVE_REQUESTS}${pending.length ? ` (${pending.length})` : ''}` : STRINGS.HOLIDAYS}
          </button>
        ))}
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {loading && <p className="text-earth text-sm">{STRINGS.LOADING}</p>}

      {!loading && tab === 'leave' && (
        <div className="space-y-3">
          {leaves.length === 0 && <p className="text-earth text-sm">{STRINGS.NO_LEAVE_REQUESTS}</p>}
          {leaves.map((l) => (
            <div key={l.id} className="card p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium text-forest-900">{l.employee?.full_name}</p>
                  <p className="text-sm text-earth">
                    {formatDate(l.start_date)} – {formatDate(l.end_date)} · {l.leave_type}
                  </p>
                  {l.reason && <p className="text-sm text-earth mt-1">{l.reason}</p>}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  l.status === 'approved' ? 'bg-forest-100 text-forest-800' :
                  l.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                }`}>{l.status}</span>
              </div>
              {l.status === 'pending' && (
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    className="input-field flex-1 text-sm"
                    placeholder={STRINGS.ADMIN_COMMENT}
                    value={reviewComment[l.id] || ''}
                    onChange={(e) => setReviewComment((c) => ({ ...c, [l.id]: e.target.value }))}
                  />
                  <button type="button" className="btn-primary text-sm" onClick={() => handleReview(l.id, 'approved')}>{STRINGS.APPROVE}</button>
                  <button type="button" className="btn-danger text-sm" onClick={() => handleReview(l.id, 'rejected')}>{STRINGS.REJECT}</button>
                </div>
              )}
              {l.admin_comment && <p className="text-xs text-earth mt-2">{STRINGS.ADMIN_COMMENT}: {l.admin_comment}</p>}
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'holidays' && (
        <>
          <form onSubmit={handleAddHoliday} className="card p-4 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input type="date" required className="input-field" value={holidayForm.holiday_date} onChange={(e) => setHolidayForm((f) => ({ ...f, holiday_date: e.target.value }))} />
            <input required className="input-field" placeholder={STRINGS.HOLIDAY_NAME} value={holidayForm.name} onChange={(e) => setHolidayForm((f) => ({ ...f, name: e.target.value }))} />
            <select className="input-field" value={holidayForm.site_id} onChange={(e) => setHolidayForm((f) => ({ ...f, site_id: e.target.value }))}>
              <option value="">{STRINGS.ALL_SITES}</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button type="submit" className="btn-primary">{STRINGS.ADD_HOLIDAY}</button>
          </form>
          <div className="space-y-2">
            {holidays.map((h) => (
              <div key={h.id} className="card-flat p-3 flex justify-between items-center">
                <span className="text-sm">{formatDate(h.holiday_date)} — {h.name} {h.sites?.name ? `(${h.sites.name})` : `(${STRINGS.ALL_SITES})`}</span>
                <button type="button" className="btn-ghost text-xs text-red-600" onClick={() => deleteHoliday(h.id).then(loadAll)}>{STRINGS.DELETE}</button>
              </div>
            ))}
          </div>
        </>
      )}

    </AppShell>
  )
}