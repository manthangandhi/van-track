import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { allowSignup } from '../config/appConfig'
import { STRINGS } from '../utils/strings'
import { validateEmail, validatePassword } from '../utils/validators'
import { AuthLayout } from '../components/ui/AuthLayout'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn, signUp, resetPassword, loading, error, infoMessage, clearMessages } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [validationErrors, setValidationErrors] = useState({})

  async function handleSubmit(e) {
    e.preventDefault()
    clearMessages()
    setValidationErrors({})

    const errors = {}
    if (!validateEmail(email)) errors.email = STRINGS.INVALID_EMAIL
    if (!validatePassword(password)) errors.password = STRINGS.PASSWORD_TOO_SHORT
    if (isSignUp && !fullName.trim()) errors.fullName = STRINGS.REQUIRED

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    if (isSignUp) {
      const { error: signUpError, needsConfirmation } = await signUp(email, password, fullName)
      if (!signUpError && !needsConfirmation) navigate('/')
    } else {
      const { error: signInError } = await signIn(email, password)
      if (!signInError) navigate('/')
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault()
    clearMessages()
    setValidationErrors({})

    if (!validateEmail(email)) {
      setValidationErrors({ email: STRINGS.INVALID_EMAIL })
      return
    }

    const { error: resetError } = await resetPassword(email)
    if (!resetError) {
      setShowForgot(false)
    }
  }

  if (showForgot) {
    return (
      <AuthLayout title={STRINGS.FORGOT_PASSWORD} subtitle={STRINGS.FORGOT_PASSWORD_HINT}>
        {error && <div className="alert-error mb-4">{error}</div>}
        {infoMessage && <div className="alert-success mb-4">{infoMessage}</div>}

        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="label-field">{STRINGS.EMAIL}</label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`input-field ${validationErrors.email ? 'border-red-400' : ''}`}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {validationErrors.email && (
              <p className="text-red-600 text-xs mt-1">{validationErrors.email}</p>
            )}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? STRINGS.LOADING : STRINGS.SEND_RESET_LINK}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setShowForgot(false)
            clearMessages()
          }}
          className="btn-ghost w-full mt-4 text-sm"
        >
          {STRINGS.BACK_TO_LOGIN}
        </button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={isSignUp ? STRINGS.SIGN_UP : STRINGS.LOGIN}
      subtitle={STRINGS.APP_SUBTITLE}
    >
      {error && <div className="alert-error mb-4">{error}</div>}
      {infoMessage && <div className="alert-success mb-4">{infoMessage}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div>
            <label htmlFor="signup-full-name" className="label-field">{STRINGS.FULL_NAME}</label>
            <input
              id="signup-full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`input-field ${validationErrors.fullName ? 'border-red-400' : ''}`}
              placeholder="Your Name"
              autoComplete="name"
            />
            {validationErrors.fullName && (
              <p className="text-red-600 text-xs mt-1">{validationErrors.fullName}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="login-email" className="label-field">{STRINGS.EMAIL}</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`input-field ${validationErrors.email ? 'border-red-400' : ''}`}
            placeholder="you@example.com"
            autoComplete="email"
          />
          {validationErrors.email && (
            <p className="text-red-600 text-xs mt-1">{validationErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="login-password" className="label-field">{STRINGS.PASSWORD}</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`input-field ${validationErrors.password ? 'border-red-400' : ''}`}
            placeholder="••••••••"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />
          {validationErrors.password && (
            <p className="text-red-600 text-xs mt-1">{validationErrors.password}</p>
          )}
        </div>

        {!isSignUp && (
          <div className="text-right">
            <button
              type="button"
              onClick={() => {
                clearMessages()
                setShowForgot(true)
              }}
              className="text-sm text-forest-600 hover:text-forest-800 font-semibold"
            >
              {STRINGS.FORGOT_PASSWORD}
            </button>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? STRINGS.LOADING : isSignUp ? STRINGS.SIGN_UP : STRINGS.LOGIN}
        </button>
      </form>

      {allowSignup ? (
        <>
          <div className="my-6 border-t border-forest-100" />
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setValidationErrors({})
              clearMessages()
            }}
            className="btn-ghost w-full text-sm"
          >
            {isSignUp ? `Have account? ${STRINGS.LOGIN}` : `New here? ${STRINGS.SIGN_UP}`}
          </button>
        </>
      ) : (
        <p className="mt-6 text-center text-sm text-earth">{STRINGS.ADMIN_CREATES_ACCOUNTS}</p>
      )}

      <p className="mt-4 text-center text-xs text-earth">
        <Link to="/privacy" className="text-forest-600 font-semibold underline">
          {STRINGS.PRIVACY_POLICY}
        </Link>
      </p>
    </AuthLayout>
  )
}