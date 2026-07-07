import { useEffect, useState, useCallback } from 'react'
import { processSyncQueue, monitorConnectivity, isOnline } from '../services/syncQueue'

export function useOfflineSync(employeeId) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setError] = useState(null)
  const [isOnlineStatus, setIsOnlineStatus] = useState(navigator.onLine)

  useEffect(() => {
    // Monitor connectivity changes
    const cleanup = monitorConnectivity(
      async () => {
        // When back online
        setIsOnlineStatus(true)
        await syncOfflineData()
      },
      () => {
        // When offline
        setIsOnlineStatus(false)
      }
    )

    return cleanup
  }, [employeeId])

  const syncOfflineData = useCallback(async () => {
    if (!isOnline() || !employeeId) return

    setIsSyncing(true)
    setError(null)

    try {
      const result = await processSyncQueue(employeeId)
      if (result.failed > 0) {
        setError(`Synced ${result.synced} punches, ${result.failed} failed`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSyncing(false)
    }
  }, [employeeId])

  return {
    isOnline: isOnlineStatus,
    isSyncing,
    syncError,
    syncOfflineData,
  }
}
