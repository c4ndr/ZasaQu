import { useState, useEffect, useRef, useCallback, useId } from 'react'
import { Link } from 'react-router-dom'
import { GoogleMap, OverlayView } from '@react-google-maps/api'
import { fitGoogleMap, distanceMeter } from '../../utils/geo'
import RoadPolyline from '../../components/RoadPolyline'
import MapSatToggle from '../../components/MapSatToggle'
import BottomNav from '../../components/BottomNav'
import api from '../../services/api'
import { useMitraGps } from '../../context/MitraGpsContext'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtTime = (d) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const fmtDist = (m) => !m && m !== 0 ? null : m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m'
const STORAGE = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')

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

function DeliveryPhotoSlot({ orderId, uploaded, onUploaded, uploadUrl }) {
  const inputId       = useId()
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
    <div style={{ background: 'var(--k-card2)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: 12, marginTop: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 8 }}>
        📸 Foto Bukti Sampai
        {done && <span style={{ marginLeft: 8, color: '#22C55E', fontSize: 11 }}>✓ Terupload</span>}
      </p>
      {preview ? (
        <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--k-border)', marginBottom: 6 }} />
      ) : done ? (
        <AuthedImg src={`/mart/orders/${orderId}/delivery-photo`} alt="Bukti pengiriman"
          style={{ width: '100%', maxHeight: 160, borderRadius: 10, border: '1px solid var(--k-border)', display: 'block', marginBottom: 6 }} />
      ) : null}
      {!done && (
        <>
          <label htmlFor={inputId} style={{ display: 'block', width: '100%', padding: '10px', borderRadius: 10, border: '1.5px dashed rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.04)', color: 'var(--k-sub)', fontSize: 12, fontWeight: 600, textAlign: 'center', cursor: 'pointer', boxSizing: 'border-box' }}>
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
function MitraDot() {
  return <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#3B82F6', border: '3px solid #fff', boxShadow: '0 0 0 4px rgba(59,130,246,0.25)' }} />
}

// ── Ambil koordinat pickup dari order ────────────────────────────────────────
function getPickup(order) {
  return {
    lat: parseFloat(order.seller_lat || order.seller?.lat),
    lng: parseFloat(order.seller_lng || order.seller?.lng),
  }
}
function getDrop(order) {
  return { lat: parseFloat(order.delivery_lat), lng: parseFloat(order.delivery_lng) }
}

// ── Peta embedded aktif ───────────────────────────────────────────────────────
function MartActiveMap({ order, mitraLat, mitraLng, height = 210, onExpand }) {
  const mapRef = useRef(null)
  const [mapType, setMapType] = useState('roadmap')
  const pick = getPickup(order)
  const drop = getDrop(order)
  const goingToSeller = order.status === 'picking_up'
  const routeFrom = goingToSeller && mitraLat ? [mitraLat, mitraLng] : [pick.lat, pick.lng]
  const routeTo   = goingToSeller ? [pick.lat, pick.lng] : [drop.lat, drop.lng]
  const hasCoords = pick.lat && pick.lng && drop.lat && drop.lng && !isNaN(pick.lat) && !isNaN(drop.lat)

  if (!hasCoords) return (
    <div style={{ height, borderRadius: 14, background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--k-sub)', fontSize: 12 }}>
      📍 Koordinat tidak tersedia
    </div>
  )
  return (
    <div style={{ position: 'relative', height, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--k-border)', cursor: 'pointer' }} onClick={onExpand}>
      <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={{ lat: pick.lat, lng: pick.lng }} zoom={13}
        options={{ disableDefaultUI: true, gestureHandling: 'none', clickableIcons: false, mapTypeId: mapType }}
        onLoad={(map) => { mapRef.current = map; const pts = [[pick.lat, pick.lng], [drop.lat, drop.lng]]; if (mitraLat) pts.push([mitraLat, mitraLng]); fitGoogleMap(map, pts, 52) }}>
        <RoadPolyline pickup={routeFrom} dropoff={routeTo} color={goingToSeller ? '#8B5CF6' : '#6366F1'} weight={4} opacity={0.9} />
        {!goingToSeller && <RoadPolyline pickup={[pick.lat, pick.lng]} dropoff={[drop.lat, drop.lng]} color="#6366F1" weight={3} opacity={0.45} />}
        <OverlayView position={{ lat: pick.lat, lng: pick.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={(w,h)=>({x:-w/2,y:-h})}><PinMarker color="#8B5CF6" emoji="🏪" size={goingToSeller ? 36 : 28} /></OverlayView>
        <OverlayView position={{ lat: drop.lat, lng: drop.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={(w,h)=>({x:-w/2,y:-h})}><PinMarker color="#6366F1" emoji="🏠" size={!goingToSeller ? 36 : 28} /></OverlayView>
        {mitraLat && mitraLng && <OverlayView position={{ lat: mitraLat, lng: mitraLng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}><MitraDot /></OverlayView>}
      </GoogleMap>
      <div onClick={e => e.stopPropagation()}>
        <MapSatToggle mapType={mapType} onToggle={() => setMapType(t => t === 'roadmap' ? 'hybrid' : 'roadmap')} />
      </div>
      <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: '5px 10px', fontSize: 11, color: '#fff', fontWeight: 600, backdropFilter: 'blur(4px)', pointerEvents: 'none' }}>
        Tap untuk perbesar ↗
      </div>
    </div>
  )
}

// ── Modal peta fullscreen ─────────────────────────────────────────────────────
function MartMapModal({ order, mitraLat, mitraLng, onClose }) {
  const mapRef = useRef(null)
  const [mapType, setMapType] = useState('roadmap')
  const pick = getPickup(order)
  const drop = getDrop(order)
  const goingToSeller = order.status === 'picking_up'
  const routeFrom = goingToSeller && mitraLat ? [mitraLat, mitraLng] : [pick.lat, pick.lng]
  const routeTo   = goingToSeller ? [pick.lat, pick.lng] : [drop.lat, drop.lng]
  const gmapsUrl  = (lat, lng) => lat && lng ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving` : '#'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: 'var(--k-bg)' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, zIndex: 10001, width: 40, height: 40, borderRadius: 12, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>✕</button>
      <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 10001, padding: '8px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{order.order_number}</p>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#8B5CF6' }}>{fmtRp(order.shipping_fee ?? 0)} pendapatan</p>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={{ lat: pick.lat, lng: pick.lng }} zoom={13}
          options={{ disableDefaultUI: true, gestureHandling: 'greedy', clickableIcons: false, mapTypeId: mapType }}
          onLoad={(map) => { mapRef.current = map; const pts = [[pick.lat, pick.lng], [drop.lat, drop.lng]]; if (mitraLat) pts.push([mitraLat, mitraLng]); fitGoogleMap(map, pts, 60) }}>
          <RoadPolyline pickup={routeFrom} dropoff={routeTo} color={goingToSeller ? '#8B5CF6' : '#6366F1'} weight={5} opacity={0.92} />
          {!goingToSeller && <RoadPolyline pickup={[pick.lat, pick.lng]} dropoff={[drop.lat, drop.lng]} color="#6366F1" weight={4} opacity={0.5} />}
          <OverlayView position={{ lat: pick.lat, lng: pick.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={(w,h)=>({x:-w/2,y:-h})}><PinMarker color="#8B5CF6" emoji="🏪" size={40} /></OverlayView>
          <OverlayView position={{ lat: drop.lat, lng: drop.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={(w,h)=>({x:-w/2,y:-h})}><PinMarker color="#6366F1" emoji="🏠" size={40} /></OverlayView>
          {mitraLat && mitraLng && <OverlayView position={{ lat: mitraLat, lng: mitraLng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}><MitraDot /></OverlayView>}
        </GoogleMap>
        <MapSatToggle mapType={mapType} onToggle={() => setMapType(t => t === 'roadmap' ? 'hybrid' : 'roadmap')} />
      </div>
      <div style={{ background: 'var(--k-surface)', borderTop: '1px solid var(--k-border)', padding: '14px 16px', paddingBottom: 'calc(14px + env(safe-area-inset-bottom,0px))', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#8B5CF6', flexShrink: 0, marginTop: 4 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: 'var(--k-sub)', fontWeight: 600 }}>PICKUP — {order.seller?.name}</p>
            <p style={{ fontSize: 13, color: 'var(--k-text)', lineHeight: 1.4 }}>{order.seller?.address || order.seller_address_snapshot || '—'}</p>
          </div>
          <a href={gmapsUrl(pick.lat, pick.lng)} target="_blank" rel="noopener noreferrer"
            style={{ padding: '7px 12px', borderRadius: 9, background: 'rgba(139,92,246,0.12)', color: '#8B5CF6', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0, border: '1px solid rgba(139,92,246,0.2)' }}>Navigasi</a>
        </div>
        <div style={{ height: 1, background: 'var(--k-border)' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366F1', flexShrink: 0, marginTop: 4 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: 'var(--k-sub)', fontWeight: 600 }}>ANTAR — {order.delivery_name || order.customer?.name}</p>
            <p style={{ fontSize: 13, color: 'var(--k-text)', lineHeight: 1.4 }}>{order.delivery_address || '—'}</p>
          </div>
          <a href={gmapsUrl(drop.lat, drop.lng)} target="_blank" rel="noopener noreferrer"
            style={{ padding: '7px 12px', borderRadius: 9, background: 'rgba(99,102,241,0.12)', color: '#6366F1', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0, border: '1px solid rgba(99,102,241,0.2)' }}>Navigasi</a>
        </div>
      </div>
    </div>
  )
}

// ── Mini peta order tersedia ──────────────────────────────────────────────────
function MartAvailableMap({ order, mitraLat, mitraLng }) {
  const mapRef = useRef(null)
  const [mapType, setMapType] = useState('roadmap')
  const pick = getPickup(order)
  const drop = getDrop(order)
  if (!pick.lat || !pick.lng || !drop.lat || !drop.lng || isNaN(pick.lat) || isNaN(drop.lat)) return null
  return (
    <div style={{ height: 150, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--k-border)', marginBottom: 12, position: 'relative' }}>
      <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={{ lat: pick.lat, lng: pick.lng }} zoom={13}
        options={{ disableDefaultUI: true, gestureHandling: 'none', clickableIcons: false, mapTypeId: mapType }}
        onLoad={(map) => { mapRef.current = map; const pts = [[pick.lat, pick.lng], [drop.lat, drop.lng]]; if (mitraLat) pts.push([mitraLat, mitraLng]); fitGoogleMap(map, pts, 44) }}>
        <RoadPolyline pickup={[pick.lat, pick.lng]} dropoff={[drop.lat, drop.lng]} color="#8B5CF6" weight={3} opacity={0.8} />
        <OverlayView position={{ lat: pick.lat, lng: pick.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={(w,h)=>({x:-w/2,y:-h})}><PinMarker color="#8B5CF6" emoji="🏪" size={28} /></OverlayView>
        <OverlayView position={{ lat: drop.lat, lng: drop.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} getPixelPositionOffset={(w,h)=>({x:-w/2,y:-h})}><PinMarker color="#6366F1" emoji="🏠" size={28} /></OverlayView>
        {mitraLat && mitraLng && <OverlayView position={{ lat: mitraLat, lng: mitraLng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}><MitraDot /></OverlayView>}
      </GoogleMap>
      <MapSatToggle mapType={mapType} onToggle={() => setMapType(t => t === 'roadmap' ? 'hybrid' : 'roadmap')} />
    </div>
  )
}

// ── Status & step ─────────────────────────────────────────────────────────────
const STATUS_META = {
  picking_up:  { label: 'Menuju Toko',  color: '#8B5CF6', bg: '#FAF5FF', border: '#8B5CF655', icon: '🛵' },
  on_delivery: { label: 'Mengantar',    color: '#6366F1', bg: '#EEF2FF', border: '#6366F155', icon: '🚀' },
  delivered:   { label: 'Terkirim',     color: '#22C55E', bg: '#F0FDF4', border: '#22C55E55', icon: '✓'  },
  completed:   { label: 'Selesai',      color: '#374151', bg: '#F9FAFB', border: '#E5E7EB',   icon: '⭐' },
}
const NEXT_STATUS = {
  picking_up:  { label: '✅ Sudah di Toko — Ambil Barang', value: 'on_delivery', color: '#6366F1' },
  on_delivery: { label: '🏁 Pesanan Sudah Diantar ke Customer', value: 'delivered', color: '#22C55E' },
}
const STEPS = ['Menuju Toko', 'Ambil', 'Antar', 'Selesai']
function stepIndex(s) { return { picking_up: 0, on_delivery: 2, delivered: 3 }[s] ?? 0 }
function DeliverySteps({ status }) {
  const idx = stepIndex(status)
  const sm  = STATUS_META[status] ?? STATUS_META.picking_up
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
        {[0,1,2,3].map(i => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= idx ? sm.color : '#E5E7EB' }} />)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {STEPS.map((l, i) => <span key={i} style={{ fontSize: 9, color: i <= idx ? sm.color : '#9CA3AF', fontWeight: i === idx ? 700 : 400 }}>{l}</span>)}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MitraMartOrdersPage() {
  const [tab,         setTab]         = useState('active')
  const [available,   setAvailable]   = useState([])
  const [myOrders,    setMyOrders]    = useState([])
  const [history,     setHistory]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [accepting,   setAccepting]   = useState(null)
  const [updating,    setUpdating]    = useState(null)
  const [toast,       setToast]       = useState(null)
  const [mapModal,    setMapModal]    = useState(null)
  const [showMapAvail,setShowMapAvail]= useState({})
  const pollRef = useRef(null)
  const { gps: mitraGps } = useMitraGps()
  const mitraLat = mitraGps?.lat ?? null
  const mitraLng = mitraGps?.lng ?? null

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3200) }

  const load = useCallback(async () => {
    try {
      const [avRes, myRes, histRes] = await Promise.all([
        api.get('/mart/mitra/orders/available'),
        api.get('/mart/mitra/orders/my'),
        api.get('/mart/mitra/orders/history').catch(() => ({ data: [] })),
      ])
      setAvailable(avRes.data ?? [])
      setMyOrders(myRes.data ?? [])
      setHistory(histRes.data ?? [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    pollRef.current = setInterval(load, 30000)
    return () => clearInterval(pollRef.current)
  }, [load])

  useEffect(() => {
    if (myOrders.length > 0) setTab('active')
  }, [myOrders.length])

  const accept = async (id) => {
    setAccepting(id)
    try {
      await api.post(`/mart/mitra/orders/${id}/accept`)
      showToast('success', 'Pesanan diterima! Menuju toko sekarang.')
      setTab('active')
      load()
    } catch (e) { showToast('error', e.response?.data?.message || 'Gagal menerima pesanan.') }
    finally { setAccepting(null) }
  }

  const updateStatus = async (id, status) => {
    setUpdating(id)
    try {
      await api.patch(`/mart/mitra/orders/${id}/status`, { status })
      showToast('success', status === 'delivered' ? 'Pesanan berhasil diantar! 🎉' : 'Status diperbarui.')
      load()
    } catch (e) { showToast('error', e.response?.data?.message || 'Gagal update status.') }
    finally { setUpdating(null) }
  }

  const todayEarning = history.filter(o => o.status === 'completed').reduce((s, o) => s + (o.shipping_fee ?? 0), 0)

  return (
    <div style={{ background: 'var(--k-bg)', minHeight: '100dvh', paddingBottom: 80 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>

      {mapModal && <MartMapModal order={mapModal} mitraLat={mitraLat} mitraLng={mitraLng} onClose={() => setMapModal(null)} />}

      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '11px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--k-text)' }}>ZasaShop Kurir 🛵</div>
            {todayEarning > 0 && <div style={{ fontSize: 12, color: '#027A48', fontWeight: 600 }}>Hari ini: +{fmtRp(todayEarning)}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {mitraLat && <span style={{ fontSize: 10, color: '#3B82F6', fontWeight: 700, background: 'rgba(59,130,246,0.1)', padding: '3px 8px', borderRadius: 20 }}>📡 GPS aktif</span>}
          </div>
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid var(--k-border)' }}>
          {[
            ['active',    '🚚', 'Aktif',    myOrders.length    ],
            ['available', '📦', 'Tersedia', available.length   ],
            ['history',   '📜', 'Riwayat',  0                  ],
          ].map(([k, emoji, l, count]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: '10px 4px 8px', border: 'none', cursor: 'pointer', background: 'transparent',
              color: tab === k ? '#8B5CF6' : 'var(--k-sub)',
              borderBottom: tab === k ? '2.5px solid #8B5CF6' : '2.5px solid transparent',
              fontWeight: tab === k ? 700 : 400, fontSize: 11,
            }}>
              <div style={{ fontSize: 18, lineHeight: 1, position: 'relative', display: 'inline-block' }}>
                {emoji}
                {count > 0 && (
                  <span style={{ position: 'absolute', top: -5, right: -8, background: k === 'available' ? '#DC2626' : '#8B5CF6', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 4px', borderRadius: 20, lineHeight: 1.4, animation: k === 'available' ? 'blink 2s infinite' : 'none' }}>{count}</span>
                )}
              </div>
              <div style={{ marginTop: 2 }}>{l}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 14 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #8B5CF6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13 }}>Memuat data...</p>
          </div>
        ) : (
          <>
            {/* ══ Tab AKTIF ══════════════════════════════════════════════════════ */}
            {tab === 'active' && (
              myOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
                  <div style={{ fontSize: 52, marginBottom: 12 }}>🛵</div>
                  <p style={{ fontWeight: 600, color: 'var(--k-text)', marginBottom: 6 }}>Tidak ada pengiriman aktif</p>
                  <p style={{ fontSize: 13, marginBottom: 20 }}>Ambil pesanan dari tab Tersedia.</p>
                  <button onClick={() => setTab('available')} style={{ padding: '11px 24px', borderRadius: 20, border: 'none', background: '#8B5CF6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Lihat Tersedia</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {myOrders.map(order => {
                    const sm = STATUS_META[order.status] ?? STATUS_META.picking_up
                    const nx = NEXT_STATUS[order.status]
                    const pick = getPickup(order)
                    const drop = getDrop(order)
                    const goingToSeller = order.status === 'picking_up'
                    const targetLat = goingToSeller ? pick.lat : drop.lat
                    const targetLng = goingToSeller ? pick.lng : drop.lng
                    const distM = mitraLat && targetLat && !isNaN(targetLat)
                      ? distanceMeter(mitraLat, mitraLng, targetLat, targetLng) : null
                    const isCOD = order.payment_method === 'cod'
                    const gmapsUrl = (lat, lng) => lat && lng ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving` : '#'

                    return (
                      <div key={order.id} style={{ borderRadius: 18, background: 'var(--k-card)', border: `2px solid ${sm.border}`, overflow: 'hidden' }}>
                        {/* Status banner */}
                        <div style={{ background: sm.bg, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: sm.color }}>{sm.icon} {sm.label}</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {isCOD && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>💵 COD</span>}
                            <span style={{ fontSize: 11, color: 'var(--k-sub)', fontFamily: 'monospace' }}>#{order.order_number}</span>
                          </div>
                        </div>

                        <div style={{ padding: 14 }}>
                          <DeliverySteps status={order.status} />

                          {/* Peta embedded */}
                          <div style={{ marginBottom: 14 }}>
                            <MartActiveMap order={order} mitraLat={mitraLat} mitraLng={mitraLng} height={200} onExpand={() => setMapModal(order)} />
                          </div>

                          {/* Jarak real-time */}
                          {distM !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: goingToSeller ? 'rgba(139,92,246,0.08)' : 'rgba(99,102,241,0.08)', border: `1px solid ${goingToSeller ? 'rgba(139,92,246,0.2)' : 'rgba(99,102,241,0.2)'}`, marginBottom: 14 }}>
                              <span style={{ fontSize: 20 }}>{goingToSeller ? '🏪' : '🏠'}</span>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: goingToSeller ? '#8B5CF6' : '#6366F1' }}>{goingToSeller ? 'Menuju toko' : 'Menuju pelanggan'}</div>
                                <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Jarak: <b>{fmtDist(distM)}</b>{distM < 300 ? ' · Hampir sampai!' : ''}</div>
                              </div>
                              <a href={gmapsUrl(targetLat, targetLng)} target="_blank" rel="noopener noreferrer"
                                style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: 9, background: goingToSeller ? 'rgba(139,92,246,0.12)' : 'rgba(99,102,241,0.12)', color: goingToSeller ? '#8B5CF6' : '#6366F1', fontSize: 12, fontWeight: 700, textDecoration: 'none', border: `1px solid ${goingToSeller ? 'rgba(139,92,246,0.2)' : 'rgba(99,102,241,0.2)'}` }}>
                                Navigasi ↗
                              </a>
                            </div>
                          )}

                          {/* Rute teks */}
                          <div style={{ display: 'flex', gap: 0, marginBottom: 14 }}>
                            <div style={{ flex: 1, padding: '10px 12px', borderRadius: '10px 0 0 10px', background: goingToSeller ? 'rgba(139,92,246,0.07)' : 'var(--k-input)', border: `1.5px solid ${goingToSeller ? '#8B5CF6' : 'var(--k-border)'}`, borderRight: 'none' }}>
                              <div style={{ fontSize: 9, color: 'var(--k-sub)', fontWeight: 700, marginBottom: 2 }}>🏪 PICKUP</div>
                              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 1 }}>{order.seller?.name || order.seller_name_snapshot}</div>
                              <div style={{ fontSize: 11, color: 'var(--k-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.seller?.address || order.seller_address_snapshot || '—'}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--k-input)', padding: '0 6px', fontSize: 14, color: 'var(--k-sub)' }}>›</div>
                            <div style={{ flex: 1, padding: '10px 12px', borderRadius: '0 10px 10px 0', background: !goingToSeller ? 'rgba(99,102,241,0.07)' : 'var(--k-input)', border: `1.5px solid ${!goingToSeller ? '#6366F1' : 'var(--k-border)'}`, borderLeft: 'none' }}>
                              <div style={{ fontSize: 9, color: 'var(--k-sub)', fontWeight: 700, marginBottom: 2 }}>🏠 ANTAR</div>
                              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 1 }}>{order.delivery_name || order.customer?.name || '—'}</div>
                              <div style={{ fontSize: 11, color: 'var(--k-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.delivery_address || '—'}</div>
                            </div>
                          </div>

                          {/* Info customer + tombol chat */}
                          {order.customer && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--k-input)', border: '1px solid var(--k-border)', marginBottom: 14 }}>
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{order.delivery_name || order.customer?.name || 'Customer'}</div>
                                <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Pelanggan</div>
                              </div>
                              <Link
                                to={`/mitra/mart/orders/${order.id}/chat`}
                                state={{ otherName: order.delivery_name || order.customer?.name }}
                                style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none', flexShrink: 0 }}
                              >💬</Link>
                            </div>
                          )}

                          {/* COD warning */}
                          {isCOD && (
                            <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 9, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', fontWeight: 600, marginBottom: 12 }}>
                              ⚠️ COD — tagih {fmtRp(order.total)} dari pelanggan saat tiba.
                            </div>
                          )}

                          {/* Items */}
                          <div style={{ fontSize: 12, color: 'var(--k-sub)', padding: '8px 10px', borderRadius: 8, background: 'var(--k-input)', marginBottom: 14, lineHeight: 1.6 }}>
                            🛍 {order.items?.map(i => `${i.product_name} ×${i.quantity}`).join(' · ')}
                          </div>

                          {/* Pendapatan */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Pendapatanmu</div>
                              <div style={{ fontWeight: 900, fontSize: 20, color: '#8B5CF6' }}>{fmtRp(order.shipping_fee ?? 0)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Total belanja</div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{fmtRp(order.total)}</div>
                            </div>
                          </div>

                          {/* Foto bukti pengiriman — saat on_delivery */}
                          {order.status === 'on_delivery' && (
                            <DeliveryPhotoSlot
                              orderId={order.id}
                              uploaded={!!order.delivery_photo}
                              onUploaded={load}
                              uploadUrl={`/mart/mitra/orders/${order.id}/delivery-photo`}
                            />
                          )}

                          {nx && (
                            <button onClick={() => updateStatus(order.id, nx.value)} disabled={updating === order.id}
                              style={{ width: '100%', padding: 15, borderRadius: 14, border: 'none', cursor: updating === order.id ? 'default' : 'pointer', background: updating === order.id ? 'var(--k-border)' : nx.color, color: '#fff', fontWeight: 900, fontSize: 15, animation: updating !== order.id ? 'pulse 2s infinite' : 'none', marginTop: order.status === 'on_delivery' ? 12 : 0 }}>
                              {updating === order.id ? 'Memperbarui...' : nx.label}
                            </button>
                          )}

                          {order.status === 'delivered' && (
                            <div style={{ padding: '12px', borderRadius: 12, background: 'rgba(34,197,94,0.09)', border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center' }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#22C55E' }}>🎉 Terkirim! Menunggu konfirmasi customer.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}

            {/* ══ Tab TERSEDIA ═══════════════════════════════════════════════════ */}
            {tab === 'available' && (
              available.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
                  <div style={{ fontSize: 52, marginBottom: 12 }}>📭</div>
                  <p style={{ fontWeight: 600, color: 'var(--k-text)', marginBottom: 6 }}>Tidak ada pesanan tersedia</p>
                  <p style={{ fontSize: 13 }}>Pesanan muncul saat seller selesai mengemas barang.</p>
                  <button onClick={load} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 20, border: '1.5px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontWeight: 700, cursor: 'pointer' }}>🔄 Refresh</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {available.map(order => {
                    const pick = getPickup(order)
                    const drop = getDrop(order)
                    const isCOD = order.payment_method === 'cod'
                    const distToShop = mitraLat && pick.lat && !isNaN(pick.lat)
                      ? distanceMeter(mitraLat, mitraLng, pick.lat, pick.lng) : null
                    const showMap = showMapAvail[order.id]

                    return (
                      <div key={order.id} style={{ borderRadius: 16, background: 'var(--k-card)', border: '2px solid rgba(139,92,246,0.3)', overflow: 'hidden' }}>
                        <div style={{ background: 'rgba(139,92,246,0.06)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
                          <span style={{ fontWeight: 800, fontSize: 13, color: '#8B5CF6' }}>📦 Siap Diambil</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {isCOD && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>💵 COD</span>}
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--k-sub)' }}>#{order.order_number}</span>
                          </div>
                        </div>

                        <div style={{ padding: '12px 14px' }}>
                          {showMap && <MartAvailableMap order={order} mitraLat={mitraLat} mitraLng={mitraLng} />}

                          {/* Rute visual */}
                          <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, marginBottom: 12 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#8B5CF6', border: '2px solid #fff', boxShadow: '0 0 0 2px #8B5CF6' }} />
                              <div style={{ width: 2, flex: 1, background: '#E5E7EB', margin: '3px 0' }} />
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366F1', border: '2px solid #fff', boxShadow: '0 0 0 2px #6366F1' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 10, color: 'var(--k-sub)', fontWeight: 600 }}>🏪 AMBIL DI</div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>
                                  {order.seller?.logo_path && (
                                    <img src={`${STORAGE}/${order.seller.logo_path}`} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover', verticalAlign: 'middle', marginRight: 5 }} />
                                  )}
                                  {order.seller?.name || order.seller_name_snapshot}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>{order.seller?.address || order.seller_address_snapshot || '—'}</div>
                                {distToShop !== null && <div style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 600, marginTop: 2 }}>📍 {fmtDist(distToShop)} dari posisimu</div>}
                              </div>
                              <div>
                                <div style={{ fontSize: 10, color: 'var(--k-sub)', fontWeight: 600 }}>🏠 ANTAR KE</div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{order.delivery_name || order.customer?.name || '—'}</div>
                                <div style={{ fontSize: 11, color: 'var(--k-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.delivery_address}</div>
                              </div>
                            </div>
                            <button onClick={() => setShowMapAvail(p => ({ ...p, [order.id]: !p[order.id] }))}
                              style={{ alignSelf: 'flex-start', padding: '6px 10px', borderRadius: 9, border: '1.5px solid var(--k-border)', background: showMap ? 'rgba(139,92,246,0.1)' : 'var(--k-input)', color: showMap ? '#8B5CF6' : 'var(--k-sub)', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                              {showMap ? 'Tutup' : '🗺️ Peta'}
                            </button>
                          </div>

                          {/* Items */}
                          <div style={{ fontSize: 12, color: 'var(--k-sub)', padding: '7px 10px', borderRadius: 8, background: 'var(--k-input)', marginBottom: 12, lineHeight: 1.6 }}>
                            🛍 {order.items?.map(i => `${i.product_name} ×${i.quantity}`).join(' · ')} · dikemas {fmtTime(order.packed_at || order.updated_at)}
                          </div>

                          {isCOD && (
                            <div style={{ fontSize: 12, padding: '7px 12px', borderRadius: 9, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', fontWeight: 600, marginBottom: 12 }}>
                              ⚠️ COD — kamu tagih {fmtRp(order.total)} dari pelanggan.
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Pendapatanmu</div>
                              <div style={{ fontWeight: 800, fontSize: 20, color: '#8B5CF6' }}>{fmtRp(order.shipping_fee ?? 0)}</div>
                            </div>
                            <button onClick={() => accept(order.id)} disabled={accepting === order.id || myOrders.length > 0}
                              style={{ padding: '13px 26px', borderRadius: 12, border: 'none', background: accepting === order.id || myOrders.length > 0 ? 'var(--k-border)' : '#8B5CF6', color: '#fff', fontWeight: 900, fontSize: 15, cursor: accepting === order.id || myOrders.length > 0 ? 'default' : 'pointer', animation: !accepting && myOrders.length === 0 ? 'pulse 1.5s infinite' : 'none' }}>
                              {myOrders.length > 0 ? 'Ada order aktif' : accepting === order.id ? 'Memproses...' : 'Ambil Pesanan'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}

            {/* ══ Tab RIWAYAT ════════════════════════════════════════════════════ */}
            {tab === 'history' && (
              history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📜</div>
                  <p>Belum ada riwayat pengiriman.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {history.map(order => {
                    const sm = STATUS_META[order.status] ?? STATUS_META.completed
                    return (
                      <div key={order.id} style={{ padding: 14, borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>#{order.order_number}</div>
                            <div style={{ fontSize: 11, color: 'var(--k-sub)', marginTop: 1 }}>{order.seller?.name} · {fmtTime(order.updated_at)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ display: 'block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg }}>{sm.icon} {sm.label}</span>
                            {order.status === 'completed' && order.shipping_fee > 0 && <div style={{ fontSize: 13, color: '#8B5CF6', fontWeight: 800, marginTop: 4 }}>+{fmtRp(order.shipping_fee)}</div>}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>📍 {order.delivery_address}</div>
                        {order.delivery_photo && (
                          <div style={{ marginTop: 10 }}>
                            <p style={{ fontSize: 11, color: 'var(--k-muted)', fontWeight: 600, marginBottom: 6 }}>📸 Bukti Sampai</p>
                            <AuthedImg src={`/mart/orders/${order.id}/delivery-photo`} alt="Bukti pengiriman"
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
