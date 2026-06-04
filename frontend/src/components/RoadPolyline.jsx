import { useMemo } from 'react'
import { Source, Layer } from 'react-map-gl/maplibre'
import useRoadRoute from '../hooks/useRoadRoute'

// pickup dan dropoff dalam format [lat, lng]
// id harus unik per peta jika ada banyak peta di halaman yang sama
export default function RoadPolyline({
  pickup,
  dropoff,
  color      = '#00C896',
  weight     = 4,
  opacity    = 0.85,
  dashArray,
  id         = 'route',
}) {
  const { routePoints } = useRoadRoute(pickup, dropoff)

  // Konversi [lat, lng] → [lng, lat] untuk GeoJSON / MapLibre
  const geojson = useMemo(() => {
    const pts = routePoints ?? (pickup && dropoff ? [pickup, dropoff] : [])
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: pts.map(([lat, lng]) => [lng, lat]),
      },
    }
  }, [routePoints, pickup, dropoff])

  if (!pickup || !dropoff) return null

  return (
    <Source id={id} type="geojson" data={geojson}>
      <Layer
        id={`${id}-line`}
        type="line"
        paint={{
          'line-color':     color,
          'line-width':     weight,
          'line-opacity':   opacity,
          ...(dashArray ? { 'line-dasharray': dashArray } : {}),
        }}
        layout={{ 'line-join': 'round', 'line-cap': 'round' }}
      />
    </Source>
  )
}
