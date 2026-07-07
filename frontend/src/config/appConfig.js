export const allowSignup = import.meta.env.VITE_ALLOW_SIGNUP === 'true'

export const appName = import.meta.env.VITE_APP_NAME || 'VanTrack'

export const errorReportUrl = import.meta.env.VITE_ERROR_REPORT_URL || ''

export const todayViewRefreshMs = Number(import.meta.env.VITE_TODAY_REFRESH_MS) || 30000

export const privacyPolicyVersion = import.meta.env.VITE_PRIVACY_POLICY_VERSION || '1.0'