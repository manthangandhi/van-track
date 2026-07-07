import React, { useEffect, useState } from 'react'
import { getSyncQueueCount } from '../services/offlineStore'
import { STRINGS } from '../utils/strings'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function refreshQueue() {
      try {
        const count = await getSyncQueueCount()
        if (active) setPendingCount(count)
      } catch {
        if (active) setPendingCount(0)
      }
    }

    refreshQueue()
    const interval = setInterval(refreshQueue, 5000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [isOnline])

  if (isOnline && pendingCount === 0) {
    return null
  }

  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 mb-4">
      <p className="font-semibold text-sm">
        {!isOnline
          ? pendingCount > 0
            ? STRINGS.OFFLINE_SAVED
            : STRINGS.OFFLINE_MODE
          : `${STRINGS.SYNCING_PENDING} (${pendingCount})`}
      </p>
    </div>
  )
}