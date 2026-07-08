import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabaseClient'
import {
  getAttendanceDays,
  summarizeEmployeeAttendance,
  generateEmployeeCSV,
} from '../services/timesheetService'
import { STRINGS } from '../utils/strings'
import { formatDate, addDays, getDayBoundsISO, getLocalDateKey } from '../utils/helpers'
import { TimelineView } from '../components/TimelineView'
import { AppShell } from '../components/ui/AppShell'
import { IconCalendar, IconDownload, IconFilter, IconMapPin } from '../components/ui/Icons'
import {
  getAssignmentsForEmployee,
  generateAssignmentCSV,
  assignmentStatus,
} from '../services/siteAssignmentService'
import { LeaveRequestPanel } from '../components/LeaveRequestPanel'
import { PrivacyPanel } from '../components/PrivacyPanel'

const DATE_PRESETS = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'full', label: STRINGS.FULL_DAY },
  { value: 'half', label: STRINGS.HALF_DAY },
  { value: 'short', label: STRINGS.SHORT_DAY },
  { value: 'absent', label: STRINGS.ABSENT },
  { value: 'pending', label: STRINGS.PENDING },
  { value: 'on_leave', label: STRINGS.ON_LEAVE },
  { value: 'holiday', label: STRINGS.HOLIDAY },
]

const dayStatusColors = {
  full: 'bg-forest-100 border-forest-300 text-forest-800',
  half: 'bg-amber-50 border-amber-200 text-amber-800',
  short: 'bg-orange-50 border-orange-200 text-orange-800',
  absent: 'bg-forest-50 border-forest-200 text-earth',
  pending: 'bg-sky-50 border-sky-200 text-sky-800',
  on_leave: 'bg-violet-50 border-violet-200 text-violet-800',
  holiday: 'bg-forest-50 border-forest-200 text-forest-600',
}

function StatCard({ label, value, accent = 'text-forest-700' }) {
  return (
    <div className="card-flat p-4 text-center">
      <p className={`text-2xl font-bold font-display ${accent}`}>{value}</p>
      <p className="text-xs text-earth mt-1">{label}</p>
    </div>
  )
}

export default function HistoryPage() {
  const { user, profile } = useAuth()
  const [attendanceDays, setAttendanceDays] = useState([])
  const [sites, setSites] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [dayPunches, setDayPunches] = useState([])
  const [dayDetailError, setDayDetailError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('attendance')
  const [assignments, setAssignments] = useState([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)

  const endDate = getLocalDateKey()
  const [startDate, setStartDate] = useState(getLocalDateKey(addDays(new Date(), -30)))
  const [rangeEnd, setRangeEnd] = useState(endDate)
  const [selectedSite, setSelectedSite] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [activePreset, setActivePreset] = useState('30d')

  const loadSites = useCallback(async () => {
    const { data } = await supabase.from('sites').select('id, name').order('name')
    setSites(data || [])
  }, [])

  const loadAttendance = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const data = await getAttendanceDays(user.id, startDate, rangeEnd, {
      siteId: selectedSite || null,
      status: statusFilter || null,
    })
    setAttendanceDays(data)
    setSelectedDay(null)
    setDayPunches([])
    setLoading(false)
  }, [user, startDate, rangeEnd, selectedSite, statusFilter])

  useEffect(() => {
    if (user && profile) {
      loadSites()
    }
  }, [user, profile, loadSites])

  useEffect(() => {
    if (user && profile && tab === 'attendance') {
      loadAttendance()
    }
  }, [user, profile, tab, loadAttendance])

  useEffect(() => {
    if (user && profile && tab === 'assignments') {
      loadAssignments()
    }
  }, [user, profile, tab, startDate, rangeEnd])

  async function loadAssignments() {
    setAssignmentsLoading(true)
    const data = await getAssignmentsForEmployee(user.id, {
      startDate,
      endDate: rangeEnd,
    })
    setAssignments(data)
    setAssignmentsLoading(false)
  }

  function handleExportAssignments() {
    const csv = generateAssignmentCSV(assignments)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-assignments-${startDate}-${rangeEnd}.csv`
    a.click()
  }

  function applyPreset(preset) {
    setActivePreset(preset.id)
    const end = getLocalDateKey()
    setRangeEnd(end)
    setStartDate(getLocalDateKey(addDays(new Date(), -preset.days)))
  }

  async function handleDayClick(day) {
    setSelectedDay(day)
    const { start, end } = getDayBoundsISO(day.work_date)
    const { data, error } = await supabase
      .from('punches')
      .select('*')
      .eq('employee_id', user.id)
      .gte('server_timestamp', start)
      .lte('server_timestamp', end)
      .order('server_timestamp', { ascending: true })

    if (error) {
      setDayPunches([])
      setDayDetailError(error.message)
      return
    }

    setDayPunches(data || [])
    setDayDetailError(null)
  }

  function handleExport() {
    const csv = generateEmployeeCSV(attendanceDays)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-timesheet-${startDate}-${rangeEnd}.csv`
    a.click()
  }

  const summary = summarizeEmployeeAttendance(attendanceDays)
  const assignedSiteName = sites.find((s) => s.id === profile?.assigned_site_id)?.name

  const today = new Date().toISOString().split('T')[0]
  const showDateFilter = tab === 'attendance' || tab === 'assignments'

  return (
    <AppShell title={STRINGS.MY_TIMESHEET} backTo="/dashboard" maxWidth="max-w-5xl">
      <div className="flex gap-2 mb-4">
        {[
          { id: 'attendance', label: STRINGS.ATTENDANCE_TAB },
          { id: 'assignments', label: STRINGS.ASSIGNMENTS_TAB },
          { id: 'leave', label: STRINGS.LEAVE_TAB },
          { id: 'privacy', label: STRINGS.PRIVACY_TAB },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              tab === t.id ? 'bg-forest-700 text-white' : 'bg-forest-50 text-forest-700 hover:bg-forest-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showDateFilter && (
        <div className="card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <IconFilter className="w-5 h-5 text-forest-600" />
            <h2 className="display-title text-lg text-forest-900">{STRINGS.FILTER}</h2>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  activePreset === preset.id
                    ? 'bg-forest-700 text-white'
                    : 'bg-forest-50 text-forest-700 hover:bg-forest-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
              tab === 'attendance' ? 'lg:grid-cols-4' : 'lg:grid-cols-2'
            }`}
          >
            <div>
              <label className="label-field">{STRINGS.FROM}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setActivePreset('custom')
                }}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">{STRINGS.TO}</label>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => {
                  setRangeEnd(e.target.value)
                  setActivePreset('custom')
                }}
                className="input-field"
              />
            </div>
            {tab === 'attendance' && (
              <>
                <div>
                  <label className="label-field flex items-center gap-1.5">
                    <IconMapPin className="w-3.5 h-3.5" />
                    {STRINGS.SITE}
                  </label>
                  <select
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="input-field"
                  >
                    <option value="">{STRINGS.ALL_LOCATIONS}</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                        {site.id === profile?.assigned_site_id ? ` (${STRINGS.ASSIGNED_SITE})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-field">{STRINGS.STATUS}</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input-field"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {tab === 'attendance' && assignedSiteName && (
            <p className="text-xs text-earth mt-3">
              {STRINGS.ASSIGNED_SITE}: <strong className="text-forest-800">{assignedSiteName}</strong>
            </p>
          )}
        </div>
      )}

      {tab === 'attendance' && (
      <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label={STRINGS.TOTAL_HOURS} value={`${summary.totalHours.toFixed(1)}h`} />
        <StatCard label={STRINGS.FULL_DAY} value={summary.fullDays} accent="text-forest-600" />
        <StatCard label={STRINGS.HALF_DAY} value={summary.halfDays} accent="text-amber-600" />
        <StatCard label={STRINGS.SHORT_DAY} value={summary.shortDays} accent="text-orange-600" />
        <StatCard label={STRINGS.ABSENT} value={summary.absentDays} accent="text-earth" />
        <StatCard label={STRINGS.TOTAL_DAYS} value={summary.totalDays} />
      </div>

      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={handleExport}
          disabled={attendanceDays.length === 0}
          className="btn-secondary flex items-center gap-2"
        >
          <IconDownload className="w-4 h-4" />
          {STRINGS.EXPORT_CSV}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <IconCalendar className="w-5 h-5 text-forest-600" />
              <h2 className="display-title text-lg text-forest-900">{STRINGS.CALENDAR}</h2>
            </div>
            {loading ? (
              <p className="text-earth">{STRINGS.LOADING}...</p>
            ) : attendanceDays.length === 0 ? (
              <p className="text-earth">{STRINGS.NO_DATA}</p>
            ) : (
              <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                {attendanceDays.map((day) => (
                  <button
                    key={day.work_date}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition ${
                      dayStatusColors[day.day_status] || dayStatusColors.pending
                    } ${
                      selectedDay?.work_date === day.work_date
                        ? 'ring-2 ring-forest-400 shadow-soft'
                        : 'hover:shadow-soft'
                    }`}
                  >
                    <p className="font-semibold text-sm">{formatDate(day.work_date)}</p>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className="text-xs capitalize opacity-80">{day.day_status}</p>
                      <p className="text-xs font-medium">{(day.hours_worked || 0).toFixed(1)}h</p>
                    </div>
                    {day.profiles?.sites?.name && (
                      <p className="text-xs opacity-70 mt-0.5 truncate">{day.profiles.sites.name}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedDay ? (
            <div className="card p-4">
              <h2 className="display-title text-lg text-forest-900 mb-4">
                {formatDate(selectedDay.work_date)}
              </h2>
              <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="card-flat p-3">
                  <p className="text-xs text-earth">{STRINGS.STATUS}</p>
                  <p className="font-semibold capitalize">{selectedDay.day_status}</p>
                </div>
                <div className="card-flat p-3">
                  <p className="text-xs text-earth">{STRINGS.HOURS_WORKED}</p>
                  <p className="font-semibold">{(selectedDay.hours_worked || 0).toFixed(1)}h</p>
                </div>
                <div className="card-flat p-3">
                  <p className="text-xs text-earth">{STRINGS.SITE}</p>
                  <p className="font-semibold truncate">
                    {selectedDay.profiles?.sites?.name || '—'}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="label-field mb-3">{STRINGS.PUNCHES}:</h3>
                {dayDetailError && <div className="alert-error mb-3">{dayDetailError}</div>}
                <TimelineView punches={dayPunches} />
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-earth">
              <IconCalendar className="w-10 h-10 mx-auto mb-3 text-forest-300" />
              <p>{STRINGS.SELECT_DAY_HINT}</p>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {tab === 'leave' && user && <LeaveRequestPanel employeeId={user.id} />}

      {tab === 'privacy' && user && <PrivacyPanel employeeId={user.id} />}

      {tab === 'assignments' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={handleExportAssignments}
              disabled={assignments.length === 0}
              className="btn-secondary flex items-center gap-2"
            >
              <IconDownload className="w-4 h-4" />
              {STRINGS.EXPORT_CSV}
            </button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-forest-50 border-b border-forest-100">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.SITE}</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.START_DATE}</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.END_DATE}</th>
                  <th className="px-4 py-2 text-center text-sm font-semibold">{STRINGS.STATUS}</th>
                </tr>
              </thead>
              <tbody>
                {assignmentsLoading ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-earth">{STRINGS.LOADING}...</td></tr>
                ) : assignments.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-earth">{STRINGS.NO_ASSIGNMENTS}</td></tr>
                ) : (
                  assignments.map((row) => {
                    const status = assignmentStatus(row, today)
                    return (
                      <tr key={row.id} className="border-b border-forest-50">
                        <td className="px-4 py-2 text-sm font-medium">{row.sites?.name}</td>
                        <td className="px-4 py-2 text-sm">{formatDate(row.start_date)}</td>
                        <td className="px-4 py-2 text-sm">{row.end_date ? formatDate(row.end_date) : STRINGS.ONGOING}</td>
                        <td className="px-4 py-2 text-center text-xs font-semibold uppercase">{status}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  )
}