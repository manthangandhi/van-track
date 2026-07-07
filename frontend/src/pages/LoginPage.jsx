import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { STRINGS } from '../utils/strings'
import { validateEmail, validatePassword } from '../utils/validators'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn, signUp, loading, error } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [validationErrors, setValidationErrors] = useState({})

  async function handleSubmit(e) {
    e.preventDefault()
    setValidationErrors({})

    // Validate
    const errors = {}
    if (!validateEmail(email)) errors.email = STRINGS.INVALID_EMAIL
    if (!validatePassword(password)) errors.password = STRINGS.PASSWORD
    if (isSignUp && !fullName.trim()) errors.fullName = STRINGS.REQUIRED

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    if (isSignUp) {
      const { error } = await signUp(email, password, fullName)
      if (!error) {
        navigate('/dashboard')
      }
    } else {
      const { error } = await signIn(email, password)
      if (!error) {
        navigate('/dashboard')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
        <h1 className="text-3xl font-bold text-center text-green-600 mb-2">{STRINGS.APP_NAME}</h1>
        <p className="text-center text-gray-600 mb-6">{STRINGS.APP_SUBTITLE}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  validationErrors.fullName ? 'border-red-500' : 'border-gray-300 focus:ring-green-500'
                }`}
                placeholder="Your Name"
              />
              {validationErrors.fullName && (
                <p className="text-red-600 text-xs mt-1">{validationErrors.fullName}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{STRINGS.EMAIL}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                validationErrors.email ? 'border-red-500' : 'border-gray-300 focus:ring-green-500'
              }`}
              placeholder="you@example.com"
            />
            {validationErrors.email && (
              <p className="text-red-600 text-xs mt-1">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {STRINGS.PASSWORD}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                validationErrors.password ? 'border-red-500' : 'border-gray-300 focus:ring-green-500'
              }`}
              placeholder="••••••••"
            />
            {validationErrors.password && (
              <p className="text-red-600 text-xs mt-1">{validationErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-2 rounded-lg transition"
          >
            {loading ? STRINGS.LOADING : isSignUp ? STRINGS.SIGN_UP : STRINGS.LOGIN}
          </button>
        </form>

        <hr className="my-6" />

        <button
          onClick={() => {
            setIsSignUp(!isSignUp)
            setValidationErrors({})
          }}
          className="w-full text-green-600 hover:text-green-700 font-semibold text-sm"
        >
          {isSignUp ? `Have account? ${STRINGS.LOGIN}` : `New here? ${STRINGS.SIGN_UP}`}
        </button>
      </div>
    </div>
  )
}
