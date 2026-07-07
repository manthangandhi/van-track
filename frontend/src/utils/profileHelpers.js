/**
 * Normalize face_descriptor from Postgres JSONB (array or numeric-key object).
 */
export function normalizeFaceDescriptor(value) {
  if (value == null) return null
  if (Array.isArray(value)) {
    return value.length > 0 ? value : null
  }
  if (typeof value === 'object' && typeof value.length === 'number' && value.length > 0) {
    return Array.from(value)
  }
  return null
}

export function hasEnrolledReferenceSelfie(profile) {
  if (!profile?.reference_selfie_url) return false
  const descriptor = normalizeFaceDescriptor(profile.face_descriptor)
  return Boolean(descriptor?.length)
}