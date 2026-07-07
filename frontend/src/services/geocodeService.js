/**
 * Location search via Photon (OpenStreetMap-backed, CORS-friendly).
 */

export async function searchLocations(query, { limit = 8 } = {}) {
  const trimmed = query?.trim()
  if (!trimmed || trimmed.length < 2) {
    return []
  }

  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', trimmed)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('lang', 'en')

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error('Location search failed')
  }

  const data = await response.json()
  const features = Array.isArray(data?.features) ? data.features : []

  return features
    .map((feature) => {
      const [longitude, latitude] = feature.geometry?.coordinates || []
      if (latitude == null || longitude == null) return null

      const props = feature.properties || {}
      const label =
        props.name && props.city
          ? `${props.name}, ${props.city}`
          : props.name || props.street || props.city || props.state || trimmed

      const detail = [props.city, props.state, props.country].filter(Boolean).join(', ')

      return {
        id: `${latitude}-${longitude}-${label}`,
        label,
        detail: detail && detail !== label ? detail : null,
        latitude: Number(latitude),
        longitude: Number(longitude),
      }
    })
    .filter(Boolean)
}