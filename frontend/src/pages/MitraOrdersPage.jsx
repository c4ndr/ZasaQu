import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import RoadPolyline from '../components/RoadPolyline'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import BottomNav from '../components/BottomNav'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { requestNotifPermission } from '../utils/systemNotif'
import useOrderChatBadges from '../hooks/useOrderChatBadges'
import ChatButton from '../components/ChatButton'

// Baca window.isSecureContext saat runtime — menghormati Chrome flags
function getSecureCtx() { return typeof window !== 'undefined' && window.isSecureContext }

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

// ── Fit bounds saat peta muncul ───────────────────────────────────────────────
function FitRoute({ pickup, dropoff }) {
  const map = useMap()
  useEffect(() => {
    try { map.fitBounds([pickup, dropoff], { padding: [48, 48] }) } catch {}
  }, [map, pickup, dropoff])
  return null
}

// ── Konstanta ─────────────────────────────────────────────────────────────────
const STATUS_NEXT = {
  accepted: 'on_pickup', on_pickup: 'picked_up', picked_up: 'on_delivery',
  on_delivery: 'delivered', delivered: 'completed',
}
const STATUS_BTN = {
  accepted: 'Menuju Pickup', on_pickup: 'Barang Diambil', picked_up: 'Mulai Kirim',
  on_delivery: 'Sudah Sampai', delivered: 'Selesaikan',
}
const STATUS_LABELS = {
  pending: 'Menunggu', accepted: 'Diterima', on_pickup: 'Menuju Pickup',
  picked_up: 'Diambil', on_delivery: 'Dikirim', delivered: 'Sampai',
  completed: 'Selesai', cancelled: 'Batal',
}
const STATUS_COLOR = {
  pending: '#A0A0BC', accepted: '#63B3ED', on_pickup: '#F6AD55',
  picked_up: '#F6AD55', on_delivery: '#B794F4', delivered: '#00C896',
  completed: '#00C896', cancelled: '#F56565',
}

function formatRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

// Buka Google Maps navigasi ke koordinat — fallback ke nama alamat jika tidak ada koordinat
function mapsUrl(lat, lng, label) {
  if (lat && lng) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`
}

function MapsLink({ lat, lng, address, color = 'var(--k-text)', fontSize = 13, style = {} }) {
  return (
    <a
      href={mapsUrl(lat, lng, address)}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color,
        fontSize,
        lineHeight: 1.4,
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 4,
        ...style,
      }}
    >
      <span style={{ flex: 1 }}>{address}</span>
      <span style={{ fontSize: 11, color: '#4285F4', flexShrink: 0, marginTop: 2, opacity: 0.85 }}>↗</span>
    </a>
  )
}

// ── Mini peta rute ────────────────────────────────────────────────────────────
function MiniMap({ order, height = 160 }) {
  const pickup  = [parseFloat(order.pickup_lat),  parseFloat(order.pickup_lng)]
  const dropoff = [parseFloat(order.dropoff_lat), parseFloat(order.dropoff_lng)]
  return (
    <div style={{ height, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--k-border)' }}>
      <style>{`
        .leaflet-container { background: #1A1A28 !important; }
        .leaflet-tile-pane { filter: brightness(0.9) saturate(0.85); }
        .leaflet-control-zoom { display: none !important; }
        .leaflet-control-attribution { display: none !important; }
      `}</style>
      <MapContainer
        center={pickup} zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false} attributionControl={false} dragging={false}
        scrollWheelZoom={false} doubleClickZoom={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitRoute pickup={pickup} dropoff={dropoff} />
        <RoadPolyline pickup={pickup} dropoff={dropoff} weight={3} opacity={0.7} />
        <Marker position={pickup}  icon={pickupPin} />
        <Marker position={dropoff} icon={dropoffPin} />
      </MapContainer>
    </div>
  )
}

// ── Modal peta fullscreen ─────────────────────────────────────────────────────
function MapModal({ order, onClose }) {
  const pickup  = [parseFloat(order.pickup_lat),  parseFloat(order.pickup_lng)]
  const dropoff = [parseFloat(order.dropoff_lat), parseFloat(order.dropoff_lng)]
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      background: 'var(--k-bg)',
    }}>
      <style>{`
        .map-modal .leaflet-container { background: #1A1A28 !important; }
        .map-modal .leaflet-tile-pane { filter: brightness(0.92) saturate(0.85); }
        .map-modal .leaflet-control-zoom a { background: #1E1E2E !important; color: #E8E8F2 !important; border-color: #252538 !important; }
        .map-modal .leaflet-bar { border: 1px solid #252538 !important; box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important; }
        .map-modal .leaflet-popup-content-wrapper { background: #1E1E2E !important; color: #E8E8F2 !important; border: 1px solid #252538 !important; border-radius: 12px !important; }
        .map-modal .leaflet-popup-tip { background: #1E1E2E !important; }
      `}</style>

      {/* Tombol tutup */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 14, right: 14, zIndex: 10001,
        width: 40, height: 40, borderRadius: 12,
        background: 'rgba(25,25,39,0.92)', border: '1px solid rgba(37,37,56,0.8)',
        backdropFilter: 'blur(12px)', color: 'var(--k-sub)',
        fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>✕</button>

      {/* Label order */}
      <div style={{
        position: 'absolute', top: 14, left: 14, zIndex: 10001,
        padding: '8px 14px', borderRadius: 12,
        background: 'rgba(25,25,39,0.92)', border: '1px solid rgba(37,37,56,0.8)',
        backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        <p style={{ fontSize: 11, color: 'var(--k-muted)', fontFamily: 'monospace' }}>{order.order_number}</p>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{formatRp(order.shipping_fee)}</p>
      </div>

      {/* Peta */}
      <div className="map-modal" style={{ flex: 1 }}>
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

      {/* Info rute bawah */}
      <div style={{
        background: 'var(--k-surface)', borderTop: '1px solid var(--k-border)',
        padding: '14px 16px 28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--k-accent)' }} />
            <div style={{ width: 2, height: 22, background: 'var(--k-border)', margin: '3px 0' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F56565' }} />
          </div>
          <div style={{ flex: 1 }}>
            <MapsLink lat={order.pickup_lat} lng={order.pickup_lng} address={order.pickup_address}
              color="var(--k-text)" style={{ marginBottom: 12 }} />
            <MapsLink lat={order.dropoff_lat} lng={order.dropoff_lng} address={order.dropoff_address}
              color="var(--k-sub)" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Card order tersedia ───────────────────────────────────────────────────────
function AvailableCard({ order, onAccept, loading, blocked }) {
  const [showMap, setShowMap] = useState(false)
  const [mapModal, setMapModal] = useState(false)

  return (
    <>
      {mapModal && <MapModal order={order} onClose={() => setMapModal(false)} />}

      <div style={{
        background: 'var(--k-card)', border: '1px solid var(--k-border)',
        borderRadius: 20, overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}>
        {/* Mini peta (collapsible) */}
        {showMap && (
          <div style={{ padding: '12px 12px 0' }}>
            <MiniMap order={order} height={150} />
          </div>
        )}

        <div style={{ padding: '14px 16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ color: 'var(--k-muted)', fontSize: 11, fontFamily: 'monospace' }}>{order.order_number}</p>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {order.is_jastip_enabled && (
                <span style={{ background: 'rgba(183,148,244,0.12)', color: '#B794F4', fontSize: 10,
                  fontWeight: 700, padding: '2px 8px', borderRadius: 100, border: '1px solid rgba(183,148,244,0.2)' }}>
                  ⚡ JastipQu
                </span>
              )}
              {order.require_photo && (
                <span style={{ background: 'rgba(246,173,85,0.1)', color: 'var(--k-warn)', fontSize: 10,
                  fontWeight: 700, padding: '2px 8px', borderRadius: 100, border: '1px solid rgba(246,173,85,0.25)' }}>
                  📸 Wajib Foto
                </span>
              )}
              <span style={{ background: 'var(--k-glow)', color: 'var(--k-accent)', fontSize: 10,
                fontWeight: 700, padding: '2px 8px', borderRadius: 100, textTransform: 'capitalize' }}>
                {order.vehicle_type}
              </span>
            </div>
          </div>

          {/* Rute */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--k-accent)', flexShrink: 0 }} />
              <div style={{ width: 1.5, height: 18, background: 'var(--k-border)', margin: '3px 0' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F56565', flexShrink: 0 }} />
            </div>
            <div style={{ flex: 1 }}>
              <MapsLink lat={order.pickup_lat} lng={order.pickup_lng} address={order.pickup_address}
                color="var(--k-text)" style={{ marginBottom: 10 }} />
              <MapsLink lat={order.dropoff_lat} lng={order.dropoff_lng} address={order.dropoff_address}
                color="var(--k-sub)" />
            </div>
          </div>

          {order.item_description && (
            <p style={{ color: 'var(--k-muted)', fontSize: 12, marginBottom: 12 }}>
              📦 {order.item_description}
            </p>
          )}

          {/* Detail order */}
          <OrderDetailPanel order={order} />

          {/* Tombol peta + accept */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowMap(s => !s)} style={{
              padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700,
              background: showMap ? 'var(--k-glow)' : 'var(--k-card2)',
              border: `1px solid ${showMap ? 'rgba(0,200,150,0.3)' : 'var(--k-border)'}`,
              color: showMap ? 'var(--k-accent)' : 'var(--k-sub)', cursor: 'pointer',
              transition: 'all 0.2s', flexShrink: 0,
            }}>
              {showMap ? '🗺️' : '🗺️'}
            </button>
            <button onClick={() => setMapModal(true)} style={{
              padding: '10px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700,
              background: 'var(--k-card2)', border: '1px solid var(--k-border)',
              color: 'var(--k-sub)', cursor: 'pointer', flexShrink: 0,
            }} title="Buka peta fullscreen">⛶</button>
            <button
              onClick={() => onAccept(order.id)}
              disabled={loading || blocked}
              title={blocked ? 'Selesaikan order aktif dulu' : ''}
              style={{
                flex: 1, padding: '10px', borderRadius: 14, fontSize: 14, fontWeight: 800,
                background: blocked ? 'var(--k-card2)' : 'var(--k-accent)',
                color:      blocked ? 'var(--k-muted)' : '#0C0C16',
                border:     blocked ? '1px solid var(--k-border)' : 'none',
                cursor: (loading || blocked) ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.2s',
              }}>
              {loading ? '...' : blocked ? '🚫 Tidak Bisa' : 'Terima Order'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Setiap slot kelola uploadnya sendiri — tidak ada prop onFile/busy ──────────
const PHOTO_STAGES = [
  { key: 'pickup',   label: 'Tiba di Pickup', emoji: '📍', desc: 'Foto lokasi jemput barang' },
  { key: 'packing',  label: 'Barang Dikemas',  emoji: '📦', desc: 'Foto barang sebelum dikirim' },
  { key: 'delivery', label: 'Sampai Tujuan',   emoji: '🏁', desc: 'Foto bukti pengiriman' },
]

// Kompres gambar di browser sebelum upload — max 1280px, JPEG 78%
// Ini memastikan upload berhasil terlepas dari konfigurasi PHP di server
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const MAX = 1280
        let w = img.naturalWidth, h = img.naturalHeight
        const ratio = Math.min(MAX / w, MAX / h, 1)
        const cw = Math.round(w * ratio)
        const ch = Math.round(h * ratio)
        const canvas = document.createElement('canvas')
        canvas.width  = cw
        canvas.height = ch
        const ctx = canvas.getContext('2d')
        // Putih sebagai background (untuk PNG transparan)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, cw, ch)
        ctx.drawImage(img, 0, 0, cw, ch)
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Kompresi gagal')),
          'image/jpeg',
          0.78
        )
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function PhotoSlot({ orderId, stage, label, emoji, desc, initialDone, onUploaded }) {
  const [done,       setDone]       = useState(initialDone)
  const [busy,       setBusy]       = useState(false)
  const [error,      setError]      = useState('')
  const [compressing,setCompressing]= useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (initialDone) setDone(true) }, [initialDone])

  const handleFile = async (file) => {
    if (!file) return
    setError('')

    // Tolak jika lebih dari 100MB (batas wajar sebelum kompresi)
    if (file.size > 100 * 1024 * 1024) {
      setError('File terlalu besar. Pilih foto dari kamera atau galeri HP.')
      return
    }

    setBusy(true)
    setCompressing(true)

    let blob
    try {
      blob = await compressImage(file)
    } catch {
      // Jika kompres gagal (misal format HEIC tidak didukung), coba kirim langsung
      blob = file
    } finally {
      setCompressing(false)
    }

    // Jika hasil kompresi masih > 8MB, tolak
    if (blob.size > 8 * 1024 * 1024) {
      setError(`Foto terlalu besar setelah dikompresi (${(blob.size/1024/1024).toFixed(1)} MB). Pilih foto lain.`)
      setBusy(false)
      return
    }

    const fd = new FormData()
    fd.append('stage', stage)
    fd.append('photo', blob, 'photo.jpg')
    try {
      await api.post(`/orders/${orderId}/photos`, fd)
      setDone(true)
      onUploaded()
    } catch (err) {
      const data = err.response?.data
      setError(data?.errors
        ? Object.values(data.errors).flat().join(' ')
        : (data?.message || 'Gagal upload. Coba lagi.'))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleChange = (e) => handleFile(e.target.files[0])

  const openPicker = () => {
    setError('')
    inputRef.current?.click()
  }

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${done ? 'rgba(0,200,150,0.2)' : 'var(--k-border)'}`, background: done ? 'rgba(0,200,150,0.06)' : 'var(--k-card)', transition: 'all 0.2s' }}>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleChange} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: done ? 'rgba(0,200,150,0.12)' : 'var(--k-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          {done ? '✅' : emoji}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: done ? 'var(--k-accent)' : 'var(--k-text)', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{label}</p>
          <p style={{ color: 'var(--k-muted)', fontSize: 11 }}>{done ? 'Foto berhasil diupload' : desc}</p>
        </div>
        {busy ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--k-muted)', fontSize: 12, flexShrink: 0 }}>
            <div style={{ width: 14, height: 14, border: '2px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            {compressing ? 'Memproses...' : 'Mengunggah...'}
          </div>
        ) : !done ? (
          <button
            type="button"
            onClick={openPicker}
            style={{ padding: '9px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'var(--k-accent)', color: '#0C0C16', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            📷 Foto
          </button>
        ) : null}
      </div>
      {error && (
        <div style={{ padding: '8px 12px', background: 'rgba(245,101,101,0.08)', borderTop: '1px solid rgba(245,101,101,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ color: 'var(--k-danger)', fontSize: 11, flex: 1 }}>⚠ {error}</p>
          <button type="button" onClick={openPicker} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: 'var(--k-danger)', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            Coba Lagi
          </button>
        </div>
      )}
    </div>
  )
}

function PhotoUpload({ order, onUploaded }) {
  const uploaded  = new Set((order.photos ?? []).map(p => p.stage))
  const totalDone = uploaded.size

  return (
    <div style={{ background: 'var(--k-card2)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '14px', marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ color: 'var(--k-sub)', fontSize: 12, fontWeight: 700 }}>📸 Foto Bukti Pengiriman</p>
        <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: totalDone === 3 ? 'rgba(0,200,150,0.12)' : 'rgba(246,173,85,0.12)', color: totalDone === 3 ? 'var(--k-accent)' : 'var(--k-warn)' }}>
          {totalDone}/3 foto
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PHOTO_STAGES.map(s => (
          <PhotoSlot
            key={`${order.id}-${s.key}`}
            orderId={order.id}
            stage={s.key}
            label={s.label}
            emoji={s.emoji}
            desc={s.desc}
            initialDone={uploaded.has(s.key)}
            onUploaded={onUploaded}
          />
        ))}
      </div>
      {totalDone === 3 && (
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', color: 'var(--k-accent)', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
          ✓ Semua foto lengkap — order siap diselesaikan
        </div>
      )}
    </div>
  )
}

// Foto yang wajib diupload sebelum bisa lanjut ke status berikutnya
const PHOTO_GATE = {
  on_pickup:   { key: 'pickup',   label: 'Tiba di Pickup', emoji: '📍', desc: 'Foto lokasi jemput barang' },
  picked_up:   { key: 'packing',  label: 'Barang Dikemas',  emoji: '📦', desc: 'Foto barang sebelum dikirim' },
  on_delivery: { key: 'delivery', label: 'Sampai Tujuan',   emoji: '🏁', desc: 'Foto bukti pengiriman' },
}

// ── Card order aktif ──────────────────────────────────────────────────────────
// ── Panel detail order (jastip & reguler) ────────────────────────────────────
function OrderDetailPanel({ order }) {
  const isJastip  = order.type === 'jastip'
  const fmtVal    = v => v > 0 ? formatRp(v) : null
  const payLabel  = order.payment_method === 'cod' ? '💵 COD (Bayar di Tempat)' : '💳 Wallet'

  const rows = [
    order.item_category   && { label: 'Kategori',   value: order.item_category?.name ?? '—' },
    { label: 'Barang',      value: order.item_description },
    fmtVal(order.item_value) && { label: 'Nilai Barang', value: fmtVal(order.item_value) },
    { label: 'Pembayaran',  value: payLabel },
    order.notes           && { label: 'Catatan',    value: order.notes },
    order.requires_disclaimer && { label: 'Disclaimer', value: '⚠️ Barang berisiko dikonfirmasi pelanggan' },
  ].filter(Boolean)

  return (
    <div style={{
      background: isJastip ? 'rgba(183,148,244,0.06)' : 'var(--k-card2)',
      border: `1px solid ${isJastip ? 'rgba(183,148,244,0.2)' : 'var(--k-border)'}`,
      borderRadius: 14, padding: '12px 14px', marginBottom: 12,
    }}>
      {/* Header panel */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>{isJastip ? '⚡' : '📦'}</span>
        <p style={{ fontSize: 11, fontWeight: 800, color: isJastip ? '#B794F4' : 'var(--k-sub)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          {isJastip ? 'Detail Titipan JastipQu' : 'Detail Pesanan'}
        </p>
        {isJastip && (
          <span style={{ marginLeft: 'auto', background: 'rgba(183,148,244,0.15)', color: '#B794F4', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
            Jastip
          </span>
        )}
      </div>

      {/* Info pelanggan */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--k-card)', marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--k-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: 'var(--k-accent)', flexShrink: 0 }}>
          {(order.customer?.name ?? '?')[0].toUpperCase()}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', lineHeight: 1.2 }}>{order.customer?.name ?? '—'}</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>Pelanggan</p>
        </div>
      </div>

      {/* Rows detail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <p style={{ fontSize: 11, color: 'var(--k-muted)', fontWeight: 600, minWidth: 80, flexShrink: 0, paddingTop: 1 }}>{row.label}</p>
            <p style={{ fontSize: 12, color: 'var(--k-text)', fontWeight: 600, lineHeight: 1.5, flex: 1 }}>{row.value}</p>
          </div>
        ))}
      </div>

      {/* Estimasi pendapatan */}
      {order.mitra_income > 0 ? (
        <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(0,200,150,0.07)', border: '1px solid rgba(0,200,150,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', fontWeight: 600 }}>Pendapatan mitra</p>
          <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--k-accent)' }}>+{formatRp(order.mitra_income)}</p>
        </div>
      ) : (
        <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(0,200,150,0.07)', border: '1px solid rgba(0,200,150,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', fontWeight: 600 }}>Ongkir</p>
          <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--k-accent)' }}>{formatRp(order.shipping_fee)}</p>
        </div>
      )}
    </div>
  )
}

function ActiveCard({ order, onUpdate, onRefresh, loading, hasUnreadChat }) {
  const [mapModal, setMapModal] = useState(false)

  const uploadedStages = new Set((order.photos ?? []).map(p => p.stage))
  const gateStage      = order.require_photo ? (PHOTO_GATE[order.status] ?? null) : null
  const gatePhotoDone  = gateStage ? uploadedStages.has(gateStage.key) : true
  const canAdvance     = gatePhotoDone

  return (
    <>
      {mapModal && <MapModal order={order} onClose={() => setMapModal(false)} />}

      <div style={{
        background: 'var(--k-card)', border: `1px solid ${STATUS_COLOR[order.status]}33`,
        borderRadius: 20, overflow: 'hidden',
      }}>
        {/* Mini peta */}
        <div style={{ position: 'relative' }}>
          <MiniMap order={order} height={160} />
          <button onClick={() => setMapModal(true)} style={{
            position: 'absolute', top: 8, right: 8, zIndex: 500,
            padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            background: 'rgba(25,25,39,0.9)', border: '1px solid rgba(37,37,56,0.8)',
            backdropFilter: 'blur(8px)', color: 'var(--k-sub)', cursor: 'pointer',
          }}>⛶ Perbesar</button>
        </div>

        <div style={{ padding: '14px 16px' }}>
          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ color: 'var(--k-muted)', fontSize: 11, fontFamily: 'monospace' }}>{order.order_number}</p>
            <span style={{
              padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
              background: `${STATUS_COLOR[order.status]}18`, color: STATUS_COLOR[order.status],
            }}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>

          {/* Rute */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--k-accent)' }} />
              <div style={{ width: 1.5, height: 18, background: 'var(--k-border)', margin: '3px 0' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F56565' }} />
            </div>
            <div style={{ flex: 1 }}>
              <MapsLink lat={order.pickup_lat} lng={order.pickup_lng} address={order.pickup_address}
                color="var(--k-text)" style={{ marginBottom: 10 }} />
              <MapsLink lat={order.dropoff_lat} lng={order.dropoff_lng} address={order.dropoff_address}
                color="var(--k-sub)" />
            </div>
          </div>

          {/* Panel detail order */}
          <OrderDetailPanel order={order} />

          {/* Slot foto wajib sesuai status saat ini */}
          {gateStage && (
            <div style={{ background: 'var(--k-card2)', border: `1px solid ${gatePhotoDone ? 'rgba(0,200,150,0.2)' : 'rgba(246,173,85,0.3)'}`, borderRadius: 14, padding: 12, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ color: 'var(--k-sub)', fontSize: 12, fontWeight: 700 }}>📸 Foto Wajib</p>
                {!gatePhotoDone && (
                  <span style={{ color: 'var(--k-warn)', fontSize: 11, fontWeight: 600 }}>Wajib sebelum lanjut ↓</span>
                )}
              </div>
              <PhotoSlot
                key={`${order.id}-${gateStage.key}`}
                orderId={order.id}
                stage={gateStage.key}
                label={gateStage.label}
                emoji={gateStage.emoji}
                desc={gateStage.desc}
                initialDone={uploadedStages.has(gateStage.key)}
                onUploaded={onRefresh}
              />
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ChatButton to={`/mitra/orders/${order.id}/chat`} hasUnread={hasUnreadChat} size={40} />
            </div>
            {STATUS_NEXT[order.status] && (
              <button
                onClick={() => onUpdate(order.id, STATUS_NEXT[order.status])}
                disabled={loading || !canAdvance}
                title={!canAdvance ? `Upload foto ${gateStage?.label?.toLowerCase()} dulu` : ''}
                style={{
                  padding: '11px 20px', borderRadius: 14, fontSize: 13, fontWeight: 800,
                  background: canAdvance ? 'var(--k-accent)' : 'var(--k-card2)',
                  color: canAdvance ? '#0C0C16' : 'var(--k-muted)',
                  border: canAdvance ? 'none' : '1px solid var(--k-border)',
                  cursor: (loading || !canAdvance) ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}>
                {loading ? '...' : STATUS_BTN[order.status]}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function MitraOrdersPage() {
  const { user } = useAuth()
  const [tab,       setTab]       = useState('available')
  const [available, setAvailable] = useState([])
  const [myOrders,  setMyOrders]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [actionId,  setActionId]  = useState(null)
  const [gpsOnline,    setGpsOnline]    = useState(false)
  const [acceptError,  setAcceptError]  = useState('')
  // Poll status GPS mitra dari server setiap 15 detik
  useEffect(() => {
    const checkGps = () => {
      api.get('/mitra/gps/status').then(r => {
        setGpsOnline(r.data?.active === true)
      }).catch(() => setGpsOnline(false))
    }
    checkGps()
    const t = setInterval(checkGps, 15000)
    return () => clearInterval(t)
  }, [])

  const fetchAll = useCallback(() => Promise.all([
    api.get('/mitra/orders/available').then(r => setAvailable(r.data)),
    api.get('/mitra/orders/my').then(r => setMyOrders(r.data.data ?? [])),
  ]), [])

  useEffect(() => { setLoading(true); fetchAll().finally(() => setLoading(false)) }, [fetchAll])

  // Minta izin notifikasi sistem
  useEffect(() => { requestNotifPermission() }, [])

  const vehicleType = user?.role === 'mitra_motor' ? 'motor' : user?.role === 'mitra_mobil' ? 'mobil' : null

  const accept = async (id) => {
    setActionId(id)
    try { await api.post(`/mitra/orders/${id}/accept`); await fetchAll(); setTab('active') }
    catch (err) { setAcceptError(err.response?.data?.message || 'Gagal menerima order') }
    finally { setActionId(null) }
  }

  const updateStatus = async (id, status) => {
    setActionId(id)
    try { await api.patch(`/mitra/orders/${id}/status`, { status }); await fetchAll() }
    catch (err) { alert(err.response?.data?.message || 'Gagal update status') }
    finally { setActionId(null) }
  }

  const active  = myOrders.filter(o => !['completed', 'cancelled'].includes(o.status))
  const history = myOrders.filter(o => ['completed', 'cancelled'].includes(o.status))

  // Badge + suara notif chat
  const { unread: chatUnread } = useOrderChatBadges(active.map(o => o.id))

  const tabs = [
    { k: 'available', l: 'Tersedia', count: available.length },
    { k: 'active',    l: 'Aktif',    count: active.length },
    { k: 'history',   l: 'Riwayat',  count: null },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 100 }}>
      <style>{`@keyframes gps-blink { 0%,100%{opacity:1} 50%{opacity:0.3} } @keyframes spin { to{transform:rotate(360deg)} }`}</style>

      {/* Header */}
      <div style={{
        padding: '52px 20px 16px',
        background: 'linear-gradient(180deg, #0F1C22 0%, var(--k-bg) 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--k-text)' }}>Order Mitra</h1>

          {/* Tombol GPS dengan status realtime */}
          <Link to="/mitra/gps" style={{
            display: 'flex', alignItems: 'center', gap: 7, textDecoration: 'none',
            padding: '8px 14px', borderRadius: 12, transition: 'all 0.2s',
            background: gpsOnline ? 'rgba(0,200,150,0.1)' : !getSecureCtx() ? 'rgba(246,173,85,0.08)' : 'var(--k-card)',
            border: gpsOnline ? '1px solid rgba(0,200,150,0.3)' : !getSecureCtx() ? '1px solid rgba(246,173,85,0.3)' : '1px solid var(--k-border)',
            color: gpsOnline ? 'var(--k-accent)' : !getSecureCtx() ? 'var(--k-warn)' : 'var(--k-sub)',
            fontSize: 12, fontWeight: 700,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: gpsOnline ? 'var(--k-accent)' : !getSecureCtx() ? 'var(--k-warn)' : 'var(--k-muted)',
              animation: gpsOnline ? 'gps-blink 2s infinite' : 'none',
            }} />
            {gpsOnline ? 'GPS Aktif' : !getSecureCtx() ? 'GPS Terbatas' : 'GPS Nonaktif'}
          </Link>
        </div>

        {/* Warning: GPS tidak tersedia di HTTP non-localhost */}
        {!getSecureCtx() && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 14px', borderRadius: 14, marginBottom: 14,
            background: 'rgba(246,173,85,0.08)', border: '1px solid rgba(246,173,85,0.25)',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <div>
              <p style={{ color: 'var(--k-warn)', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                GPS tidak tersedia di jaringan lokal
              </p>
              <p style={{ color: 'var(--k-muted)', fontSize: 11, lineHeight: 1.6 }}>
                Akses lewat <strong style={{ color: 'var(--k-sub)' }}>localhost:5174</strong> agar GPS bisa diaktifkan dan lokasi terkirim ke pelanggan.
              </p>
            </div>
          </div>
        )}

        {/* Warning: ada order aktif tapi GPS mati (di secure context) */}
        {getSecureCtx() && !gpsOnline && myOrders.some(o => ['on_pickup','picked_up','on_delivery'].includes(o.status)) && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 14px', borderRadius: 14, marginBottom: 14,
            background: 'rgba(245,101,101,0.08)', border: '1px solid rgba(245,101,101,0.2)',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🚨</span>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'var(--k-danger)', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                GPS belum aktif — ada order yang sedang berjalan
              </p>
              <p style={{ color: 'var(--k-muted)', fontSize: 11, lineHeight: 1.6 }}>
                Pelanggan tidak bisa melacak posisi Anda. Aktifkan GPS sekarang.
              </p>
            </div>
            <Link to="/mitra/gps" style={{
              padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700,
              background: 'var(--k-danger)', color: '#fff', textDecoration: 'none', flexShrink: 0,
            }}>
              Aktifkan
            </Link>
          </div>
        )}

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
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : tab === 'available' ? (
          available.length === 0 ? (
            <EmptyState icon="🔍" title="Tidak ada order tersedia" sub="Order baru akan muncul di sini secara otomatis" />
          ) : (
            <>
              {/* Banner: sudah ada order aktif */}
              {active.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 16px', borderRadius: 14,
                  background: 'rgba(246,173,85,0.08)', border: '1px solid rgba(246,173,85,0.25)',
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>🚫</span>
                  <div>
                    <p style={{ color: 'var(--k-warn)', fontSize: 13, fontWeight: 700, marginBottom: 3 }}>
                      Anda sedang mengerjakan order aktif
                    </p>
                    <p style={{ color: 'var(--k-muted)', fontSize: 12, lineHeight: 1.6 }}>
                      Selesaikan order yang sedang berjalan terlebih dahulu sebelum menerima order baru.
                    </p>
                  </div>
                </div>
              )}
              {/* Error dari server saat coba accept */}
              {acceptError && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 16px', borderRadius: 14,
                  background: 'rgba(245,101,101,0.08)', border: '1px solid rgba(245,101,101,0.2)',
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>❌</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: 'var(--k-danger)', fontSize: 13, lineHeight: 1.5 }}>{acceptError}</p>
                  </div>
                  <button onClick={() => setAcceptError('')}
                    style={{ background: 'none', border: 'none', color: 'var(--k-muted)', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              )}
              {available.map(order => (
                <AvailableCard key={order.id} order={order}
                  onAccept={accept} loading={actionId === order.id}
                  blocked={active.length > 0} />
              ))}
            </>
          )
        ) : tab === 'active' ? (
          active.length === 0 ? (
            <EmptyState icon="📦" title="Tidak ada order aktif" sub="Terima order dari tab Tersedia untuk mulai bekerja" />
          ) : active.map(order => (
            <ActiveCard key={order.id} order={order}
              onUpdate={updateStatus} onRefresh={fetchAll} loading={actionId === order.id}
              hasUnreadChat={!!chatUnread[String(order.id)]} />
          ))
        ) : (
          history.length === 0 ? (
            <EmptyState icon="📋" title="Belum ada riwayat" sub="Order yang selesai atau dibatalkan akan muncul di sini" />
          ) : history.map(order => (
            <HistoryCard key={order.id} order={order} />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  )
}

// ── Komponen kecil ────────────────────────────────────────────────────────────
function EmptyState({ icon, title, sub }) {
  return (
    <div style={{
      background: 'var(--k-card)', border: '1px solid var(--k-border)',
      borderRadius: 20, padding: '40px 20px', textAlign: 'center',
    }}>
      <p style={{ fontSize: 36, marginBottom: 10 }}>{icon}</p>
      <p style={{ color: 'var(--k-text)', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{title}</p>
      <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>{sub}</p>
    </div>
  )
}

// ── Modal rating pelanggan oleh mitra ────────────────────────────────────────
function MitraRatingModal({ order, onClose, onSubmitted }) {
  const [score,      setScore]      = useState(0)
  const [comment,    setComment]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  const STAR_LABELS = { 1: 'Bermasalah', 2: 'Kurang Baik', 3: 'Cukup', 4: 'Baik', 5: 'Pelanggan Terbaik!' }

  const submit = async () => {
    if (!score) { setError('Pilih bintang.'); return }
    setSubmitting(true); setError('')
    try {
      await api.post(`/orders/${order.id}/rate`, { score, comment: comment || undefined })
      onSubmitted()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirim rating.')
    } finally { setSubmitting(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', background: '#111120', borderRadius: '24px 24px 0 0', border: '1.5px solid rgba(99,179,237,0.2)', borderBottom: 'none', padding: '8px 0 36px' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#333', margin: '8px auto 20px' }} />
        <div style={{ padding: '0 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>👤</p>
            <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--k-text)', marginBottom: 4 }}>Rating Pelanggan</p>
            <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>Order <span style={{ fontFamily: 'monospace' }}>{order.order_number}</span></p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setScore(s)} style={{
                fontSize: 36, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                filter: score >= s ? 'none' : 'grayscale(1) opacity(0.3)',
                transform: score === s ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.15s',
              }}>⭐</button>
            ))}
          </div>
          {score > 0 && <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#63B3ED', marginBottom: 14 }}>{STAR_LABELS[score]}</p>}
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
            placeholder="Catatan tentang pelanggan ini (opsional)..."
            style={{ width: '100%', background: 'var(--k-card)', border: '1.5px solid var(--k-border)', color: 'var(--k-text)', padding: '10px 14px', borderRadius: 14, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
          {error && <p style={{ color: 'var(--k-danger)', fontSize: 12, marginBottom: 10 }}>⚠ {error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 16, fontSize: 13, fontWeight: 700, background: 'var(--k-card)', color: 'var(--k-muted)', border: '1px solid var(--k-border)', cursor: 'pointer' }}>Lewati</button>
            <button onClick={submit} disabled={submitting || !score} style={{
              flex: 2, padding: '13px', borderRadius: 16, fontSize: 13, fontWeight: 800,
              background: submitting || !score ? 'var(--k-card2)' : '#63B3ED',
              color: submitting || !score ? 'var(--k-muted)' : '#0C0C16',
              border: 'none', cursor: submitting || !score ? 'not-allowed' : 'pointer',
            }}>{submitting ? 'Mengirim...' : 'Kirim Rating 👤'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HistoryCard({ order }) {
  const [showRating,   setShowRating]   = useState(false)
  const [alreadyRated, setAlreadyRated] = useState(order.mitra_rating != null)
  const showRateBtn = order.status === 'completed' && order.customer_id && !alreadyRated

  return (
    <>
      {showRating && <MitraRatingModal order={order} onClose={() => setShowRating(false)} onSubmitted={() => setAlreadyRated(true)} />}
      <div style={{
        background: 'var(--k-card)', border: '1px solid var(--k-border)',
        borderRadius: 18, padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'var(--k-muted)', fontSize: 11, fontFamily: 'monospace', marginBottom: 4 }}>
              {order.order_number}
            </p>
            <p style={{ color: 'var(--k-text)', fontSize: 13, fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {order.item_description || order.pickup_address}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: STATUS_COLOR[order.status] }}>
              {STATUS_LABELS[order.status]}
            </span>
            {order.status === 'completed' && order.mitra_income && (
              <p style={{ color: 'var(--k-accent)', fontSize: 14, fontWeight: 800 }}>
                +{formatRp(order.mitra_income)}
              </p>
            )}
          </div>
        </div>
        {showRateBtn && (
          <button onClick={() => setShowRating(true)} style={{
            marginTop: 10, width: '100%', padding: '9px', borderRadius: 12, fontSize: 12, fontWeight: 700,
            background: 'rgba(99,179,237,0.08)', color: '#63B3ED',
            border: '1px solid rgba(99,179,237,0.25)', cursor: 'pointer',
          }}>
            👤 Rating Pelanggan
          </button>
        )}
      </div>
    </>
  )
}
