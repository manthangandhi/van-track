import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../services/supabaseClient'
import { todayViewRefreshMs } from '../config/appConfig'
import { STRINGS } from '../utils/strings'
import { getDailyStats, getTodayPunchesByEmployee } from '../services/punchService'
import { PunchDetailModal } from '../components/PunchDetailModal'
import { formatTime, getLocalDateKey } from '../utils/helpers'
import { AppShell } from '../components/ui/AppShell'
import { IconCheck, IconFlag, PunchTypeIcon } from '../components/ui/Icons'

function PunchCell({ punch, onClick }) {
  if (!punch) {
    return <span className="text-earth">—</span>
  }

  const isFlagged = punch.status === 'flagged'
  const isRejected = punch.status === 'rejected'

  return (
    <button
      onClick={onClick}
      className={`inline-flex flex-col items-center px-2 py-1 rounded transition hover:ring-2 hover:ring-forest-300 ${
        isFlagged ? 'bg-red-50 text-red-700' : isRejected ? 'bg-forest-50 text-earth' : 'text-forest-700'
      }`}
      title={isFlagged ? punch.flag_reasons?.join(', ') : formatTime(punch.server_timestamp)}
    >
      <span className="font-semibold">
        {isFlagged ? <IconFlag className="w-4 h-4" /> : <IconCheck className="w-4 h-4" />}
      </span>
      <span className="text-xs">{formatTime(punch.server_timestamp)}</span>
    </button>
  )
}

export default function AdminTodayView() {
  const [employees, setEmployees] = useState([])
  const [punchesByEmployee, setPunchesByEmployee] = useState({})
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [selectedPunch, setSelectedPunch] = useState(null)
  const initialLoadDone = useRef(false)

  const loadTodayData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(!initialLoadDone.current)
    } else {
      setRefreshing(true)
    }

    const today = getLocalDateKey()

    const { data: empData } = await supabase
      .from('profiles')
      .select('*, sites(name)')
      .eq('role', 'employee')
      .eq('is_active', true)

    setEmployees(empData || [])

    const [statsData, punchData] = await Promise.all([
      getDailyStats(today),
      getTodayPunchesByEmployee(today),
    ])

    setStats(statsData)
    setPunchesByEmployee(punchData)
    setLastUpdated(new Date())
    initialLoadDone.current = true
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    loadTodayData()

    const channel = supabase
      .channel('admin-today-punches')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'punches' },
        () => loadTodayData(true)
      )
      .subscribe()

    const interval = setInterval(() => loadTodayData(true), todayViewRefreshMs)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [loadTodayData])

  const subtitle = lastUpdated
    ? `${refreshing ? STRINGS.REFRESHING : STRINGS.LAST_UPDATED} ${lastUpdated.toLocaleTimeString()}`
    : undefined

  return (
    <AppShell
      title={STRINGS.TODAY_VIEW}
      subtitle={subtitle}
      backTo="/admin"
      maxWidth="max-w-6xl"
      headerActions={
        <button
          type="button"
          onClick={() => loadTodayData(true)}
          disabled={refreshing}
          className="btn-primary"
        >
          {refreshing ? STRINGS.REFRESHING : STRINGS.REFRESH}
        </button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-forest-600">{stats.checkedInCount || 0}</p>
          <p className="text-sm text-earth">{STRINGS.CHECK_IN}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-forest-700">{stats.middayDoneCount || 0}</p>
          <p className="text-sm text-earth">{STRINGS.MIDDAY}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-forest-800">{stats.checkedOutCount || 0}</p>
          <p className="text-sm text-earth">{STRINGS.CHECK_OUT}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.flaggedCount || 0}</p>
          <p className="text-sm text-earth flex items-center justify-center gap-1">
            <IconFlag className="w-3.5 h-3.5" />
            {STRINGS.FLAGGED_PUNCHES}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-forest-100">
          <h2 className="display-title text-lg text-forest-900">{STRINGS.EMPLOYEES}</h2>
        </div>
        {loading ? (
          <div className="p-4 text-center">{STRINGS.LOADING}...</div>
        ) : employees.length === 0 ? (
          <div className="p-4 text-center text-earth">{STRINGS.NO_DATA}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-forest-50 border-b border-forest-100">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.EMPLOYEE}</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.SITE}</th>
                  <th className="px-4 py-2 text-center text-sm font-semibold">
                    <span className="inline-flex items-center gap-1 justify-center">
                      <PunchTypeIcon type="check_in" className="w-4 h-4" />
                      {STRINGS.CHECK_IN}
                    </span>
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold">
                    <span className="inline-flex items-center gap-1 justify-center">
                      <PunchTypeIcon type="midday" className="w-4 h-4" />
                      {STRINGS.MIDDAY}
                    </span>
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold">
                    <span className="inline-flex items-center gap-1 justify-center">
                      <PunchTypeIcon type="check_out" className="w-4 h-4" />
                      {STRINGS.CHECK_OUT}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const empPunches = punchesByEmployee[emp.id] || {}
                  const hasFlagged = Object.values(empPunches).some((p) => p.status === 'flagged')

                  return (
                    <tr
                      key={emp.id}
                      className={`border-b border-forest-50 hover:bg-forest-50/50 ${hasFlagged ? 'bg-red-50/50' : ''}`}
                    >
                      <td className="px-4 py-2 text-sm font-medium">
                        {emp.full_name}
                        {hasFlagged && (
                          <IconFlag className="w-3.5 h-3.5 ml-2 inline text-red-600" />
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-earth">{emp.sites?.name || '—'}</td>
                      <td className="px-4 py-2 text-center text-sm">
                        <PunchCell
                          punch={empPunches.check_in}
                          onClick={() => empPunches.check_in && setSelectedPunch(empPunches.check_in)}
                        />
                      </td>
                      <td className="px-4 py-2 text-center text-sm">
                        <PunchCell
                          punch={empPunches.midday}
                          onClick={() => empPunches.midday && setSelectedPunch(empPunches.midday)}
                        />
                      </td>
                      <td className="px-4 py-2 text-center text-sm">
                        <PunchCell
                          punch={empPunches.check_out}
                          onClick={() => empPunches.check_out && setSelectedPunch(empPunches.check_out)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedPunch && (
        <PunchDetailModal punch={selectedPunch} onClose={() => setSelectedPunch(null)} />
      )}
    </AppShell>
  )
}