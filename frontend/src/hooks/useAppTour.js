import { useState, useEffect, useCallback } from 'react'

const TOUR_VERSION = 'v1'

function storageKey(userId, role) {
  return `vantrack_tour_${TOUR_VERSION}_${role}_${userId}`
}

export function useAppTour(userId, role) {
  const [isOpen, setIsOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (!userId || !role) return undefined

    const completed = localStorage.getItem(storageKey(userId, role))
    if (!completed) {
      const timer = setTimeout(() => setIsOpen(true), 500)
      return () => clearTimeout(timer)
    }

    return undefined
  }, [userId, role])

  const completeTour = useCallback(() => {
    if (userId && role) {
      localStorage.setItem(storageKey(userId, role), String(Date.now()))
    }
    setIsOpen(false)
    setStepIndex(0)
  }, [userId, role])

  const skipTour = useCallback(() => {
    completeTour()
  }, [completeTour])

  const replayTour = useCallback(() => {
    if (userId && role) {
      localStorage.removeItem(storageKey(userId, role))
    }
    setStepIndex(0)
    setIsOpen(true)
  }, [userId, role])

  const goNext = useCallback(
    (totalSteps) => {
      if (stepIndex >= totalSteps - 1) {
        completeTour()
      } else {
        setStepIndex((i) => i + 1)
      }
    },
    [stepIndex, completeTour]
  )

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  return {
    isOpen,
    stepIndex,
    setStepIndex,
    completeTour,
    skipTour,
    replayTour,
    goNext,
    goBack,
  }
}