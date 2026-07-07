import { useState, useCallback } from 'react'

export function usePermissions() {
  const [cameraPermission, setCameraPermission] = useState(null)
  const [locationPermission, setLocationPermission] = useState(null)
  const [loading, setLoading] = useState(false)

  const requestCameraPermission = useCallback(async () => {
    setLoading(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      setCameraPermission('granted')
      // Stop the stream as we just wanted to test permission
      stream.getTracks().forEach((track) => track.stop())
      setLoading(false)
      return true
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        setCameraPermission('denied')
      } else if (error.name === 'NotFoundError') {
        setCameraPermission('notfound')
      } else {
        setCameraPermission('error')
      }
      setLoading(false)
      return false
    }
  }, [])

  const requestLocationPermission = useCallback(async () => {
    setLoading(true)
    if (!navigator.geolocation) {
      setLocationPermission('notavailable')
      setLoading(false)
      return false
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationPermission('granted')
          setLoading(false)
          resolve(true)
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setLocationPermission('denied')
          } else {
            setLocationPermission('error')
          }
          setLoading(false)
          resolve(false)
        },
        { enableHighAccuracy: true, timeout: 5000 }
      )
    })
  }, [])

  return {
    cameraPermission,
    locationPermission,
    loading,
    requestCameraPermission,
    requestLocationPermission,
  }
}
