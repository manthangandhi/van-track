import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import EmployeeDashboard from './pages/EmployeeDashboard'
import HistoryPage from './pages/HistoryPage'
import AdminDashboard from './pages/AdminDashboard'
import AdminTodayView from './pages/AdminTodayView'
import AdminReviewQueue from './pages/AdminReviewQueue'
import AdminEmployees from './pages/AdminEmployees'
import AdminSites from './pages/AdminSites'
import AdminTimesheet from './pages/AdminTimesheet'
import AdminInsights from './pages/AdminInsights'
import AdminAssignments from './pages/AdminAssignments'
import AdminWorkforce from './pages/AdminWorkforce'
import AdminAudit from './pages/AdminAudit'
import AdminPrivacy from './pages/AdminPrivacy'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import NotFound from './pages/NotFound'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ProfileError from './components/ProfileError'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoadingScreen } from './components/ui/LoadingScreen'
import './styles/index.css'

function ProtectedRoute({ children, requiredRole = null }) {
  const { user, profile, loading, error, signOut } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (error || !profile) {
    return <ProfileError error={error} onSignOut={signOut} />
  }

  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return children
}

function HomeRoute() {
  const { user, profile, loading, error, signOut } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <LoginPage />
  }

  if (error || !profile) {
    return <ProfileError error={error} onSignOut={signOut} />
  }

  if (profile.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router
        basename={import.meta.env.BASE_URL}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />

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
            path="/admin/assignments"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminAssignments />
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
          <Route
            path="/admin/insights"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminInsights />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/workforce"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminWorkforce />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminAudit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/privacy"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPrivacy />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}