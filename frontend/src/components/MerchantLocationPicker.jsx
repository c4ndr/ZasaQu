import { useState, useRef, useCallback, useEffect } from 'react'
import { GoogleMap, Marker } from '@react-google-maps/api'
import MapSatToggle from './MapSatToggle'

const MAP_STYLE = [
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
]

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  styles: MAP_STYLE,
}

function reverseGeocodeGoogle(lat, lng) {
  return new Promise((resolve) => {
    if (!window.google?.maps) { resolve(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); return }
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng }, language: 'id' }, (results, status) => {
      resolve(status === 'OK' && results[0] ? results[0].formatted_address : `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    })
  })
}

// onPick({ lat, lng, address })
export default function MerchantLocationPicker({ lat, lng, onPick }) {
  const [geocoding, setGeocoding] = useState(false)
  const [locating,  setLocating]  = useState(false)
  const [gpsError,  setGpsError]  = useState('')
  const [mapsReady, setMapsReady] = useState(!!window.google?.maps)
  const [mapType,   setMapType]   = useState('roadmap')
  const mapRef   = useRef(null)

  useEffect(() => {
    if (window.google?.maps) { setMapsReady(true); return }
    const timer = setInterval(() => {
      if (window.google?.maps) { setMapsReady(true); clearInterval(timer) }
    }, 300)
    return () => clearInterval(timer)
  }, [])

  const hasPos = lat && lng
  const posLat = hasPos ? parseFloat(lat) : -6.2
  const posLng = hasPos ? parseFloat(lng) : 106.816

  const pick = useCallback(async (newLat, newLng) => {
    setGpsError('')
    setGeocoding(true)
    const address = await reverseGeocodeGoogle(newLat, newLng)
    onPick({ lat: String(newLat), lng: String(newLng), address })
    setGeocoding(false)
    if (mapRef.current) {
      mapRef.current.panTo({ lat: newLat, lng: newLng })
    }
  }, [onPick])

  const detectGps = () => {
    setGpsError('')
    if (!navigator.geolocation) {
      setGpsError('GPS tidak tersedia. Ketuk peta untuk pilih manual.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await pick(pos.coords.latitude, pos.coords.longitude)
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        const msgs = { 1: 'Izin lokasi ditolak.', 2: 'Sinyal GPS tidak tersedia.', 3: 'Waktu habis.' }
        setGpsError((msgs[err.code] ?? 'Gagal deteksi lokasi.') + ' Ketuk peta untuk pilih manual.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const onMapClick = useCallback((e) => {
    pick(e.latLng.lat(), e.latLng.lng())
  }, [pick])

  const onLoad = useCallback((map) => {
    mapRef.current = map
  }, [])

  return (
    <div style={{ border: '1.5px solid var(--k-border)', borderRadius: 14, overflow: 'hidden' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 8px', background: 'var(--k-card)' }}>
        <p style={{ color: 'var(--k-sub)', fontSize: 12, fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {geocoding ? '⏳ Memuat alamat...' : hasPos ? `📍 ${posLat.toFixed(5)}, ${posLng.toFixed(5)}` : '📍 Ketuk peta untuk pin lokasi'}
        </p>
        <button type="button" onClick={detectGps} disabled={locating || geocoding}
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, flexShrink: 0,
            background: 'rgba(249,115,22,0.1)', color: '#F97316', border: '1px solid rgba(249,115,22,0.25)',
            borderRadius: 8, padding: '5px 10px', cursor: (locating || geocoding) ? 'not-allowed' : 'pointer',
            opacity: (locating || geocoding) ? 0.6 : 1, marginLeft: 8 }}>
          {locating
            ? <><span style={{ width: 10, height: 10, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'mlp-spin 0.7s linear infinite' }} /> Mendeteksi...</>
            : '🎯 Lokasiku'}
        </button>
      </div>

      {gpsError && (
        <div style={{ margin: '0 10px 6px', padding: '8px 12px', borderRadius: 8, fontSize: 12, background: 'rgba(246,173,85,0.08)', border: '1px solid rgba(246,173,85,0.25)', color: 'var(--k-warn)' }}>
          ⚠️ {gpsError}
        </div>
      )}

      {/* Map */}
      <div style={{ height: 220, position: 'relative' }}>
        {mapsReady ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={{ lat: posLat, lng: posLng }}
            zoom={hasPos ? 16 : 12}
            options={{ ...MAP_OPTIONS, mapTypeId: mapType }}
            onClick={onMapClick}
            onLoad={onLoad}
          >
            {hasPos && (
              <Marker
                position={{ lat: posLat, lng: posLng }}
                draggable
                onDragEnd={(e) => pick(e.latLng.lat(), e.latLng.lng())}
              />
            )}
          </GoogleMap>
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <div style={{ width: 24, height: 24, border: '3px solid var(--k-border)', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'mlp-spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 12, color: 'var(--k-muted)' }}>Memuat peta...</span>
          </div>
        )}

        {mapsReady && <MapSatToggle mapType={mapType} onToggle={() => setMapType(t => t === 'roadmap' ? 'hybrid' : 'roadmap')} />}

        {!hasPos && mapsReady && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'rgba(12,12,22,0.35)', zIndex: 4, gap: 4 }}>
            <span style={{ fontSize: 28 }}>👆</span>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>Ketuk peta untuk pin lokasi</span>
          </div>
        )}
      </div>

      <style>{`@keyframes mlp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
