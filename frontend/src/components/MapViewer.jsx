import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export function MapViewer({ latitude, longitude, siteLatitude, siteLongitude, siteRadius, title = 'Location Map' }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Initialize map
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([latitude, longitude], 15)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance.current)
    }

    const map = mapInstance.current

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer)
      }
    })

    // Add punch location marker
    L.marker([latitude, longitude], {
      title: 'Punch Location',
      icon: L.divIcon({
        className: 'custom-marker',
        html: `<div class="bg-blue-500 rounded-full w-6 h-6 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs">📍</div>`,
      }),
    }).addTo(map)

    // Add site location if provided
    if (siteLatitude && siteLongitude) {
      L.marker([siteLatitude, siteLongitude], {
        title: 'Site Location',
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div class="bg-green-500 rounded-full w-6 h-6 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs">🌳</div>`,
        }),
      }).addTo(map)

      // Add geofence circle
      if (siteRadius) {
        L.circle([siteLatitude, siteLongitude], {
          radius: siteRadius,
          color: '#10b981',
          fillColor: '#d1fae5',
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(map)
      }

      // Fit bounds
      const group = new L.featureGroup([
        L.latLng(latitude, longitude),
        L.latLng(siteLatitude, siteLongitude),
      ])
      map.fitBounds(group.getBounds(), { padding: [50, 50] })
    }
  }, [latitude, longitude, siteLatitude, siteLongitude, siteRadius])

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      <div ref={mapRef} className="w-full h-64 rounded border border-gray-200" />
    </div>
  )
}
