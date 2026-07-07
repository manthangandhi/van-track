import React from 'react'
import { BrandMark } from './ui/BrandMark'
import { STRINGS } from '../utils/strings'

export default function ProfileError({ error, onSignOut }) {
  return (
    <div className="page-shell flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full text-center shadow-elevated">
        <div className="flex justify-center mb-6">
          <BrandMark size="sm" />
        </div>
        <h1 className="display-title text-xl text-red-700 mb-2">{STRINGS.SERVER_ERROR}</h1>
        <p className="text-earth mb-4">
          Could not load your profile. This is usually fixed by running the latest Supabase
          migration (<code className="text-sm bg-cream px-1 rounded">006_fix_rls_recursion.sql</code>
          ).
        </p>
        {error && (
          <p className="text-sm text-earth bg-cream rounded-xl p-3 mb-4 break-words">{error}</p>
        )}
        <button type="button" onClick={onSignOut} className="btn-primary">
          {STRINGS.LOGOUT}
        </button>
      </div>
    </div>
  )
}