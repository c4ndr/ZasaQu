import { useState, useEffect, useRef, useCallback, useId } from 'react'
import { Link } from 'react-router-dom'
import { GoogleMap, OverlayView } from '@react-google-maps/api'
import LocationSearch from '../../components/LocationSearch'
import { fitGoogleMap, distanceMeter } from '../../utils/geo'
import RoadPolyline from '../../components/RoadPolyline'
import MapSatToggle from '../../components/MapSatToggle'
import BottomNav from '../../components/BottomNav'
import api from '../../services/api'
import echo from '../../services/echo'
import { useAuth } from '../../context/AuthContext'
import { useMitraGps } from '../../context/MitraGpsContext'

function fmtRp(v)   { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

// ── Authenticated image (requires auth header) ────────────────────────────────
function AuthedImg({ src, alt, style = {} }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let active = true
    api.get(src, { responseType: 'blob' })
      .then(r => { if (active) setUrl(URL.createObjectURL(r.data)) })
      .catch(() => {})
    return () => { active = false }
  }, [src])
  if (!url) return <div style={{ ...style, background: 'var(--k-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span>📷</span></div>
  return <img src={url} alt={alt} style={{ ...style, objectFit: 'cover' }} />
}

// ── Photo upload slot for delivery proof ──────────────────────────────────────
function DeliveryPhotoSlot({ orderId, uploaded, onUploaded, uploadUrl }) {
  const inputId     = useId()
  const [busy, setBusy]     = useState(false)
  const [done, setDone]     = useState(uploaded)
  const [preview, setPreview] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      await api.post(uploadUrl, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setDone(true)
      onUploaded?.()
    } catch { setPreview(null) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ background: 'var(--k-card2)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: 14, padding: 12, marginTop: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 8 }}>
        📸 Foto Bukti Sampai
        {done && <span style={{ marginLeft: 8, color: '#027A48', fontSize: 11 }}>✓ Terupload</span>}
      </p>
      {preview ? (
        <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--k-border)', marginBottom: 6 }} />
      ) : done ? (
        <AuthedImg src={`/food/orders/${orderId}/delivery-photo`} alt="Bukti pengiriman"
          style={{ width: '100%', maxHeight: 160, borderRadius: 10, border: '1px solid var(--k-border)', display: 'block', marginBottom: 6 }} />
      ) : null}
      {!done && (
        <>
          <label htmlFor={inputId} style={{ display: 'block', width: '100%', padding: '10px', borderRadius: 10, border: '1.5px dashed rgba(0,200,150,0.4)', background: 'rgba(0,200,150,0.04)', color: 'var(--k-sub)', fontSize: 12, fontWeight: 600, textAlign: 'center', cursor: 'pointer', boxSizing: 'border-box' }}>
            {busy ? 'Mengunggah...' : '📷 Pilih Foto'}
          </label>
          <input id={inputId} type="file" accept="image/*" capture="environment" onChange={handleFile} disabled={busy} style={{ display: 'none' }} />
        </>
      )}
      {done && !preview && (
        <>
          <label htmlFor={inputId} style={{ display: 'block', marginTop: 6, fontSize: 11, color: 'var(--k-muted)', textAlign: 'center', cursor: 'pointer' }}>
            {busy ? 'Mengunggah...' : '🔄 Ganti foto'}
          </label>
          <input id={inputId} type="file" accept="image/*" capture="environment" onChange={handleFile} disabled={busy} style={{ display: 'none' }} />
        </>
      )}
    </div>
  )
}
function fmtTime(d) { return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
function fmtDist(m) {
  if (!m && m !== 0) return null
  return m >= 1000 ? (m / 1000).toFixed(1) + ' km' : m + ' m'
}

// ── Pin marker ────────────────────────────────────────────────────────────────
function PinMarker({ color, emoji, size = 34 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size * 1.25, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: size, height: size, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: color, border: '2.5px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ transform: 'rotate(45deg)', fontSize: size * 0.45, lineHeight: 1 }}>{emoji}</span>
      </div>
    </div>
  )
}

// Dot posisi mitra
function MitraDot() {
  return (
    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#3B82F6', border: '3px solid #fff', boxShadow: '0 0 0 4px rgba(59,130,246,0.25), 0 2px 8px rgba(0,0,0,0.3)' }} />
  )
}

// ── Peta embedded untuk order aktif ──────────────────────────────────────────
function FoodActiveMap({ order, mitraLat, mitraLng, height = 210, onExpand }) {
  const mapRef    = useRef(null)
  const [mapType, setMapType] = useState('roadmap')
  const merchant  = order.merchant
  const pickLat   = parseFloat(merchant?.lat)
  const pickLng   = parseFloat(merchant?.lng)
  const dropLat   = parseFloat(order.delivery_lat)
  const dropLng   = parseFloat(order.delivery_lng)

  const goingToMerchant = order.status === 'mitra_on_pickup'

  // Rute yang relevan saat ini
  const routeFrom = goingToMerchant && mitraLat
    ? [mitraLat, mitraLng]
    : [pickLat,  pickLng]
  const routeTo = goingToMerchant
    ? [pickLat, pickLng]
    : [dropLat, dropLng]

  const allPoints = [routeFrom, routeTo]
  if (!goingToMerchant) allPoints.push([pickLat, pickLng]) // tampilkan merchant juga saat pengantaran

  const hasCoords = pickLat && pickLng && dropLat && dropLng && !isNaN(pickLat) && !isNaN(dropLat)
  if (!hasCoords) return (
    <div style={{ height, borderRadius: 14, background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--k-sub)', fontSize: 12 }}>
      📍 Koordinat tidak tersedia
    </div>
  )

  return (
    <div style={{ position: 'relative', height, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--k-border)' }}
      onClick={onExpand}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={{ lat: pickLat, lng: pickLng }}
        zoom={13}
        options={{ disableDefaultUI: true, gestureHandling: 'none', clickableIcons: false, mapTypeId: mapType }}
        onLoad={(map) => {
          mapRef.current = map
          const pts = [[pickLat, pickLng], [dropLat, dropLng]]
          if (mitraLat) pts.push([mitraLat, mitraLng])
          fitGoogleMap(map, pts, 52)
        }}
      >
        <RoadPolyline pickup={routeFrom} dropoff={routeTo} color={goingToMerchant ? '#F97316' : '#3B82F6'} weight={4} opacity={0.9} />
        {!goingToMerchant && <RoadPolyline pickup={[pickLat, pickLng]} dropoff={[dropLat, dropLng]} color="#3B82F6" weight={3} opacity={0.5} />}

        <OverlayView position={{ lat: pickLat, lng: pickLng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h })}>
          <PinMarker color="#F97316" emoji="🍜" size={goingToMerchant ? 36 : 28} />
        </OverlayView>
        <OverlayView position={{ lat: dropLat, lng: dropLng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h })}>
          <PinMarker color="#3B82F6" emoji="🏠" size={!goingToMerchant ? 36 : 28} />
        </OverlayView>
        {mitraLat && mitraLng && (
          <OverlayView position={{ lat: mitraLat, lng: mitraLng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <MitraDot />
          </OverlayView>
        )}
      </GoogleMap>

      <div onClick={e => e.stopPropagation()}>
        <MapSatToggle mapType={mapType} onToggle={() => setMapType(t => t === 'roadmap' ? 'hybrid' : 'roadmap')} />
      </div>

      {/* Overlay tap-to-expand */}
      <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: '5px 10px', fontSize: 11, color: '#fff', fontWeight: 600, backdropFilter: 'blur(4px)', pointerEvents: 'none' }}>
        Tap untuk perbesar ↗
      </div>
    </div>
  )
}

// ── Modal peta fullscreen ──────────────────────────────────────────────────────
function FoodMapModal({ order, mitraLat, mitraLng, onClose }) {
  const mapRef   = useRef(null)
  const [mapType, setMapType] = useState('roadmap')
  const merchant = order.merchant
  const pickLat  = parseFloat(merchant?.lat)
  const pickLng  = parseFloat(merchant?.lng)
  const dropLat  = parseFloat(order.delivery_lat)
  const dropLng  = parseFloat(order.delivery_lng)
  const goingToMerchant = order.status === 'mitra_on_pickup'

  const routeFrom = goingToMerchant && mitraLat ? [mitraLat, mitraLng] : [pickLat, pickLng]
  const routeTo   = goingToMerchant ? [pickLat, pickLng] : [dropLat, dropLng]

  const gmapsUrl = (lat, lng, label) =>
    lat && lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: 'var(--k-bg)' }}>
      {/* Tutup */}
      <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, zIndex: 10001, width: 40, height: 40, borderRadius: 12, background: 'rgba(0,0,0,0.7)', border: 'none', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

      {/* Label order */}
      <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 10001, padding: '8px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{order.order_number}</p>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#F97316' }}>{fmtRp(order.mitra_income)}</p>
      </div>

      {/* Peta */}
      <div style={{ flex: 1, position: 'relative' }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={{ lat: pickLat, lng: pickLng }}
          zoom={13}
          options={{ disableDefaultUI: true, gestureHandling: 'greedy', clickableIcons: false, mapTypeId: mapType }}
          onLoad={(map) => {
            mapRef.current = map
            const pts = [[pickLat, pickLng], [dropLat, dropLng]]
            if (mitraLat) pts.push([mitraLat, mitraLng])
            fitGoogleMap(map, pts, 60)
          }}
        >
          <RoadPolyline pickup={routeFrom} dropoff={routeTo} color={goingToMerchant ? '#F97316' : '#3B82F6'} weight={5} opacity={0.92} />
          {!goingToMerchant && <RoadPolyline pickup={[pickLat, pickLng]} dropoff={[dropLat, dropLng]} color="#3B82F6" weight={4} opacity={0.55} />}
          <OverlayView position={{ lat: pickLat, lng: pickLng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h })}>
            <PinMarker color="#F97316" emoji="🍜" size={40} />
          </OverlayView>
          <OverlayView position={{ lat: dropLat, lng: dropLng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h })}>
            <PinMarker color="#3B82F6" emoji="🏠" size={40} />
          </OverlayView>
          {mitraLat && mitraLng && (
            <OverlayView position={{ lat: mitraLat, lng: mitraLng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
              <MitraDot />
            </OverlayView>
          )}
        </GoogleMap>
        <MapSatToggle mapType={mapType} onToggle={() => setMapType(t => t === 'roadmap' ? 'hybrid' : 'roadmap')} />
      </div>

      {/* Info rute bawah */}
      <div style={{ background: 'var(--k-surface)', borderTop: '1px solid var(--k-border)', padding: '14px 16px', paddingBottom: 'calc(14px + env(safe-area-inset-bottom,0px))', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Merchant */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F97316', flexShrink: 0, marginTop: 4 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: 'var(--k-sub)', fontWeight: 600 }}>PICKUP — {merchant?.name}</p>
            <p style={{ fontSize: 13, color: 'var(--k-text)', lineHeight: 1.4 }}>{merchant?.address || '—'}</p>
          </div>
          <a href={gmapsUrl(merchant?.lat, merchant?.lng, merchant?.address)} target="_blank" rel="noopener noreferrer"
            style={{ padding: '7px 12px', borderRadius: 9, background: '#FFF4EE', color: '#F97316', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0, border: '1px solid rgba(249,115,22,0.2)' }}>
            Navigasi
          </a>
        </div>
        <div style={{ height: 1, background: 'var(--k-border)' }} />
        {/* Customer */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3B82F6', flexShrink: 0, marginTop: 4 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: 'var(--k-sub)', fontWeight: 600 }}>ANTAR — {order.customer?.name}</p>
            <p style={{ fontSize: 13, color: 'var(--k-text)', lineHeight: 1.4 }}>{order.delivery_address || '—'}</p>
          </div>
          <a href={gmapsUrl(order.delivery_lat, order.delivery_lng, order.delivery_address)} target="_blank" rel="noopener noreferrer"
            style={{ padding: '7px 12px', borderRadius: 9, background: '#EFF6FF', color: '#3B82F6', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0, border: '1px solid rgba(59,130,246,0.2)' }}>
            Navigasi
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Peta kecil untuk order tersedia (bisa di-expand) ─────────────────────────
function FoodAvailableMap({ order, mitraLat, mitraLng }) {
  const mapRef   = useRef(null)
  const merchant = order.merchant
  const pickLat  = parseFloat(merchant?.lat)
  const pickLng  = parseFloat(merchant?.lng)
  const dropLat  = parseFloat(order.delivery_lat)
  const dropLng  = parseFloat(order.delivery_lng)

  if (!pickLat || !pickLng || !dropLat || !dropLng || isNaN(pickLat) || isNaN(dropLat)) return null

  return (
    <div style={{ height: 150, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--k-border)', marginBottom: 12 }}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: pickLng, latitude: pickLat, zoom: 13 }}
        mapStyle={SATELLITE_STYLE}
        style={{ width: '100%', height: '100%' }}
        interactive={false}
        attributionControl={false}
        onLoad={() => {
          const pts = [[pickLat, pickLng], [dropLat, dropLng]]
          if (mitraLat) pts.push([mitraLat, mitraLng])
          fitPoints(mapRef.current?.getMap(), pts, 44)
        }}
      >
        <RoadPolyline pickup={[pickLat, pickLng]} dropoff={[dropLat, dropLng]} color="#F97316" weight={3} opacity={0.8} id={`avail-${order.id}`} />
        <Marker longitude={pickLng} latitude={pickLat} anchor="bottom"><PinMarker color="#F97316" emoji="🍜" size={28} /></Marker>
        <Marker longitude={dropLng} latitude={dropLat} anchor="bottom"><PinMarker color="#3B82F6" emoji="🏠" size={28} /></Marker>
        {mitraLat && mitraLng && <Marker longitude={mitraLng} latitude={mitraLat} anchor="center"><MitraDot /></Marker>}
      </Map>
    </div>
  )
}

// ── Status metadata ───────────────────────────────────────────────────────────
const STATUS_META = {
  mitra_on_pickup: { label: 'Menuju Warung',   color: '#F59E0B', bg: '#FFFBEB', border: '#F59E0B55', icon: '🏍️' },
  picked_up:       { label: 'Pesanan Diambil', color: '#7C3AED', bg: '#FAF5FF', border: '#9F7AEA55', icon: '📦' },
  on_delivery:     { label: 'Mengantar',        color: '#1D4ED8', bg: '#EFF6FF', border: '#3B82F655', icon: '🚀' },
  delivered:       { label: 'Terkirim',         color: '#027A48', bg: '#ECFDF3', border: '#00C89655', icon: '✓'  },
  completed:       { label: 'Selesai',          color: '#374151', bg: '#F9FAFB', border: '#E5E7EB',   icon: '⭐' },
  cancelled:       { label: 'Dibatalkan',       color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB',   icon: '✕'  },
}
const NEXT_STATUS = {
  mitra_on_pickup: { label: '✓ Sudah di Warung — Ambil Pesanan', value: 'picked_up',  color: '#7C3AED', bg: '#EDE9FE' },
  picked_up:       { label: '🚀 Berangkat Antar ke Pelanggan',   value: 'on_delivery', color: '#1D4ED8', bg: '#DBEAFE' },
  on_delivery:     { label: '✓ Pesanan Sudah Diantar',           value: 'delivered',   color: '#027A48', bg: '#DCFCE7' },
}
const ACTIVE_STATUSES = ['mitra_on_pickup', 'picked_up', 'on_delivery']
const STEPS = ['Menuju Warung', 'Ambil', 'Antar', 'Selesai']
function stepIndex(status) {
  return { mitra_on_pickup: 0, picked_up: 1, on_delivery: 2, delivered: 3 }[status] ?? 0
}

// ── Progress step bar ─────────────────────────────────────────────────────────
function DeliverySteps({ status }) {
  const idx = stepIndex(status)
  const sm  = STATUS_META[status] ?? STATUS_META.mitra_on_pickup
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= idx ? sm.color : '#E5E7EB' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {STEPS.map((l, i) => (
          <span key={i} style={{ fontSize: 9, color: i <= idx ? sm.color : '#9CA3AF', fontWeight: i === idx ? 700 : 400 }}>{l}</span>
        ))}
      </div>
    </div>
  )
}

// ── Confirm modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, danger, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--k-card)', borderRadius: 16, padding: '24px 20px', width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>{danger ? '⚠️' : '❓'}</div>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--k-sub)', marginBottom: 20, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid var(--k-border)', background: 'transparent', color: 'var(--k-sub)', cursor: 'pointer', fontWeight: 600 }}>Batal</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: danger ? '#FEF2F2' : '#ECFDF3', color: danger ? '#DC2626' : '#027A48', cursor: 'pointer', fontWeight: 700 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

const SESSION_FORM_DEFAULT = {
  origin_address: '', origin_lat: null, origin_lng: null,
  destination_address: '', corridor_width: 1000, max_orders: 5,
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MitraFoodOrdersPage() {
  const [available,       setAvailable]       = useState([])
  const [myOrders,        setMyOrders]        = useState([])
  const [jastipSession,   setJastipSession]   = useState(undefined)
  const [loading,         setLoading]         = useState(true)
  const [accepting,       setAccepting]       = useState(null)
  const [updating,        setUpdating]        = useState(null)
  const [pickingUp,       setPickingUp]       = useState(null)
  const [startingSession, setStartingSession] = useState(false)
  const [closingSession,  setClosingSession]  = useState(false)
  const [tab,             setTab]             = useState('active')
  const [toast,           setToast]           = useState(null)
  const [confirm,         setConfirm]         = useState(null)
  const [mapModal,        setMapModal]        = useState(null)  // order untuk fullscreen map
  const [sessionForm,     setSessionForm]     = useState(SESSION_FORM_DEFAULT)
  const [gettingGps,      setGettingGps]      = useState(false)
  const [showMapAvail,    setShowMapAvail]    = useState({})    // { orderId: bool }
  const pollRef = useRef(null)
  const { user } = useAuth()
  const { gps: mitraGps } = useMitraGps()
  const mitraLat = mitraGps?.lat ?? null
  const mitraLng = mitraGps?.lng ?? null

  const load = useCallback(async () => {
    try {
      const [avRes, myRes, sessRes] = await Promise.all([
        api.get('/food/mitra/orders/available'),
        api.get('/food/mitra/orders/my'),
        api.get('/food/jastip/sessions/current').catch(() => ({ data: { data: null } })),
      ])
      setAvailable(avRes.data.data || [])
      setMyOrders(myRes.data.data || [])
      setJastipSession(sessRes.data.data)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const vehicleType = user?.role?.replace('mitra_', '') ?? 'motor'
    const ch = echo.channel(`mitra.${vehicleType}`)
    ch.listen('.food.order.new',    () => load())
    ch.listen('.food.order.status', () => load())
    pollRef.current = setInterval(load, 30000)
    return () => { clearInterval(pollRef.current); echo.leave(`mitra.${vehicleType}`) }
  }, [load, user?.role])

  async function handleAccept(orderId) {
    setAccepting(orderId)
    try {
      await api.post(`/food/mitra/orders/${orderId}/accept`)
      showToast('success', 'Order diterima! Segera menuju warung.')
      setTab('active')
      load()
    } catch (e) { showToast('error', e.response?.data?.message || 'Gagal menerima order.') }
    finally { setAccepting(null) }
  }

  async function handleUpdateStatus(orderId, status) {
    setUpdating(orderId)
    try {
      await api.patch(`/food/mitra/orders/${orderId}/status`, { status })
      showToast('success', 'Status diperbarui.')
      load()
    } catch (e) { showToast('error', e.response?.data?.message || 'Gagal.') }
    finally { setUpdating(null) }
  }

  async function handlePickupFromMerchant(orderId) {
    setPickingUp(orderId)
    try {
      await api.post(`/food/jastip/orders/${orderId}/pickup-from-merchant`)
      showToast('success', 'Pickup dicatat.')
      load()
    } catch (e) { showToast('error', e.response?.data?.message || 'Gagal.') }
    finally { setPickingUp(null) }
  }

  function getGps() {
    setGettingGps(true)
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const { latitude: la, longitude: lo } = pos.coords
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${lo}&format=json&accept-language=id`)
          .then(r => r.json())
          .then(data => setSessionForm(f => ({ ...f, origin_lat: la, origin_lng: lo, origin_address: f.origin_address || data.display_name || `${la.toFixed(5)}, ${lo.toFixed(5)}` })))
          .catch(() => setSessionForm(f => ({ ...f, origin_lat: la, origin_lng: lo })))
          .finally(() => setGettingGps(false))
      },
      () => { showToast('error', 'Gagal ambil GPS.'); setGettingGps(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleStartSession() {
    if (!sessionForm.origin_lat) return showToast('error', 'Ambil lokasi awal terlebih dahulu.')
    if (!sessionForm.destination_address.trim()) return showToast('error', 'Isi area/tujuan rute.')
    setStartingSession(true)
    try {
      await api.post('/food/jastip/sessions', {
        origin_lat: sessionForm.origin_lat, origin_lng: sessionForm.origin_lng,
        origin_address: sessionForm.origin_address,
        destination_address: sessionForm.destination_address,
        corridor_width: Number(sessionForm.corridor_width),
        max_orders: Number(sessionForm.max_orders),
      })
      showToast('success', 'Sesi Kuliner dimulai!')
      setSessionForm(SESSION_FORM_DEFAULT)
      load()
    } catch (e) { showToast('error', e.response?.data?.message || 'Gagal memulai sesi.') }
    finally { setStartingSession(false) }
  }

  function askCloseSession() {
    setConfirm({
      title: 'Tutup Sesi Kuliner?',
      message: 'Order yang sudah masuk tetap diproses hingga selesai. Pelanggan baru tidak bisa bergabung lagi.',
      confirmLabel: 'Ya, Tutup Sesi',
      danger: true,
      onConfirm: async () => {
        setConfirm(null); setClosingSession(true)
        try {
          await api.delete('/food/jastip/sessions/current')
          showToast('success', 'Sesi ditutup.')
          load()
        } catch (e) { showToast('error', e.response?.data?.message || 'Gagal menutup sesi.') }
        finally { setClosingSession(false) }
      },
    })
  }

  function showToast(type, msg) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  const active  = myOrders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const history = myOrders.filter(o => ['completed', 'cancelled', 'delivered'].includes(o.status))

  const ordersByMerchant = {}
  ;(jastipSession?.food_orders || []).forEach(o => {
    const mid = o.merchant_id
    if (!ordersByMerchant[mid]) ordersByMerchant[mid] = { merchant: o.merchant, orders: [] }
    ordersByMerchant[mid].orders.push(o)
  })
  const merchantGroups = Object.values(ordersByMerchant)

  const pendingAvail = available.length
  const todayEarning = history.filter(o => o.status === 'completed').reduce((s, o) => s + (o.mitra_income ?? 0), 0)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}`}</style>

      {/* Fullscreen map modal */}
      {mapModal && <FoodMapModal order={mapModal} mitraLat={mitraLat} mitraLng={mitraLng} onClose={() => setMapModal(null)} />}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '11px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}

      {/* ── Header ── */}
      <div style={{ background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--k-text)' }}>Delivery Makanan 🍜</div>
            {todayEarning > 0 && <div style={{ fontSize: 12, color: '#027A48', fontWeight: 600 }}>Hari ini: +{fmtRp(todayEarning)}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mitraLat && <span style={{ fontSize: 10, color: '#3B82F6', fontWeight: 700, background: 'rgba(59,130,246,0.1)', padding: '3px 8px', borderRadius: 20 }}>📡 GPS aktif</span>}
            {jastipSession && <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(0,200,150,0.12)', color: '#027A48' }}>● Sesi Aktif</span>}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--k-border)' }}>
          {[
            ['active',       '🏍️', 'Aktif',      active.length        ],
            ['available',    '📋', 'Order Baru', pendingAvail         ],
            ['sesi_kuliner', '🛵', 'Sesi',       jastipSession ? 1 : 0],
            ['history',      '📜', 'Riwayat',    0                    ],
          ].map(([k, emoji, l, count]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: '10px 4px 8px', border: 'none', cursor: 'pointer', background: 'transparent',
              color: tab === k ? '#F97316' : 'var(--k-sub)',
              borderBottom: tab === k ? '2.5px solid #F97316' : '2.5px solid transparent',
              fontWeight: tab === k ? 700 : 400, fontSize: 11,
            }}>
              <div style={{ fontSize: 18, lineHeight: 1, position: 'relative', display: 'inline-block' }}>
                {emoji}
                {count > 0 && (
                  <span style={{ position: 'absolute', top: -5, right: -8, background: k === 'sesi_kuliner' ? '#00C896' : '#DC2626', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 4px', borderRadius: 20, lineHeight: 1.4, animation: k === 'available' && pendingAvail > 0 ? 'blink 2s infinite' : 'none' }}>{k === 'sesi_kuliner' ? '●' : count}</span>
                )}
              </div>
              <div style={{ marginTop: 2 }}>{l}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #F97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13 }}>Memuat data...</p>
          </div>
        ) : (
          <>

            {/* ══════════════════════════════════════════════════════════════════
                Tab: ORDER AKTIF — peta penuh, info pelanggan, navigasi
            ══════════════════════════════════════════════════════════════════ */}
            {tab === 'active' && (
              active.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
                  <div style={{ fontSize: 52, marginBottom: 12 }}>🏍️</div>
                  <p style={{ fontWeight: 600, color: 'var(--k-text)', marginBottom: 6 }}>Tidak ada order aktif</p>
                  <p style={{ fontSize: 13, marginBottom: 20 }}>Cek tab "Order Baru" untuk ambil order.</p>
                  <button onClick={() => setTab('available')} style={{ padding: '11px 24px', borderRadius: 20, border: 'none', background: '#F97316', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                    Lihat Order Baru
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {active.map(order => {
                    const sm  = STATUS_META[order.status] ?? STATUS_META.mitra_on_pickup
                    const nx  = NEXT_STATUS[order.status]
                    const isCOD = order.payment_method === 'cod'
                    const goingToMerchant = order.status === 'mitra_on_pickup'

                    // Hitung jarak ke tujuan sekarang
                    const targetLat = goingToMerchant ? order.merchant?.lat : order.delivery_lat
                    const targetLng = goingToMerchant ? order.merchant?.lng : order.delivery_lng
                    const distM = mitraLat && targetLat
                      ? distanceMeter(mitraLat, mitraLng, parseFloat(targetLat), parseFloat(targetLng))
                      : null

                    const gmapsUrl = (lat, lng, addr) =>
                      lat && lng ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`

                    return (
                      <div key={order.id} style={{ borderRadius: 18, background: 'var(--k-card)', border: `2px solid ${sm.border}`, overflow: 'hidden' }}>

                        {/* Status banner */}
                        <div style={{ background: sm.bg, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: sm.color }}>{sm.icon} {sm.label}</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {isCOD && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>💵 COD</span>}
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--k-sub)', fontFamily: 'monospace' }}>#{order.order_number}</span>
                          </div>
                        </div>

                        <div style={{ padding: '14px' }}>
                          {/* Progress */}
                          <DeliverySteps status={order.status} />

                          {/* PETA EMBEDDED — tap untuk fullscreen */}
                          <div style={{ marginBottom: 14 }}>
                            <FoodActiveMap
                              order={order}
                              mitraLat={mitraLat}
                              mitraLng={mitraLng}
                              height={200}
                              onExpand={() => setMapModal(order)}
                            />
                          </div>

                          {/* Jarak ke tujuan */}
                          {distM !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: goingToMerchant ? 'rgba(249,115,22,0.08)' : 'rgba(59,130,246,0.08)', border: `1px solid ${goingToMerchant ? 'rgba(249,115,22,0.2)' : 'rgba(59,130,246,0.2)'}`, marginBottom: 14 }}>
                              <span style={{ fontSize: 20 }}>{goingToMerchant ? '🍜' : '🏠'}</span>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: goingToMerchant ? '#F97316' : '#3B82F6' }}>
                                  {goingToMerchant ? 'Menuju warung' : 'Menuju pelanggan'}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>
                                  Jarak: <b>{fmtDist(distM)}</b>
                                  {distM < 1000 && ' · Hampir sampai!'}
                                </div>
                              </div>
                              <a href={gmapsUrl(targetLat, targetLng, goingToMerchant ? order.merchant?.address : order.delivery_address)} target="_blank" rel="noopener noreferrer"
                                style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: 9, background: goingToMerchant ? '#FFF4EE' : '#EFF6FF', color: goingToMerchant ? '#F97316' : '#3B82F6', fontSize: 12, fontWeight: 700, textDecoration: 'none', border: `1px solid ${goingToMerchant ? 'rgba(249,115,22,0.2)' : 'rgba(59,130,246,0.2)'}` }}>
                                Navigasi ↗
                              </a>
                            </div>
                          )}

                          {/* Rute teks: Warung → Pelanggan */}
                          <div style={{ display: 'flex', gap: 0, marginBottom: 14 }}>
                            <div style={{ flex: 1, padding: '10px 12px', borderRadius: '10px 0 0 10px', background: goingToMerchant ? 'rgba(249,115,22,0.08)' : 'var(--k-input)', border: `1.5px solid ${goingToMerchant ? '#F97316' : 'var(--k-border)'}`, borderRight: 'none' }}>
                              <div style={{ fontSize: 9, color: 'var(--k-sub)', fontWeight: 700, marginBottom: 2, letterSpacing: '0.05em' }}>🍜 PICKUP</div>
                              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 1 }}>{order.merchant?.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--k-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.merchant?.address || '—'}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--k-input)', padding: '0 6px', fontSize: 14, color: 'var(--k-sub)' }}>›</div>
                            <div style={{ flex: 1, padding: '10px 12px', borderRadius: '0 10px 10px 0', background: !goingToMerchant ? 'rgba(59,130,246,0.08)' : 'var(--k-input)', border: `1.5px solid ${!goingToMerchant ? '#3B82F6' : 'var(--k-border)'}`, borderLeft: 'none' }}>
                              <div style={{ fontSize: 9, color: 'var(--k-sub)', fontWeight: 700, marginBottom: 2, letterSpacing: '0.05em' }}>🏠 ANTAR</div>
                              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 1 }}>{order.customer?.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--k-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.delivery_address || '—'}</div>
                            </div>
                          </div>

                          {/* Info pelanggan + tombol chat */}
                          {order.customer && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--k-input)', border: '1px solid var(--k-border)', marginBottom: 14 }}>
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{order.customer.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Pelanggan</div>
                              </div>
                              <Link
                                to={`/mitra/food/orders/${order.id}/chat`}
                                state={{ otherName: order.customer.name }}
                                style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none', flexShrink: 0 }}
                              >💬</Link>
                            </div>
                          )}

                          {/* COD info — rincian uang yang harus dibayar & diterima */}
                          {isCOD && (
                            <div style={{ fontSize: 12, padding: '10px 12px', borderRadius: 9, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', marginBottom: 12 }}>
                              <div style={{ color: '#DC2626', fontWeight: 700, marginBottom: 8 }}>
                                {goingToMerchant ? '💵 COD — Bayar ke merchant saat ambil pesanan' : '💵 COD — Terima uang tunai dari pelanggan'}
                              </div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <div style={{ flex: 1, background: 'rgba(220,38,38,0.08)', borderRadius: 7, padding: '6px 8px' }}>
                                  <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700, marginBottom: 2 }}>Bayar ke merchant</div>
                                  <div style={{ fontWeight: 800, fontSize: 14, color: '#DC2626' }}>{fmtRp(order.merchant_income)}</div>
                                </div>
                                <div style={{ flex: 1, background: 'rgba(220,38,38,0.08)', borderRadius: 7, padding: '6px 8px' }}>
                                  <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700, marginBottom: 2 }}>Terima dari pelanggan</div>
                                  <div style={{ fontWeight: 800, fontSize: 14, color: '#DC2626' }}>{fmtRp(order.total_amount)}</div>
                                </div>
                                <div style={{ flex: 1, background: 'rgba(220,38,38,0.08)', borderRadius: 7, padding: '6px 8px' }}>
                                  <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700, marginBottom: 2 }}>Potong walletmu</div>
                                  <div style={{ fontWeight: 800, fontSize: 14, color: '#DC2626' }}>−{fmtRp((order.platform_commission_food ?? 0) + (order.platform_commission_delivery ?? 0))}</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Item list */}
                          <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 14, padding: '8px 10px', borderRadius: 8, background: 'var(--k-input)', lineHeight: 1.6 }}>
                            🛍 {order.items?.map(i => `${i.item_name} ×${i.quantity}`).join(' · ')}
                          </div>

                          {/* Pendapatan */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Pendapatanmu</div>
                              <div style={{ fontWeight: 900, fontSize: 20, color: '#F97316' }}>{fmtRp(order.mitra_income)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Total order</div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{fmtRp(order.total_amount)}</div>
                            </div>
                          </div>

                          {/* Foto bukti pengiriman — saat on_delivery */}
                          {order.status === 'on_delivery' && (
                            <DeliveryPhotoSlot
                              orderId={order.id}
                              uploaded={!!order.delivery_photo}
                              onUploaded={load}
                              uploadUrl={`/food/mitra/orders/${order.id}/delivery-photo`}
                            />
                          )}

                          {/* Tombol update status — CTA utama */}
                          {nx && (
                            <button onClick={() => handleUpdateStatus(order.id, nx.value)} disabled={updating === order.id}
                              style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', cursor: updating === order.id ? 'default' : 'pointer', background: updating === order.id ? 'var(--k-border)' : nx.color, color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: '-0.2px', animation: updating !== order.id ? 'pulse 2s infinite' : 'none', marginTop: order.status === 'on_delivery' ? 12 : 0 }}>
                              {updating === order.id ? 'Memperbarui...' : nx.label}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}

            {/* ══════════════════════════════════════════════════════════════════
                Tab: ORDER TERSEDIA
            ══════════════════════════════════════════════════════════════════ */}
            {tab === 'available' && (
              available.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
                  <div style={{ fontSize: 52, marginBottom: 12 }}>🍜</div>
                  <p style={{ fontWeight: 600, color: 'var(--k-text)', marginBottom: 6 }}>Belum ada order tersedia</p>
                  <p style={{ fontSize: 13 }}>Pesanan siap diambil akan muncul di sini.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {available.map(order => {
                    const isCOD = order.payment_method === 'cod'
                    const merchant = order.merchant
                    const distToMerchantM = mitraLat && merchant?.lat
                      ? distanceMeter(mitraLat, mitraLng, parseFloat(merchant.lat), parseFloat(merchant.lng))
                      : null
                    const showMap = showMapAvail[order.id]

                    return (
                      <div key={order.id} style={{ borderRadius: 16, background: 'var(--k-card)', border: '2px solid rgba(0,200,150,0.35)', overflow: 'hidden' }}>
                        {/* Banner */}
                        <div style={{ background: 'rgba(0,200,150,0.08)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,200,150,0.2)' }}>
                          <span style={{ fontWeight: 800, fontSize: 13, color: '#027A48' }}>🟢 Siap Diambil</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {isCOD && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>💵 COD</span>}
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(99,179,237,0.15)', color: '#1D4ED8' }}>#{order.order_number}</span>
                          </div>
                        </div>

                        <div style={{ padding: '12px 14px' }}>
                          {/* Mini map (collapsible) */}
                          {showMap && (
                            <FoodAvailableMap order={order} mitraLat={mitraLat} mitraLng={mitraLng} />
                          )}

                          {/* Rute visual */}
                          <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, marginBottom: 12 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F97316', border: '2px solid #fff', boxShadow: '0 0 0 2px #F97316' }} />
                              <div style={{ width: 2, flex: 1, background: '#E5E7EB', margin: '3px 0' }} />
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3B82F6', border: '2px solid #fff', boxShadow: '0 0 0 2px #3B82F6' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 10, color: 'var(--k-sub)', fontWeight: 600 }}>🍜 PICKUP</div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{merchant?.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>{merchant?.address || '—'}</div>
                                {distToMerchantM !== null && <div style={{ fontSize: 11, color: '#F97316', fontWeight: 600, marginTop: 2 }}>📍 {fmtDist(distToMerchantM)} dari posisimu</div>}
                              </div>
                              <div>
                                <div style={{ fontSize: 10, color: 'var(--k-sub)', fontWeight: 600 }}>🏠 ANTAR</div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{order.customer?.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--k-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.delivery_address}</div>
                              </div>
                            </div>

                            {/* Tombol lihat peta */}
                            <button onClick={() => setShowMapAvail(p => ({ ...p, [order.id]: !p[order.id] }))}
                              style={{ alignSelf: 'flex-start', padding: '6px 10px', borderRadius: 9, border: '1.5px solid var(--k-border)', background: showMap ? '#FFF4EE' : 'var(--k-input)', color: showMap ? '#F97316' : 'var(--k-sub)', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                              {showMap ? 'Tutup' : '🗺️ Peta'}
                            </button>
                          </div>

                          {/* Items */}
                          <div style={{ fontSize: 12, color: 'var(--k-sub)', padding: '7px 10px', borderRadius: 8, background: 'var(--k-input)', marginBottom: 12, lineHeight: 1.6 }}>
                            🛍 {order.items?.map(i => `${i.item_name} ×${i.quantity}`).join(' · ')}
                          </div>

                          {/* COD info — rincian uang sebelum order diambil */}
                          {isCOD && (
                            <div style={{ fontSize: 12, padding: '10px 12px', borderRadius: 9, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', marginBottom: 12 }}>
                              <div style={{ color: '#DC2626', fontWeight: 700, marginBottom: 8 }}>💵 COD — Rincian uang yang perlu kamu siapkan</div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <div style={{ flex: 1, background: 'rgba(220,38,38,0.08)', borderRadius: 7, padding: '6px 8px' }}>
                                  <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700, marginBottom: 2 }}>Bayar ke merchant</div>
                                  <div style={{ fontWeight: 800, fontSize: 14, color: '#DC2626' }}>{fmtRp(order.merchant_income)}</div>
                                </div>
                                <div style={{ flex: 1, background: 'rgba(220,38,38,0.08)', borderRadius: 7, padding: '6px 8px' }}>
                                  <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700, marginBottom: 2 }}>Terima dari pelanggan</div>
                                  <div style={{ fontWeight: 800, fontSize: 14, color: '#DC2626' }}>{fmtRp(order.total_amount)}</div>
                                </div>
                                <div style={{ flex: 1, background: 'rgba(220,38,38,0.08)', borderRadius: 7, padding: '6px 8px' }}>
                                  <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700, marginBottom: 2 }}>Potong walletmu</div>
                                  <div style={{ fontWeight: 800, fontSize: 14, color: '#DC2626' }}>−{fmtRp((order.platform_commission_food ?? 0) + (order.platform_commission_delivery ?? 0))}</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Pendapatan + tombol ambil */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Pendapatanmu</div>
                              <div style={{ fontWeight: 800, fontSize: 20, color: '#F97316' }}>{fmtRp(order.mitra_income)}</div>
                            </div>
                            <button onClick={() => handleAccept(order.id)} disabled={accepting === order.id}
                              style={{ padding: '13px 26px', borderRadius: 12, border: 'none', background: accepting === order.id ? 'var(--k-border)' : '#00C896', color: '#fff', fontWeight: 900, fontSize: 15, cursor: accepting === order.id ? 'default' : 'pointer', animation: accepting !== order.id ? 'pulse 1.5s infinite' : 'none' }}>
                              {accepting === order.id ? 'Memproses...' : 'Ambil Order'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}

            {/* ══════════════════════════════════════════════════════════════════
                Tab: SESI KULINER
            ══════════════════════════════════════════════════════════════════ */}
            {tab === 'sesi_kuliner' && (
              jastipSession ? (
                <div>
                  <div style={{ padding: '16px', borderRadius: 16, background: 'var(--k-card)', border: '2px solid rgba(0,200,150,0.3)', marginBottom: 16, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{jastipSession.vehicle_type === 'motor' ? '🛵' : '🚗'} Sesi Aktif</div>
                      <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: 'rgba(0,200,150,0.15)', color: '#027A48' }}>● LIVE</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 4 }}>📍 {jastipSession.origin_address}</div>
                    <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 12 }}>🎯 {jastipSession.destination_address}</div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                      <div style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 10, background: 'var(--k-input)' }}>
                        <div style={{ fontWeight: 800, fontSize: 18 }}>{jastipSession.orders_count}/{jastipSession.max_orders}</div>
                        <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>slot order</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 10, background: 'var(--k-input)' }}>
                        <div style={{ fontWeight: 800, fontSize: 18 }}>{jastipSession.corridor_width}m</div>
                        <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>koridor</div>
                      </div>
                    </div>
                    <button onClick={askCloseSession} disabled={closingSession} style={{ width: '100%', padding: '11px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(220,38,38,0.08)', color: '#DC2626', fontWeight: 700, fontSize: 14 }}>
                      {closingSession ? 'Menutup...' : '🔴 Tutup Sesi'}
                    </button>
                  </div>

                  {merchantGroups.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--k-sub)' }}>
                      <div style={{ fontSize: 40, marginBottom: 10 }}>⏳</div>
                      <p style={{ fontWeight: 600 }}>Menunggu pelanggan bergabung</p>
                      <p style={{ fontSize: 13, marginTop: 4 }}>Pelanggan bisa memilih warung dalam rute kamu.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {merchantGroups.map(({ merchant, orders }) => {
                        const allPickedUp = orders.every(o => o.mitra_picked_up_from_merchant_at)
                        return (
                          <div key={merchant?.id} style={{ borderRadius: 14, background: 'var(--k-card)', border: `1.5px solid ${allPickedUp ? 'rgba(0,200,150,0.3)' : 'var(--k-border)'}`, overflow: 'hidden' }}>
                            <div style={{ padding: '10px 14px', background: allPickedUp ? 'rgba(0,200,150,0.08)' : 'rgba(249,115,22,0.06)', borderBottom: '1px solid var(--k-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: 14 }}>🏪 {merchant?.name || 'Warung'}</div>
                                <div style={{ fontSize: 11, color: 'var(--k-sub)', marginTop: 1 }}>{merchant?.address || '—'}</div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                {allPickedUp
                                  ? <span style={{ fontSize: 12, fontWeight: 700, color: '#027A48' }}>✓ Diambil</span>
                                  : <span style={{ fontSize: 12, fontWeight: 700, color: '#F97316' }}>{orders.length} order</span>
                                }
                                {merchant?.lat && (
                                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${merchant.lat},${merchant.lng}&travelmode=driving`} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', textDecoration: 'none', background: '#EFF6FF', padding: '3px 8px', borderRadius: 8, border: '1px solid #BFDBFE' }}>
                                    🗺️ Navigasi
                                  </a>
                                )}
                              </div>
                            </div>

                            <div style={{ padding: '10px 14px' }}>
                              {orders.map((o, idx) => (
                                <div key={o.id} style={{ marginBottom: idx < orders.length - 1 ? 10 : 0, paddingBottom: idx < orders.length - 1 ? 10 : 0, borderBottom: idx < orders.length - 1 ? '1px solid var(--k-border)' : 'none' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ fontWeight: 700, fontSize: 13 }}>#{o.order_number}</span>
                                    <span style={{ fontSize: 11, color: o.mitra_picked_up_from_merchant_at ? '#027A48' : '#9CA3AF', fontWeight: 600 }}>
                                      {o.mitra_picked_up_from_merchant_at ? '✓ Diambil' : 'Belum diambil'}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>{o.items?.map(i => `${i.item_name} ×${i.quantity}`).join(', ')}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                                    <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>👤 {o.customer?.name} · {o.delivery_address}</div>
                                    <Link
                                      to={`/mitra/food/orders/${o.id}/chat`}
                                      state={{ otherName: o.customer?.name }}
                                      style={{ fontSize: 11, fontWeight: 700, color: '#027A48', textDecoration: 'none', background: 'rgba(0,200,150,0.1)', padding: '3px 10px', borderRadius: 8, flexShrink: 0 }}
                                    >💬</Link>
                                  </div>
                                </div>
                              ))}

                              {!allPickedUp && (
                                <button onClick={() => {
                                  const unpicked = orders.find(o => !o.mitra_picked_up_from_merchant_at)
                                  if (unpicked) handlePickupFromMerchant(unpicked.id)
                                }} disabled={pickingUp !== null}
                                  style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(124,58,237,0.1)', color: '#7C3AED', fontWeight: 700, fontSize: 13, marginTop: 10 }}>
                                  {pickingUp !== null ? 'Mencatat...' : `✅ Sudah Pickup dari ${merchant?.name || 'Warung'}`}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ padding: '14px 16px', borderRadius: 14, marginBottom: 18, background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#F97316', marginBottom: 4 }}>💡 Apa itu Sesi Kuliner?</div>
                    <div style={{ fontSize: 12, color: 'var(--k-sub)', lineHeight: 1.6 }}>Buka sesi dengan rute tertentu. Pelanggan bisa memesan dari warung-warung dalam koridor rute kamu, berbagi ongkir bersama.</div>
                  </div>
                  <div style={{ padding: '20px', borderRadius: 16, background: 'var(--k-card)', border: '1.5px solid var(--k-border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>🚀 Buka Sesi Kuliner</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 6 }}>Lokasi Awal</div>
                      <LocationSearch
                        value={sessionForm.origin_address}
                        confirmed={!!sessionForm.origin_lat}
                        placeholder="Ketik nama jalan atau area awal..."
                        onChange={v => setSessionForm(f => ({ ...f, origin_address: v, origin_lat: null, origin_lng: null }))}
                        onSelect={r => setSessionForm(f => ({ ...f, origin_address: r.display, origin_lat: r.lat, origin_lng: r.lng }))}
                      />
                      <button onClick={getGps} disabled={gettingGps} style={{ marginTop: 6, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: sessionForm.origin_lat ? 'rgba(0,200,150,0.15)' : 'var(--k-input)', color: sessionForm.origin_lat ? '#027A48' : 'var(--k-sub)', fontWeight: 700, fontSize: 12 }}>
                        {gettingGps ? '...' : sessionForm.origin_lat ? '✓ GPS aktif' : '📍 Gunakan GPS saya'}
                      </button>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 6 }}>Area / Tujuan Rute</div>
                      <LocationSearch
                        value={sessionForm.destination_address}
                        confirmed={false}
                        placeholder="Ketik nama perumahan, kelurahan, atau area tujuan..."
                        onChange={v => setSessionForm(f => ({ ...f, destination_address: v }))}
                        onSelect={r => setSessionForm(f => ({ ...f, destination_address: r.display }))}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 6 }}>Lebar Koridor</div>
                        <select value={sessionForm.corridor_width} onChange={e => setSessionForm(f => ({ ...f, corridor_width: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)' }}>
                          {[500, 1000, 1500, 2000].map(v => <option key={v} value={v}>{v < 1000 ? v + ' m' : (v / 1000) + ' km'}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 6 }}>Maks Order</div>
                        <select value={sessionForm.max_orders} onChange={e => setSessionForm(f => ({ ...f, max_orders: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)' }}>
                          {[3, 4, 5, 6, 7, 8, 10].map(n => <option key={n} value={n}>{n} order</option>)}
                        </select>
                      </div>
                    </div>
                    <button onClick={handleStartSession} disabled={startingSession} style={{ padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: startingSession ? 'var(--k-border)' : '#F97316', color: '#fff', fontWeight: 800, fontSize: 15 }}>
                      {startingSession ? 'Memulai sesi...' : '🚀 Mulai Sesi Kuliner'}
                    </button>
                  </div>
                </div>
              )
            )}

            {/* ══════════════════════════════════════════════════════════════════
                Tab: RIWAYAT
            ══════════════════════════════════════════════════════════════════ */}
            {tab === 'history' && (
              history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📜</div>
                  <p>Belum ada riwayat delivery.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {history.map(order => {
                    const sm = STATUS_META[order.status] ?? STATUS_META.completed
                    return (
                      <div key={order.id} style={{ padding: '14px', borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>#{order.order_number}</div>
                            <div style={{ fontSize: 11, color: 'var(--k-sub)', marginTop: 1 }}>{order.merchant?.name} · {fmtTime(order.created_at)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ display: 'block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg }}>{sm.icon} {sm.label}</span>
                            {order.status === 'completed' && order.mitra_income > 0 && (
                              <div style={{ fontSize: 13, color: '#F97316', fontWeight: 800, marginTop: 4 }}>+{fmtRp(order.mitra_income)}</div>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>
                          {order.items?.map(i => `${i.item_name} ×${i.quantity}`).join(', ')}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--k-sub)', marginTop: 2 }}>📍 {order.delivery_address}</div>
                        {order.delivery_photo && (
                          <div style={{ marginTop: 10 }}>
                            <p style={{ fontSize: 11, color: 'var(--k-muted)', fontWeight: 600, marginBottom: 6 }}>📸 Bukti Sampai</p>
                            <AuthedImg src={`/food/orders/${order.id}/delivery-photo`} alt="Bukti pengiriman"
                              style={{ width: '100%', maxHeight: 140, borderRadius: 10, border: '1px solid var(--k-border)', display: 'block' }} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            )}

          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
