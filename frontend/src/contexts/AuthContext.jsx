import React, { createContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { STRINGS } from '../utils/strings'

function formatAuthError(err, action = 'auth') {
  const status = err?.status ?? err?.code
  const message = (err?.message || '').toLowerCase()

  if (status === 429 || message.includes('too many requests') || message.includes('rate limit')) {
    return action === 'signup' ? STRINGS.SIGNUP_RATE_LIMIT : STRINGS.SERVER_ERROR
  }

  if (
    message.includes('already registered') ||
    message.includes('already exists') ||
    message.includes('user already registered')
  ) {
    return STRINGS.SIGNUP_EMAIL_EXISTS
  }

  return err?.message || STRINGS.SERVER_ERROR
}

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [infoMessage, setInfoMessage] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)

      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
      }

      if (session?.user) {
        setLoading(true)
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setError(null)
        if (event !== 'PASSWORD_RECOVERY') {
          setRecoveryMode(false)
        }
        setLoading(false)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      setError(null)
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError
      setProfile(data)
      return data
    } catch (err) {
      setProfile(null)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  async function signUp(email, password, fullName) {
    setLoading(true)
    setError(null)
    setInfoMessage(null)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (signUpError) throw signUpError
      if (data.user && fullName?.trim()) {
        await supabase
          .from('profiles')
          .update({ full_name: fullName.trim() })
          .eq('id', data.user.id)
      }

      if (data.user && !data.session) {
        setInfoMessage(STRINGS.CONFIRM_EMAIL_SENT)
      }

      return { data, error: null, needsConfirmation: !data.session }
    } catch (err) {
      const friendly = formatAuthError(err, 'signup')
      setError(friendly)
      return { data: null, error: { ...err, message: friendly } }
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email, password) {
    setLoading(true)
    setError(null)
    setInfoMessage(null)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw signInError
      return { data, error: null }
    } catch (err) {
      const friendly = formatAuthError(err, 'signin')
      setError(friendly)
      return { data: null, error: { ...err, message: friendly } }
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword(email) {
    setLoading(true)
    setError(null)
    setInfoMessage(null)
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, '')
      const redirectTo = `${window.location.origin}${base}/reset-password`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })
      if (resetError) throw resetError
      setInfoMessage(STRINGS.RESET_EMAIL_SENT)
      return { error: null }
    } catch (err) {
      const friendly = formatAuthError(err, 'reset')
      setError(friendly)
      return { error: { ...err, message: friendly } }
    } finally {
      setLoading(false)
    }
  }

  async function updatePassword(password) {
    setLoading(true)
    setError(null)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setRecoveryMode(false)
      return { error: null }
    } catch (err) {
      const friendly = formatAuthError(err, 'update')
      setError(friendly)
      return { error: { ...err, message: friendly } }
    } finally {
      setLoading(false)
    }
  }

  async function refreshProfile() {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    if (!currentUser?.id) return null
    setLoading(true)
    return fetchProfile(currentUser.id)
  }

  async function signOut() {
    setLoading(true)
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      setUser(null)
      setProfile(null)
      setError(null)
      setInfoMessage(null)
      setRecoveryMode(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function clearMessages() {
    setError(null)
    setInfoMessage(null)
  }

  const value = {
    user,
    profile,
    loading,
    error,
    infoMessage,
    recoveryMode,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    clearMessages,
    refreshProfile,
    isAdmin: profile?.role === 'admin',
    isEmployee: profile?.role === 'employee',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}