import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { generateTimesheet, aggregateTimesheetByEmployee, generateCSV, generateXLSX } from '../services/timesheetService'
import { STRINGS } from '../utils/strings'
import { formatDate } from '../utils/helpers'

export default function AdminTimesheet() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [sites, setSites] = useState([])
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [selectedSites, setSelectedSites] = useState([])
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [timesheet, setTimesheet] = useState([])
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    loadFilters()
  }, [])

  async function loadFilters() {
    const { data: empData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'employee')
      .eq('is_active', true)
      .order('full_name')

    const { data: siteData } = await supabase.from('sites').select('id, name').order('name')

    setEmployees(empData || [])
    setSites(siteData || [])
  }

  async function handleGenerate() {
    setLoading(true)
    try {
      const data = await generateTimesheet(
        selectedEmployees.length > 0 ? selectedEmployees : null,
        selectedSites.length > 0 ? selectedSites : null,
        startDate,
        endDate
      )
      const aggregated = aggregateTimesheetByEmployee(data)
      setTimesheet(aggregated)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleExportCSV() {
    const csv = generateCSV(timesheet)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timesheet-${startDate}-${endDate}.csv`
    a.click()
  }

  function handleExportXLSX() {
    generateXLSX(timesheet, `timesheet-${startDate}-${endDate}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">{STRINGS.TIMESHEETS}</h1>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded"
          >
            {STRINGS.BACK}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">{STRINGS.FILTER}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{STRINGS.FROM}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{STRINGS.TO}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{STRINGS.EMPLOYEES}</label>
              <select
                multiple
                value={selectedEmployees}
                onChange={(e) => setSelectedEmployees(Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{STRINGS.SITES}</label>
              <select
                multiple
                value={selectedSites}
                onChange={(e) => setSelectedSites(Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded"
          >
            {loading ? STRINGS.LOADING : STRINGS.GENERATE}
          </button>
        </div>

        {/* Results */}
        {timesheet.length > 0 && (
          <div className="space-y-6">
            {/* Export Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleExportCSV}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded"
              >
                📥 {STRINGS.EXPORT_CSV}
              </button>
              <button
                onClick={handleExportXLSX}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded"
              >
                📥 {STRINGS.EXPORT_XLSX}
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">{STRINGS.EMPLOYEE}</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">{STRINGS.TOTAL_HOURS}</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold">Full</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold">Half</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold">Short</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold">Absent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timesheet.map((row) => (
                      <tr key={row.employeeId} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-semibold">{row.fullName}</td>
                        <td className="px-4 py-2 text-sm text-right font-bold">{row.totalHours.toFixed(1)}h</td>
                        <td className="px-4 py-2 text-center text-sm text-green-600">{row.fullDays}</td>
                        <td className="px-4 py-2 text-center text-sm text-yellow-600">{row.halfDays}</td>
                        <td className="px-4 py-2 text-center text-sm text-orange-600">{row.shortDays}</td>
                        <td className="px-4 py-2 text-center text-sm text-gray-600">{row.absentDays}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!loading && timesheet.length === 0 && (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            {STRINGS.NO_DATA}
          </div>
        )}
      </main>
    </div>
  )
}
