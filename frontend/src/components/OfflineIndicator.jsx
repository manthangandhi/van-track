import React, { useEffect, useState } from 'react'
import { STRINGS } from '../utils/strings'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    window.addEventListener('online', () => setIsOnline(true))
    window.addEventListener('offline', () => setIsOnline(false))

    return () => {
      window.removeEventListener('online', () => setIsOnline(true))
      window.removeEventListener('offline', () => setIsOnline(false))
    }
  }, [])

  if (!isOnline) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-4">
        <p className="font-bold">📴 {STRINGS.OFFLINE_SAVED}</p>
      </div>
    )
  }

  return null
}
