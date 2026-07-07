import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'
import { filterActiveSites, selectSites } from '../services/sitesService'
import {
  getAssignmentReport,
  createSiteAssignment,
  deleteSiteAssignment,
  updateSiteAssignment,
  assignmentStatus,
  generateAssignmentCSV,
} from '../services/siteAssignmentService'
import { SearchableSelect } from '../components/SearchableSelect'
import { AppShell } from '../components/ui/AppShell'
import { MetricsStrip } from '../components/ui/MetricsStrip'
import { STRINGS } from '../utils/strings'
import { formatDate, addDays } from '../utils/helpers'
import { IconDownload, IconFilter, IconMapPin, IconUsers } from '../components/ui/Icons'

const STATUS_STYLES = {
  active: 'bg-forest-100 text-forest-700',
  upcoming: 'bg-sky-100 text-sky-700',
  expired: 'bg-forest-50 text-earth',
}

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'expired', label: 'Expired' },
]

export default function AdminAssignments() {
  const [employees, setEmployees] = useState([])
  const [sites, setSites] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [startDate, setStartDate] = useState(addDays(new Date(), -90).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(addDays(new Date(), 90).toISOString().split('T')[0])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    employee_id: '',
    site_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
  })

  const today = new Date().toISOString().split('T')[0]
  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.full_name }))
  const siteOptions = sites.map((s) => ({ value: s.id, label: s.name }))

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: empData }, { data: siteData }, rows] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('role', 'employee').eq('is_active', true).order('full_name'),
      selectSites('id, name, is_active'),
      getAssignmentReport({
        employeeIds: filterEmployee ? [filterEmployee] : null,
        siteIds: filterSite ? [filterSite] : null,
        startDate,
        endDate,
      }),
    ])
    setEmployees(empData || [])
    setSites(filterActiveSites(siteData))
    setAssignments(rows)
    setLoading(false)
  }, [filterEmployee, filterSite, startDate, endDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return assignments.filter((row) => {
      const status = assignmentStatus(row, today)
      if (filterStatus && status !== filterStatus) return false
      if (!q) return true
      return (
        row.profiles?.full_name?.toLowerCase().includes(q) ||
        row.sites?.name?.toLowerCase().includes(q) ||
        row.notes?.toLowerCase().includes(q)
      )
    })
  }, [assignments, search, filterStatus, today])

  const counts = useMemo(() => {
    const c = { active: 0, upcoming: 0, expired: 0 }
    assignments.forEach((a) => {
      c[assignmentStatus(a, today)] += 1
    })
    return c
  }, [assignments, today])

  async function handleSave() {
    if (!form.employee_id || !form.site_id) {
      setError(STRINGS.ASSIGNMENT_FIELDS_REQUIRED)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (editingId) {
        await updateSiteAssignment(editingId, {
          start_date: form.start_date,
          end_date: form.end_date || null,
          notes: form.notes || null,
        })
        setEditingId(null)
      } else {
        await createSiteAssignment({
          employeeId: form.employee_id,
          siteId: form.site_id,
          startDate: form.start_date,
          endDate: form.end_date || null,
          notes: form.notes || null,
          createdBy: user?.id,
        })
      }
      setForm({
        employee_id: '',
        site_id: '',
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

  function startEdit(row) {
    setEditingId(row.id)
    setForm({
      employee_id: row.employee_id,
      site_id: row.site_id,
      start_date: row.start_date,
      end_date: row.end_date || '',
      notes: row.notes || '',
    })
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm({ employee_id: '', site_id: '', start_date: today, end_date: '', notes: '' })
    setError(null)
  }

  async function handleDelete(id) {
    if (!window.confirm(STRINGS.CONFIRM_DELETE_ASSIGNMENT)) return
    try {
      await deleteSiteAssignment(id)
      if (editingId === id) cancelEdit()
      await loadData()
    } catch (err) {
      setError(err.message || STRINGS.SERVER_ERROR)
    }
  }

  function handleExport() {
    const csv = generateAssignmentCSV(filtered)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `staff-assignments-${today}.csv`
    a.click()
  }

  return (
    <AppShell title={STRINGS.STAFF_SITE_MAPPING} backTo="/admin" maxWidth="max-w-6xl">
      <p className="text-sm text-earth mb-5 -mt-2">{STRINGS.ASSIGNMENTS_PAGE_HINT}</p>

      <MetricsStrip
        items={[
          { label: STRINGS.ACTIVE_NOW, value: counts.active, accent: 'text-forest-700' },
          { label: 'Upcoming', value: counts.upcoming, accent: 'text-sky-700' },
          { label: 'Expired', value: counts.expired },
          { label: STRINGS.TOTAL, value: assignments.length },
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_20rem] gap-5 mt-5">
        <div className="space-y-4">
          <div className="rounded-xl border border-forest-100 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <IconFilter className="w-4 h-4 text-forest-600" />
              <h2 className="font-display font-semibold text-forest-900">{STRINGS.FILTER}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={STRINGS.SEARCH_EMPLOYEES}
                className="input-field"
              />
              <select value={filterSite} onChange={(e) => setFilterSite(e.target.value)} className="input-field">
                <option value="">{STRINGS.ALL_LOCATIONS}</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} className="input-field">
                <option value="">All employees</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field">
                {STATUS_FILTERS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-end gap-3 justify-between">
              <div className="flex gap-2">
                <div>
                  <label className="label-field text-xs">{STRINGS.FROM}</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field py-1.5 text-sm" />
                </div>
                <div>
                  <label className="label-field text-xs">{STRINGS.TO}</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field py-1.5 text-sm" />
                </div>
              </div>
              <button type="button" onClick={handleExport} disabled={!filtered.length} className="btn-secondary text-sm flex items-center gap-1.5">
                <IconDownload className="w-4 h-4" />
                {STRINGS.EXPORT_CSV}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-forest-100 bg-white overflow-hidden">
            <table className="w-full">
              <thead className="bg-forest-900 text-white text-left">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{STRINGS.EMPLOYEE}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{STRINGS.SITE}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">{STRINGS.PERIOD}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-center">{STRINGS.STATUS}</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-right">{STRINGS.ACTIONS}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-earth">{STRINGS.LOADING}...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-earth">{STRINGS.NO_ASSIGNMENTS}</td></tr>
                ) : (
                  filtered.map((row) => {
                    const status = assignmentStatus(row, today)
                    return (
                      <tr key={row.id} className="border-b border-forest-50 hover:bg-forest-50/30">
                        <td className="px-4 py-3 text-sm font-medium text-forest-900">{row.profiles?.full_name}</td>
                        <td className="px-4 py-3 text-sm text-earth">{row.sites?.name}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="font-medium">{formatDate(row.start_date)}</span>
                          <span className="text-earth mx-1">→</span>
                          <span>{row.end_date ? formatDate(row.end_date) : STRINGS.ONGOING}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_STYLES[status]}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => startEdit(row)} className="text-xs text-forest-700 hover:underline mr-2">
                            {STRINGS.EDIT}
                          </button>
                          <button type="button" onClick={() => handleDelete(row.id)} className="text-xs text-red-600 hover:underline">
                            {STRINGS.DELETE}
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-xl border border-forest-200 bg-forest-50/50 p-4 h-fit xl:sticky xl:top-24">
          <h3 className="font-display font-semibold text-forest-900 mb-1 flex items-center gap-2">
            <IconUsers className="w-4 h-4" />
            {editingId ? STRINGS.EDIT_ASSIGNMENT : STRINGS.ADD_ASSIGNMENT}
          </h3>
          <p className="text-xs text-earth mb-4">{STRINGS.ASSIGNMENT_FORM_HINT}</p>

          <div className="space-y-3">
            {!editingId && (
              <>
                <SearchableSelect
                  label={STRINGS.EMPLOYEE}
                  options={employeeOptions}
                  value={form.employee_id}
                  onChange={(employee_id) => setForm({ ...form, employee_id })}
                  placeholder={STRINGS.SEARCH_EMPLOYEES}
                />
                <SearchableSelect
                  label={STRINGS.SITE}
                  options={siteOptions}
                  value={form.site_id}
                  onChange={(site_id) => setForm({ ...form, site_id })}
                  placeholder={STRINGS.SEARCH_SITES}
                />
              </>
            )}
            {editingId && (
              <div className="rounded-lg bg-white border border-forest-100 px-3 py-2 text-sm">
                <p className="font-medium">{employees.find((e) => e.id === form.employee_id)?.full_name}</p>
                <p className="text-earth flex items-center gap-1 mt-0.5">
                  <IconMapPin className="w-3 h-3" />
                  {sites.find((s) => s.id === form.site_id)?.name}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label-field">{STRINGS.START_DATE}</label>
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label-field">{STRINGS.END_DATE}</label>
                <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="input-field" />
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
            <div className="flex gap-2">
              <button type="button" onClick={handleSave} disabled={saving} className="btn-primary flex-1 text-sm">
                {saving ? STRINGS.LOADING : editingId ? STRINGS.SAVE : STRINGS.ADD_ASSIGNMENT}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="btn-secondary text-sm">
                  {STRINGS.CANCEL}
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  )
}