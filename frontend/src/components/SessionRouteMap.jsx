import { useRef, useEffect } from 'react'
import Map, { Marker } from 'react-map-gl/maplibre'
import { SATELLITE_STYLE } from '../utils/mapStyle'
import RoadPolyline from './RoadPolyline'
import { fitPoints } from '../utils/geo'

const originStyle = { width: 30, height: 30, borderRadius: '50%', background: '#00C896', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,200,150,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }
const destStyle   = { ...originStyle, background: '#818CF8', boxShadow: '0 2px 8px rgba(129,140,248,.5)' }

export default function SessionRouteMap({ session, height = 180 }) {
  const mapRef = useRef(null)

  const originLat = parseFloat(session.origin_lat)
  const originLng = parseFloat(session.origin_lng)
  const destLat   = parseFloat(session.destination_lat)
  const destLng   = parseFloat(session.destination_lng)

  if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) return null

  const origin = [originLat, originLng]
  const dest   = [destLat,   destLng]

  // Fit bounds setelah map siap
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    const fit = () => fitPoints(map, [origin, dest], 40)
    if (map.loaded()) { fit() } else { map.once('load', fit) }
  }, []) // eslint-disable-line

  return (
    <div style={{ height, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--k-border)' }}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: originLng, latitude: originLat, zoom: 12 }}
        mapStyle={SATELLITE_STYLE}
        style={{ width: '100%', height: '100%' }}
        interactive={false}
        attributionControl={false}
      >
        <RoadPolyline pickup={origin} dropoff={dest} color="#818CF8" weight={4} opacity={0.85} id="session-route" />
        <Marker longitude={originLng} latitude={originLat} anchor="center">
          <div style={originStyle}>A</div>
        </Marker>
        <Marker longitude={destLng} latitude={destLat} anchor="center">
          <div style={destStyle}>B</div>
        </Marker>
      </Map>
    </div>
  )
}
