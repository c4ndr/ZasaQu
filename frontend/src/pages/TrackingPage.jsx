import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GoogleMap, OverlayView } from '@react-google-maps/api'
import { fitGoogleMap } from '../utils/geo'
import RoadPolyline from '../components/RoadPolyline'
import MapSatToggle from '../components/MapSatToggle'
import useRoadRoute from '../hooks/useRoadRoute'
import useOrderTracking from '../hooks/useOrderTracking'
import api from '../services/api'
import ReportComplaintModal from '../components/ReportComplaintModal'

const COMPLAINT_WINDOW_HOURS = 24

// ── Konstanta status ──────────────────────────────────────────────────────────
const STATUS_STEPS = [
  { key: 'pending',     label: 'Mencari Mitra',      emoji: '🔍' },
  { key: 'accepted',    label: 'Diterima Mitra',      emoji: '✅' },
  { key: 'on_pickup',   label: 'Menuju Pickup',       emoji: '🚗' },
  { key: 'picked_up',   label: 'Barang Diambil',      emoji: '📦' },
  { key: 'on_delivery', label: 'Dalam Perjalanan',    emoji: '🚀' },
  { key: 'delivered',   label: 'Sampai Tujuan',       emoji: '🏁' },
  { key: 'completed',   label: 'Selesai',             emoji: '🎉' },
]
const STATUS_MAP = Object.fromEntries(STATUS_STEPS.map(s => [s.key, s]))

function formatRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

function MapsLink({ lat, lng, address, color = 'var(--k-sub)', fontSize = 12, style = {} }) {
  const url = (lat && lng)
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ color, fontSize, lineHeight: 1.4, textDecoration: 'none', display: 'flex', alignItems: 'flex-start', gap: 4, ...style }}>
      <span style={{ flex: 1 }}>{address}</span>
      <span style={{ fontSize: 10, color: '#4285F4', flexShrink: 0, marginTop: 2, opacity: 0.85 }}>↗</span>
    </a>
  )
}

function playStatusSound() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    [[660, 0], [880, 0.15], [1100, 0.3]].forEach(([freq, when]) => {
      const osc = ctx.createOscillator()
      osc.connect(gain)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.3, ctx.currentTime + when)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + 0.25)
      osc.start(ctx.currentTime + when)
      osc.stop(ctx.currentTime + when + 0.25)
    })
  } catch {}
}

const STATUS_COLOR_MAP = {
  accepted:    { bg: '#1a3a2a', border: '#00C896', text: '#00C896' },
  on_pickup:   { bg: '#2a2a1a', border: '#F6AD55', text: '#F6AD55' },
  picked_up:   { bg: '#2a2a1a', border: '#F6AD55', text: '#F6AD55' },
  on_delivery: { bg: '#1a1a3a', border: '#B794F4', text: '#B794F4' },
  delivered:   { bg: '#1a3a2a', border: '#00C896', text: '#00C896' },
  completed:   { bg: '#1a3a2a', border: '#00C896', text: '#00C896' },
  cancelled:   { bg: '#3a1a1a', border: '#F56565', text: '#F56565' },
}

function StatusNotif({ update, onDismiss }) {
  const colors = STATUS_COLOR_MAP[update.status] ?? { bg: '#1a1a2a', border: '#A0A0BC', text: '#A0A0BC' }

  useEffect(() => {
    playStatusSound()
    const t = setTimeout(onDismiss, 6000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        padding: '0 0 12px',
        background: `linear-gradient(180deg, ${colors.bg} 0%, rgba(12,12,22,0.98) 100%)`,
        borderBottom: `2px solid ${colors.border}`,
        boxShadow: `0 4px 40px ${colors.border}55`,
        animation: 'notifSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        cursor: 'pointer',
      }}>
      <style>{`
        @keyframes notifSlideIn { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes notifPulse { 0%,100% { box-shadow: 0 0 0 0 ${colors.border}55; } 50% { box-shadow: 0 0 0 10px ${colors.border}00; } }
        @keyframes notifBar { from { transform: scaleX(1); } to { transform: scaleX(0); } }
      `}</style>
      <div style={{ height: 3, background: colors.border, transformOrigin: 'left', animation: 'notifBar 6s linear forwards' }} />
      <div style={{ padding: '16px 20px 4px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 18, flexShrink: 0,
          background: `${colors.border}20`, border: `2px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
          animation: 'notifPulse 1.5s infinite',
        }}>
          {update.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: colors.border, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Update Order</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#E8E8F2', lineHeight: 1.4 }}>{update.message}</p>
        </div>
        <span style={{ fontSize: 18, color: '#A0A0BC', flexShrink: 0 }}>✕</span>
      </div>
    </div>
  )
}

const PHOTO_LABELS = { pickup: '📍 Tiba di Pickup', packing: '📦 Barang Dikemas', delivery: '🏁 Sampai Tujuan' }

function AuthedImg({ src, alt, style }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [status,  setStatus]  = useState('loading')
  const blobRef = useRef(null)

  useEffect(() => {
    if (!src) { setStatus('error'); return }
    let active = true
    setStatus('loading')
    api.get(src, { responseType: 'blob' })
      .then(res => {
        if (!active) return
        const url = URL.createObjectURL(res.data)
        blobRef.current = url
        setBlobUrl(url)
        setStatus('ready')
      })
      .catch(() => { if (active) setStatus('error') })
    return () => {
      active = false
      if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = null }
    }
  }, [src])

  if (status === 'ready') return <img src={blobUrl} alt={alt} style={style} />
  return (
    <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--k-card2)', objectFit: undefined }}>
      {status === 'loading'
        ? <div style={{ width: 16, height: 16, border: '2px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        : <span style={{ fontSize: 20, opacity: 0.5 }}>🖼️</span>
      }
    </div>
  )
}

function PhotoViewer({ photos, orderId, status }) {
  const [preview, setPreview] = useState(null)
  const isDelivered = ['delivered', 'completed'].includes(status)

  // Tampilkan section jika ada foto, ATAU jika sudah terkirim (menunggu foto mitra)
  if (!photos?.length && !isDelivered) return null

  const deliveryPhoto = photos?.find(p => p.stage === 'delivery')

  return (
    <>
      {preview && (
        <div onClick={() => setPreview(null)} style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AuthedImg src={preview} alt="Foto bukti" style={{ maxWidth: '95vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} />
          <button onClick={() => setPreview(null)} style={{
            position: 'absolute', top: 16, right: 16, width: 40, height: 40,
            borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', fontSize: 20, cursor: 'pointer',
          }}>✕</button>
        </div>
      )}
      <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '12px 14px', marginTop: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          📸 Bukti Pengiriman
        </p>

        {/* Foto bukti sampai — tampil besar di atas */}
        {deliveryPhoto ? (
          <button onClick={() => setPreview(`/orders/${orderId}/photos/delivery`)} style={{ width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'pointer', marginBottom: 10 }}>
            <AuthedImg
              src={`/orders/${orderId}/photos/delivery`}
              alt="Bukti sampai"
              style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12, border: '2px solid rgba(0,200,150,0.35)' }}
            />
            <p style={{ fontSize: 11, color: 'var(--k-accent)', fontWeight: 700, textAlign: 'center', marginTop: 4 }}>✓ Paket Sudah Sampai</p>
          </button>
        ) : (
          <div style={{ width: '100%', padding: '24px 0', background: 'var(--k-card2)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 10, border: '1px dashed var(--k-border)' }}>
            <span style={{ fontSize: 32, opacity: 0.3 }}>📷</span>
            <p style={{ fontSize: 12, color: 'var(--k-muted)', textAlign: 'center' }}>Foto bukti pengiriman belum tersedia</p>
          </div>
        )}

        {/* Foto pickup & packing — tampil kecil di bawah jika ada */}
        {photos?.some(p => ['pickup', 'packing'].includes(p.stage)) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {['pickup', 'packing'].map(stage => {
              const hasPhoto = photos.some(p => p.stage === stage)
              const url      = hasPhoto ? `/orders/${orderId}/photos/${stage}` : null
              return (
                <div key={stage}>
                  {url ? (
                    <button onClick={() => setPreview(url)} style={{ width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
                      <AuthedImg src={url} alt={PHOTO_LABELS[stage]} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(0,200,150,0.2)' }} />
                    </button>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '1', background: 'var(--k-card2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--k-border)' }}>
                      <span style={{ fontSize: 18, opacity: 0.3 }}>📷</span>
                    </div>
                  )}
                  <p style={{ fontSize: 10, color: url ? 'var(--k-accent)' : 'var(--k-muted)', textAlign: 'center', marginTop: 4, fontWeight: url ? 700 : 400 }}>
                    {url ? '✓' : '—'} {PHOTO_LABELS[stage].split(' ').slice(1).join(' ')}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

function getGpsBadge(order, gpsActive, mitraLocation) {
  if (!order) return { text: '—', color: 'var(--k-muted)', pulse: false }
  if (['pending'].includes(order.status))
    return { text: 'Mencari Mitra...', color: 'var(--k-muted)', pulse: false }
  if (['completed', 'cancelled'].includes(order.status))
    return { text: 'Order Selesai', color: 'var(--k-muted)', pulse: false }
  if (gpsActive)
    return { text: 'GPS Mitra Aktif', color: 'var(--k-accent)', pulse: true }
  if (mitraLocation && !gpsActive)
    return { text: 'GPS Mitra Terputus', color: 'var(--k-warn)', pulse: false }
  if (order.mitra && ['accepted', 'on_pickup', 'picked_up', 'on_delivery', 'delivered'].includes(order.status))
    return { text: 'Menunggu GPS Mitra', color: '#A0A0BC', pulse: false }
  return { text: 'GPS Tidak Aktif', color: 'var(--k-muted)', pulse: false }
}

function formatNotifMessage(n) {
  if (n.type === 'gps_lost') return 'GPS mitra terputus. Lokasi di peta mungkin tidak akurat. Hubungi mitra lewat chat jika perlu.'
  if (n.type === 'jastip_placed') return n.message || 'Titipan baru masuk ke sesi JastipQu.'
  return n.message || ''
}

// ── Marker MapLibre ───────────────────────────────────────────────────────────
function MitraMarkerEl() {
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%',
      background: '#3B82F6', border: '3px solid #fff',
      boxShadow: '0 4px 14px rgba(59,130,246,.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 20, userSelect: 'none',
    }}>🏍️</div>
  )
}

function PinMarkerEl({ color, emoji }) {
  return (
    <div style={{ position: 'relative', width: 36, height: 46, display: 'flex', justifyContent: 'center', userSelect: 'none' }}>
      <svg viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="46" style={{ position: 'absolute', top: 0, left: 0 }}>
        <path d="M18 1C9.163 1 2 8.163 2 17c0 10.8 16 28 16 28S34 27.8 34 17C34 8.163 26.837 1 18 1z" fill={color} stroke="white" strokeWidth="2" />
        <circle cx="18" cy="17" r="7" fill="white" />
      </svg>
      <span style={{ position: 'absolute', top: 8, fontSize: 14, zIndex: 1 }}>{emoji}</span>
    </div>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function TrackingPage() {
  const { id } = useParams()
  const mapRef  = useRef(null)
  const [order,      setOrder]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [follow,     setFollow]     = useState(true)
  const [panelOpen,  setPanelOpen]  = useState(true)
  const [mapType,    setMapType]    = useState('roadmap')
  const { mitraLocation, gpsActive, notifications, statusUpdate } = useOrderTracking(id)
  const [shownUpdate, setShownUpdate] = useState(null)
  const dismissNotif = useCallback(() => setShownUpdate(null), [])
  const [showComplaint, setShowComplaint] = useState(false)
  const [complaintSent, setComplaintSent] = useState(false)

  // Camera follow mitra
  useEffect(() => {
    if (!mitraLocation || !mapRef.current || !follow) return
    mapRef.current.panTo({ lat: mitraLocation.lat, lng: mitraLocation.lng })
  }, [mitraLocation, follow])

  useEffect(() => {
    api.get(`/orders/${id}`).then(r => setOrder(r.data)).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!statusUpdate) return
    setShownUpdate(statusUpdate)
    api.get(`/orders/${id}`).then(r => setOrder(r.data)).catch(() => {})
  }, [statusUpdate, id])

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Memuat peta...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!order) return null

  const pickup   = [parseFloat(order.pickup_lat),  parseFloat(order.pickup_lng)]
  const dropoff  = [parseFloat(order.dropoff_lat), parseFloat(order.dropoff_lng)]
  const initLng  = mitraLocation?.lng ?? pickup[1]
  const initLat  = mitraLocation?.lat ?? pickup[0]

  const currentStep  = STATUS_STEPS.findIndex(s => s.key === order.status)
  const isDone       = ['completed', 'cancelled'].includes(order.status)
  const isCancelled  = order.status === 'cancelled'
  const canComplain  = order.status === 'completed' && order.completed_at
    && (Date.now() - new Date(order.completed_at).getTime()) / 36e5 <= COMPLAINT_WINDOW_HOURS
    && !complaintSent
  const gpsBadge     = getGpsBadge(order, gpsActive, mitraLocation)
  const showGpsHint  = order.mitra && !gpsActive && !mitraLocation &&
                       ['accepted','on_pickup','picked_up','on_delivery'].includes(order.status)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {shownUpdate && <StatusNotif update={shownUpdate} onDismiss={dismissNotif} />}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-gps { 0%,100% { box-shadow: 0 0 0 0 rgba(0,200,150,0.4); } 50% { box-shadow: 0 0 0 8px rgba(0,200,150,0); } }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '12px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/orders" style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(25,25,39,0.92)', border: '1px solid rgba(37,37,56,0.8)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--k-sub)', textDecoration: 'none', fontSize: 18,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>←</Link>
          <div style={{
            padding: '8px 14px', borderRadius: 12,
            background: 'rgba(25,25,39,0.92)', border: '1px solid rgba(37,37,56,0.8)',
            backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', lineHeight: 1.2 }}>Lacak Order</p>
            <p style={{ fontSize: 11, color: 'var(--k-muted)', fontFamily: 'monospace' }}>{order.order_number}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setFollow(f => !f)} style={{
            width: 40, height: 40, borderRadius: 12,
            background: follow ? 'rgba(0,200,150,0.2)' : 'rgba(25,25,39,0.92)',
            border: `1px solid ${follow ? 'rgba(0,200,150,0.4)' : 'rgba(37,37,56,0.8)'}`,
            backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 18, color: follow ? 'var(--k-accent)' : 'var(--k-muted)',
          }} title={follow ? 'Berhenti ikuti mitra' : 'Ikuti mitra'}>🎯</button>

          {order.mitra && (
            <Link
              to={`/orders/${id}/chat`}
              state={{ otherName: order.mitra?.name }}
              style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#00C896,#00A87D)', boxShadow: '0 4px 16px rgba(0,200,150,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 20 }}
            >💬</Link>
          )}
        </div>
      </nav>

      {/* ── GPS status badge ── */}
      <div style={{
        position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 16px', borderRadius: 100, whiteSpace: 'nowrap',
        background: 'rgba(25,25,39,0.92)',
        border: `1px solid ${gpsActive ? 'rgba(0,200,150,0.35)' : mitraLocation ? 'rgba(246,173,85,0.35)' : 'rgba(37,37,56,0.8)'}`,
        backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: gpsBadge.color,
          animation: gpsBadge.pulse ? 'pulse-gps 2s infinite' : 'none',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: gpsBadge.color }}>{gpsBadge.text}</span>
      </div>

      {/* ── Notifikasi ── */}
      {notifications.length > 0 && (
        <div style={{ position: 'absolute', top: 112, left: 12, right: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {notifications.slice(0, 2).map((n, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 14px', borderRadius: 14,
              background: n.type === 'gps_lost' ? 'rgba(246,173,85,0.15)' : 'rgba(0,200,150,0.12)',
              border: `1px solid ${n.type === 'gps_lost' ? 'rgba(246,173,85,0.35)' : 'rgba(0,200,150,0.3)'}`,
              backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            }}>
              <span style={{ flexShrink: 0, fontSize: 15 }}>{n.type === 'gps_lost' ? '⚠️' : '📦'}</span>
              <p style={{ flex: 1, fontSize: 12, lineHeight: 1.5, fontWeight: 600, color: n.type === 'gps_lost' ? 'var(--k-warn)' : 'var(--k-accent)' }}>
                {formatNotifMessage(n)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Peta Google Maps ── */}
      <div style={{ flex: 1, minHeight: panelOpen ? 'calc(100vh - 340px)' : 'calc(100vh - 72px)', transition: 'min-height 0.3s', position: 'relative' }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%', minHeight: 300 }}
          center={{ lat: initLat, lng: initLng }}
          zoom={14}
          options={{ disableDefaultUI: true, gestureHandling: 'greedy', clickableIcons: false, mapTypeId: mapType }}
          onLoad={(map) => {
            mapRef.current = map
            const pts = [pickup, dropoff]
            if (mitraLocation) pts.push([mitraLocation.lat, mitraLocation.lng])
            fitGoogleMap(map, pts, 60)
          }}
        >
          <RoadPolyline pickup={pickup} dropoff={dropoff} color="#00C896" />

          {mitraLocation && (
            <OverlayView position={{ lat: mitraLocation.lat, lng: mitraLocation.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
              <MitraMarkerEl />
            </OverlayView>
          )}

          <OverlayView position={{ lat: pickup[0], lng: pickup[1] }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h })}>
            <PinMarkerEl color="#00C896" emoji="📍" />
          </OverlayView>

          <OverlayView position={{ lat: dropoff[0], lng: dropoff[1] }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h })}>
            <PinMarkerEl color="#F56565" emoji="🏁" />
          </OverlayView>
        </GoogleMap>

        <MapSatToggle mapType={mapType} onToggle={() => setMapType(t => t === 'roadmap' ? 'hybrid' : 'roadmap')} />

        {showGpsHint && (
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 4, padding: '10px 16px', borderRadius: 14, whiteSpace: 'nowrap',
            background: 'rgba(25,25,39,0.92)', border: '1px solid rgba(246,173,85,0.3)',
            backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 14 }}>⏳</span>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-warn)' }}>Menunggu mitra mengaktifkan GPS...</p>
          </div>
        )}
      </div>

      {/* ── Tombol buka/tutup panel ── */}
      <button onClick={() => setPanelOpen(o => !o)} style={{
        position: 'absolute', bottom: panelOpen ? 340 : 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1001, padding: '8px 20px', borderRadius: 100,
        background: 'rgba(25,25,39,0.95)', border: '1px solid rgba(37,37,56,0.8)',
        backdropFilter: 'blur(12px)', color: 'var(--k-sub)', fontSize: 12, fontWeight: 700,
        cursor: 'pointer', transition: 'bottom 0.3s', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {panelOpen ? '▼ Sembunyikan' : '▲ Detail Order'}
      </button>

      {/* ── Panel info bawah ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        maxHeight: panelOpen ? 340 : 0, overflow: 'hidden',
        transition: 'max-height 0.3s ease',
        background: 'var(--k-surface)', borderTop: '1px solid var(--k-border)',
        zIndex: 1000,
      }}>
        <div style={{ padding: '16px 16px 28px', overflowY: 'auto', maxHeight: 340 }}>

          {!isCancelled && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 8 }}>
                {STATUS_STEPS.filter(s => !['completed'].includes(s.key)).map((s, i, arr) => {
                  const stepIdx   = STATUS_STEPS.findIndex(x => x.key === s.key)
                  const isActive  = stepIdx === currentStep
                  const isDoneStep = stepIdx < currentStep
                  return (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : 'none' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                        background: isDoneStep ? 'var(--k-accent)' : isActive ? 'rgba(0,200,150,0.2)' : 'var(--k-card2)',
                        border: `2px solid ${isDoneStep ? 'var(--k-accent)' : isActive ? 'var(--k-accent)' : 'var(--k-border)'}`,
                        transition: 'all 0.3s',
                      }}>
                        {isDoneStep ? '✓' : s.emoji}
                      </div>
                      {i < arr.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: isDoneStep ? 'var(--k-accent)' : 'var(--k-border)', transition: 'background 0.3s' }} />
                      )}
                    </div>
                  )
                })}
              </div>
              <p style={{ color: 'var(--k-text)', fontSize: 14, fontWeight: 700 }}>
                {STATUS_MAP[order.status]?.emoji} {STATUS_MAP[order.status]?.label ?? order.status}
              </p>
            </div>
          )}

          {isCancelled && (
            <div style={{ background: 'rgba(245,101,101,0.08)', border: '1px solid rgba(245,101,101,0.2)', borderRadius: 14, padding: '12px 14px', marginBottom: 14, color: 'var(--k-danger)', fontSize: 14, fontWeight: 700 }}>
              ❌ Order Dibatalkan
            </div>
          )}

          <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--k-accent)', flexShrink: 0 }} />
                <div style={{ width: 2, height: 18, background: 'var(--k-border)', margin: '2px 0' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F56565', flexShrink: 0 }} />
              </div>
              <div style={{ flex: 1 }}>
                <MapsLink lat={order.pickup_lat} lng={order.pickup_lng} address={order.pickup_address} style={{ marginBottom: 10 }} />
                <MapsLink lat={order.dropoff_lat} lng={order.dropoff_lng} address={order.dropoff_address} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--k-border)', paddingTop: 10 }}>
              <div>
                <p style={{ color: 'var(--k-muted)', fontSize: 11 }}>Ongkir</p>
                <p style={{ color: 'var(--k-text)', fontWeight: 700, fontSize: 14 }}>{formatRp(order.shipping_fee)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'var(--k-muted)', fontSize: 11 }}>Bayar</p>
                <p style={{ color: 'var(--k-text)', fontWeight: 700, fontSize: 14 }}>
                  {order.payment_method === 'cod' ? 'COD' : 'Wallet'}
                </p>
              </div>
            </div>
          </div>

          {order.jastip_discount_applied > 0 && (
            <div style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: 14, padding: '10px 14px', marginBottom: 12 }}>
              <p style={{ color: 'var(--k-accent)', fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
                ⚡ Diskon JastipQu: {formatRp(order.jastip_discount_applied)}
              </p>
              <p style={{ color: 'var(--k-muted)', fontSize: 12 }}>
                Anda membayar: {formatRp(order.shipping_fee - order.jastip_discount_applied)}
              </p>
            </div>
          )}

          {order.mitra && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '12px 14px' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '2px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--k-info)', flexShrink: 0 }}>
                {order.mitra.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--k-text)', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{order.mitra.name}</p>
                <p style={{ color: 'var(--k-muted)', fontSize: 12, textTransform: 'capitalize' }}>
                  {order.vehicle_type === 'motor' ? '🏍️ Motor' : '🚗 Mobil'}
                </p>
              </div>
              {gpsActive && (
                <span style={{ padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: 'rgba(0,200,150,0.1)', color: 'var(--k-accent)' }}>Online</span>
              )}
            </div>
          )}

          <PhotoViewer photos={order.photos} orderId={order.id} status={order.status} />

          {canComplain && (
            <button onClick={() => setShowComplaint(true)} style={{
              width: '100%', marginTop: 12, padding: '13px', borderRadius: 14,
              border: '1.5px solid rgba(246,173,85,0.4)', background: 'rgba(246,173,85,0.06)',
              color: '#F6AD55', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>
              ⚠️ Laporkan Masalah
            </button>
          )}
          {complaintSent && (
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--k-accent)', fontWeight: 700, marginTop: 12 }}>
              ✓ Laporan sudah dikirim, tim kami akan meninjau
            </p>
          )}
        </div>
      </div>

      {showComplaint && (
        <ReportComplaintModal
          orderType="zasago"
          orderId={order.id}
          onClose={() => setShowComplaint(false)}
          onSuccess={() => { setShowComplaint(false); setComplaintSent(true) }}
        />
      )}
    </div>
  )
}
