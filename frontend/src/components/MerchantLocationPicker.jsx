import { useState, useCallback, useEffect } from 'react'
import { MapContainer, Marker, useMapEvents, useMap } from 'react-leaflet'
import SatelliteTiles from './SatelliteTiles'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const shopPin = L.divIcon({
  html: `<div style="position:relative;width:32px;height:40px">
    <svg viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="40">
      <path d="M16 0C8.268 0 2 6.268 2 14c0 9.6 14 26 14 26S30 23.6 30 14C30 6.268 23.732 0 16 0z" fill="#F97316"/>
      <circle cx="16" cy="14" r="6" fill="white"/>
    </svg>
  </div>`,
  iconSize: [32, 40], iconAnchor: [16, 40], className: '',
})

function FlyTo({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, map.getZoom() < 14 ? 15 : map.getZoom(), { duration: 0.8 })
  }, [position, map])
  return null
}

function MapClicker({ onClick }) {
  useMapEvents({ click(e) { onClick(e.latlng.lat, e.latlng.lng) } })
  return null
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=id`
    )
    const data = await res.json()
    return data.display_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
}

// onPick({ lat, lng, address })
export default function MerchantLocationPicker({ lat, lng, onPick }) {
  const [geocoding, setGeocoding] = useState(false)
  const [locating,  setLocating]  = useState(false)
  const [gpsError,  setGpsError]  = useState('')
  const position = (lat && lng) ? [parseFloat(lat), parseFloat(lng)] : null

  const pick = useCallback(async (newLat, newLng) => {
    setGpsError('')
    setGeocoding(true)
    const address = await reverseGeocode(newLat, newLng)
    onPick({ lat: String(newLat), lng: String(newLng), address })
    setGeocoding(false)
  }, [onPick])

  const detectGps = () => {
    setGpsError('')
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung GPS. Ketuk peta untuk pilih manual.')
      return
    }
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
          {position
            ? `📍 ${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`
            : '📍 Ketuk peta untuk pin lokasi toko'}
        </p>
        <button type="button" onClick={detectGps} disabled={locating || geocoding} style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
          background: 'rgba(249,115,22,0.1)', color: '#F97316',
          border: '1px solid rgba(249,115,22,0.25)', borderRadius: 8,
          padding: '5px 10px', cursor: (locating || geocoding) ? 'not-allowed' : 'pointer',
          opacity: (locating || geocoding) ? 0.6 : 1,
        }}>
          {locating
            ? <><span style={{ width: 11, height: 11, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Mendeteksi...</>
            : geocoding ? '⏳ Memuat...' : '🎯 Lokasiku'}
        </button>
      </div>

      {gpsError && (
        <div style={{ margin: '0 10px 8px', padding: '8px 12px', borderRadius: 8, fontSize: 12,
          background: 'rgba(246,173,85,0.08)', border: '1px solid rgba(246,173,85,0.25)', color: 'var(--k-warn)' }}>
          ⚠️ {gpsError}
        </div>
      )}

      <div style={{ height: 200, position: 'relative' }}>
        <MapContainer
          center={position ?? [-6.2, 106.816]}
          zoom={position ? 15 : 12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <SatelliteTiles />
          <MapClicker onClick={pick} />
          {position && (
            <>
              <FlyTo position={position} />
              <Marker position={position} icon={shopPin} />
            </>
          )}
        </MapContainer>
        {!position && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            background: 'rgba(12,12,22,0.45)', zIndex: 500, gap: 4,
          }}>
            <span style={{ fontSize: 26 }}>👆</span>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>Ketuk peta untuk pin lokasi</span>
          </div>
        )}
      </div>
    </div>
  )
}
