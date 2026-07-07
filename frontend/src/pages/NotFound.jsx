import React from 'react'
import { useNavigate } from 'react-router-dom'
import { STRINGS } from '../utils/strings'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="page-shell flex items-center justify-center p-4">
      <div className="card p-8 sm:p-12 max-w-md text-center shadow-elevated">
        <h1 className="display-title text-6xl text-forest-900 mb-4">404</h1>
        <p className="text-xl text-earth mb-6">{STRINGS.NOT_FOUND}</p>
        <button type="button" onClick={() => navigate('/')} className="btn-primary">
          {STRINGS.HOME}
        </button>
      </div>
    </div>
  )
}