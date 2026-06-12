import { useState, useEffect, useRef, useCallback } from 'react'

function getAutocompleteService() {
  return window.google?.maps?.places ? new window.google.maps.places.AutocompleteService() : null
}

function getGeocoder() {
  return window.google?.maps ? new window.google.maps.Geocoder() : null
}

function placeEmoji(types = []) {
  if (types.some(t => ['restaurant','food','cafe','bar','bakery','meal_takeaway','meal_delivery'].includes(t))) return '🍜'
  if (types.some(t => ['grocery_or_supermarket','supermarket','convenience_store'].includes(t))) return '🛒'
  if (types.some(t => ['store','shopping_mall','clothing_store','market'].includes(t))) return '🏪'
  if (types.some(t => ['atm','bank'].includes(t))) return '🏧'
  if (types.some(t => ['school','university','primary_school','secondary_school'].includes(t))) return '🎓'
  if (types.some(t => ['hospital','pharmacy','doctor','dentist','health'].includes(t))) return '🏥'
  if (types.some(t => ['gas_station'].includes(t))) return '⛽'
  if (types.some(t => ['lodging','hotel'].includes(t))) return '🏨'
  if (types.some(t => ['park','tourist_attraction','amusement_park','natural_feature'].includes(t))) return '🌳'
  if (types.some(t => ['place_of_worship','mosque','church','hindu_temple'].includes(t))) return '🕌'
  if (types.some(t => ['transit_station','bus_station','train_station','subway_station'].includes(t))) return '🚉'
  return '📍'
}

export default function LocationSearch({
  value, onChange, onSelect,
  placeholder = 'Ketik nama jalan, tempat, atau daerah...',
  confirmed = false, inputStyle = {},
  nearLat = null, nearLng = null,
}) {
  const [suggestions,   setSuggestions]   = useState([])
  const [open,          setOpen]          = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [nearbyPlaces,  setNearbyPlaces]  = useState([])
  const [nearbyOpen,    setNearbyOpen]    = useState(false)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const containerRef   = useRef(null)
  const debounceRef    = useRef(null)
  const touchingRef    = useRef(false)
  const sessionToken   = useRef(null)
  const mapDivRef      = useRef(null)
  const nearbyCacheKey = useRef(null)

  const refreshToken = useCallback(() => {
    if (window.google?.maps?.places) {
      sessionToken.current = new window.google.maps.places.AutocompleteSessionToken()
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(refreshToken, 800)
    return () => clearTimeout(timer)
  }, [refreshToken])

  // Autocomplete saat mengetik
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (value.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setNearbyOpen(false)

    debounceRef.current = setTimeout(() => {
      const svc = getAutocompleteService()
      if (!svc) return

      setLoading(true)
      if (!sessionToken.current) refreshToken()

      const req = {
        input: value,
        componentRestrictions: { country: 'id' },
        language: 'id',
        sessionToken: sessionToken.current,
      }
      if (nearLat && nearLng) {
        req.location = new window.google.maps.LatLng(nearLat, nearLng)
        req.radius = 30000
      }

      svc.getPlacePredictions(req, (results, status) => {
        setLoading(false)
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.length) {
          setSuggestions(results)
          setOpen(true)
        } else {
          setSuggestions([])
          setOpen(false)
        }
      })
    }, 350)

    return () => clearTimeout(debounceRef.current)
  }, [value, nearLat, nearLng, refreshToken])

  // Fetch nearby places saat fokus & input kosong
  const fetchNearby = useCallback(() => {
    if (!nearLat || !nearLng || !window.google?.maps?.places) return
    const cacheKey = `${nearLat.toFixed(3)},${nearLng.toFixed(3)}`
    if (nearbyCacheKey.current === cacheKey && nearbyPlaces.length > 0) {
      setNearbyOpen(true)
      return
    }
    if (!mapDivRef.current) mapDivRef.current = document.createElement('div')
    setNearbyLoading(true)
    const svc = new window.google.maps.places.PlacesService(mapDivRef.current)
    svc.nearbySearch(
      { location: new window.google.maps.LatLng(nearLat, nearLng), radius: 1500 },
      (results, status) => {
        setNearbyLoading(false)
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.length) {
          setNearbyPlaces(results.slice(0, 7))
          nearbyCacheKey.current = cacheKey
          setNearbyOpen(true)
        }
      }
    )
  }, [nearLat, nearLng, nearbyPlaces.length])

  // Reset cache saat lokasi acuan berubah signifikan
  useEffect(() => {
    nearbyCacheKey.current = null
    setNearbyPlaces([])
  }, [Math.round((nearLat ?? 0) * 100), Math.round((nearLng ?? 0) * 100)]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleOutside(e) {
      if (touchingRef.current) return
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setNearbyOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [])

  function handleFocus() {
    if (value.length >= 2 && suggestions.length > 0) { setOpen(true); return }
    if (value.length < 2) fetchNearby()
  }

  function handleSelect(prediction) {
    setOpen(false)
    setSuggestions([])
    touchingRef.current = false
    onChange(prediction.description)

    const geocoder = getGeocoder()
    if (!geocoder) { onSelect({ lat: null, lng: null, display: prediction.description }); return }

    geocoder.geocode({ placeId: prediction.place_id, language: 'id' }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location
        onSelect({ lat: loc.lat(), lng: loc.lng(), display: prediction.description })
      } else {
        onSelect({ lat: null, lng: null, display: prediction.description })
      }
    })
    refreshToken()
  }

  function handleSelectNearby(place) {
    setNearbyOpen(false)
    touchingRef.current = false
    const display = place.name + (place.vicinity ? `, ${place.vicinity}` : '')
    onChange(display)

    if (place.geometry?.location) {
      onSelect({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), display })
    } else if (place.place_id) {
      const geocoder = getGeocoder()
      if (geocoder) {
        geocoder.geocode({ placeId: place.place_id, language: 'id' }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const loc = results[0].geometry.location
            onSelect({ lat: loc.lat(), lng: loc.lng(), display })
          } else {
            onSelect({ lat: null, lng: null, display })
          }
        })
      }
    }
    refreshToken()
  }

  function mainText(p) {
    return p.structured_formatting?.main_text ?? p.description.split(',')[0]
  }
  function secondaryText(p) {
    return p.structured_formatting?.secondary_text ?? ''
  }

  const showNearby = nearbyOpen && nearbyPlaces.length > 0 && value.length < 2
  const showSuggest = open && suggestions.length > 0

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '12px 40px 12px 14px', borderRadius: 12, boxSizing: 'border-box',
            background: 'var(--k-card2)',
            border: `1px solid ${confirmed ? 'rgba(0,200,150,0.5)' : (open || nearbyOpen) ? 'rgba(79,70,229,0.4)' : 'var(--k-border)'}`,
            color: 'var(--k-text)', fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
            ...inputStyle,
          }}
        />
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          {(loading || nearbyLoading)
            ? <div style={{ width: 14, height: 14, border: '2px solid var(--k-border)', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            : confirmed
              ? <span style={{ color: 'var(--k-accent)', fontSize: 14 }}>✓</span>
              : <span style={{ color: 'var(--k-muted)', fontSize: 14 }}>🔍</span>}
        </div>
      </div>

      {/* ── Dropdown Nearby Populer ── */}
      {showNearby && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
          background: 'var(--k-card)', border: '1px solid var(--k-border)',
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          maxHeight: 320, overflowY: 'auto',
        }}>
          <div style={{ padding: '8px 14px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12 }}>📍</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-sub)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Populer di sekitarmu
            </span>
          </div>
          {nearbyPlaces.map((place, i) => (
            <button key={place.place_id ?? i} type="button"
              onMouseDown={e => e.preventDefault()}
              onTouchStart={() => { touchingRef.current = true }}
              onTouchEnd={() => handleSelectNearby(place)}
              onClick={() => handleSelectNearby(place)}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: i < nearbyPlaces.length - 1 ? '1px solid var(--k-border)' : 'none',
                color: 'var(--k-text)', display: 'flex', alignItems: 'flex-start', gap: 10,
                WebkitTapHighlightColor: 'rgba(99,102,241,0.1)',
              }}
            >
              <span style={{ flexShrink: 0, marginTop: 1, fontSize: 16 }}>{placeEmoji(place.types)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {place.name}
                </div>
                {place.vicinity && (
                  <div style={{ fontSize: 11, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                    {place.vicinity}
                  </div>
                )}
              </div>
              {place.rating && (
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: '#F6AD55' }}>★</span>
                  <span style={{ fontSize: 10, color: 'var(--k-muted)', fontWeight: 600 }}>{place.rating}</span>
                </div>
              )}
            </button>
          ))}
          <div style={{ padding: '6px 14px', borderTop: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
            <img src="https://maps.gstatic.com/mapfiles/api-3/images/google_white5.png" alt="Google" style={{ height: 12, opacity: 0.5 }} />
            <span style={{ fontSize: 10, color: 'var(--k-muted)' }}>Powered by Google</span>
          </div>
        </div>
      )}

      {/* ── Dropdown Autocomplete ── */}
      {showSuggest && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
          background: 'var(--k-card)', border: '1px solid var(--k-border)',
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          maxHeight: 300, overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => (
            <button key={s.place_id} type="button"
              onMouseDown={e => e.preventDefault()}
              onTouchStart={() => { touchingRef.current = true }}
              onTouchEnd={() => handleSelect(s)}
              onClick={() => handleSelect(s)}
              style={{
                width: '100%', textAlign: 'left', padding: '12px 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--k-border)' : 'none',
                color: 'var(--k-text)', display: 'flex', alignItems: 'flex-start', gap: 10,
                WebkitTapHighlightColor: 'rgba(99,102,241,0.1)',
              }}
            >
              <span style={{ flexShrink: 0, marginTop: 2, fontSize: 15 }}>📍</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {mainText(s)}
                </div>
                {secondaryText(s) && (
                  <div style={{ fontSize: 11, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                    {secondaryText(s)}
                  </div>
                )}
              </div>
            </button>
          ))}
          <div style={{ padding: '6px 14px', borderTop: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
            <img src="https://maps.gstatic.com/mapfiles/api-3/images/google_white5.png" alt="Google" style={{ height: 12, opacity: 0.5 }} />
            <span style={{ fontSize: 10, color: 'var(--k-muted)' }}>Powered by Google</span>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
