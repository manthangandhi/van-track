import React from 'react'

const defaults = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function VanTrackLogo({ className = 'w-10 h-10', variant = 'full' }) {
  if (variant === 'mark') {
    return (
      <svg viewBox="0 0 40 40" className={className} aria-hidden>
        <defs>
          <linearGradient id="vt-pin" x1="8" y1="4" x2="32" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#dceee6" />
            <stop offset="1" stopColor="#faf8f5" />
          </linearGradient>
        </defs>
        <path
          d="M20 4c-1.2 0-2.2 1-2.2 2.2 0 .8.4 1.5 1 1.9L11 30.5a2.2 2.2 0 0 0 2 3.2h14a2.2 2.2 0 0 0 2-3.2L21.2 8.1c.6-.4 1-1.1 1-1.9C22.2 5 21.2 4 20 4z"
          fill="url(#vt-pin)"
        />
        <path d="M14 18h4l2-5 2 5h4" stroke="#1f5645" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 22h8" stroke="#34856a" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="20" cy="27" r="2.2" fill="#1f5645" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id="vt-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0b211b" />
          <stop offset="0.55" stopColor="#1f5645" />
          <stop offset="1" stopColor="#34856a" />
        </linearGradient>
        <linearGradient id="vt-glow" x1="12" y1="8" x2="28" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#faf8f5" />
          <stop offset="1" stopColor="#dceee6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#vt-bg)" />
      <circle cx="20" cy="21" r="11" stroke="#dceee6" strokeWidth="1" opacity="0.35" fill="none" />
      <path
        d="M20 9c-1.1 0-2 .9-2 2 0 .7.3 1.3.8 1.7L12.5 29.5a1.8 1.8 0 0 0 1.6 2.7h11.8a1.8 1.8 0 0 0 1.6-2.7L21.2 13.7c.5-.4.8-1 .8-1.7 0-1.1-.9-2-2-2z"
        fill="url(#vt-glow)"
      />
      <path d="M15 19h3.2l1.8-4.2 1.8 4.2H25" stroke="#1f5645" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 22.5h7" stroke="#276b55" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="20" cy="26.5" r="1.8" fill="#1f5645" />
    </svg>
  )
}

export function IconCheckIn({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...defaults} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
      <path d="M12 3v2" />
    </svg>
  )
}

export function IconMidday({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...defaults} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

export function IconCheckOut({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...defaults} {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconFlag({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...defaults} {...props}>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2.5 4L16 12H5" fill="currentColor" fillOpacity="0.15" />
    </svg>
  )
}

export function IconCalendar({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...defaults} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  )
}

export function IconChart({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...defaults} {...props}>
      <path d="M4 20V10M10 20V4M16 20v-6M22 20v-9" />
    </svg>
  )
}

export function IconUsers({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...defaults} {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
      <circle cx="17.5" cy="9" r="2.5" />
      <path d="M15 20c.5-2.2 2-3.5 4-3.5" />
    </svg>
  )
}

export function IconTree({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...defaults} {...props}>
      <path d="M12 3L7 12h3.5L8 19h8l-2.5-7H17L12 3z" fill="currentColor" fillOpacity="0.12" />
      <path d="M12 3L7 12h3.5L8 19h8l-2.5-7H17L12 3z" />
      <path d="M12 19v2" />
    </svg>
  )
}

export function IconClipboard({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...defaults} {...props}>
      <rect x="5" y="4" width="14" height="18" rx="2" />
      <path d="M9 4h6a2 2 0 0 1 2 2v1H7V6a2 2 0 0 1 2-2z" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  )
}

export function IconMapPin({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...defaults} {...props}>
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

export function IconCheck({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...defaults} {...props}>
      <path d="M5 12.5l4 4L19 7.5" />
    </svg>
  )
}

export function IconDownload({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...defaults} {...props}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 20h16" />
    </svg>
  )
}

export function IconFilter({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...defaults} {...props}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  )
}

export function IconInsights({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...defaults} {...props}>
      <path d="M4 20V4M20 20H4" />
      <path d="M8 16l4-5 3 3 5-7" />
    </svg>
  )
}

export function IconClock({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...defaults} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export function IconSiteMarker({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#1f5645" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="#fff" strokeWidth="1.5" />
      <path d="M12 6L9 12h2l-1 5h4l-1-5h2L12 6z" fill="#dceee6" />
    </svg>
  )
}

const PUNCH_ICONS = {
  check_in: IconCheckIn,
  midday: IconMidday,
  check_out: IconCheckOut,
}

export function PunchTypeIcon({ type, className = 'w-5 h-5' }) {
  const Comp = PUNCH_ICONS[type]
  return Comp ? <Comp className={className} /> : null
}