export function isApprovedPunch(punch) {
  return punch?.status === 'auto_approved' || punch?.status === 'approved'
}

export function hasValidCheckIn(todayPunches) {
  return isApprovedPunch(todayPunches?.check_in)
}

export function blocksDuplicatePunch(punch) {
  return Boolean(punch && punch.status !== 'rejected')
}