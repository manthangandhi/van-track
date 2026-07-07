import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { STRINGS } from '../utils/strings'
import { validatePassword } from '../utils/validators'
import { AuthLayout } from '../components/ui/AuthLayout'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { updatePassword, loading, error, recoveryMode } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!recoveryMode && !success) {
      const timer = setTimeout(() => navigate('/'), 3000)
      return () => clearTimeout(timer)
    }
  }, [recoveryMode, success, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setValidationError(null)

    if (!validatePassword(password)) {
      setValidationError(STRINGS.PASSWORD_TOO_SHORT)
      return
    }

    if (password !== confirmPassword) {
      setValidationError(STRINGS.PASSWORDS_DONT_MATCH)
      return
    }

    const { error: updateError } = await updatePassword(password)
    if (!updateError) {
      setSuccess(true)
      setTimeout(() => navigate('/'), 2000)
    }
  }

  if (success) {
    return (
      <AuthLayout title={STRINGS.RESET_PASSWORD}>
        <div className="alert-success text-center">{STRINGS.PASSWORD_UPDATED}</div>
      </AuthLayout>
    )
  }

  if (!recoveryMode) {
    return (
      <AuthLayout title={STRINGS.RESET_PASSWORD}>
        <p className="text-center text-earth">{STRINGS.RESET_LINK_INVALID}</p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={STRINGS.RESET_PASSWORD} subtitle={STRINGS.RESET_PASSWORD_HINT}>
      {error && <div className="alert-error mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-field">{STRINGS.NEW_PASSWORD}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field">{STRINGS.CONFIRM_PASSWORD}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field"
          />
        </div>
        {validationError && <p className="text-red-600 text-xs">{validationError}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? STRINGS.LOADING : STRINGS.UPDATE_PASSWORD}
        </button>
      </form>
    </AuthLayout>
  )
}