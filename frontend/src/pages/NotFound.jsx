import React from 'react'
import { useNavigate } from 'react-router-dom'
import { STRINGS } from '../utils/strings'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-6">{STRINGS.NOT_FOUND}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded"
        >
          {STRINGS.HOME}
        </button>
      </div>
    </div>
  )
}
