import { useMemo } from 'react'
import { Polyline } from '@react-google-maps/api'
import useRoadRoute from '../hooks/useRoadRoute'

// pickup dan dropoff dalam format [lat, lng]
export default function RoadPolyline({
  pickup,
  dropoff,
  color   = '#00C896',
  weight  = 4,
  opacity = 0.85,
  dashArray,
}) {
  const { routePoints } = useRoadRoute(pickup, dropoff)

  const path = useMemo(() => {
    const pts = routePoints ?? (pickup && dropoff ? [pickup, dropoff] : [])
    return pts.map(([lat, lng]) => ({ lat, lng }))
  }, [routePoints, pickup, dropoff])

  if (!pickup || !dropoff || path.length < 2) return null

  return (
    <Polyline
      path={path}
      options={{
        strokeColor:   color,
        strokeWeight:  weight,
        strokeOpacity: opacity,
        geodesic:      true,
        ...(dashArray ? { icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: opacity, scale: weight / 2 }, offset: '0', repeat: '16px' }], strokeOpacity: 0 } : {}),
      }}
    />
  )
}
