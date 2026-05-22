import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import RoadPolyline from '../components/RoadPolyline'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import BottomNav from '../components/BottomNav'
import api from '../services/api'
import echo from '../services/echo'
import { requestNotifPermission, showOrderStatusNotif } from '../utils/systemNotif'
import useOrderChatBadges from '../hooks/useOrderChatBadges'
import ChatButton from '../components/ChatButton'

const PHOTO_LABELS = { pickup: 'Tiba di Pickup', packing: 'Barang Dikemas', delivery: 'Sampai Tujuan' }
const STORAGE_URL  = ''  // URL relatif — Vite proxy /storage → backend:8000

const STATUS_NOTIF_COLOR = {
  accepted:    '#00C896', on_pickup: '#F6AD55', picked_up: '#F6AD55',
  on_delivery: '#B794F4', delivered: '#00C896', completed: '#00C896', cancelled: '#F56565',
}

function playStatusSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    [[660,0],[880,0.15],[1100,0.3]].forEach(([freq, when]) => {
      const osc = ctx.createOscillator()
      osc.connect(gain); osc.type = 'sine'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0.3, ctx.currentTime + when)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + 0.25)
      osc.start(ctx.currentTime + when); osc.stop(ctx.currentTime + when + 0.25)
    })
  } catch {}
}

function OrderNotifBanner({ notif, onDismiss }) {
  const color = STATUS_NOTIF_COLOR[notif.status] ?? '#A0A0BC'
  useEffect(() => {
    playStatusSound()
    const t = setTimeout(onDismiss, 7000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div onClick={onDismiss} style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, cursor: 'pointer',
      background: `linear-gradient(135deg, #0C0C16 0%, ${color}22 100%)`,
      borderBottom: `2.5px solid ${color}`,
      boxShadow: `0 6px 40px ${color}44`,
      animation: 'notifIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <style>{`
        @keyframes notifIn { from { transform: translateY(-100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes notifBar2 { from { transform:scaleX(1); } to { transform:scaleX(0); } }
      `}</style>
      <div style={{ height: 3, background: color, transformOrigin: 'left', animation: 'notifBar2 7s linear forwards' }} />
      <div style={{ padding: '14px 18px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 36, flexShrink: 0 }}>{notif.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
            Update Order
          </p>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#E8E8F2', lineHeight: 1.4 }}>{notif.message}</p>
        </div>
        <span style={{ fontSize: 18, color: '#666', flexShrink: 0 }}>✕</span>
      </div>
    </div>
  )
}

// ── Fix ikon Leaflet ──────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const makePin = (color) => L.divIcon({
  html: `<div style="position:relative;width:28px;height:36px">
    <svg viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="36">
      <path d="M14 1C7.373 1 2 6.373 2 13c0 8.4 12 22 12 22S26 21.4 26 13C26 6.373 20.627 1 14 1z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="13" r="5" fill="white"/>
    </svg>
  </div>`,
  iconSize: [28, 36], iconAnchor: [14, 36], className: '',
})

const pickupPin  = makePin('#00C896')
const dropoffPin = makePin('#F56565')

// ── Fit bounds ────────────────────────────────────────────────────────────────
function FitRoute({ pickup, dropoff }) {
  const map = useMap()
  useEffect(() => {
    try { map.fitBounds([pickup, dropoff], { padding: [48, 48] }) } catch {}
  }, [map, pickup, dropoff])
  return null
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_LABELS = {
  pending:     'Mencari Mitra',
  accepted:    'Diterima Mitra',
  on_pickup:   'Menuju Pickup',
  picked_up:   'Barang Diambil',
  on_delivery: 'Dalam Perjalanan',
  delivered:   'Sampai Tujuan',
  completed:   'Selesai',
  cancelled:   'Dibatalkan',
}
const STATUS_COLOR = {
  pending:     '#F6AD55',
  accepted:    '#63B3ED',
  on_pickup:   '#63B3ED',
  picked_up:   '#63B3ED',
  on_delivery: '#B794F4',
  delivered:   '#00C896',
  completed:   '#00C896',
  cancelled:   '#F56565',
}
const ACTIVE_STATUSES = ['pending', 'accepted', 'on_pickup', 'picked_up', 'on_delivery', 'delivered']

function formatRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

// ── Mini peta ─────────────────────────────────────────────────────────────────
function MiniMap({ order, height = 150 }) {
  const pickup  = [parseFloat(order.pickup_lat),  parseFloat(order.pickup_lng)]
  const dropoff = [parseFloat(order.dropoff_lat), parseFloat(order.dropoff_lng)]
  return (
    <div style={{ height, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--k-border)' }}>
      <style>{`
        .mini-map-ol .leaflet-container { background: #1A1A28 !important; }
        .mini-map-ol .leaflet-tile-pane { filter: brightness(0.9) saturate(0.85); }
        .mini-map-ol .leaflet-control-zoom,
        .mini-map-ol .leaflet-control-attribution { display: none !important; }
      `}</style>
      <div className="mini-map-ol" style={{ height: '100%' }}>
        <MapContainer center={pickup} zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false} attributionControl={false}
          dragging={false} scrollWheelZoom={false} doubleClickZoom={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitRoute pickup={pickup} dropoff={dropoff} />
          <RoadPolyline pickup={pickup} dropoff={dropoff} weight={3} opacity={0.7} />
          <Marker position={pickup}  icon={pickupPin} />
          <Marker position={dropoff} icon={dropoffPin} />
        </MapContainer>
      </div>
    </div>
  )
}

// ── Modal peta fullscreen ─────────────────────────────────────────────────────
function MapModal({ order, onClose }) {
  const pickup  = [parseFloat(order.pickup_lat),  parseFloat(order.pickup_lng)]
  const dropoff = [parseFloat(order.dropoff_lat), parseFloat(order.dropoff_lng)]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: 'var(--k-bg)' }}>
      <style>{`
        .map-fs .leaflet-container { background: #1A1A28 !important; }
        .map-fs .leaflet-tile-pane { filter: brightness(0.92) saturate(0.85); }
        .map-fs .leaflet-control-zoom a { background: #1E1E2E !important; color: #E8E8F2 !important; border-color: #252538 !important; }
        .map-fs .leaflet-bar { border: 1px solid #252538 !important; box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important; }
        .map-fs .leaflet-popup-content-wrapper { background: #1E1E2E !important; color: #E8E8F2 !important; border: 1px solid #252538 !important; border-radius: 12px !important; }
        .map-fs .leaflet-popup-tip { background: #1E1E2E !important; }
      `}</style>

      {/* Tutup */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 14, right: 14, zIndex: 10001,
        width: 40, height: 40, borderRadius: 12,
        background: 'rgba(25,25,39,0.92)', border: '1px solid rgba(37,37,56,0.8)',
        backdropFilter: 'blur(12px)', color: 'var(--k-sub)',
        fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>✕</button>

      {/* Info order */}
      <div style={{
        position: 'absolute', top: 14, left: 14, zIndex: 10001,
        padding: '8px 14px', borderRadius: 12,
        background: 'rgba(25,25,39,0.92)', border: '1px solid rgba(37,37,56,0.8)',
        backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        <p style={{ fontSize: 11, color: 'var(--k-muted)', fontFamily: 'monospace' }}>{order.order_number}</p>
        <p style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLOR[order.status] }}>
          {STATUS_LABELS[order.status]}
        </p>
      </div>

      {/* Link ke tracking (order aktif) */}
      {ACTIVE_STATUSES.includes(order.status) && (
        <Link to={`/orders/${order.id}/tracking`} onClick={onClose} style={{
          position: 'absolute', bottom: 100, right: 14, zIndex: 10001,
          padding: '10px 16px', borderRadius: 14,
          background: 'var(--k-accent)', color: '#0C0C16',
          fontSize: 13, fontWeight: 800, textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(0,200,150,0.4)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          📡 Lacak Real-time
        </Link>
      )}

      {/* Peta */}
      <div className="map-fs" style={{ flex: 1 }}>
        <MapContainer center={pickup} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl>
          <TileLayer
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitRoute pickup={pickup} dropoff={dropoff} />
          <RoadPolyline pickup={pickup} dropoff={dropoff} weight={4} opacity={0.8} />
          <Marker position={pickup}  icon={pickupPin} />
          <Marker position={dropoff} icon={dropoffPin} />
        </MapContainer>
      </div>

      {/* Rute bawah */}
      <div style={{ background: 'var(--k-surface)', borderTop: '1px solid var(--k-border)', padding: '14px 16px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--k-accent)' }} />
            <div style={{ width: 2, height: 22, background: 'var(--k-border)', margin: '3px 0' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F56565' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: 'var(--k-text)', fontSize: 13, marginBottom: 12, lineHeight: 1.4 }}>{order.pickup_address}</p>
            <p style={{ color: 'var(--k-sub)', fontSize: 13, lineHeight: 1.4 }}>{order.dropoff_address}</p>
          </div>
        </div>
        {order.jastip_discount_applied > 0 && (
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 10,
            background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)',
            color: 'var(--k-accent)', fontSize: 12, fontWeight: 600 }}>
            ⚡ Diskon JastipQu: {formatRp(order.jastip_discount_applied)}
          </div>
        )}
      </div>
    </div>
  )
}

// Foto diakses via endpoint authenticated — gunakan AuthedImg agar Bearer token ikut dikirim
function photoUrl(orderId, stage) {
  return `/orders/${orderId}/photos/${stage}`
}

// Fetch gambar via Axios (membawa Bearer token) lalu tampilkan sebagai blob URL
function AuthedImg({ src, alt, style }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [status,  setStatus]  = useState('loading') // 'loading' | 'ready' | 'error'
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

// ── Foto bukti pengiriman ─────────────────────────────────────────────────────
function PhotoViewer({ photos, orderId }) {
  const [preview, setPreview] = useState(null)
  if (!photos?.length) return null

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
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--k-border)' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
          📸 Foto Bukti Pengiriman
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {['pickup', 'packing', 'delivery'].map(stage => {
            const hasPhoto = photos.some(p => p.stage === stage)
            const url      = hasPhoto ? photoUrl(orderId, stage) : null
            return (
              <div key={stage}>
                {url ? (
                  <button onClick={() => setPreview(url)} style={{ width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
                    <AuthedImg src={url} alt={PHOTO_LABELS[stage]}
                      style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, border: '2px solid rgba(0,200,150,0.25)' }}
                    />
                  </button>
                ) : (
                  <div style={{ width: '100%', aspectRatio: '1', background: 'var(--k-card2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--k-border)' }}>
                    <span style={{ fontSize: 18, opacity: 0.35 }}>📷</span>
                  </div>
                )}
                <p style={{ fontSize: 9, color: url ? 'var(--k-accent)' : 'var(--k-muted)', textAlign: 'center', marginTop: 3, fontWeight: url ? 700 : 400 }}>
                  {url ? '✓' : '—'} {PHOTO_LABELS[stage]}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

const CANCELLABLE = ['pending', 'accepted']

// ── Modal rating mitra ────────────────────────────────────────────────────────
function RatingModal({ order, onClose, onSubmitted }) {
  const [score,      setScore]      = useState(0)
  const [comment,    setComment]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')

  const STARS = [1, 2, 3, 4, 5]
  const STAR_LABELS = { 1: 'Sangat Buruk', 2: 'Buruk', 3: 'Cukup', 4: 'Bagus', 5: 'Sangat Bagus!' }

  const submit = async () => {
    if (!score) { setError('Pilih bintang terlebih dahulu.'); return }
    setSubmitting(true); setError('')
    try {
      await api.post(`/orders/${order.id}/rate`, { score, comment: comment || undefined })
      onSubmitted()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirim rating.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', background: '#111120', borderRadius: '24px 24px 0 0', border: '1.5px solid rgba(0,200,150,0.2)', borderBottom: 'none', padding: '8px 0 36px', boxShadow: '0 -8px 40px rgba(0,200,150,0.1)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#333', margin: '8px auto 20px' }} />

        <div style={{ padding: '0 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>⭐</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--k-text)', marginBottom: 4 }}>Beri Rating Mitra</p>
            <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>
              Order <span style={{ fontFamily: 'monospace' }}>{order.order_number}</span>
            </p>
          </div>

          {/* Bintang */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            {STARS.map(s => (
              <button key={s} onClick={() => setScore(s)} style={{
                fontSize: 36, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                filter: score >= s ? 'none' : 'grayscale(1) opacity(0.3)',
                transform: score === s ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.15s',
              }}>⭐</button>
            ))}
          </div>
          {score > 0 && (
            <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--k-accent)', marginBottom: 16 }}>
              {STAR_LABELS[score]}
            </p>
          )}

          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            placeholder="Ceritakan pengalaman Anda (opsional)..."
            style={{ width: '100%', background: 'var(--k-card)', border: '1.5px solid var(--k-border)', color: 'var(--k-text)', padding: '10px 14px', borderRadius: 14, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
          />

          {error && <p style={{ color: 'var(--k-danger)', fontSize: 12, marginBottom: 10 }}>⚠ {error}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: 16, fontSize: 14, fontWeight: 700, background: 'var(--k-card)', color: 'var(--k-muted)', border: '1px solid var(--k-border)', cursor: 'pointer' }}>
              Lewati
            </button>
            <button onClick={submit} disabled={submitting || !score} style={{
              flex: 2, padding: '14px', borderRadius: 16, fontSize: 14, fontWeight: 800,
              background: submitting || !score ? 'var(--k-card2)' : 'var(--k-accent)',
              color: submitting || !score ? 'var(--k-muted)' : '#0C0C16',
              border: 'none', cursor: submitting || !score ? 'not-allowed' : 'pointer',
            }}>
              {submitting ? 'Mengirim...' : 'Kirim Rating ⭐'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal konfirmasi batalkan ─────────────────────────────────────────────────
function CancelModal({ order, onConfirm, onClose }) {
  const [reason,    setReason]    = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [error,     setError]     = useState('')

  const submit = async () => {
    if (!reason.trim()) { setError('Alasan wajib diisi.'); return }
    setCancelling(true); setError('')
    try {
      await api.post(`/orders/${order.id}/cancel`, { reason })
      onConfirm()
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membatalkan order.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', background: '#111120', borderRadius: '24px 24px 0 0', border: '1.5px solid rgba(245,101,101,0.3)', borderBottom: 'none', padding: '8px 0 32px', boxShadow: '0 -8px 40px rgba(245,101,101,0.15)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#333', margin: '8px auto 20px' }} />

        <div style={{ padding: '0 20px' }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--k-danger)', marginBottom: 4 }}>❌ Batalkan Order</p>
          <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 20 }}>
            Order <span style={{ fontFamily: 'monospace', color: 'var(--k-sub)' }}>{order.order_number}</span> akan dibatalkan.
            {order.payment_method === 'wallet' && ' Saldo wallet akan dikembalikan.'}
          </p>

          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--k-sub)', marginBottom: 8 }}>
            Alasan pembatalan
          </label>

          {/* Pilihan cepat alasan */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {['Salah input alamat', 'Tidak jadi pesan', 'Menunggu terlalu lama', 'Ganti ke jasa lain'].map(r => (
              <button key={r} onClick={() => setReason(r)} style={{
                padding: '6px 12px', borderRadius: 100, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: reason === r ? 'rgba(245,101,101,0.15)' : 'var(--k-card)',
                color: reason === r ? 'var(--k-danger)' : 'var(--k-muted)',
                border: `1px solid ${reason === r ? 'rgba(245,101,101,0.4)' : 'var(--k-border)'}`,
                transition: 'all 0.15s',
              }}>{r}</button>
            ))}
          </div>

          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
            placeholder="Atau ketik alasan lain..."
            style={{ width: '100%', background: 'var(--k-card)', border: '1.5px solid var(--k-border)', color: 'var(--k-text)', padding: '10px 14px', borderRadius: 14, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />

          {error && <p style={{ color: 'var(--k-danger)', fontSize: 12, marginTop: 6 }}>⚠ {error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: 16, fontSize: 14, fontWeight: 700, background: 'var(--k-card)', color: 'var(--k-muted)', border: '1px solid var(--k-border)', cursor: 'pointer' }}>
              Kembali
            </button>
            <button onClick={submit} disabled={cancelling} style={{ flex: 1, padding: '14px', borderRadius: 16, fontSize: 14, fontWeight: 800, background: cancelling ? 'var(--k-card2)' : 'var(--k-danger)', color: cancelling ? 'var(--k-muted)' : '#fff', border: 'none', cursor: cancelling ? 'not-allowed' : 'pointer' }}>
              {cancelling ? 'Membatalkan...' : 'Ya, Batalkan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Card order ────────────────────────────────────────────────────────────────
function OrderCard({ order, onCancelled, hasUnreadChat }) {
  const [showMap,       setShowMap]       = useState(false)
  const [mapModal,      setMapModal]      = useState(false)
  const [showCancel,    setShowCancel]    = useState(false)
  const [showRating,    setShowRating]    = useState(false)
  const [alreadyRated,  setAlreadyRated]  = useState(order.user_rating != null)
  const [codConfirming, setCodConfirming] = useState(false)
  const isActive      = ACTIVE_STATUSES.includes(order.status)
  const isCancellable = CANCELLABLE.includes(order.status)
  const color         = STATUS_COLOR[order.status]
  const showRateBtn   = order.status === 'completed' && order.mitra_id && !alreadyRated
  const showCodBtn    = order.status === 'delivered' && order.payment_method === 'cod' && !order.cod_confirmed_at

  const confirmCod = async () => {
    setCodConfirming(true)
    try {
      await api.post(`/orders/${order.id}/confirm-cod`)
      onCancelled() // refresh list
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal konfirmasi.')
    } finally {
      setCodConfirming(false)
    }
  }

  return (
    <>
      {mapModal    && <MapModal     order={order} onClose={() => setMapModal(false)} />}
      {showCancel  && <CancelModal  order={order} onClose={() => setShowCancel(false)} onConfirm={() => { setShowCancel(false); onCancelled() }} />}
      {showRating  && <RatingModal  order={order} onClose={() => setShowRating(false)} onSubmitted={() => setAlreadyRated(true)} />}

      <div style={{
        background: 'var(--k-card)',
        border: `1px solid ${isActive ? `${color}33` : 'var(--k-border)'}`,
        borderRadius: 20, overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}>
        {/* Mini peta (collapsible) */}
        {showMap && (
          <div style={{ padding: '12px 12px 0', position: 'relative' }}>
            <MiniMap order={order} height={150} />
            <button onClick={() => setMapModal(true)} style={{
              position: 'absolute', top: 20, right: 20, zIndex: 500,
              padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: 'rgba(25,25,39,0.9)', border: '1px solid rgba(37,37,56,0.8)',
              backdropFilter: 'blur(8px)', color: 'var(--k-sub)', cursor: 'pointer',
            }}>⛶ Perbesar</button>
          </div>
        )}

        <div style={{ padding: '14px 16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ color: 'var(--k-muted)', fontSize: 11, fontFamily: 'monospace' }}>{order.order_number}</p>
            <span style={{
              padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
              background: `${color}18`, color,
            }}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>

          {/* Rute */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--k-accent)', flexShrink: 0 }} />
              <div style={{ width: 1.5, height: 18, background: 'var(--k-border)', margin: '3px 0' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F56565', flexShrink: 0 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: 'var(--k-text)', fontSize: 13, marginBottom: 10, lineHeight: 1.4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {order.pickup_address}
              </p>
              <p style={{ color: 'var(--k-sub)', fontSize: 13, lineHeight: 1.4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {order.dropoff_address}
              </p>
            </div>
          </div>

          {/* Badge JastipQu & diskon */}
          {(order.is_jastip_enabled || order.jastip_discount_applied > 0) && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {order.is_jastip_enabled && (
                <span style={{ background: 'rgba(0,200,150,0.1)', color: 'var(--k-accent)',
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                  border: '1px solid rgba(0,200,150,0.2)' }}>
                  ⚡ JastipQu
                </span>
              )}
              {order.jastip_discount_applied > 0 && (
                <span style={{ background: 'rgba(0,200,150,0.1)', color: 'var(--k-accent)',
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                  border: '1px solid rgba(0,200,150,0.2)' }}>
                  Hemat {formatRp(order.jastip_discount_applied)}
                </span>
              )}
            </div>
          )}

          {/* Tombol peta */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => setShowMap(s => !s)} style={{
              flex: 1, padding: '9px', borderRadius: 12, fontSize: 12, fontWeight: 700,
              background: showMap ? 'var(--k-glow)' : 'var(--k-card2)',
              border: `1px solid ${showMap ? 'rgba(0,200,150,0.3)' : 'var(--k-border)'}`,
              color: showMap ? 'var(--k-accent)' : 'var(--k-sub)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
              {showMap ? '🗺️ Tutup Peta' : '🗺️ Lihat Peta'}
            </button>
            <button onClick={() => setMapModal(true)} style={{
              padding: '9px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700,
              background: 'var(--k-card2)', border: '1px solid var(--k-border)',
              color: 'var(--k-sub)', cursor: 'pointer',
            }} title="Buka peta fullscreen">⛶</button>
          </div>

          {/* Footer: harga + lacak + chat + batalkan */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <p style={{ fontSize: 17, fontWeight: 900, color: 'var(--k-text)' }}>
                {formatRp(order.shipping_fee)}
              </p>
              {order.mitra_id && (
                <ChatButton to={`/orders/${order.id}/chat`} hasUnread={hasUnreadChat} size={38} />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Konfirmasi COD — hanya saat delivered + COD */}
              {showCodBtn && (
                <button onClick={confirmCod} disabled={codConfirming} style={{
                  padding: '9px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  background: 'rgba(0,200,150,0.1)', color: 'var(--k-accent)',
                  border: '1px solid rgba(0,200,150,0.3)', cursor: codConfirming ? 'not-allowed' : 'pointer',
                  opacity: codConfirming ? 0.6 : 1,
                }}>
                  {codConfirming ? '...' : '✓ Terima COD'}
                </button>
              )}
              {/* Batalkan — hanya pending/accepted */}
              {isCancellable && (
                <button onClick={() => setShowCancel(true)} style={{
                  padding: '9px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  background: 'rgba(245,101,101,0.08)', color: 'var(--k-danger)',
                  border: '1px solid rgba(245,101,101,0.25)', cursor: 'pointer',
                }}>
                  Batalkan
                </button>
              )}
              {isActive ? (
                <Link to={`/orders/${order.id}/tracking`} style={{
                  padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 800,
                  background: 'var(--k-accent)', color: '#0C0C16', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  📡 Lacak
                </Link>
              ) : showRateBtn ? (
                <button onClick={() => setShowRating(true)} style={{
                  padding: '9px 16px', borderRadius: 12, fontSize: 12, fontWeight: 800,
                  background: 'rgba(246,173,85,0.12)', color: '#F6AD55',
                  border: '1px solid rgba(246,173,85,0.3)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  ⭐ Beri Rating
                </button>
              ) : (
                <span style={{
                  padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  background: `${color}18`, color,
                }}>
                  {order.status === 'completed' ? '✓ Selesai' : '✕ Batal'}
                </span>
              )}
            </div>
          </div>

          {/* Foto bukti (hanya jika ada) */}
          <PhotoViewer photos={order.photos} orderId={order.id} />
        </div>
      </div>
    </>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('active')
  const [notif,   setNotif]   = useState(null)
  const dismissNotif = useCallback(() => setNotif(null), [])

  const fetchOrders = useCallback(() =>
    api.get('/orders').then(r => setOrders(r.data.data ?? [])), [])

  useEffect(() => { fetchOrders().finally(() => setLoading(false)) }, [fetchOrders])

  // Badge + suara notif chat
  const activeOrderIds = orders.filter(o => o.mitra_id).map(o => o.id)
  const { unread: chatUnread } = useOrderChatBadges(activeOrderIds)

  // Minta izin notifikasi sistem saat halaman orders dibuka
  useEffect(() => { requestNotifPermission() }, [])

  // Subscribe WebSocket untuk semua order aktif
  useEffect(() => {
    if (!orders.length) return
    const activeIds = orders
      .filter(o => ACTIVE_STATUSES.includes(o.status))
      .map(o => o.id)
    if (!activeIds.length) return

    const channels = activeIds.map(id => {
      const ch = echo.channel(`orders.${id}`)
      ch.listen('.order.status.updated', (data) => {
        setNotif(data)
        showOrderStatusNotif(data)   // system notif saat browser minimize
        fetchOrders()
      })
      return id
    })

    return () => channels.forEach(id => echo.leave(`orders.${id}`))
  }, [orders.map(o => o.id).join(','), fetchOrders]) // eslint-disable-line

  const [histFilter, setHistFilter] = useState('all') // all | completed | cancelled

  const active  = orders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const histAll = orders.filter(o => !ACTIVE_STATUSES.includes(o.status))
  const history = histFilter === 'all' ? histAll
    : histAll.filter(o => o.status === histFilter)

  const tabs = [
    { k: 'active',  l: 'Aktif',   count: active.length },
    { k: 'history', l: 'Riwayat', count: null },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 100 }}>
      {notif && <OrderNotifBanner notif={notif} onDismiss={dismissNotif} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{
        padding: '52px 20px 16px',
        background: 'linear-gradient(180deg, #0F1C22 0%, var(--k-bg) 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--k-text)' }}>Order Saya</h1>
          <Link to="/orders/create" style={{
            background: 'var(--k-accent)', color: '#0C0C16',
            fontSize: 12, fontWeight: 800, padding: '8px 16px',
            borderRadius: 12, textDecoration: 'none',
          }}>
            + Buat Order
          </Link>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'var(--k-card)',
          border: '1px solid var(--k-border)', borderRadius: 16, padding: 4, gap: 4,
        }}>
          {tabs.map(({ k, l, count }) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: '10px 4px', fontSize: 12, fontWeight: 700,
              borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: tab === k ? 'var(--k-accent)' : 'transparent',
              color: tab === k ? '#0C0C16' : 'var(--k-muted)',
            }}>
              {l}{count !== null && count > 0 ? ` (${count})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Konten */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 28, height: 28, border: '2.5px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : tab === 'active' ? (
          active.length === 0 ? (
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, padding: '48px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📦</p>
              <p style={{ color: 'var(--k-text)', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Belum ada order aktif</p>
              <p style={{ color: 'var(--k-muted)', fontSize: 13, marginBottom: 20 }}>Buat order pertama Anda sekarang</p>
              <Link to="/orders/create" style={{
                display: 'inline-block', padding: '12px 28px',
                background: 'var(--k-accent)', color: '#0C0C16',
                fontWeight: 800, fontSize: 14, borderRadius: 14, textDecoration: 'none',
              }}>
                Buat Order
              </Link>
            </div>
          ) : active.map(order => <OrderCard key={order.id} order={order} onCancelled={fetchOrders} hasUnreadChat={!!chatUnread[String(order.id)]} />)
        ) : (
          <>
            {/* Filter chip riwayat */}
            {histAll.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                {[['all','Semua'],['completed','Selesai'],['cancelled','Dibatalkan']].map(([k, l]) => (
                  <button key={k} onClick={() => setHistFilter(k)} style={{
                    padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700,
                    background: histFilter === k ? 'var(--k-accent)' : 'var(--k-card)',
                    color: histFilter === k ? '#0C0C16' : 'var(--k-muted)',
                    border: `1px solid ${histFilter === k ? 'transparent' : 'var(--k-border)'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>{l}</button>
                ))}
              </div>
            )}
            {history.length === 0 ? (
              <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, padding: '40px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 36, marginBottom: 10 }}>📋</p>
                <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Belum ada riwayat order</p>
              </div>
            ) : history.map(order => <OrderCard key={order.id} order={order} onCancelled={fetchOrders} hasUnreadChat={!!chatUnread[String(order.id)]} />)}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
