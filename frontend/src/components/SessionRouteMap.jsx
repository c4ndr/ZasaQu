import { useRef, useState } from 'react'
import { GoogleMap, OverlayView } from '@react-google-maps/api'
import RoadPolyline from './RoadPolyline'
import MapSatToggle from './MapSatToggle'
import { fitGoogleMap } from '../utils/geo'

const originStyle = { width: 30, height: 30, borderRadius: '50%', background: '#00C896', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,200,150,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, transform: 'translate(-50%,-50%)' }
const destStyle   = { ...originStyle, background: '#818CF8', boxShadow: '0 2px 8px rgba(129,140,248,.5)' }

const MAP_OPTIONS = { disableDefaultUI: true, gestureHandling: 'none', clickableIcons: false }

export default function SessionRouteMap({ session, height = 180 }) {
  const mapRef = useRef(null)
  const [mapType, setMapType] = useState('roadmap')

  const originLat = parseFloat(session.origin_lat)
  const originLng = parseFloat(session.origin_lng)
  const destLat   = parseFloat(session.destination_lat)
  const destLng   = parseFloat(session.destination_lng)

  if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) return null

  const origin = [originLat, originLng]
  const dest   = [destLat,   destLng]

  const onLoad = (map) => {
    mapRef.current = map
    fitGoogleMap(map, [origin, dest], 40)
  }

  return (
    <div style={{ height, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--k-border)', position: 'relative' }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={{ lat: originLat, lng: originLng }}
        zoom={12}
        options={{ ...MAP_OPTIONS, mapTypeId: mapType }}
        onLoad={onLoad}
      >
        <RoadPolyline pickup={origin} dropoff={dest} color="#818CF8" weight={4} opacity={0.85} />
        <OverlayView position={{ lat: originLat, lng: originLng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
          <div style={originStyle}>A</div>
        </OverlayView>
        <OverlayView position={{ lat: destLat, lng: destLng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
          <div style={destStyle}>B</div>
        </OverlayView>
      </GoogleMap>
      <MapSatToggle mapType={mapType} onToggle={() => setMapType(t => t === 'roadmap' ? 'hybrid' : 'roadmap')} />
    </div>
  )
}
