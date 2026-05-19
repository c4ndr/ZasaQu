import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import RoadPolyline from './RoadPolyline'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const originIcon = L.divIcon({
  html: `<div style="width:30px;height:30px;border-radius:50%;background:#00C896;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,200,150,0.5);display:flex;align-items:center;justify-content:center;font-size:13px;">A</div>`,
  iconSize: [30, 30], iconAnchor: [15, 15], className: '',
})
const destIcon = L.divIcon({
  html: `<div style="width:30px;height:30px;border-radius:50%;background:#818CF8;border:3px solid #fff;box-shadow:0 2px 8px rgba(129,140,248,0.5);display:flex;align-items:center;justify-content:center;font-size:13px;">B</div>`,
  iconSize: [30, 30], iconAnchor: [15, 15], className: '',
})

function FitRoute({ origin, dest }) {
  const map = useMap()
  useEffect(() => {
    if (origin && dest) map.fitBounds([origin, dest], { padding: [32, 32] })
  }, [origin, dest, map])
  return null
}

export default function SessionRouteMap({ session, height = 180 }) {
  const origin = [parseFloat(session.origin_lat),      parseFloat(session.origin_lng)]
  const dest   = [parseFloat(session.destination_lat), parseFloat(session.destination_lng)]

  const valid = origin.every(v => !isNaN(v)) && dest.every(v => !isNaN(v))
  if (!valid) return null

  return (
    <div style={{ height, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--k-border)' }}>
      <MapContainer
        center={origin}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
        dragging={true}
        scrollWheelZoom={false}
        doubleClickZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RoadPolyline pickup={origin} dropoff={dest} color="#818CF8" weight={4} opacity={0.85} />
        <Marker position={origin} icon={originIcon} />
        <Marker position={dest}   icon={destIcon} />
        <FitRoute origin={origin} dest={dest} />
      </MapContainer>
    </div>
  )
}
