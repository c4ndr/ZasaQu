import { useState, useCallback, useRef } from 'react'
import Map, { Marker } from 'react-map-gl/maplibre'
import { SATELLITE_STYLE } from '../utils/mapStyle'

const shopMarker = (
  <div style={{ position: 'relative', width: 32, height: 40 }}>
    <svg viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="40"
      style={{ position: 'absolute', top: 0, left: 0 }}>
      <path d="M16 0C8.268 0 2 6.268 2 14c0 9.6 14 26 14 26S30 23.6 30 14C30 6.268 23.732 0 16 0z"
        fill="#F97316" />
      <circle cx="16" cy="14" r="6" fill="white" />
    </svg>
  </div>
)

async function reverseGeocode(lat, lng) {
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=id`)
    const data = await res.json()
    return data.display_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } catch { return `${lat.toFixed(6)}, ${lng.toFixed(6)}` }
}

// onPick({ lat, lng, address })
export default function MerchantLocationPicker({ lat, lng, onPick }) {
  const mapRef   = useRef(null)
  const [geocoding, setGeocoding] = useState(false)
  const [locating,  setLocating]  = useState(false)
  const [gpsError,  setGpsError]  = useState('')

  const hasPos  = lat && lng
  const posLat  = hasPos ? parseFloat(lat) : -6.2
  const posLng  = hasPos ? parseFloat(lng) : 106.816

  const pick = useCallback(async (newLat, newLng) => {
    setGpsError('')
    setGeocoding(true)
    const address = await reverseGeocode(newLat, newLng)
    onPick({ lat: String(newLat), lng: String(newLng), address })
    setGeocoding(false)
    mapRef.current?.getMap()?.flyTo({ center: [newLng, newLat], zoom: 15, duration: 600 })
  }, [onPick])

  const detectGps = () => {
    setGpsError('')
    if (!navigator.geolocation) { setGpsError('Browser tidak mendukung GPS. Ketuk peta untuk pilih manual.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => { await pick(pos.coords.latitude, pos.coords.longitude); setLocating(false) },
      (err) => {
        setLocating(false)
        const msgs = { 1: 'Izin lokasi ditolak.', 2: 'Sinyal GPS tidak tersedia.', 3: 'Waktu habis.' }
        setGpsError((msgs[err.code] ?? 'Gagal deteksi lokasi.') + ' Ketuk peta untuk pilih manual.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  return (
    <div style={{ border: '1.5px solid var(--k-border)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 8px' }}>
        <p style={{ color: 'var(--k-sub)', fontSize: 12, fontWeight: 700 }}>
          {hasPos ? `📍 ${posLat.toFixed(5)}, ${posLng.toFixed(5)}` : '📍 Ketuk peta untuk pin lokasi toko'}
        </p>
        <button type="button" onClick={detectGps} disabled={locating || geocoding} style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
          background: 'rgba(249,115,22,0.1)', color: '#F97316',
          border: '1px solid rgba(249,115,22,0.25)', borderRadius: 8,
          padding: '5px 10px', cursor: (locating || geocoding) ? 'not-allowed' : 'pointer',
          opacity: (locating || geocoding) ? 0.6 : 1,
        }}>
          {locating ? <><span style={{ width: 11, height: 11, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Mendeteksi...</> : geocoding ? '⏳ Memuat...' : '🎯 Lokasiku'}
        </button>
      </div>

      {gpsError && (
        <div style={{ margin: '0 10px 8px', padding: '8px 12px', borderRadius: 8, fontSize: 12, background: 'rgba(246,173,85,0.08)', border: '1px solid rgba(246,173,85,0.25)', color: 'var(--k-warn)' }}>
          ⚠️ {gpsError}
        </div>
      )}

      <div style={{ height: 200, position: 'relative' }}>
        <Map
          ref={mapRef}
          initialViewState={{ longitude: posLng, latitude: posLat, zoom: hasPos ? 15 : 12 }}
          mapStyle={SATELLITE_STYLE}
          style={{ width: '100%', height: '100%' }}
          attributionControl={false}
          onClick={(e) => pick(e.lngLat.lat, e.lngLat.lng)}
          cursor="crosshair"
        >
          {hasPos && (
            <Marker longitude={posLng} latitude={posLat} anchor="bottom">
              {shopMarker}
            </Marker>
          )}
        </Map>
        {!hasPos && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            background: 'rgba(12,12,22,0.45)', zIndex: 4, gap: 4,
          }}>
            <span style={{ fontSize: 26 }}>👆</span>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>Ketuk peta untuk pin lokasi</span>
          </div>
        )}
      </div>
    </div>
  )
}
