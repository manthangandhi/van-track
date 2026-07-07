import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import {
  getAssignmentsForSite,
  createSiteAssignment,
  deleteSiteAssignment,
  assignmentStatus,
} from '../services/siteAssignmentService'
import { SearchableSelect } from './SearchableSelect'
import { STRINGS } from '../utils/strings'
import { formatDate } from '../utils/helpers'
import { IconUsers } from './ui/Icons'

const STATUS_STYLES = {
  active: 'bg-forest-100 text-forest-700 border-forest-200',
  upcoming: 'bg-sky-50 text-sky-700 border-sky-200',
  expired: 'bg-forest-50 text-earth border-forest-100',
}

export function SiteAssignmentPanel({ siteId, siteName, readOnly = false }) {
  const [assignments, setAssignments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    employee_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
  })

  const today = new Date().toISOString().split('T')[0]
  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.full_name }))

  useEffect(() => {
    if (siteId) {
      loadData()
    }
  }, [siteId])

  async function loadData() {
    setLoading(true)
    const [{ data: empData }, assignmentData] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'employee')
        .eq('is_active', true)
        .order('full_name'),
      getAssignmentsForSite(siteId),
    ])
    setEmployees(empData || [])
    setAssignments(assignmentData)
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.employee_id) {
      setError(STRINGS.EMPLOYEE_REQUIRED)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await createSiteAssignment({
        employeeId: form.employee_id,
        siteId,
        startDate: form.start_date,
        endDate: form.end_date || null,
        notes: form.notes || null,
        createdBy: user?.id,
      })
      setForm({
        employee_id: '',
        start_date: today,
        end_date: '',
        notes: '',
      })
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id) {
    if (!window.confirm(STRINGS.CONFIRM_DELETE_ASSIGNMENT)) return
    await deleteSiteAssignment(id)
    await loadData()
  }

  const activeCount = assignments.filter((a) => assignmentStatus(a, today) === 'active').length

  return (
    <div className="border-t border-forest-100 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="label-field flex items-center gap-1.5 mb-0">
          <IconUsers className="w-4 h-4" />
          {STRINGS.SITE_ASSIGNMENTS}
        </h3>
        <span className="text-xs font-medium text-forest-600">
          {activeCount} {STRINGS.ACTIVE_NOW}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-earth">{STRINGS.LOADING}...</p>
      ) : assignments.length === 0 ? (
        <p className="text-sm text-earth mb-3">{STRINGS.NO_ASSIGNMENTS}</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto mb-3 pr-1">
          {assignments.map((row) => {
            const status = assignmentStatus(row, today)
            return (
              <div
                key={row.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-forest-100 bg-forest-50/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-forest-900 truncate">
                    {row.profiles?.full_name}
                  </p>
                  <p className="text-xs text-earth">
                    {formatDate(row.start_date)} → {row.end_date ? formatDate(row.end_date) : STRINGS.ONGOING}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${STATUS_STYLES[status]}`}>
                    {status}
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemove(row.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      {STRINGS.DELETE}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!readOnly && siteId && (
        <div className="space-y-3 rounded-lg border border-dashed border-forest-200 p-3 bg-white">
          <p className="text-xs font-semibold text-forest-700">{STRINGS.ADD_ASSIGNMENT}</p>
          <SearchableSelect
            label={STRINGS.EMPLOYEE}
            options={employeeOptions}
            value={form.employee_id}
            onChange={(employee_id) => setForm({ ...form, employee_id })}
            placeholder={STRINGS.SEARCH_EMPLOYEES}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label-field">{STRINGS.START_DATE}</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">{STRINGS.END_DATE}</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="input-field"
                placeholder={STRINGS.ONGOING}
              />
            </div>
          </div>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder={STRINGS.ASSIGNMENT_NOTES}
            className="input-field"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving}
            className="btn-secondary w-full text-sm"
          >
            {saving ? STRINGS.LOADING : STRINGS.ADD_ASSIGNMENT}
          </button>
        </div>
      )}
    </div>
  )
}