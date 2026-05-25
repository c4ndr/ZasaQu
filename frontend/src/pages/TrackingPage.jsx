import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapContainer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import SatelliteTiles from '../components/SatelliteTiles'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import useOrderTracking from '../hooks/useOrderTracking'
import api from '../services/api'

// ── Fix ikon Leaflet ──────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ── Ikon SVG custom ───────────────────────────────────────────────────────────
const mitraIcon = L.divIcon({
  html: `<div style="
    width:44px;height:44px;border-radius:50%;
    background:#3B82F6;border:3px solid #fff;
    box-shadow:0 4px 14px rgba(59,130,246,0.5);
    display:flex;align-items:center;justify-content:center;
    font-size:20px;
  ">🏍️</div>`,
  iconSize: [44, 44], iconAnchor: [22, 22], className: '',
})

const makePin = (color, emoji) => L.divIcon({
  html: `<div style="position:relative;width:36px;height:46px;display:flex;justify-content:center">
    <svg viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="46" style="position:absolute;top:0;left:0">
      <path d="M18 1C9.163 1 2 8.163 2 17c0 10.8 16 28 16 28S34 27.8 34 17C34 8.163 26.837 1 18 1z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="18" cy="17" r="7" fill="white"/>
    </svg>
    <span style="position:absolute;top:8px;font-size:14px;z-index:1">${emoji}</span>
  </div>`,
  iconSize: [36, 46], iconAnchor: [18, 46], className: '',
})

const pickupPin  = makePin('#00C896', '🟢')
const dropoffPin = makePin('#F56565', '🔴')

// ── Follow mitra di peta ──────────────────────────────────────────────────────
function MapFollower({ center, follow }) {
  const map = useMap()
  const firstRun = useRef(true)
  useEffect(() => {
    if (!center) return
    if (firstRun.current || follow) {
      map.flyTo([center.lat, center.lng], map.getZoom() < 14 ? 15 : map.getZoom(), { duration: 1 })
      firstRun.current = false
    }
  }, [center, follow, map])
  return null
}

// ── Fit bounds ke semua marker ────────────────────────────────────────────────
function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 2) return
    try { map.fitBounds(points, { padding: [50, 50] }) } catch {}
  }, []) // eslint-disable-line
  return null
}

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
    // Tiga nada naik — terasa seperti notif penting
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
        @keyframes notifSlideIn {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes notifPulse {
          0%,100% { box-shadow: 0 0 0 0 ${colors.border}55; }
          50%      { box-shadow: 0 0 0 10px ${colors.border}00; }
        }
      `}</style>

      {/* Progress bar countdown 6 detik */}
      <div style={{
        height: 3, background: colors.border, transformOrigin: 'left',
        animation: 'notifBar 6s linear forwards',
      }} />
      <style>{`
        @keyframes notifBar { from { transform: scaleX(1); } to { transform: scaleX(0); } }
      `}</style>

      <div style={{ padding: '16px 20px 4px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 18, flexShrink: 0,
          background: `${colors.border}20`,
          border: `2px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
          animation: 'notifPulse 1.5s infinite',
        }}>
          {update.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: colors.border, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Update Order
          </p>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#E8E8F2', lineHeight: 1.4 }}>
            {update.message}
          </p>
        </div>
        <span style={{ fontSize: 18, color: '#A0A0BC', flexShrink: 0 }}>✕</span>
      </div>
    </div>
  )
}

const PHOTO_LABELS = { pickup: '📍 Tiba di Pickup', packing: '📦 Barang Dikemas', delivery: '🏁 Sampai Tujuan' }

// Fetch gambar via Axios agar Bearer token ikut dikirim ke endpoint authenticated
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

function PhotoViewer({ photos, orderId }) {
  const [preview, setPreview] = useState(null)
  if (!photos?.length) return null

  return (
    <>
      {/* Lightbox */}
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
          📸 Foto Bukti Pengiriman
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {['pickup', 'packing', 'delivery'].map(stage => {
            const hasPhoto = photos.some(p => p.stage === stage)
            const url      = hasPhoto ? `/orders/${orderId}/photos/${stage}` : null
            return (
              <div key={stage}>
                {url ? (
                  <button onClick={() => setPreview(url)} style={{ width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
                    <AuthedImg
                      src={url}
                      alt={PHOTO_LABELS[stage]}
                      style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10, border: '2px solid rgba(0,200,150,0.3)' }}
                    />
                  </button>
                ) : (
                  <div style={{ width: '100%', aspectRatio: '1', background: 'var(--k-card2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--k-border)' }}>
                    <span style={{ fontSize: 22, opacity: 0.4 }}>📷</span>
                  </div>
                )}
                <p style={{ fontSize: 10, color: url ? 'var(--k-accent)' : 'var(--k-muted)', textAlign: 'center', marginTop: 4, fontWeight: url ? 700 : 400 }}>
                  {url ? '✓' : '—'} {PHOTO_LABELS[stage].split(' ').slice(1).join(' ')}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Teks badge GPS berdasarkan konteks ───────────────────────────────────────
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

// ── Pesan notifikasi GPS yang lebih jelas ─────────────────────────────────────
function formatNotifMessage(n) {
  if (n.type === 'gps_lost')
    return 'GPS mitra terputus. Lokasi di peta mungkin tidak akurat. Hubungi mitra lewat chat jika perlu.'
  if (n.type === 'jastip_placed')
    return n.message || 'Titipan baru masuk ke sesi JastipQu.'
  return n.message || ''
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function TrackingPage() {
  const { id } = useParams()
  const [order,      setOrder]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [follow,     setFollow]     = useState(true)
  const [panelOpen,  setPanelOpen]  = useState(true)
  const { mitraLocation, gpsActive, notifications, statusUpdate } = useOrderTracking(id)
  const [shownUpdate, setShownUpdate] = useState(null)
  const dismissNotif = useCallback(() => setShownUpdate(null), [])

  useEffect(() => {
    api.get(`/orders/${id}`).then(r => setOrder(r.data)).finally(() => setLoading(false))
  }, [id])

  // Saat status berubah via WebSocket — refresh order + tampilkan notifikasi
  useEffect(() => {
    if (!statusUpdate) return
    setShownUpdate(statusUpdate)
    api.get(`/orders/${id}`).then(r => setOrder(r.data)).catch(() => {})
  }, [statusUpdate, id])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Memuat peta...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!order) return null

  const mapCenter   = mitraLocation
    ? [mitraLocation.lat, mitraLocation.lng]
    : [order.pickup_lat, order.pickup_lng]

  const allPoints = [
    [order.pickup_lat, order.pickup_lng],
    [order.dropoff_lat, order.dropoff_lng],
  ]

  const currentStep  = STATUS_STEPS.findIndex(s => s.key === order.status)
  const isDone       = ['completed', 'cancelled'].includes(order.status)
  const isCancelled  = order.status === 'cancelled'
  const gpsBadge     = getGpsBadge(order, gpsActive, mitraLocation)
  const showGpsHint  = order.mitra && !gpsActive && !mitraLocation &&
                       ['accepted','on_pickup','picked_up','on_delivery'].includes(order.status)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {shownUpdate && <StatusNotif update={shownUpdate} onDismiss={dismissNotif} />}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-gps { 0%,100% { box-shadow: 0 0 0 0 rgba(0,200,150,0.4); } 50% { box-shadow: 0 0 0 8px rgba(0,200,150,0); } }
        .leaflet-container { background: #1A1A28 !important; }
        .leaflet-tile-pane { filter: brightness(0.92) saturate(0.9); }
        .leaflet-popup-content-wrapper { background: #1E1E2E !important; color: #E8E8F2 !important; border: 1px solid #252538 !important; border-radius: 14px !important; box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important; }
        .leaflet-popup-tip { background: #1E1E2E !important; }
        .leaflet-popup-content { font-size: 13px !important; color: #E8E8F2 !important; }
        .leaflet-control-zoom a { background: #1E1E2E !important; color: #E8E8F2 !important; border-color: #252538 !important; }
        .leaflet-control-zoom a:hover { background: #252535 !important; }
        .leaflet-bar { border: 1px solid #252538 !important; box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important; }
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
          {/* GPS Follow toggle */}
          <button onClick={() => setFollow(f => !f)} style={{
            width: 40, height: 40, borderRadius: 12,
            background: follow ? 'rgba(0,200,150,0.2)' : 'rgba(25,25,39,0.92)',
            border: `1px solid ${follow ? 'rgba(0,200,150,0.4)' : 'rgba(37,37,56,0.8)'}`,
            backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 18, color: follow ? 'var(--k-accent)' : 'var(--k-muted)',
          }} title={follow ? 'Berhenti ikuti mitra' : 'Ikuti mitra'}>
            🎯
          </button>

          {/* Chat — hanya tampil setelah mitra menerima order */}
          {order.mitra && (
            <Link to={`/orders/${id}/chat`} style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #00C896, #00A87D)',
              boxShadow: '0 4px 16px rgba(0,200,150,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none', fontSize: 20,
            }}>💬</Link>
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
        <span style={{ fontSize: 12, fontWeight: 700, color: gpsBadge.color }}>
          {gpsBadge.text}
        </span>
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
              <span style={{ flexShrink: 0, fontSize: 15 }}>
                {n.type === 'gps_lost' ? '⚠️' : '📦'}
              </span>
              <p style={{
                flex: 1, fontSize: 12, lineHeight: 1.5, fontWeight: 600,
                color: n.type === 'gps_lost' ? 'var(--k-warn)' : 'var(--k-accent)',
              }}>
                {formatNotifMessage(n)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Peta (full screen) ── */}
      <div style={{ flex: 1, minHeight: panelOpen ? 'calc(100vh - 340px)' : 'calc(100vh - 72px)', transition: 'min-height 0.3s' }}>
        <MapContainer
          center={mapCenter}
          zoom={14}
          style={{ height: '100%', width: '100%', minHeight: 300 }}
          zoomControl={true}
        >
          <SatelliteTiles />

          {/* Fit semua titik saat pertama load */}
          {!mitraLocation && <FitBounds points={allPoints} />}

          {/* Ikuti mitra */}
          {mitraLocation && <MapFollower center={mitraLocation} follow={follow} />}

          {/* Garis rute */}
          <Polyline
            positions={allPoints}
            pathOptions={{ color: '#00C896', weight: 3, opacity: 0.5, dashArray: '8 6' }}
          />

          {/* Overlay saat GPS mitra belum aktif */}
          {showGpsHint && (
            <div style={{
              position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              zIndex: 500, padding: '10px 16px', borderRadius: 14, whiteSpace: 'nowrap',
              background: 'rgba(25,25,39,0.92)', border: '1px solid rgba(246,173,85,0.3)',
              backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none',
            }}>
              <span style={{ fontSize: 14 }}>⏳</span>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-warn)' }}>
                Menunggu mitra mengaktifkan GPS...
              </p>
            </div>
          )}

          {/* Marker mitra */}
          {mitraLocation && (
            <Marker position={[mitraLocation.lat, mitraLocation.lng]} icon={mitraIcon}>
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, marginBottom: 2 }}>{order.mitra?.name ?? 'Mitra'}</p>
                  <p style={{ fontSize: 11, color: '#A0A0BC' }}>{gpsActive ? '🟢 Online' : '⚫ Offline'}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Marker pickup */}
          <Marker position={[order.pickup_lat, order.pickup_lng]} icon={pickupPin}>
            <Popup>
              <div>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>📍 Pickup</p>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${order.pickup_lat},${order.pickup_lng}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: '#4285F4', display: 'block', marginTop: 4 }}>
                  {order.pickup_address} ↗
                </a>
              </div>
            </Popup>
          </Marker>

          {/* Marker tujuan */}
          <Marker position={[order.dropoff_lat, order.dropoff_lng]} icon={dropoffPin}>
            <Popup>
              <div>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>🏁 Tujuan</p>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${order.dropoff_lat},${order.dropoff_lng}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: '#4285F4', display: 'block', marginTop: 4 }}>
                  {order.dropoff_address} ↗
                </a>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
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

          {/* Progress status */}
          {!isCancelled && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 8 }}>
                {STATUS_STEPS.filter(s => !['completed'].includes(s.key)).map((s, i, arr) => {
                  const stepIdx  = STATUS_STEPS.findIndex(x => x.key === s.key)
                  const isActive = stepIdx === currentStep
                  const isDoneStep = stepIdx < currentStep
                  return (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : 'none' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12,
                        background: isDoneStep ? 'var(--k-accent)' : isActive ? 'rgba(0,200,150,0.2)' : 'var(--k-card2)',
                        border: `2px solid ${isDoneStep ? 'var(--k-accent)' : isActive ? 'var(--k-accent)' : 'var(--k-border)'}`,
                        transition: 'all 0.3s',
                      }}>
                        {isDoneStep ? '✓' : s.emoji}
                      </div>
                      {i < arr.length - 1 && (
                        <div style={{
                          flex: 1, height: 2, marginLeft: 0,
                          background: isDoneStep ? 'var(--k-accent)' : 'var(--k-border)',
                          transition: 'background 0.3s',
                        }} />
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
            <div style={{
              background: 'rgba(245,101,101,0.08)', border: '1px solid rgba(245,101,101,0.2)',
              borderRadius: 14, padding: '12px 14px', marginBottom: 14,
              color: 'var(--k-danger)', fontSize: 14, fontWeight: 700,
            }}>
              ❌ Order Dibatalkan
            </div>
          )}

          {/* Rute */}
          <div style={{
            background: 'var(--k-card)', border: '1px solid var(--k-border)',
            borderRadius: 16, padding: '12px 14px', marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--k-accent)', flexShrink: 0 }} />
                <div style={{ width: 2, height: 18, background: 'var(--k-border)', margin: '2px 0' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F56565', flexShrink: 0 }} />
              </div>
              <div style={{ flex: 1 }}>
                <MapsLink lat={order.pickup_lat} lng={order.pickup_lng} address={order.pickup_address}
                  style={{ marginBottom: 10 }} />
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

          {/* Diskon JastipQu */}
          {order.jastip_discount_applied > 0 && (
            <div style={{
              background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)',
              borderRadius: 14, padding: '10px 14px', marginBottom: 12,
            }}>
              <p style={{ color: 'var(--k-accent)', fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
                ⚡ Diskon JastipQu: {formatRp(order.jastip_discount_applied)}
              </p>
              <p style={{ color: 'var(--k-muted)', fontSize: 12 }}>
                Anda membayar: {formatRp(order.shipping_fee - order.jastip_discount_applied)}
              </p>
            </div>
          )}

          {/* Info mitra */}
          {order.mitra && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--k-card)', border: '1px solid var(--k-border)',
              borderRadius: 16, padding: '12px 14px',
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'rgba(59,130,246,0.15)', border: '2px solid rgba(59,130,246,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: 'var(--k-info)', flexShrink: 0,
              }}>
                {order.mitra.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--k-text)', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                  {order.mitra.name}
                </p>
                <p style={{ color: 'var(--k-muted)', fontSize: 12, textTransform: 'capitalize' }}>
                  {order.vehicle_type === 'motor' ? '🏍️ Motor' : '🚗 Mobil'}
                </p>
              </div>
              {gpsActive && (
                <span style={{
                  padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                  background: 'rgba(0,200,150,0.1)', color: 'var(--k-accent)',
                }}>Online</span>
              )}
            </div>
          )}

          {/* Foto bukti pengiriman */}
          <PhotoViewer photos={order.photos} orderId={order.id} />
        </div>
      </div>
    </div>
  )
}
