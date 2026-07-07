// General helper functions

export function formatDate(date) {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(date) {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDateTime(date) {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  return `${formatDate(date)} ${formatTime(date)}`
}

export function timeDifference(startDate, endDate) {
  if (typeof startDate === 'string') startDate = new Date(startDate)
  if (typeof endDate === 'string') endDate = new Date(endDate)

  const diffMs = endDate - startDate
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours
}

export function formatHours(hours) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${m}m`
}

export function getDateKey(date) {
  if (typeof date === 'string') date = new Date(date)
  return date.toISOString().split('T')[0]
}

export function isToday(date) {
  if (typeof date === 'string') date = new Date(date)
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export function isSameDay(date1, date2) {
  if (typeof date1 === 'string') date1 = new Date(date1)
  if (typeof date2 === 'string') date2 = new Date(date2)
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  )
}

export function addDays(date, days) {
  if (typeof date === 'string') date = new Date(date)
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function startOfDay(date) {
  if (typeof date === 'string') date = new Date(date)
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

export function endOfDay(date) {
  if (typeof date === 'string') date = new Date(date)
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

export function getDayOfWeek(date) {
  if (typeof date === 'string') date = new Date(date)
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[date.getDay()]
}
