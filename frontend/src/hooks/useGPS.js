import { useEffect, useState, useCallback } from 'react'

export function useGPS() {
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const requestLocation = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      setLoading(false)
      return null
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            timestamp: position.timestamp,
          }
          setLocation(coords)
          setLoading(false)
          resolve(coords)
        },
        (error) => {
          let errorMsg = 'Failed to get location'
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = 'Permission denied. Please enable location access.'
              break
            case error.POSITION_UNAVAILABLE:
              errorMsg = 'Location is unavailable.'
              break
            case error.TIMEOUT:
              errorMsg = 'Request timed out.'
              break
            default:
              errorMsg = error.message
          }
          setError(errorMsg)
          setLoading(false)
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    })
  }, [])

  return {
    location,
    loading,
    error,
    requestLocation,
  }
}
