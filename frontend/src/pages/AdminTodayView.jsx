import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { STRINGS } from '../utils/strings'
import { getDailyStats } from '../services/punchService'

export default function AdminTodayView() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTodayData()
  }, [])

  async function loadTodayData() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    // Get all active employees with their site info
    const { data: empData } = await supabase
      .from('profiles')
      .select('*, sites(name)')
      .eq('role', 'employee')
      .eq('is_active', true)

    setEmployees(empData || [])

    // Get today's stats
    const statsData = await getDailyStats(today)
    setStats(statsData)

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">{STRINGS.TODAY_VIEW}</h1>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded"
          >
            {STRINGS.BACK}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.checkedInCount || 0}</p>
            <p className="text-sm text-gray-600">{STRINGS.CHECK_IN}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.middayDoneCount || 0}</p>
            <p className="text-sm text-gray-600">{STRINGS.MIDDAY}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.checkedOutCount || 0}</p>
            <p className="text-sm text-gray-600">{STRINGS.CHECK_OUT}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.flaggedCount || 0}</p>
            <p className="text-sm text-gray-600">🚩 {STRINGS.FLAGGED_PUNCHES}</p>
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold text-gray-800">{STRINGS.EMPLOYEES}</h2>
          </div>
          {loading ? (
            <div className="p-4 text-center">{STRINGS.LOADING}...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.EMPLOYEE}</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.SITE}</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">✓ {STRINGS.CHECK_IN}</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">☀️ {STRINGS.MIDDAY}</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">🔒 {STRINGS.CHECK_OUT}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{emp.full_name}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{emp.sites?.name || '—'}</td>
                      <td className="px-4 py-2 text-center text-sm">—</td>
                      <td className="px-4 py-2 text-center text-sm">—</td>
                      <td className="px-4 py-2 text-center text-sm">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
