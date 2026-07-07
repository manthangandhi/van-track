import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { STRINGS } from '../utils/strings'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { signOut, profile } = useAuth()

  const adminOptions = [
    {
      title: STRINGS.TODAY_VIEW,
      icon: '📊',
      path: '/admin/today',
      description: 'View today attendance',
    },
    {
      title: STRINGS.REVIEW_QUEUE,
      icon: '🚩',
      path: '/admin/review',
      description: 'Review flagged punches',
    },
    {
      title: STRINGS.EMPLOYEES,
      icon: '👥',
      path: '/admin/employees',
      description: 'Manage employees',
    },
    {
      title: STRINGS.SITES,
      icon: '🌳',
      path: '/admin/sites',
      description: 'Manage sites',
    },
    {
      title: STRINGS.TIMESHEETS,
      icon: '📋',
      path: '/admin/timesheet',
      description: 'Generate & export',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-green-600">{STRINGS.ADMIN_DASHBOARD}</h1>
            <p className="text-sm text-gray-600">{profile?.full_name}</p>
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded"
          >
            {STRINGS.LOGOUT}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {adminOptions.map((option) => (
            <button
              key={option.path}
              onClick={() => navigate(option.path)}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 text-center"
            >
              <div className="text-4xl mb-3">{option.icon}</div>
              <h3 className="text-lg font-bold text-gray-800">{option.title}</h3>
              <p className="text-sm text-gray-600">{option.description}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
