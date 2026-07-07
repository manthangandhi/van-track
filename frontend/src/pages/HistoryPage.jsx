import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/supabaseClient'
import { getAttendanceDays } from '../services/timesheetService'
import { STRINGS } from '../utils/strings'
import { formatDate, addDays } from '../utils/helpers'
import { TimelineView } from '../components/TimelineView'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [attendanceDays, setAttendanceDays] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [dayPunches, setDayPunches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && profile) {
      loadAttendanceHistory()
    }
  }, [user, profile])

  async function loadAttendanceHistory() {
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = addDays(new Date(endDate), -30).toISOString().split('T')[0]

    const data = await getAttendanceDays(user.id, startDate, endDate)
    setAttendanceDays(data)
    setLoading(false)
  }

  async function handleDayClick(day) {
    setSelectedDay(day)
    const { data, error } = await supabase
      .from('punches')
      .select('*')
      .eq('employee_id', user.id)
      .gte('server_timestamp', `${day.work_date}T00:00:00Z`)
      .lte('server_timestamp', `${day.work_date}T23:59:59Z`)
      .order('server_timestamp', { ascending: true })

    if (!error) {
      setDayPunches(data)
    }
  }

  const dayStatusColors = {
    full: 'bg-green-100 border-green-300',
    half: 'bg-yellow-100 border-yellow-300',
    short: 'bg-orange-100 border-orange-300',
    absent: 'bg-gray-100 border-gray-300',
    pending: 'bg-blue-100 border-blue-300',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-600">{STRINGS.HISTORY}</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded"
          >
            {STRINGS.BACK}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">{STRINGS.CALENDAR}</h2>
              {loading ? (
                <p>{STRINGS.LOADING}...</p>
              ) : attendanceDays.length === 0 ? (
                <p className="text-gray-600">{STRINGS.NO_DATA}</p>
              ) : (
                <div className="space-y-2">
                  {attendanceDays.map((day) => (
                    <button
                      key={day.work_date}
                      onClick={() => handleDayClick(day)}
                      className={`w-full text-left px-3 py-2 rounded border-2 ${dayStatusColors[day.day_status]} hover:shadow transition`}
                    >
                      <p className="font-semibold text-sm">{formatDate(day.work_date)}</p>
                      <p className="text-xs text-gray-600">{day.day_status.toUpperCase()}</p>
                      <p className="text-xs text-gray-600">
                        {(day.hours_worked || 0).toFixed(1)}h
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2">
            {selectedDay ? (
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-bold text-gray-800 mb-4">
                  {formatDate(selectedDay.work_date)}
                </h2>
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm">
                    <strong>Status:</strong> {selectedDay.day_status.toUpperCase()}
                  </p>
                  <p className="text-sm">
                    <strong>Hours Worked:</strong> {(selectedDay.hours_worked || 0).toFixed(1)}h
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">{STRINGS.PUNCHES}:</h3>
                  <TimelineView punches={dayPunches} />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">
                Select a day to view details
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
