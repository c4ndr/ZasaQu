import { useState, useEffect } from 'react'

// Cache sederhana agar rute yang sama tidak di-fetch ulang
const _cache = new Map()
function cacheKey(lat1, lng1, lat2, lng2) {
  return `${lat1.toFixed(4)},${lng1.toFixed(4)};${lat2.toFixed(4)},${lng2.toFixed(4)}`
}

export default function useRoadRoute(pickup, dropoff) {
  const [routePoints, setRoutePoints] = useState(null)
  const [distanceKm,  setDistanceKm]  = useState(null)
  const [loading,     setLoading]     = useState(false)

  const lat1 = pickup?.[0],  lng1 = pickup?.[1]
  const lat2 = dropoff?.[0], lng2 = dropoff?.[1]

  useEffect(() => {
    // Validasi koordinat (null, NaN, atau 0 = tidak valid)
    if (!lat1 || !lng1 || !lat2 || !lng2) return
    if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) return

    const key = cacheKey(lat1, lng1, lat2, lng2)

    // Pakai cache jika sudah ada
    if (_cache.has(key)) {
      const cached = _cache.get(key)
      setRoutePoints(cached.points)
      setDistanceKm(cached.distanceKm)
      return
    }

    let cancelled = false
    setLoading(true)

    // Gunakan AbortController (lebih kompatibel dari AbortSignal.timeout)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    // OSRM pakai urutan lng,lat — bukan lat,lng!
    const url = `https://router.project-osrm.org/route/v1/driving/` +
                `${lng1},${lat1};${lng2},${lat2}` +
                `?overview=full&geometries=geojson`

    // Seluruh fetch dibungkus try-catch agar error sync pun tertangkap
    ;(async () => {
      try {
        const res  = await fetch(url, { signal: controller.signal })
        const data = await res.json()

        if (cancelled) return

        if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates?.length > 1) {
          // Konversi [lng, lat] → [lat, lng] untuk Leaflet
          const points = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
          const km     = parseFloat((data.routes[0].distance / 1000).toFixed(1))

          _cache.set(key, { points, distanceKm: km })
          setRoutePoints(points)
          setDistanceKm(km)
        } else {
          fallback()
        }
      } catch {
        if (!cancelled) fallback()
      } finally {
        clearTimeout(timer)
        if (!cancelled) setLoading(false)
      }
    })()

    function fallback() {
      const points = [[lat1, lng1], [lat2, lng2]]
      const km     = haversine(lat1, lng1, lat2, lng2)
      setRoutePoints(points)
      setDistanceKm(km)
    }

    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(timer)
    }
  }, [lat1, lng1, lat2, lng2])

  return { routePoints, distanceKm, loading }
}

function haversine(lat1, lng1, lat2, lng2) {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
             * Math.sin(dLng / 2) ** 2
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1))
}
