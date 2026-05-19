import { useEffect, useRef } from 'react'
import { Polyline, useMap } from 'react-leaflet'
import useRoadRoute from '../hooks/useRoadRoute'

// Polyline yang mengikuti jalan nyata via OSRM
// Saat loading → tampilkan garis lurus sementara
// Setelah route dimuat → otomatis update ke jalur jalan
export default function RoadPolyline({
  pickup,
  dropoff,
  color   = '#00C896',
  weight  = 4,
  opacity = 0.85,
  dashArray,
}) {
  const map = useMap()
  const polyRef = useRef(null)
  const { routePoints } = useRoadRoute(pickup, dropoff)

  const positions = routePoints ?? [pickup, dropoff]

  // Update polyline secara imperatif saat positions berubah
  // (cara paling andal di react-leaflet untuk update layer Leaflet)
  useEffect(() => {
    if (polyRef.current && positions?.length > 0) {
      polyRef.current.setLatLngs(positions)
    }
  }, [positions])

  if (!pickup || !dropoff) return null

  return (
    <Polyline
      ref={polyRef}
      positions={positions}
      pathOptions={{ color, weight, opacity, dashArray }}
    />
  )
}
