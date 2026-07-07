import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { getAttendanceInsights } from '../services/analyticsService'
import { STRINGS } from '../utils/strings'
import { formatDate } from '../utils/helpers'
import { AppShell } from '../components/ui/AppShell'
import { IconInsights, IconMapPin } from '../components/ui/Icons'

function BarChart({ items, valueKey, labelKey, maxBars = 14 }) {
  const slice = items.slice(-maxBars)
  const max = Math.max(...slice.map((i) => i[valueKey]), 1)

  return (
    <div className="flex items-end gap-1.5 h-40">
      {slice.map((item) => {
        const height = Math.max(8, (item[valueKey] / max) * 100)
        return (
          <div key={item[labelKey]} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-forest-700 to-forest-500 transition-all"
              style={{ height: `${height}%` }}
              title={`${item[labelKey]}: ${item[valueKey].toFixed(1)}h`}
            />
            <span className="text-[10px] text-earth truncate w-full text-center">
              {String(item[labelKey]).slice(5)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminInsights() {
  const [sites, setSites] = useState([])
  const [selectedSite, setSelectedSite] = useState('')
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    supabase.from('sites').select('id, name').order('name').then(({ data }) => setSites(data || []))
  }, [])

  useEffect(() => {
    loadInsights()
  }, [])

  async function loadInsights() {
    setLoading(true)
    setLoadError(null)
    const data = await getAttendanceInsights(startDate, endDate, selectedSite || null)
    if (data.error) {
      setLoadError(data.error)
      setInsights(null)
    } else {
      setInsights(data)
    }
    setLoading(false)
  }

  const totals = insights?.totals
  const hasTotals = totals && typeof totals.totalHours === 'number'

  return (
    <AppShell title={STRINGS.INSIGHTS} backTo="/admin" maxWidth="max-w-6xl">
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <IconInsights className="w-5 h-5 text-forest-600" />
          <h2 className="display-title text-lg text-forest-900">{STRINGS.FILTER}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label-field">{STRINGS.FROM}</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label-field">{STRINGS.TO}</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label-field flex items-center gap-1.5">
              <IconMapPin className="w-3.5 h-3.5" />
              {STRINGS.SITE}
            </label>
            <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} className="input-field">
              <option value="">{STRINGS.ALL_LOCATIONS}</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={loadInsights} disabled={loading} className="btn-primary w-full">
              {loading ? STRINGS.LOADING : STRINGS.GENERATE}
            </button>
          </div>
        </div>
      </div>

      {loadError && <div className="alert-error mb-4">{loadError}</div>}

      {hasTotals && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-forest-700">{totals.totalHours.toFixed(0)}h</p>
            <p className="text-xs text-earth">{STRINGS.TOTAL_HOURS}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-forest-600">{totals.fullDays}</p>
            <p className="text-xs text-earth">{STRINGS.FULL_DAY}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{totals.halfDays}</p>
            <p className="text-xs text-earth">{STRINGS.HALF_DAY}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{totals.shortDays}</p>
            <p className="text-xs text-earth">{STRINGS.SHORT_DAY}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-earth">{totals.absentDays}</p>
            <p className="text-xs text-earth">{STRINGS.ABSENT}</p>
          </div>
        </div>
      )}

      {insights && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="display-title text-base text-forest-900 mb-4">{STRINGS.DAILY_HOURS_TREND}</h3>
            {insights.byDay.length === 0 ? (
              <p className="text-earth">{STRINGS.NO_DATA}</p>
            ) : (
              <BarChart items={insights.byDay} valueKey="totalHours" labelKey="date" />
            )}
          </div>

          <div className="card p-5">
            <h3 className="display-title text-base text-forest-900 mb-4">{STRINGS.HOURS_BY_SITE}</h3>
            {insights.bySite.length === 0 ? (
              <p className="text-earth">{STRINGS.NO_DATA}</p>
            ) : (
              <div className="space-y-3">
                {insights.bySite.map((site) => {
                  const maxHours = insights.bySite[0]?.totalHours || 1
                  const pct = (site.totalHours / maxHours) * 100
                  return (
                    <div key={site.siteName}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-forest-900">{site.siteName}</span>
                        <span className="text-earth">{site.totalHours.toFixed(1)}h · {site.employeeCount} staff</span>
                      </div>
                      <div className="h-2 bg-forest-50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-forest-600 to-forest-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card overflow-hidden lg:col-span-2">
            <div className="p-4 border-b border-forest-100">
              <h3 className="display-title text-base text-forest-900">{STRINGS.EMPLOYEE_LEADERBOARD}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-forest-50 border-b border-forest-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.EMPLOYEE}</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.SITE}</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">{STRINGS.TOTAL_HOURS}</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">{STRINGS.FULL_DAY}</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">{STRINGS.ABSENT}</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">{STRINGS.MISSING_MIDDAY}</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.byEmployee.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-earth">
                        {STRINGS.NO_DATA}
                      </td>
                    </tr>
                  ) : (
                    insights.byEmployee.slice(0, 20).map((emp, idx) => (
                      <tr key={emp.employeeId} className="border-b border-forest-50 hover:bg-forest-50/50">
                        <td className="px-4 py-2 text-sm font-medium">
                          <span className="text-earth mr-2">#{idx + 1}</span>
                          {emp.fullName}
                        </td>
                        <td className="px-4 py-2 text-sm text-earth">{emp.siteName}</td>
                        <td className="px-4 py-2 text-sm text-right font-bold text-forest-700">
                          {emp.totalHours.toFixed(1)}h
                        </td>
                        <td className="px-4 py-2 text-center text-sm text-forest-600">{emp.fullDays}</td>
                        <td className="px-4 py-2 text-center text-sm text-earth">{emp.absentDays}</td>
                        <td className="px-4 py-2 text-center text-sm text-amber-600">{emp.missingMidday}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-hidden lg:col-span-2">
            <div className="p-4 border-b border-forest-100">
              <h3 className="display-title text-base text-forest-900">{STRINGS.DAILY_BREAKDOWN}</h3>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full">
                <thead className="bg-forest-50 border-b border-forest-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.DATE_RANGE}</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">{STRINGS.TOTAL_HOURS}</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">{STRINGS.PRESENT}</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">{STRINGS.ABSENT}</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.byDay.map((day) => (
                    <tr key={day.date} className="border-b border-forest-50">
                      <td className="px-4 py-2 text-sm">{formatDate(day.date)}</td>
                      <td className="px-4 py-2 text-sm text-right font-medium">{day.totalHours.toFixed(1)}h</td>
                      <td className="px-4 py-2 text-center text-sm text-forest-600">{day.present}</td>
                      <td className="px-4 py-2 text-center text-sm text-earth">{day.absent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}