import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, Marker, useMap } from 'react-leaflet'
import SatelliteTiles from '../../components/SatelliteTiles'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../../services/api'
import echo from '../../services/echo'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const mitraIcon = L.divIcon({
  html: `<div style="width:40px;height:40px;border-radius:50%;background:#F97316;border:3px solid #fff;box-shadow:0 4px 12px rgba(249,115,22,0.5);display:flex;align-items:center;justify-content:center;font-size:18px;">🏍️</div>`,
  iconSize: [40, 40], iconAnchor: [20, 20], className: '',
})
const merchantPin = L.divIcon({
  html: `<div style="width:36px;height:36px;border-radius:50%;background:#00C896;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px;">🏪</div>`,
  iconSize: [36, 36], iconAnchor: [18, 18], className: '',
})
const destPin = L.divIcon({
  html: `<div style="width:36px;height:36px;border-radius:50%;background:#F56565;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px;">📍</div>`,
  iconSize: [36, 36], iconAnchor: [18, 18], className: '',
})

function MapFollower({ center }) {
  const map = useMap()
  const first = useRef(true)
  useEffect(() => {
    if (!center) return
    if (first.current) { map.setView([center.lat, center.lng], 15); first.current = false }
    else map.panTo([center.lat, center.lng], { animate: true, duration: 1 })
  }, [center])
  return null
}

function fmtRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

function StarRow({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, color: 'var(--k-sub)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1,2,3,4,5].map(s => (
          <span key={s} onClick={() => onChange(s)} style={{ fontSize: 28, cursor: 'pointer', opacity: s <= value ? 1 : 0.3 }}>⭐</span>
        ))}
      </div>
    </div>
  )
}

const STATUS_META = {
  pending:           { label: 'Menunggu Merchant',  icon: '⏳', desc: 'Menunggu merchant konfirmasi pesananmu.' },
  merchant_accepted: { label: 'Diterima!',           icon: '✅', desc: 'Merchant menerima pesananmu.' },
  preparing:         { label: 'Sedang Dimasak',      icon: '👨‍🍳', desc: 'Merchant sedang menyiapkan pesananmu.' },
  ready_for_pickup:  { label: 'Siap Diambil',        icon: '🎉', desc: 'Pesanan siap! Mitra sedang dicari.' },
  mitra_on_pickup:   { label: 'Mitra Menuju Merchant',icon:'🏍️', desc: 'Mitra sedang menuju merchant.' },
  picked_up:         { label: 'Pesanan Diambil',     icon: '📦', desc: 'Mitra sudah mengambil pesananmu.' },
  on_delivery:       { label: 'Dalam Perjalanan',    icon: '🚀', desc: 'Pesananmu sedang dalam perjalanan!' },
  delivered:         { label: 'Sudah Tiba!',         icon: '🎊', desc: 'Pesananmu sudah diantar. Konfirmasi sekarang?' },
  completed:         { label: 'Selesai',             icon: '⭐', desc: 'Pesanan selesai. Terima kasih!' },
  cancelled:         { label: 'Dibatalkan',          icon: '❌', desc: 'Pesanan dibatalkan.' },
  rejected:          { label: 'Ditolak Merchant',    icon: '❌', desc: 'Merchant menolak pesananmu. Saldo dikembalikan.' },
}

export default function FoodTrackingPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const [order,   setOrder]   = useState(null)
  const [gps,     setGps]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState(null)
  const [rating,  setRating]  = useState({ merchant_score: 0, mitra_score: 0 })
  const [rated,   setRated]   = useState(false)
  const pollRef = useRef(null)

  const loadOrder = useCallback(async () => {
    try {
      const res = await api.get(`/food/orders/${id}`)
      setOrder(res.data.data)
      setGps(res.data.mitra_gps)
    } catch { navigate('/food/orders') }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => {
    loadOrder()
    api.get(`/food/orders/${id}/rating`)
      .then(r => { if (r.data.rated) setRated(true) })
      .catch(() => {})

    // WebSocket real-time: status update + GPS mitra
    const channel = echo.channel(`food.${id}`)
    channel.listen('.food.order.status', (e) => {
      setOrder(prev => prev ? { ...prev, status: e.status, estimated_prep_minutes: e.estimated_prep_minutes ?? prev.estimated_prep_minutes, mitra_id: e.mitra_id ?? prev.mitra_id } : prev)
    })
    channel.listen('.mitra.location', (e) => {
      setGps({ lat: e.lat, lng: e.lng })
    })

    // Polling fallback tiap 30 detik (bukan 10 detik) karena WebSocket sudah handle real-time
    pollRef.current = setInterval(loadOrder, 30000)
    return () => {
      clearInterval(pollRef.current)
      echo.leave(`food.${id}`)
    }
  }, [loadOrder, id])

  async function handleConfirm() {
    try {
      await api.post(`/food/orders/${id}/confirm`)
      showToast('success', 'Pesanan dikonfirmasi selesai!')
      loadOrder()
    } catch (e) { showToast('error', e.response?.data?.message || 'Gagal.') }
  }

  async function handleCancel() {
    if (!confirm('Batalkan pesanan ini?')) return
    try {
      await api.post(`/food/orders/${id}/cancel`)
      showToast('success', 'Pesanan dibatalkan.')
      loadOrder()
    } catch (e) { showToast('error', e.response?.data?.message || 'Gagal.') }
  }

  async function handleRate() {
    if (!rating.merchant_score) { showToast('error', 'Beri rating untuk merchant.'); return }
    try {
      await api.post(`/food/orders/${id}/rate`, {
        merchant_score:   rating.merchant_score,
        merchant_comment: rating.merchant_comment,
        mitra_score:      rating.mitra_score || undefined,
        mitra_comment:    rating.mitra_comment,
      })
      setRated(true)
      showToast('success', 'Rating dikirim. Terima kasih!')
    } catch (e) { showToast('error', e.response?.data?.message || 'Gagal.') }
  }

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--k-sub)' }}>Memuat...</p></div>
  if (!order)  return null

  const sm = STATUS_META[order.status] ?? STATUS_META.pending
  const showMap = gps && ['mitra_on_pickup','picked_up','on_delivery'].includes(order.status)
  const showConfirm = order.status === 'delivered'
  const showCancel  = order.status === 'pending'
  const showRating  = order.status === 'completed' && !rated

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 20 }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14,
          background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff',
        }}>{toast.msg}</div>
      )}

      {/* Back header */}
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)' }}>
        <button onClick={() => navigate('/food/orders')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22 }}>‹</button>
        <div style={{ fontWeight: 800, fontSize: 17 }}>Lacak Pesanan</div>
      </div>

      {/* Peta GPS */}
      {showMap && (
        <div style={{ height: 240 }}>
          <MapContainer center={[gps.lat, gps.lng]} zoom={15} style={{ height: '100%' }} zoomControl={false}>
            <SatelliteTiles />
            <Marker position={[gps.lat, gps.lng]} icon={mitraIcon} />
            {order.merchant?.lat && order.merchant?.lng && (
              <Marker position={[order.merchant.lat, order.merchant.lng]} icon={merchantPin} />
            )}
            <Marker position={[order.delivery_lat, order.delivery_lng]} icon={destPin} />
            <MapFollower center={gps} />
          </MapContainer>
        </div>
      )}

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Status card */}
        <div style={{
          padding: '20px', borderRadius: 16, background: 'var(--k-card)',
          border: '1.5px solid var(--k-border)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>{sm.icon}</div>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{sm.label}</div>
          <div style={{ fontSize: 14, color: 'var(--k-sub)' }}>{sm.desc}</div>
          {order.estimated_prep_minutes && ['merchant_accepted','preparing'].includes(order.status) && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#F97316', fontWeight: 700 }}>
              ⏱ Estimasi siap ~{order.estimated_prep_minutes} menit
            </div>
          )}
        </div>

        {/* Info merchant & order */}
        <div style={{ padding: '16px', borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)' }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>{order.merchant?.name}</div>
          {order.items?.map(i => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span>{i.item_name} ×{i.quantity}</span>
              <span style={{ fontWeight: 600 }}>Rp {(i.item_price * i.quantity).toLocaleString('id-ID')}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--k-border)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
            <span>Total</span>
            <span style={{ color: '#F97316' }}>{fmtRp(order.total_amount)}</span>
          </div>
        </div>

        {/* Aksi */}
        {showConfirm && (
          <button onClick={handleConfirm} style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: '#00C896', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}>✓ Konfirmasi Pesanan Diterima</button>
        )}

        {showCancel && (
          <button onClick={handleCancel} style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: 'rgba(245,101,101,0.1)', color: '#F56565', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}>Batalkan Pesanan</button>
        )}

        {/* Rating */}
        {showRating && (
          <div style={{ padding: '20px', borderRadius: 16, background: 'var(--k-card)', border: '1.5px solid var(--k-border)' }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Beri Rating</div>
            <StarRow label="Merchant" value={rating.merchant_score}
              onChange={s => setRating(r => ({ ...r, merchant_score: s }))} />
            {order.mitra_id && (
              <StarRow label="Mitra Delivery" value={rating.mitra_score}
                onChange={s => setRating(r => ({ ...r, mitra_score: s }))} />
            )}
            <button onClick={handleRate} style={{
              width: '100%', marginTop: 8, padding: '12px', borderRadius: 12, border: 'none',
              background: '#F97316', color: '#fff', fontWeight: 700, cursor: 'pointer',
            }}>Kirim Rating</button>
          </div>
        )}
      </div>
    </div>
  )
}
