import React, { useState, useEffect, useCallback } from 'react'
import {
  getAuditLog,
  AUDIT_ENTITY_TYPES,
  formatAuditAction,
  formatAuditDetails,
} from '../services/auditService'
import { STRINGS } from '../utils/strings'
import { formatDateTime } from '../utils/helpers'
import { AppShell } from '../components/ui/AppShell'

export default function AdminAudit() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [entityType, setEntityType] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getAuditLog({ entityType: entityType || null, search }))
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }, [entityType, search])

  useEffect(() => {
    load()
  }, [load])

  return (
    <AppShell title={STRINGS.AUDIT_LOG} backTo="/admin" maxWidth="max-w-6xl">
      <p className="text-sm text-earth mb-4">{STRINGS.AUDIT_LOG_HINT}</p>

      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <select
          className="input-field sm:w-48"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        >
          {AUDIT_ENTITY_TYPES.map((t) => (
            <option key={t.value || 'all'} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          className="input-field flex-1"
          placeholder={STRINGS.SEARCH_AUDIT}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="btn-secondary" onClick={load}>
          {STRINGS.REFRESH}
        </button>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {loading && <p className="text-earth text-sm">{STRINGS.LOADING}</p>}

      {!loading && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-forest-100 text-left text-earth">
                <th className="p-3">{STRINGS.TIME}</th>
                <th className="p-3">{STRINGS.ACTOR}</th>
                <th className="p-3">{STRINGS.ACTION}</th>
                <th className="p-3">{STRINGS.ENTITY}</th>
                <th className="p-3">{STRINGS.DETAILS}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-earth">
                    {STRINGS.NO_AUDIT_ENTRIES}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-forest-50 align-top">
                    <td className="p-3 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                    <td className="p-3">{row.actor?.full_name || '—'}</td>
                    <td className="p-3">{formatAuditAction(row.action)}</td>
                    <td className="p-3 capitalize">{row.entity_type?.replace('_', ' ')}</td>
                    <td className="p-3 text-earth max-w-md">{formatAuditDetails(row.details)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  )
}