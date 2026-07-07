import React, { useEffect, useState } from 'react'
import { STRINGS } from '../utils/strings'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const dismissedAt = localStorage.getItem('pwa-install-dismissed')
    if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) {
      setDismissed(true)
    }

    function handleBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  if (!deferredPrompt || dismissed) return null

  async function handleInstall() {
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    localStorage.setItem('pwa-install-dismissed', String(Date.now()))
    setDismissed(true)
    setDeferredPrompt(null)
  }

  return (
    <div className="card-flat p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-forest-200">
      <div>
        <p className="font-semibold text-forest-800">{STRINGS.INSTALL_APP_TITLE}</p>
        <p className="text-sm text-earth">{STRINGS.INSTALL_APP_HINT}</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={handleInstall} className="btn-primary text-sm py-2">
          {STRINGS.INSTALL_APP}
        </button>
        <button type="button" onClick={handleDismiss} className="btn-secondary text-sm py-2">
          {STRINGS.NOT_NOW}
        </button>
      </div>
    </div>
  )
}