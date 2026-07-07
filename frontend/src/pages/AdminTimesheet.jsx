import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'
import {
  generateTimesheet,
  aggregateTimesheetByEmployee,
  summarizeEmployeeAttendance,
  generateCSV,
  generateXLSX,
} from '../services/timesheetService'
import { STRINGS } from '../utils/strings'
import { formatDate, addDays } from '../utils/helpers'
import { TimelineView } from '../components/TimelineView'
import { AppShell } from '../components/ui/AppShell'
import { IconDownload, IconFilter } from '../components/ui/Icons'

// Simple chevron - add to Icons or inline
function Chevron({ open }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const DATE_PRESETS = [
  { id: '7d', label: '7d', days: 7 },
  { id: '30d', label: '30d', days: 30 },
  { id: '90d', label: '90d', days: 90 },
]

const STATUS_DOT = {
  full: 'bg-forest-500',
  half: 'bg-amber-500',
  short: 'bg-orange-500',
  absent: 'bg-forest-200',
  pending: 'bg-sky-400',
}

export default function AdminTimesheet() {
  const [sites, setSites] = useState([])
  const [startDate, setStartDate] = useState(addDays(new Date(), -30).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [activePreset, setActivePreset] = useState('30d')
  const [selectedSite, setSelectedSite] = useState('')
  const [search, setSearch] = useState('')
  const [rawRecords, setRawRecords] = useState([])
  const [aggregated, setAggregated] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [dayPunches, setDayPunches] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('sites').select('id, name').order('name').then(({ data }) => setSites(data || []))
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    const siteIds = selectedSite ? [selectedSite] : null
    const data = await generateTimesheet(null, siteIds, startDate, endDate)
    setRawRecords(data)
    setAggregated(aggregateTimesheetByEmployee(data))
    setExpandedId(null)
    setSelectedDay(null)
    setDayPunches([])
    setLoading(false)
  }, [startDate, endDate, selectedSite])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return aggregated
    return aggregated.filter((r) => r.fullName?.toLowerCase().includes(q))
  }, [aggregated, search])

  const totals = useMemo(() => summarizeEmployeeAttendance(rawRecords), [rawRecords])

  function applyPreset(preset) {
    setActivePreset(preset.id)
    const end = new Date().toISOString().split('T')[0]
    setEndDate(end)
    setStartDate(addDays(new Date(end), -preset.days).toISOString().split('T')[0])
  }

  async function handleDayClick(day, employeeId) {
    setSelectedDay(day)
    const { data } = await supabase
      .from('punches')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('server_timestamp', `${day.work_date}T00:00:00Z`)
      .lte('server_timestamp', `${day.work_date}T23:59:59Z`)
      .order('server_timestamp', { ascending: true })
    setDayPunches(data || [])
  }

  const employeeDays = useMemo(() => {
    if (!expandedId) return []
    return rawRecords
      .filter((r) => r.employee_id === expandedId)
      .sort((a, b) => new Date(b.work_date) - new Date(a.work_date))
  }, [rawRecords, expandedId])

  const expandedEmployee = aggregated.find((r) => r.employeeId === expandedId)

  return (
    <AppShell title={STRINGS.TIMESHEETS} backTo="/admin" maxWidth="max-w-7xl">
      <p className="text-sm text-earth mb-4 -mt-2">{STRINGS.TIMESHEET_PAGE_HINT}</p>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4 p-3 rounded-xl bg-forest-900 text-white">
        <div className="flex items-center gap-2 shrink-0">
          <IconFilter className="w-4 h-4 text-forest-200" />
          <span className="text-sm font-medium">Period</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className={`px-3 py-1 rounded-md text-xs font-semibold ${
                activePreset === p.id ? 'bg-white text-forest-900' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setActivePreset('custom') }}
          className="input-field py-1.5 text-sm bg-white/10 border-white/20 text-white max-w-[9rem]"
        />
        <span className="text-forest-300 hidden sm:inline">—</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setActivePreset('custom') }}
          className="input-field py-1.5 text-sm bg-white/10 border-white/20 text-white max-w-[9rem]"
        />
        <select
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value)}
          className="input-field py-1.5 text-sm bg-white/10 border-white/20 text-white lg:ml-auto max-w-[12rem]"
        >
          <option value="" className="text-forest-900">{STRINGS.ALL_LOCATIONS}</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id} className="text-forest-900">{s.name}</option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={STRINGS.SEARCH_EMPLOYEES}
          className="input-field py-1.5 text-sm bg-white/10 border-white/20 text-white placeholder:text-forest-300 max-w-[14rem]"
        />
        <div className="flex gap-2 lg:ml-0">
          <button type="button" onClick={() => generateXLSX(aggregated, `timesheet-${startDate}-${endDate}.xlsx`)} disabled={!aggregated.length} className="px-3 py-1.5 rounded-md bg-white text-forest-900 text-xs font-semibold flex items-center gap-1 disabled:opacity-40">
            <IconDownload className="w-3.5 h-3.5" />
            XLSX
          </button>
          <button type="button" onClick={() => { const csv = generateCSV(aggregated); const b = new Blob([csv], { type: 'text/csv' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `timesheet-${startDate}-${endDate}.csv`; a.click() }} disabled={!aggregated.length} className="px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-xs font-semibold flex items-center gap-1 disabled:opacity-40">
            <IconDownload className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { label: STRINGS.TOTAL_HOURS, value: `${totals.totalHours.toFixed(0)}h`, cls: 'bg-forest-900 text-white' },
          { label: STRINGS.FULL_DAY, value: totals.fullDays, cls: 'bg-forest-100 text-forest-800' },
          { label: STRINGS.HALF_DAY, value: totals.halfDays, cls: 'bg-amber-100 text-amber-800' },
          { label: STRINGS.SHORT_DAY, value: totals.shortDays, cls: 'bg-orange-100 text-orange-800' },
          { label: STRINGS.ABSENT, value: totals.absentDays, cls: 'bg-forest-50 text-earth' },
          { label: STRINGS.EMPLOYEES, value: filteredRows.length, cls: 'border border-forest-200 text-forest-800' },
        ].map((pill) => (
          <span key={pill.label} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${pill.cls}`}>
            <span className="text-xs opacity-80">{pill.label}</span>
            <span className="font-bold">{pill.value}</span>
          </span>
        ))}
      </div>

      {/* Payroll ledger table */}
      <div className="rounded-xl border border-forest-100 bg-white overflow-hidden shadow-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-forest-50 border-b border-forest-100 text-left">
              <th className="w-8 px-3 py-2" />
              <th className="px-3 py-2 font-semibold text-forest-900">{STRINGS.EMPLOYEE}</th>
              <th className="px-3 py-2 font-semibold text-forest-900 text-right">{STRINGS.TOTAL_HOURS}</th>
              <th className="px-3 py-2 font-semibold text-center text-forest-700">Full</th>
              <th className="px-3 py-2 font-semibold text-center text-amber-700">Half</th>
              <th className="px-3 py-2 font-semibold text-center text-orange-700">Short</th>
              <th className="px-3 py-2 font-semibold text-center text-earth">Absent</th>
              <th className="px-3 py-2 font-semibold text-center text-earth">No Mid</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-earth">{STRINGS.LOADING}...</td></tr>
            ) : filteredRows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-earth">{STRINGS.NO_DATA}</td></tr>
            ) : (
              filteredRows.map((row) => {
                const isOpen = expandedId === row.employeeId
                return (
                  <React.Fragment key={row.employeeId}>
                    <tr
                      className={`border-b border-forest-50 cursor-pointer transition ${isOpen ? 'bg-forest-50' : 'hover:bg-forest-50/50'}`}
                      onClick={() => {
                        setExpandedId(isOpen ? null : row.employeeId)
                        setSelectedDay(null)
                        setDayPunches([])
                      }}
                    >
                      <td className="px-3 py-2.5 text-forest-400">
                        <Chevron open={isOpen} />
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-forest-900">{row.fullName}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-forest-800">{row.totalHours.toFixed(1)}h</td>
                      <td className="px-3 py-2.5 text-center text-forest-600">{row.fullDays}</td>
                      <td className="px-3 py-2.5 text-center text-amber-600">{row.halfDays}</td>
                      <td className="px-3 py-2.5 text-center text-orange-600">{row.shortDays}</td>
                      <td className="px-3 py-2.5 text-center text-earth">{row.absentDays}</td>
                      <td className="px-3 py-2.5 text-center text-earth">{row.missingMiddayDays || 0}</td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-cream border-b border-forest-100">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-earth mb-2">
                                Daily log — {expandedEmployee?.fullName}
                              </p>
                              <div className="max-h-56 overflow-y-auto rounded-lg border border-forest-100 bg-white">
                                <table className="w-full text-xs">
                                  <thead className="bg-forest-50 sticky top-0">
                                    <tr>
                                      <th className="px-3 py-1.5 text-left">Date</th>
                                      <th className="px-3 py-1.5 text-center">Status</th>
                                      <th className="px-3 py-1.5 text-right">Hours</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {employeeDays.map((day) => (
                                      <tr
                                        key={day.work_date}
                                        onClick={(e) => { e.stopPropagation(); handleDayClick(day, row.employeeId) }}
                                        className={`border-t border-forest-50 cursor-pointer hover:bg-forest-50/60 ${selectedDay?.work_date === day.work_date ? 'bg-forest-100' : ''}`}
                                      >
                                        <td className="px-3 py-2">{formatDate(day.work_date)}</td>
                                        <td className="px-3 py-2 text-center">
                                          <span className="inline-flex items-center gap-1.5 capitalize">
                                            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[day.day_status] || STATUS_DOT.pending}`} />
                                            {day.day_status}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium">{(day.hours_worked || 0).toFixed(1)}h</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            <div className="rounded-lg border border-forest-100 bg-white p-3 min-h-[12rem]">
                              {selectedDay ? (
                                <>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-earth mb-2">
                                    Punches — {formatDate(selectedDay.work_date)}
                                  </p>
                                  <TimelineView punches={dayPunches} />
                                </>
                              ) : (
                                <p className="text-earth text-xs text-center py-10">{STRINGS.SELECT_DAY_HINT}</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}