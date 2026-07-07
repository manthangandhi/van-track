import { errorReportUrl } from '../config/appConfig'

export function reportError(error, context = {}) {
  const payload = {
    message: error?.message || String(error),
    stack: error?.stack,
    context,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    timestamp: new Date().toISOString(),
  }

  console.error('[VanTrack]', payload)

  if (errorReportUrl && typeof fetch !== 'undefined') {
    fetch(errorReportUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  }
}

export function initErrorReporting() {
  if (typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    reportError(event.error || new Error(event.message), { type: 'window.error' })
  })

  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, { type: 'unhandledrejection' })
  })
}