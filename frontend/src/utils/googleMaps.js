export const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

// Reverse geocode koordinat → alamat teks (Google Geocoding API)
export async function reverseGeocodeGoogle(lat, lng) {
  if (!window.google?.maps?.Geocoder) return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  return new Promise(resolve => {
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng }, language: 'id' }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        resolve(results[0].formatted_address)
      } else {
        resolve(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
      }
    })
  })
}

// Hitung bounds dari array titik [{lat, lng}]
export function getBounds(points) {
  if (!points || points.length === 0) return null
  if (!window.google?.maps?.LatLngBounds) return null
  const bounds = new window.google.maps.LatLngBounds()
  points.forEach(p => bounds.extend({ lat: p[0] ?? p.lat, lng: p[1] ?? p.lng }))
  return bounds
}
