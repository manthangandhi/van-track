import React, { useEffect, useRef, useState } from 'react'
import { searchLocations } from '../services/geocodeService'
import { STRINGS } from '../utils/strings'

export function LocationSearch({ onSelect, placeholder = STRINGS.SEARCH_LOCATION }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const places = await searchLocations(query)
        if (!cancelled) {
          setResults(places)
          setOpen(true)
        }
      } catch {
        if (!cancelled) {
          setResults([])
          setError(STRINGS.LOCATION_SEARCH_FAILED)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handlePick(place) {
    onSelect(place)
    setQuery(place.label)
    setOpen(false)
    setResults([])
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
        {STRINGS.SEARCH_LOCATION}
      </label>
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="input-field pl-3 pr-10"
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            ...
          </span>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => handlePick(place)}
                className="w-full text-left px-3 py-2.5 hover:bg-forest-50 border-b border-forest-100 last:border-b-0"
              >
                <p className="text-sm font-medium text-gray-900">{place.label}</p>
                {place.detail && <p className="text-xs text-gray-500">{place.detail}</p>}
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}