import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { STRINGS } from './utils/strings'
import LoginPage from './pages/LoginPage'
import EmployeeDashboard from './pages/EmployeeDashboard'
import HistoryPage from './pages/HistoryPage'
import AdminDashboard from './pages/AdminDashboard'
import AdminTodayView from './pages/AdminTodayView'
import AdminReviewQueue from './pages/AdminReviewQueue'
import AdminEmployees from './pages/AdminEmployees'
import AdminSites from './pages/AdminSites'
import AdminTimesheet from './pages/AdminTimesheet'
import NotFound from './pages/NotFound'
import './styles/index.css'

function ProtectedRoute({ children, requiredRole = null }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">{STRINGS.LOADING}...</div>
  }

  if (!user || !profile) {
    return <Navigate to="/" replace />
  }

  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              profile?.role === 'admin' ? (
                <Navigate to="/admin" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <LoginPage />
            )
          }
        />

        {/* Employee Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="employee">
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute requiredRole="employee">
              <HistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/today"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminTodayView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/review"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminReviewQueue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/employees"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminEmployees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sites"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminSites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/timesheet"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminTimesheet />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}
