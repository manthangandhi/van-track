import { useEffect, useState, useCallback } from 'react'
import { processSyncQueue, monitorConnectivity, isOnline } from '../services/syncQueue'

export function useOfflineSync(employeeId) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setError] = useState(null)
  const [isOnlineStatus, setIsOnlineStatus] = useState(navigator.onLine)

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

  useEffect(() => {
    if (employeeId && isOnline()) {
      syncOfflineData()
    }

    const cleanup = monitorConnectivity(
      async () => {
        setIsOnlineStatus(true)
        await syncOfflineData()
      },
      () => {
        setIsOnlineStatus(false)
      }
    )

    return cleanup
  }, [employeeId, syncOfflineData])

  return {
    isOnline: isOnlineStatus,
    isSyncing,
    syncError,
    syncOfflineData,
  }
}