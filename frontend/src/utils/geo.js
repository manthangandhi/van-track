// Geolocation utilities: Haversine, distance calculations

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000 // Earth's radius in meters
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg) {
  return deg * (Math.PI / 180)
}

/**
 * Check if a point is within a geofence (circle)
 * @param {number} lat - Point latitude
 * @param {number} lon - Point longitude
 * @param {number} centerLat - Geofence center latitude
 * @param {number} centerLon - Geofence center longitude
 * @param {number} radiusMeters - Geofence radius in meters
 * @returns {boolean} True if inside, false otherwise
 */
export function isWithinGeofence(lat, lon, centerLat, centerLon, radiusMeters) {
  const distance = haversineDistance(lat, lon, centerLat, centerLon)
  return distance <= radiusMeters
}

/**
 * Format coordinates for display
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {string} Formatted coordinates
 */
export function formatCoordinates(lat, lon) {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
}

/**
 * Get compass bearing between two points
 * @param {number} lat1 - Start latitude
 * @param {number} lon1 - Start longitude
 * @param {number} lat2 - End latitude
 * @param {number} lon2 - End longitude
 * @returns {number} Bearing in degrees (0-360)
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = toRad(lon2 - lon1)
  const y = Math.sin(dLon) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon)
  const bearing = Math.atan2(y, x)
  return (toDeg(bearing) + 360) % 360
}

function toDeg(rad) {
  return rad * (180 / Math.PI)
}
