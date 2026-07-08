import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  exportEmployeeData,
  downloadJson,
  requestDataErasure,
} from '../services/privacyService'
import { STRINGS } from '../utils/strings'

export function PrivacyPanel({ employeeId }) {
  const [reason, setReason] = useState('')
  const [exporting, setExporting] = useState(false)
  const [erasing, setErasing] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  async function handleExport() {
    setExporting(true)
    setError(null)
    setMessage(null)
    try {
      const data = await exportEmployeeData(employeeId)
      downloadJson(data, `vantrack-data-export-${employeeId.slice(0, 8)}.json`)
      setMessage(STRINGS.DATA_EXPORT_DONE)
    } catch (err) {
      setError(err.message)
    }
    setExporting(false)
  }

  async function handleErasureRequest(e) {
    e.preventDefault()
    if (!window.confirm(STRINGS.ERASURE_REQUEST_CONFIRM)) return
    setErasing(true)
    setError(null)
    setMessage(null)
    try {
      await requestDataErasure(employeeId, reason)
      setMessage(STRINGS.ERASURE_REQUEST_SUBMITTED)
      setReason('')
    } catch (err) {
      setError(err.message)
    }
    setErasing(false)
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="display-title text-base mb-2">{STRINGS.YOUR_DATA_RIGHTS}</h3>
        <p className="text-sm text-earth mb-4">{STRINGS.YOUR_DATA_RIGHTS_HINT}</p>
        <Link to="/privacy" className="text-sm text-forest-600 font-semibold underline mb-4 inline-block">
          {STRINGS.PRIVACY_POLICY}
        </Link>
        <button type="button" onClick={handleExport} disabled={exporting || erasing} className="btn-secondary w-full sm:w-auto">
          {STRINGS.EXPORT_MY_DATA}
        </button>
      </div>

      <form onSubmit={handleErasureRequest} className="card p-5">
        <h3 className="display-title text-base mb-2">{STRINGS.REQUEST_ERASURE}</h3>
        <p className="text-sm text-earth mb-3">{STRINGS.REQUEST_ERASURE_HINT}</p>
        <textarea className="input-field mb-3 min-h-[80px]" placeholder={STRINGS.REASON_OPTIONAL} value={reason} onChange={(e) => setReason(e.target.value)} />
        <button type="submit" disabled={exporting || erasing} className="btn-danger w-full sm:w-auto">
          {STRINGS.REQUEST_ERASURE}
        </button>
      </form>

      {message && <div className="alert-success">{message}</div>}
      {error && <div className="alert-error">{error}</div>}
    </div>
  )
}