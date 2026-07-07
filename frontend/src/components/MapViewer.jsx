import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { siteMarkerHtml, punchMarkerHtml } from '../utils/mapMarkers'

function hasCoords(lat, lng) {
  return lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))
}

export function MapViewer({
  latitude,
  longitude,
  siteLatitude,
  siteLongitude,
  siteRadius,
  title = 'Location Map',
  mapClassName = 'h-64',
}) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const layersRef = useRef([])

  useEffect(() => {
    if (!mapRef.current || !hasCoords(latitude, longitude)) return

    const lat = Number(latitude)
    const lng = Number(longitude)

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([lat, lng], 15)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance.current)
    }

    const map = mapInstance.current

    layersRef.current.forEach((layer) => map.removeLayer(layer))
    layersRef.current = []

    const punchMarker = L.marker([lat, lng], {
      title: 'Punch Location',
      icon: L.divIcon({
        className: 'custom-marker',
        html: punchMarkerHtml(),
      }),
    }).addTo(map)
    layersRef.current.push(punchMarker)

    if (hasCoords(siteLatitude, siteLongitude)) {
      const siteLat = Number(siteLatitude)
      const siteLng = Number(siteLongitude)

      const siteMarker = L.marker([siteLat, siteLng], {
        title: 'Site Location',
        icon: L.divIcon({
          className: 'custom-marker',
          html: siteMarkerHtml(),
        }),
      }).addTo(map)
      layersRef.current.push(siteMarker)

      if (siteRadius) {
        const circle = L.circle([siteLat, siteLng], {
          radius: siteRadius,
          color: '#276b55',
          fillColor: '#dceee6',
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(map)
        layersRef.current.push(circle)
        map.fitBounds(circle.getBounds().extend([lat, lng]), { padding: [50, 50] })
      } else {
        const bounds = L.latLngBounds([lat, lng], [siteLat, siteLng])
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    } else {
      map.setView([lat, lng], 15)
    }
  }, [latitude, longitude, siteLatitude, siteLongitude, siteRadius])

  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      <div ref={mapRef} className={`w-full rounded border border-gray-200 ${mapClassName}`} />
    </div>
  )
}