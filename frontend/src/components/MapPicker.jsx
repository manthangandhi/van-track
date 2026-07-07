import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { STRINGS } from '../utils/strings'
import { siteMarkerHtml } from '../utils/mapMarkers'

export function MapPicker({
  latitude,
  longitude,
  radius,
  onChange,
  interactive = true,
  mapClassName = 'w-full h-64 rounded-lg border border-gray-200',
}) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)
  const circleRef = useRef(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!mapRef.current) return

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([latitude, longitude], 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance.current)

      if (interactive) {
        mapInstance.current.on('click', (e) => {
          onChangeRef.current({
            latitude: e.latlng.lat,
            longitude: e.latlng.lng,
          })
        })
      }
    }

    const map = mapInstance.current

    if (markerRef.current) {
      map.removeLayer(markerRef.current)
    }
    if (circleRef.current) {
      map.removeLayer(circleRef.current)
    }

    markerRef.current = L.marker([latitude, longitude], {
      draggable: interactive,
      icon: L.divIcon({
        className: 'custom-marker',
        html: siteMarkerHtml(),
      }),
    }).addTo(map)

    if (interactive) {
      markerRef.current.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng()
        onChangeRef.current({ latitude: lat, longitude: lng })
      })
    }

    circleRef.current = L.circle([latitude, longitude], {
      radius,
      color: '#276b55',
      fillColor: '#dceee6',
      fillOpacity: 0.2,
      weight: 2,
    }).addTo(map)

    map.setView([latitude, longitude], map.getZoom())
    map.invalidateSize()
  }, [latitude, longitude, radius, interactive])

  useEffect(() => {
    if (!mapRef.current || !mapInstance.current) return

    const observer = new ResizeObserver(() => {
      mapInstance.current?.invalidateSize()
    })

    observer.observe(mapRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <p className="text-sm text-gray-600 mb-2 shrink-0">{STRINGS.MAP_PICKER_HINT}</p>
      <div ref={mapRef} className={`flex-1 min-h-[280px] ${mapClassName}`} />
    </div>
  )
}