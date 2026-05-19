import { useEffect, useState } from 'react'
import echo from '../services/echo'
import api from '../services/api'
import { showOrderStatusNotif } from '../utils/systemNotif'

export default function useOrderTracking(orderId) {
  const [mitraLocation,  setMitraLocation]  = useState(null)
  const [gpsActive,      setGpsActive]      = useState(false)
  const [notifications,  setNotifications]  = useState([])
  const [sessionClosed,  setSessionClosed]  = useState(null)
  const [statusUpdate,   setStatusUpdate]   = useState(null)   // { status, message, emoji }

  // Poll lokasi awal dari server
  useEffect(() => {
    if (!orderId) return
    api.get(`/orders/${orderId}/location`).then(r => {
      if (r.data.gps_active) {
        setMitraLocation(r.data.location)
        setGpsActive(true)
      }
    }).catch(() => {})
  }, [orderId])

  // Subscribe ke channel WebSocket
  useEffect(() => {
    if (!orderId) return

    const channel = echo.channel(`orders.${orderId}`)

    // Update lokasi mitra real-time
    channel.listen('.mitra.location', (data) => {
      setMitraLocation({ lat: data.lat, lng: data.lng, ts: data.timestamp })
      setGpsActive(true)
    })

    // GPS mitra mati → sesi jastip tutup
    channel.listen('.jastip.session.closed', (data) => {
      setGpsActive(false)
      setSessionClosed(data)
      setNotifications(prev => [{ type: 'gps_lost', message: data.message, ts: Date.now() }, ...prev])
    })

    // Titipan jastip baru masuk
    channel.listen('.jastip.order.placed', (data) => {
      setNotifications(prev => [{ type: 'jastip_placed', ...data, ts: Date.now() }, ...prev])
    })

    // Status order berubah — notifikasi mencolok ke pelanggan
    channel.listen('.order.status.updated', (data) => {
      setStatusUpdate({ ...data, ts: Date.now() })
      showOrderStatusNotif(data)   // system notif saat browser minimize
    })

    return () => {
      echo.leave(`orders.${orderId}`)
    }
  }, [orderId])

  return { mitraLocation, gpsActive, notifications, sessionClosed, statusUpdate }
}
