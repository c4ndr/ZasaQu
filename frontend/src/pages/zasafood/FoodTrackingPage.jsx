import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { GoogleMap, OverlayView } from '@react-google-maps/api'
import { fitGoogleMap, distanceMeter } from '../../utils/geo'
import RoadPolyline from '../../components/RoadPolyline'
import MapSatToggle from '../../components/MapSatToggle'
import useRoadRoute from '../../hooks/useRoadRoute'
import api from '../../services/api'
import echo from '../../services/echo'
import ReportComplaintModal from '../../components/ReportComplaintModal'

const COMPLAINT_WINDOW_HOURS = 24

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

function AuthedImg({ src, alt, style = {} }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let active = true
    api.get(src, { responseType: 'blob' })
      .then(r => { if (active) setUrl(URL.createObjectURL(r.data)) })
      .catch(() => {})
    return () => { active = false }
  }, [src])
  if (!url) return <div style={{ ...style, background: 'var(--k-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 28 }}>📷</span></div>
  return <img src={url} alt={alt} style={{ ...style, objectFit: 'cover' }} />
}
function fmtDist(m) {
  if (!m && m !== 0) return null
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`
}

// ── Progress stepper ───────────────────────────────────────────────────────────
const STEPS = [
  { key: 'confirm', label: 'Dikonfirmasi', icon: '✅', statuses: ['pending', 'merchant_accepted'] },
  { key: 'cook',    label: 'Dimasak',       icon: '👨‍🍳', statuses: ['preparing'] },
  { key: 'ready',   label: 'Siap',          icon: '🎉', statuses: ['ready_for_pickup'] },
  { key: 'pickup',  label: 'Dijemput',      icon: '🏍️', statuses: ['mitra_on_pickup', 'picked_up', 'on_delivery'] },
  { key: 'arrive',  label: 'Tiba',          icon: '🏠', statuses: ['delivered', 'completed'] },
]
function getStepIndex(status) {
  const i = STEPS.findIndex(s => s.statuses.includes(status))
  return i === -1 ? 0 : i
}

const STATUS_META = {
  pending:           { label: 'Menunggu Merchant',        icon: '⏳', color: '#F6AD55' },
  merchant_accepted: { label: 'Merchant Menerima!',        icon: '✅', color: '#00C896' },
  preparing:         { label: 'Sedang Dimasak',           icon: '👨‍🍳', color: '#9F7AEA' },
  ready_for_pickup:  { label: 'Siap! Mencari Mitra...',   icon: '🎉', color: '#00C896' },
  mitra_on_pickup:   { label: 'Mitra Menuju Warung',      icon: '🏍️', color: '#3B82F6' },
  picked_up:         { label: 'Pesanan Diambil',          icon: '📦', color: '#3B82F6' },
  on_delivery:       { label: 'Dalam Perjalanan!',        icon: '🚀', color: '#F97316' },
  delivered:         { label: 'Pesanan Tiba!',            icon: '🎊', color: '#00C896' },
  completed:         { label: 'Selesai',                  icon: '⭐', color: '#00C896' },
  cancelled:         { label: 'Dibatalkan',               icon: '❌', color: '#A0A0BC' },
  rejected:          { label: 'Ditolak Merchant',         icon: '❌', color: '#F56565' },
}

function useEtaCountdown(initialMinutes) {
  const [remaining, setRemaining] = useState(initialMinutes)
  useEffect(() => {
    if (!initialMinutes) return
    setRemaining(initialMinutes)
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 60000)
    return () => clearInterval(t)
  }, [initialMinutes])
  return remaining
}

function StarRow({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 13, color: 'var(--k-sub)', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        {[1,2,3,4,5].map(s => (
          <span key={s} onClick={() => onChange(s)}
            style={{ fontSize: 30, cursor: 'pointer', opacity: s <= value ? 1 : 0.25, transition: 'all 0.15s', transform: s === value ? 'scale(1.2)' : 'scale(1)' }}>
            ⭐
          </span>
        ))}
      </div>
    </div>
  )
}

function StatusNotif({ status, onDismiss }) {
  const sm = STATUS_META[status] ?? STATUS_META.pending
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div onClick={onDismiss} style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'rgba(12,12,22,0.96)', borderBottom: `3px solid ${sm.color}`,
      boxShadow: `0 4px 30px ${sm.color}44`,
      animation: 'notifIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      cursor: 'pointer', padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <style>{`@keyframes notifIn { from { transform:translateY(-100%); opacity:0 } to { transform:translateY(0); opacity:1 } }`}</style>
      <span style={{ fontSize: 32 }}>{sm.icon}</span>
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: sm.color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Update Pesanan</p>
        <p style={{ fontSize: 15, fontWeight: 800, color: '#E8E8F2' }}>{sm.label}</p>
      </div>
      <span style={{ marginLeft: 'auto', fontSize: 18, color: '#666' }}>✕</span>
    </div>
  )
}

// ── Marker elemen ──────────────────────────────────────────────────────────────
function MitraMarkerEl() {
  return (
    <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#F97316', border: '3px solid #fff', boxShadow: '0 4px 14px rgba(249,115,22,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, userSelect: 'none' }}>
      🏍️
    </div>
  )
}
function MerchantMarkerEl() {
  return (
    <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#00C896', border: '3px solid #fff', boxShadow: '0 4px 14px rgba(0,200,150,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, userSelect: 'none' }}>
      🏪
    </div>
  )
}
function DestMarkerEl() {
  return (
    <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#F56565', border: '3px solid #fff', boxShadow: '0 4px 14px rgba(245,101,101,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, userSelect: 'none' }}>
      📍
    </div>
  )
}

// ── Halaman utama ──────────────────────────────────────────────────────────────
export default function FoodTrackingPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const mapRef   = useRef(null)
  const prevStatus = useRef(null)

  const [order,        setOrder]        = useState(null)
  const [mitraGps,     setMitraGps]     = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [mapType,      setMapType]      = useState('roadmap')
  const [loadError,    setLoadError]    = useState(false)
  const [notifStatus,  setNotifStatus]  = useState(null)
  const [rating,       setRating]       = useState({ merchant_score: 0, mitra_score: 0 })
  const [rated,        setRated]        = useState(false)
  const [toast,        setToast]        = useState(null)
  const [confirming,   setConfirming]   = useState(false)
  const [showComplaint, setShowComplaint] = useState(false)
  const [complaintSent, setComplaintSent] = useState(false)

  const loadOrder = useCallback(async () => {
    try {
      const res = await api.get(`/food/orders/${id}`)
      setOrder(res.data.data)
      setLoadError(false)
      if (res.data.mitra_gps) setMitraGps(res.data.mitra_gps)
    } catch (e) {
      if (e?.response?.status === 404) navigate('/food/orders')
      else setLoadError(true)
    }
    finally { setLoading(false) }
  }, [id, navigate])

  useEffect(() => {
    loadOrder()
    api.get(`/food/orders/${id}/rating`).then(r => { if (r.data.rated) setRated(true) }).catch(() => {})

    const ch = echo.channel(`food.${id}`)
    ch.listen('.food.order.status', e => {
      setOrder(prev => {
        if (!prev) return prev
        if (e.status !== prev.status) setNotifStatus(e.status)
        return { ...prev, status: e.status, estimated_prep_minutes: e.estimated_prep_minutes ?? prev.estimated_prep_minutes, mitra_id: e.mitra_id ?? prev.mitra_id, mitra: e.mitra ?? prev.mitra }
      })
    })
    ch.listen('.mitra.location', e => setMitraGps({ lat: e.lat, lng: e.lng }))

    const poll = setInterval(loadOrder, 30000)
    return () => { clearInterval(poll); echo.leave(`food.${id}`) }
  }, [loadOrder, id])

  // Camera follow mitra
  useEffect(() => {
    if (!mitraGps || !mapRef.current) return
    mapRef.current.panTo({ lat: mitraGps.lat, lng: mitraGps.lng })
  }, [mitraGps])

  const routeFrom = useMemo(() => mitraGps ? [mitraGps.lat, mitraGps.lng] : null, [mitraGps])
  const routeTo   = useMemo(() => {
    if (!order) return null
    if (['mitra_on_pickup'].includes(order.status) && order.merchant?.lat && order.merchant?.lng)
      return [parseFloat(order.merchant.lat), parseFloat(order.merchant.lng)]
    if (order.delivery_lat && order.delivery_lng)
      return [parseFloat(order.delivery_lat), parseFloat(order.delivery_lng)]
    return null
  }, [order, mitraGps]) // eslint-disable-line

  const { routePoints } = useRoadRoute(routeFrom, routeTo)

  const distToTarget = useMemo(() => {
    if (!mitraGps || !routeTo) return null
    return distanceMeter(mitraGps.lat, mitraGps.lng, routeTo[0], routeTo[1])
  }, [mitraGps, routeTo])

  const deliveryEtaMin = useMemo(() => {
    if (!distToTarget) return null
    return Math.max(1, Math.ceil(distToTarget / 1000 / 30 * 60))
  }, [distToTarget])

  const prepEtaRaw = order?.estimated_prep_minutes && ['merchant_accepted','preparing'].includes(order?.status)
    ? order.estimated_prep_minutes : null
  const prepEta = useEtaCountdown(prepEtaRaw)

  async function handleConfirm() {
    setConfirming(true)
    try { await api.post(`/food/orders/${id}/confirm`); showToast('success', 'Pesanan dikonfirmasi!'); loadOrder() }
    catch (e) { showToast('error', e.response?.data?.message || 'Gagal.') }
    finally { setConfirming(false) }
  }
  async function handleCancel() {
    if (!confirm('Batalkan pesanan ini?')) return
    try { await api.post(`/food/orders/${id}/cancel`); showToast('success', 'Pesanan dibatalkan.'); loadOrder() }
    catch (e) { showToast('error', e.response?.data?.message || 'Gagal.') }
  }
  async function handleRate() {
    if (!rating.merchant_score) { showToast('error', 'Beri rating untuk warung dulu.'); return }
    try {
      await api.post(`/food/orders/${id}/rate`, { merchant_score: rating.merchant_score, merchant_comment: rating.merchant_comment, mitra_score: rating.mitra_score || undefined, mitra_comment: rating.mitra_comment })
      setRated(true); showToast('success', 'Rating dikirim. Terima kasih!')
    } catch (e) { showToast('error', e.response?.data?.message || 'Gagal.') }
  }
  function showToast(type, msg) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--k-bg)' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #F97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )

  if (loadError && !order) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--k-bg)', gap: 16, padding: 24 }}>
      <div style={{ fontSize: 48 }}>📡</div>
      <p style={{ fontWeight: 700, color: 'var(--k-text)', textAlign: 'center' }}>Gagal memuat pesanan</p>
      <p style={{ fontSize: 13, color: 'var(--k-muted)', textAlign: 'center' }}>Periksa koneksi internet lalu coba lagi</p>
      <button onClick={loadOrder} style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: '#F97316', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Coba Lagi</button>
      <button onClick={() => navigate('/food/orders')} style={{ padding: '10px 24px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'transparent', color: 'var(--k-sub)', fontSize: 13, cursor: 'pointer' }}>Kembali ke Daftar</button>
    </div>
  )

  if (!order) return null

  const sm        = STATUS_META[order.status] ?? STATUS_META.pending
  const stepIndex = getStepIndex(order.status)
  const showMap   = ['mitra_on_pickup','picked_up','on_delivery','delivered'].includes(order.status)
  const showMitra = mitraGps && ['mitra_on_pickup','picked_up','on_delivery','delivered'].includes(order.status)
  const isDone    = ['completed','cancelled','rejected'].includes(order.status)
  const canComplain = order.status === 'completed' && order.completed_at
    && (Date.now() - new Date(order.completed_at).getTime()) / 36e5 <= COMPLAINT_WINDOW_HOURS
    && !complaintSent

  const mapCenter = order.delivery_lat && order.delivery_lng
    ? { lat: parseFloat(order.delivery_lat), lng: parseFloat(order.delivery_lng) }
    : { lat: -6.2088, lng: 106.8456 }

  const MAP_OPTS = { disableDefaultUI: true, gestureHandling: 'none', clickableIcons: false }

  return (
    <div style={{ minHeight: '100dvh', background: '#0C0C16', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes spin      { to { transform:rotate(360deg) } }
        @keyframes blink     { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes pulseRing { 0%{transform:scale(.6);opacity:.8} 100%{transform:scale(1.8);opacity:0} }
      `}</style>

      {notifStatus && <StatusNotif status={notifStatus} onDismiss={() => setNotifStatus(null)} />}

      {toast && (
        <div style={{ position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)', zIndex: 9998, padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff', whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* ── Navbar floating ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <button onClick={() => navigate('/food/orders')} style={{
          width: 42, height: 42, borderRadius: 14,
          background: 'rgba(12,12,20,0.85)', border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(10px)', color: '#E8E8F2', fontSize: 22, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
        <div style={{ padding: '8px 14px', borderRadius: 12, background: 'rgba(12,12,20,0.85)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)' }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#E8E8F2', lineHeight: 1.2 }}>Lacak Pesanan</p>
          <p style={{ fontSize: 10, color: '#888', fontFamily: 'monospace' }}>{order.order_number}</p>
        </div>
        {distToTarget !== null && showMitra && (
          <div style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: 10, background: 'rgba(249,115,22,0.9)', backdropFilter: 'blur(8px)' }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{fmtDist(distToTarget)}</p>
          </div>
        )}
      </div>

      {/* ── Peta Google Maps ── */}
      <div style={{ height: showMap ? '45vh' : '0px', minHeight: showMap ? 200 : 0, transition: 'height 0.3s', flexShrink: 0, position: 'relative' }}>
        {showMap && (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={mapCenter}
            zoom={14}
            options={{ ...MAP_OPTS, mapTypeId: mapType }}
            onLoad={map => {
              mapRef.current = map
              const pts = []
              if (mitraGps) pts.push([mitraGps.lat, mitraGps.lng])
              if (order.merchant?.lat) pts.push([parseFloat(order.merchant.lat), parseFloat(order.merchant.lng)])
              if (order.delivery_lat)  pts.push([parseFloat(order.delivery_lat),  parseFloat(order.delivery_lng)])
              fitGoogleMap(map, pts, 70)
            }}
          >
            {routeFrom && routeTo && (
              <RoadPolyline pickup={routeFrom} dropoff={routeTo} color="#F97316" />
            )}

            {showMitra && (
              <OverlayView position={{ lat: mitraGps.lat, lng: mitraGps.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                <div style={{ transform: 'translate(-50%,-50%)' }}><MitraMarkerEl /></div>
              </OverlayView>
            )}

            {order.merchant?.lat && order.merchant?.lng && (
              <OverlayView position={{ lat: parseFloat(order.merchant.lat), lng: parseFloat(order.merchant.lng) }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                <div style={{ transform: 'translate(-50%,-50%)' }}><MerchantMarkerEl /></div>
              </OverlayView>
            )}

            {order.delivery_lat && order.delivery_lng && (
              <OverlayView position={{ lat: parseFloat(order.delivery_lat), lng: parseFloat(order.delivery_lng) }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                <div style={{ transform: 'translate(-50%,-50%)' }}><DestMarkerEl /></div>
              </OverlayView>
            )}
          </GoogleMap>
        )}
        {showMap && <MapSatToggle mapType={mapType} onToggle={() => setMapType(t => t === 'roadmap' ? 'hybrid' : 'roadmap')} />}
      </div>

      {/* ── Panel bawah ── */}
      <div style={{
        flex: 1, background: 'var(--k-bg)',
        borderRadius: showMap ? '22px 22px 0 0' : 0,
        marginTop: showMap ? -22 : 0,
        overflowY: 'auto', position: 'relative', zIndex: 10,
        boxShadow: '0 -6px 30px rgba(0,0,0,0.4)',
      }}>
        {showMap && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--k-border2)' }} />
          </div>
        )}

        <div style={{ padding: '14px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, flexShrink: 0, background: `${sm.color}18`, border: `2px solid ${sm.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{sm.icon}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 17, fontWeight: 900, color: sm.color, lineHeight: 1.2 }}>{sm.label}</p>
              {prepEta !== null && prepEta > 0 && (
                <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 3 }}>⏱ Estimasi siap ~{prepEta} menit lagi</p>
              )}
              {deliveryEtaMin !== null && ['on_delivery','mitra_on_pickup','picked_up'].includes(order.status) && (
                <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 3 }}>🏁 Estimasi tiba ~{deliveryEtaMin} menit</p>
              )}
            </div>
            {!isDone && (
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: sm.color, animation: 'blink 2s infinite', flexShrink: 0 }} />
            )}
          </div>

          {order.status === 'pending' && (
            <div style={{ background: 'linear-gradient(135deg, rgba(246,173,85,0.12), rgba(249,115,22,0.08))', border: '1.5px solid rgba(246,173,85,0.35)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(246,173,85,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, animation: 'blink 2s infinite' }}>⏳</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#F6AD55' }}>Menunggu konfirmasi merchant</p>
                <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 2 }}>Pesanan akan otomatis dibatalkan jika tidak ada respons</p>
              </div>
            </div>
          )}

          {/* Progress stepper */}
          {!['cancelled','rejected'].includes(order.status) && (
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '14px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {STEPS.map((step, i) => {
                  const done    = i < stepIndex
                  const current = i === stepIndex
                  const color   = done || current ? '#F97316' : 'var(--k-border2)'
                  return (
                    <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      {i > 0 && (
                        <div style={{ position: 'absolute', top: 14, right: '50%', left: '-50%', height: 3, background: i <= stepIndex ? '#F97316' : 'var(--k-border)', transition: 'background 0.4s' }} />
                      )}
                      <div style={{ width: 28, height: 28, borderRadius: '50%', zIndex: 1, background: done ? '#F97316' : current ? 'var(--k-bg)' : 'var(--k-card2)', border: `3px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: done ? 13 : 14, transition: 'all 0.4s', boxShadow: current ? `0 0 0 4px ${sm.color}22` : 'none' }}>
                        {done ? '✓' : <span style={{ opacity: current ? 1 : 0.4 }}>{step.icon}</span>}
                      </div>
                      <p style={{ fontSize: 9, color: current ? '#F97316' : done ? 'var(--k-muted)' : 'var(--k-border2)', fontWeight: current ? 800 : 500, marginTop: 5, textAlign: 'center' }}>
                        {step.label}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Info mitra */}
          {order.mitra && ['mitra_on_pickup','picked_up','on_delivery','delivered'].includes(order.status) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(249,115,22,0.12)', border: '1.5px solid rgba(249,115,22,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏍️</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{order.mitra?.name ?? 'Mitra'}</p>
                <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{order.mitra?.role === 'mitra_motor' ? 'Motor' : 'Mobil'} · Mitra Delivery</p>
                {distToTarget !== null && (
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#F97316', marginTop: 2 }}>{fmtDist(distToTarget)} dari Anda</p>
                )}
              </div>
              {/* Tombol chat */}
              <Link
                to={`/food/orders/${id}/chat`}
                state={{ otherName: order.mitra?.name }}
                style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none' }}
              >💬</Link>
            </div>
          )}

          {/* Bill pesanan */}
          <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,200,150,0.1)', border: '1.5px solid rgba(0,200,150,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏪</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--k-text)' }}>{order.merchant?.name}</p>
                <p style={{ fontSize: 10, color: 'var(--k-muted)', fontFamily: 'monospace' }}>{order.order_number}</p>
              </div>
            </div>
            <div style={{ padding: '10px 14px' }}>
              {order.items?.map(i => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 7, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--k-text)', flex: 1 }}>{i.item_name} <span style={{ color: 'var(--k-muted)' }}>×{i.quantity}</span></span>
                  <span style={{ fontWeight: 600, color: 'var(--k-text)', flexShrink: 0, marginLeft: 8 }}>{fmtRp(i.item_price * i.quantity)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--k-border)', marginTop: 8, paddingTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--k-muted)', marginBottom: 4 }}>
                  <span>Subtotal</span><span>{fmtRp(order.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--k-muted)', marginBottom: 4 }}>
                  <span>Ongkos kirim</span><span>{fmtRp(order.delivery_fee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, borderTop: '1px solid var(--k-border)', paddingTop: 8, marginTop: 4 }}>
                  <span>Total</span>
                  <span style={{ color: '#F97316' }}>{fmtRp(order.total_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--k-muted)', marginTop: 6 }}>
                  <span>Pembayaran</span>
                  <span style={{ fontWeight: 700, color: order.payment_method === 'cod' ? '#F97316' : '#00C896' }}>
                    {order.payment_method === 'cod' ? 'COD (Tunai)' : 'Saldo ZasaQu'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Foto bukti pengiriman — tampil saat delivered/completed */}
          {['delivered', 'completed'].includes(order.status) && order.delivery_photo && (
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--k-border)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>📸 Bukti Pengiriman</p>
              </div>
              <AuthedImg src={`/food/orders/${id}/delivery-photo`} alt="Bukti pengiriman"
                style={{ width: '100%', maxHeight: 220, display: 'block' }} />
            </div>
          )}

          {order.status === 'delivered' && (
            <div>
              <button onClick={handleConfirm} disabled={confirming} style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none', background: confirming ? 'var(--k-border)' : 'linear-gradient(135deg, #00C896, #00A87D)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: confirming ? 'not-allowed' : 'pointer', boxShadow: confirming ? 'none' : '0 4px 20px rgba(0,200,150,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {confirming ? <><span style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Mengkonfirmasi...</> : '✓ Konfirmasi Pesanan Diterima'}
              </button>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', textAlign: 'center', marginTop: 8 }}>Pesanan akan otomatis terkonfirmasi jika tidak ada aksi</p>
            </div>
          )}

          {order.status === 'pending' && (
            <button onClick={handleCancel} style={{ width: '100%', padding: '14px', borderRadius: 14, border: '1px solid rgba(245,101,101,0.3)', background: 'rgba(245,101,101,0.06)', color: '#F56565', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Batalkan Pesanan</button>
          )}

          {order.status === 'completed' && !rated && (
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '18px 16px' }}>
              <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Bagaimana pesananmu?</p>
              <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 16 }}>Bantu warung dan mitra kami berkembang</p>
              <StarRow label={`🏪 ${order.merchant?.name ?? 'Warung'}`} value={rating.merchant_score} onChange={s => setRating(r => ({ ...r, merchant_score: s }))} />
              {order.mitra_id && <StarRow label="🏍️ Mitra Delivery" value={rating.mitra_score} onChange={s => setRating(r => ({ ...r, mitra_score: s }))} />}
              <button onClick={handleRate} style={{ width: '100%', marginTop: 4, padding: '14px', borderRadius: 14, border: 'none', background: rating.merchant_score ? '#F97316' : 'var(--k-card2)', color: rating.merchant_score ? '#fff' : 'var(--k-muted)', fontWeight: 700, fontSize: 14, cursor: rating.merchant_score ? 'pointer' : 'not-allowed' }}>Kirim Rating ⭐</button>
            </div>
          )}

          {order.status === 'completed' && rated && (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <p style={{ fontSize: 28, marginBottom: 6 }}>⭐</p>
              <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Rating sudah dikirim. Terima kasih!</p>
            </div>
          )}

          {['cancelled','rejected'].includes(order.status) && (
            <div style={{ padding: 16, borderRadius: 14, background: 'rgba(245,101,101,0.07)', border: '1px solid rgba(245,101,101,0.2)', textAlign: 'center' }}>
              <p style={{ fontSize: 28 }}>{sm.icon}</p>
              <p style={{ fontWeight: 700, color: '#F56565', marginTop: 8 }}>{sm.label}</p>
              {order.cancellation_reason && <p style={{ fontSize: 13, color: 'var(--k-muted)', marginTop: 6 }}>{order.cancellation_reason}</p>}
              {order.rejection_reason    && <p style={{ fontSize: 13, color: 'var(--k-muted)', marginTop: 6 }}>{order.rejection_reason}</p>}
            </div>
          )}

          {canComplain && (
            <button onClick={() => setShowComplaint(true)} style={{
              width: '100%', padding: '13px', borderRadius: 14,
              border: '1.5px solid rgba(246,173,85,0.4)', background: 'rgba(246,173,85,0.06)',
              color: '#F6AD55', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>
              ⚠️ Laporkan Masalah
            </button>
          )}
          {complaintSent && (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#00C896', fontWeight: 700 }}>
              ✓ Laporan sudah dikirim, tim kami akan meninjau
            </p>
          )}
        </div>
      </div>

      {showComplaint && (
        <ReportComplaintModal
          orderType="zasafood"
          orderId={order.id}
          onClose={() => setShowComplaint(false)}
          onSuccess={() => { setShowComplaint(false); setComplaintSent(true) }}
        />
      )}
    </div>
  )
}
