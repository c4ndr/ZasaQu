import { isNative } from './nativePlatform'

async function _getCurrent(opts) {
  if (isNative) {
    const { Geolocation } = await import('@capacitor/geolocation')
    return Geolocation.getCurrentPosition(opts)
  }
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, opts)
  )
}

// Coba coarse dulu (cepat, boleh pakai cache), fallback ke high accuracy.
// Pakai Capacitor di native Android, browser API di web.
export async function getPosition() {
  try {
    const pos = await _getCurrent({ enableHighAccuracy: false, timeout: 6000, maximumAge: 30000 })
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  } catch {
    const pos = await _getCurrent({ enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 })
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  }
}

// Hitung jarak antara dua koordinat dalam meter (haversine formula)
export function distanceMeter(lat1, lng1, lat2, lng2) {
  const R    = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
             * Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

// Buat GeoJSON polygon lingkaran (approximate) untuk MapLibre accuracy circle
export function circleGeoJson(lat, lng, radiusMeters, steps = 64) {
  const coords = []
  for (let i = 0; i <= steps; i++) {
    const angle = (i * 360) / steps
    const dx    = radiusMeters * Math.cos(angle * Math.PI / 180)
    const dy    = radiusMeters * Math.sin(angle * Math.PI / 180)
    const dLng  = dx / (111320 * Math.cos(lat * Math.PI / 180))
    const dLat  = dy / 110540
    coords.push([lng + dLng, lat + dLat])
  }
  coords.push(coords[0])
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } }
}

// Fit bounds dari array titik [lat, lng] ke Google Maps map instance
export function fitGoogleMap(mapInstance, points, padding = 60) {
  if (!mapInstance || !window.google?.maps || points.length < 1) return
  try {
    const bounds = new window.google.maps.LatLngBounds()
    points.forEach(([lat, lng]) => { if (!isNaN(lat) && !isNaN(lng)) bounds.extend({ lat, lng }) })
    if (!bounds.isEmpty()) mapInstance.fitBounds(bounds, padding)
  } catch {}
}

// Kept for any remaining MapLibre usage
export function fitPoints(mapInstance, points, padding = 50) {
  if (!mapInstance || points.length < 2) return
  const lngs = points.map(p => p[1])
  const lats = points.map(p => p[0])
  const sw   = [Math.min(...lngs), Math.min(...lats)]
  const ne   = [Math.max(...lngs), Math.max(...lats)]
  try { mapInstance.fitBounds([sw, ne], { padding, duration: 600 }) } catch {}
}
