import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

function getPlacesService() {
  if (!window.google?.maps?.places) return null
  if (!window.__locationSearchMapDiv) window.__locationSearchMapDiv = document.createElement('div')
  return new window.google.maps.places.PlacesService(window.__locationSearchMapDiv)
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
  const [suggestions,   setSuggestions]   = useState([])  // textSearch results
  const [open,          setOpen]          = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [nearbyPlaces,  setNearbyPlaces]  = useState([])
  const [nearbyOpen,    setNearbyOpen]    = useState(false)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [geocodeFallback, setGeocodeFallback] = useState(null)
  const containerRef   = useRef(null)
  const debounceRef    = useRef(null)
  const touchingRef    = useRef(false)
  const nearbyCacheKey = useRef(null)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0, above: false })

  // Hitung posisi dropdown relatif viewport — supaya tembus iframe Google Maps
  // Pakai visualViewport agar akurat saat keyboard virtual Android muncul
  const updateDropPos = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const vh = window.visualViewport?.height ?? window.innerHeight
    const spaceBelow = vh - rect.bottom
    const spaceAbove = rect.top
    const above = spaceBelow < 220 && spaceAbove > spaceBelow
    setDropPos({
      left: rect.left,
      width: rect.width,
      top:    rect.bottom + 4,   // posisi untuk mode bawah
      bottom: vh - rect.top + 4, // posisi untuk mode atas
      above,
      maxH: above
        ? Math.max(80, Math.min(300, spaceAbove - 12))
        : Math.max(80, Math.min(300, spaceBelow - 12)),
    })
  }, [])

  useEffect(() => {
    updateDropPos()
  }, [open, nearbyOpen, updateDropPos])

  useEffect(() => {
    window.addEventListener('scroll', updateDropPos, true)
    window.addEventListener('resize', updateDropPos)
    window.visualViewport?.addEventListener('resize', updateDropPos)
    return () => {
      window.removeEventListener('scroll', updateDropPos, true)
      window.removeEventListener('resize', updateDropPos)
      window.visualViewport?.removeEventListener('resize', updateDropPos)
    }
  }, [updateDropPos])

  // ── Pencarian utama: textSearch (sama seperti Google Maps app) ──────────────
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (value.length < 2) {
      setSuggestions([])
      setGeocodeFallback(null)
      setOpen(false)
      return
    }
    setNearbyOpen(false)

    debounceRef.current = setTimeout(() => {
      const svc = getPlacesService()
      if (!svc) return

      setLoading(true)
      setGeocodeFallback(null)

      const req = {
        query: value,
        region: 'id',
        language: 'id',
      }
      // Bias ke lokasi pengguna jika tersedia — prioritaskan hasil terdekat
      if (nearLat && nearLng) {
        req.location = new window.google.maps.LatLng(nearLat, nearLng)
        req.radius = 50000
      }

      svc.textSearch(req, (results, status) => {
        const OK = window.google.maps.places.PlacesServiceStatus.OK
        if (status === OK && results?.length) {
          setLoading(false)
          setSuggestions(results.slice(0, 6))
          setOpen(true)
        } else {
          // Fallback: Geocoding API (coverage lebih luas untuk alamat pelosok)
          setSuggestions([])
          const geocoder = getGeocoder()
          if (!geocoder) { setLoading(false); setOpen(false); return }

          const biasedQuery = nearLat && nearLng
            ? value  // sudah ada lokasi acuan, biarkan google pakai bias dari latlng
            : value + ', Indonesia'

          geocoder.geocode(
            { address: biasedQuery, language: 'id',
              ...(nearLat && nearLng ? { bounds: new window.google.maps.LatLngBounds(
                { lat: nearLat - 0.5, lng: nearLng - 0.5 },
                { lat: nearLat + 0.5, lng: nearLng + 0.5 }
              ) } : {})
            },
            (gResults, gStatus) => {
              setLoading(false)
              if (gStatus === 'OK' && gResults?.length) {
                // Ambil semua hasil geocode (bisa lebih dari 1)
                const hits = gResults.slice(0, 4).map(r => ({
                  _type: 'geocode',
                  place_id: r.place_id,
                  display: r.formatted_address,
                  lat: r.geometry.location.lat(),
                  lng: r.geometry.location.lng(),
                  types: r.types || [],
                }))
                setGeocodeFallback(hits)
                setOpen(true)
              } else {
                setGeocodeFallback(null)
                setOpen(false)
              }
            }
          )
        }
      })
    }, 400)

    return () => clearTimeout(debounceRef.current)
  }, [value, nearLat, nearLng])

  // ── Nearby places saat fokus & input kosong ────────────────────────────────
  const fetchNearby = useCallback(() => {
    if (!nearLat || !nearLng || !window.google?.maps?.places) return
    const cacheKey = `${nearLat.toFixed(3)},${nearLng.toFixed(3)}`
    if (nearbyCacheKey.current === cacheKey && nearbyPlaces.length > 0) {
      setNearbyOpen(true); return
    }
    setNearbyLoading(true)
    const svc = getPlacesService()
    if (!svc) { setNearbyLoading(false); return }
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

  useEffect(() => {
    nearbyCacheKey.current = null
    setNearbyPlaces([])
  }, [Math.round((nearLat ?? 0) * 100), Math.round((nearLng ?? 0) * 100)]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tutup dropdown saat klik di luar ──────────────────────────────────────
  useEffect(() => {
    function handleOutside(e) {
      if (touchingRef.current) return
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false); setNearbyOpen(false)
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
    if (value.length >= 2 && (suggestions.length > 0 || geocodeFallback)) { setOpen(true); return }
    if (value.length < 2) fetchNearby()
  }

  // textSearch result sudah punya geometry.location — tidak perlu geocode lagi
  function handleSelect(place) {
    setOpen(false); setSuggestions([]); setGeocodeFallback(null)
    touchingRef.current = false
    const display = place.name + (place.formatted_address ? `, ${place.formatted_address}` : '')
    onChange(display)
    if (place.geometry?.location) {
      onSelect({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), display })
    } else {
      onSelect({ lat: null, lng: null, display })
    }
  }

  function handleSelectGeocode(hit) {
    setOpen(false); setSuggestions([]); setGeocodeFallback(null)
    touchingRef.current = false
    onChange(hit.display)
    onSelect({ lat: hit.lat, lng: hit.lng, display: hit.display })
  }

  function handleSelectNearby(place) {
    setNearbyOpen(false)
    touchingRef.current = false
    const display = place.name + (place.vicinity ? `, ${place.vicinity}` : '')
    onChange(display)
    if (place.geometry?.location) {
      onSelect({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), display })
    } else {
      onSelect({ lat: null, lng: null, display })
    }
  }

  function handleFreeText() {
    setOpen(false); setSuggestions([]); setGeocodeFallback(null)
    touchingRef.current = false
    onSelect({ lat: null, lng: null, display: value })
  }

  const showNearby   = nearbyOpen && nearbyPlaces.length > 0 && value.length < 2
  const showSuggest  = open && suggestions.length > 0
  const showGeocode  = open && suggestions.length === 0 && geocodeFallback?.length > 0
  const showFreeText = open && suggestions.length === 0 && !geocodeFallback && value.length >= 2
  const showAny      = showNearby || showSuggest || showGeocode || showFreeText

  // Style untuk dropdown via portal — position: fixed agar tembus iframe peta
  const portalStyle = {
    position: 'fixed',
    left: dropPos.left,
    width: dropPos.width,
    zIndex: 999999,
    background: 'var(--k-card)',
    border: '1px solid var(--k-border)',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    maxHeight: dropPos.maxH ?? 300,
    overflowY: 'auto',
    ...(dropPos.above
      ? { bottom: dropPos.bottom, top: 'auto' }
      : { top: dropPos.top, bottom: 'auto' }),
  }

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

      {/* Dropdown via Portal — tembus iframe Google Maps */}
      {showAny && createPortal(
        <div style={portalStyle}>
          {/* Nearby Populer */}
          {showNearby && <>
            <div style={{ padding: '8px 14px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12 }}>📍</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-sub)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Populer di sekitarmu</span>
            </div>
            {nearbyPlaces.map((place, i) => (
              <button key={place.place_id ?? i} type="button"
                onMouseDown={e => e.preventDefault()}
                onTouchStart={() => { touchingRef.current = true }}
                onTouchEnd={() => handleSelectNearby(place)}
                onClick={() => handleSelectNearby(place)}
                style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: i < nearbyPlaces.length - 1 ? '1px solid var(--k-border)' : 'none', color: 'var(--k-text)', display: 'flex', alignItems: 'flex-start', gap: 10, WebkitTapHighlightColor: 'rgba(99,102,241,0.1)' }}
              >
                <span style={{ flexShrink: 0, marginTop: 1, fontSize: 16 }}>{placeEmoji(place.types)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name}</div>
                  {place.vicinity && <div style={{ fontSize: 11, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{place.vicinity}</div>}
                </div>
                {place.rating && <div style={{ flexShrink: 0, fontSize: 10, color: '#F6AD55', fontWeight: 700, marginTop: 2 }}>★ {place.rating}</div>}
              </button>
            ))}
            <GoogleBadge />
          </>}

          {/* textSearch results */}
          {showSuggest && <>
            {suggestions.map((place, i) => (
              <button key={place.place_id ?? i} type="button"
                onMouseDown={e => e.preventDefault()}
                onTouchStart={() => { touchingRef.current = true }}
                onTouchEnd={() => handleSelect(place)}
                onClick={() => handleSelect(place)}
                style={{ width: '100%', textAlign: 'left', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid var(--k-border)' : 'none', color: 'var(--k-text)', display: 'flex', alignItems: 'flex-start', gap: 10, WebkitTapHighlightColor: 'rgba(99,102,241,0.1)' }}
              >
                <span style={{ flexShrink: 0, marginTop: 2, fontSize: 16 }}>{placeEmoji(place.types)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name}</div>
                  {place.formatted_address && <div style={{ fontSize: 11, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{place.formatted_address}</div>}
                </div>
                {place.rating && <div style={{ flexShrink: 0, fontSize: 10, color: '#F6AD55', fontWeight: 700, marginTop: 2 }}>★ {place.rating}</div>}
              </button>
            ))}
            <GoogleBadge />
          </>}

          {/* Geocoding fallback */}
          {showGeocode && <>
            <div style={{ padding: '8px 14px 4px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hasil Pencarian Peta</span>
            </div>
            {geocodeFallback.map((hit, i) => (
              <button key={hit.place_id ?? i} type="button"
                onMouseDown={e => e.preventDefault()}
                onTouchStart={() => { touchingRef.current = true }}
                onTouchEnd={() => handleSelectGeocode(hit)}
                onClick={() => handleSelectGeocode(hit)}
                style={{ width: '100%', textAlign: 'left', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: i < geocodeFallback.length - 1 ? '1px solid var(--k-border)' : 'none', color: 'var(--k-text)', display: 'flex', alignItems: 'flex-start', gap: 10, WebkitTapHighlightColor: 'rgba(99,102,241,0.1)' }}
              >
                <span style={{ flexShrink: 0, marginTop: 2, fontSize: 16 }}>🗺️</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hit.display.split(',')[0]}</div>
                  <div style={{ fontSize: 11, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{hit.display.split(',').slice(1).join(',').trim()}</div>
                </div>
              </button>
            ))}
            <GoogleBadge />
          </>}

          {/* Teks bebas last resort */}
          {showFreeText && <>
            <button type="button"
              onMouseDown={e => e.preventDefault()}
              onTouchStart={() => { touchingRef.current = true }}
              onTouchEnd={handleFreeText}
              onClick={handleFreeText}
              style={{ width: '100%', textAlign: 'left', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--k-text)', display: 'flex', alignItems: 'flex-start', gap: 10, WebkitTapHighlightColor: 'rgba(99,102,241,0.1)' }}
            >
              <span style={{ flexShrink: 0, marginTop: 2, fontSize: 15 }}>✏️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Gunakan "{value}"</div>
                <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 1 }}>⚠️ Lokasi tidak ditemukan — driver akan konfirmasi via chat</div>
              </div>
            </button>
            <GoogleBadge />
          </>}
        </div>,
        document.body
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function GoogleBadge() {
  return (
    <div style={{ padding: '5px 14px', borderTop: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
      <img src="https://maps.gstatic.com/mapfiles/api-3/images/google_white5.png" alt="Google" style={{ height: 12, opacity: 0.5 }} />
      <span style={{ fontSize: 10, color: 'var(--k-muted)' }}>Powered by Google</span>
    </div>
  )
}
