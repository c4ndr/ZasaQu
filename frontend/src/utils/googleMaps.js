// Reverse geocode koordinat → alamat teks (Nominatim/OpenStreetMap, tanpa API key)
export async function reverseGeocodeGoogle(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=id`,
      { headers: { 'User-Agent': 'ZasaQu/1.0' } }
    )
    if (!res.ok) return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    const data = await res.json()
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
}
