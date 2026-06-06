import { useState, useEffect, useRef, useCallback } from 'react'

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

// Pastikan Google Maps sudah di-load sebelum pakai
function isGoogleReady() {
  return !!(window.google?.maps?.places)
}

export default function LocationSearch({
  value, onChange, onSelect,
  placeholder = 'Ketik nama jalan, tempat, atau daerah...',
  confirmed = false, inputStyle = {},
  nearLat = null, nearLng = null,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [open,        setOpen]        = useState(false)
  const [loading,     setLoading]     = useState(false)
  const containerRef  = useRef(null)
  const debounceRef   = useRef(null)
  const serviceRef    = useRef(null)
  const touchingRef   = useRef(false)

  // Inisialisasi AutocompleteService saat Google Maps siap
  const initService = useCallback(() => {
    if (!serviceRef.current && isGoogleReady()) {
      serviceRef.current = new window.google.maps.places.AutocompleteService()
    }
  }, [])

  useEffect(() => {
    initService()
    // Coba lagi setelah 1 detik jika belum siap
    if (!serviceRef.current) {
      const t = setTimeout(initService, 1000)
      return () => clearTimeout(t)
    }
  }, [initService])

  // Google Places Autocomplete saat user mengetik
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (value.length < 2) { setSuggestions([]); setOpen(false); return }

    debounceRef.current = setTimeout(() => {
      initService()
      if (!serviceRef.current) return
      setLoading(true)
      const req = {
        input: value,
        language: 'id',
        componentRestrictions: { country: 'id' },
      }
      if (nearLat && nearLng) {
        req.locationBias = {
          center: { lat: nearLat, lng: nearLng },
          radius: 15000, // 15 km
        }
      }
      serviceRef.current.getPlacePredictions(req, (results, status) => {
        setLoading(false)
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.length) {
          setSuggestions(results)
          setOpen(true)
        } else {
          setSuggestions([])
          setOpen(false)
        }
      })
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [value, nearLat, nearLng, initService])

  // Klik di luar → tutup dropdown
  useEffect(() => {
    function handleOutside(e) {
      if (touchingRef.current) return
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [])

  // Saat user pilih suggestion → ambil koordinat via Geocoder
  function handleSelect(prediction) {
    setOpen(false); setSuggestions([]); touchingRef.current = false
    onChange(prediction.description)

    if (!window.google?.maps?.Geocoder) return
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ placeId: prediction.place_id, language: 'id' }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const loc = results[0].geometry.location
        onSelect({
          lat: loc.lat(),
          lng: loc.lng(),
          display: results[0].formatted_address || prediction.description,
        })
      }
    })
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value) }}
          onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '12px 40px 12px 14px', borderRadius: 12, boxSizing: 'border-box',
            background: 'var(--k-card2)',
            border: `1px solid ${confirmed ? 'rgba(0,200,150,0.5)' : open ? 'rgba(79,70,229,0.4)' : 'var(--k-border)'}`,
            color: 'var(--k-text)', fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
            ...inputStyle,
          }}
        />
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          {loading
            ? <div style={{ width: 14, height: 14, border: '2px solid var(--k-border)', borderTopColor: 'var(--k-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            : confirmed
              ? <span style={{ color: 'var(--k-accent)', fontSize: 14 }}>✓</span>
              : <span style={{ color: 'var(--k-muted)', fontSize: 14 }}>🔍</span>}
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
          background: 'var(--k-card)', border: '1px solid var(--k-border)',
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          maxHeight: 280, overflowY: 'auto',
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
                color: 'var(--k-text)', fontSize: 13,
                display: 'flex', alignItems: 'flex-start', gap: 8,
                WebkitTapHighlightColor: 'rgba(0,200,150,0.1)',
              }}
            >
              <span style={{ flexShrink: 0, marginTop: 2, fontSize: 14 }}>📍</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.structured_formatting?.main_text || s.description}
                </div>
                {s.structured_formatting?.secondary_text && (
                  <div style={{ fontSize: 11, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.structured_formatting.secondary_text}
                  </div>
                )}
              </div>
            </button>
          ))}
          {/* Attributi Google Places */}
          <div style={{ padding: '6px 14px', borderTop: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <img src={`https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png`}
              alt="Powered by Google" style={{ height: 14, opacity: 0.7 }} />
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
