import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre'
import { SATELLITE_STYLE } from '../../utils/mapStyle'
import { distanceMeter, fitPoints } from '../../utils/geo'
import useRoadRoute from '../../hooks/useRoadRoute'
import api from '../../services/api'
import echo from '../../services/echo'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
function fmtDist(m) {
  if (!m && m !== 0) return null
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`
}

// ── Progress stepper — 5 tahap utama ──────────────────────────────────────────
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

// ── Status metadata ────────────────────────────────────────────────────────────
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

// ── ETA Countdown hook ─────────────────────────────────────────────────────────
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

// ── StarRow ───────────────────────────────────────────────────────────────────
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

// ── Notifikasi status slide-in ────────────────────────────────────────────────
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

// ── Halaman utama ──────────────────────────────────────────────────────────────
export default function FoodTrackingPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const mapRef   = useRef(null)
  const mapLoaded = useRef(false)
  const prevStatus = useRef(null)

  const [order,        setOrder]        = useState(null)
  const [mitraGps,     setMitraGps]     = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [panelOpen,    setPanelOpen]    = useState(true)
  const [notifStatus,  setNotifStatus]  = useState(null)
  const [rating,       setRating]       = useState({ merchant_score: 0, mitra_score: 0 })
  const [rated,        setRated]        = useState(false)
  const [toast,        setToast]        = useState(null)
  const [confirming,   setConfirming]   = useState(false)

  // ── Load order ──────────────────────────────────────────────────────────────
  const loadOrder = useCallback(async () => {
    try {
      const res = await api.get(`/food/orders/${id}`)
      setOrder(res.data.data)
      if (res.data.mitra_gps) setMitraGps(res.data.mitra_gps)
    } catch { navigate('/food/orders') }
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

  // ── Kamera follow mitra ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mitraGps || !mapLoaded.current) return
    mapRef.current?.getMap()?.easeTo({ center: [mitraGps.lng, mitraGps.lat], duration: 1500 })
  }, [mitraGps])

  // ── Route: mitra → target tergantung status ─────────────────────────────────
  const routeFrom = useMemo(() => {
    if (!mitraGps) return null
    return [mitraGps.lat, mitraGps.lng]
  }, [mitraGps])

  const routeTo = useMemo(() => {
    if (!order) return null
    const toMerchant = ['mitra_on_pickup'].includes(order.status)
    if (toMerchant && order.merchant?.lat && order.merchant?.lng) {
      return [parseFloat(order.merchant.lat), parseFloat(order.merchant.lng)]
    }
    if (order.delivery_lat && order.delivery_lng) {
      return [parseFloat(order.delivery_lat), parseFloat(order.delivery_lng)]
    }
    return null
  }, [order, mitraGps])  // eslint-disable-line

  const { routePoints } = useRoadRoute(routeFrom, routeTo)

  const routeGeoJson = useMemo(() => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: routePoints
        ? routePoints.map(([lat, lng]) => [lng, lat])
        : (routeFrom && routeTo ? [[routeFrom[1], routeFrom[0]], [routeTo[1], routeTo[0]]] : []),
    },
  }), [routePoints, routeFrom, routeTo])

  // ── Fit bounds saat map load ─────────────────────────────────────────────────
  const fitMap = useCallback(() => {
    if (!order || !mapLoaded.current) return
    const pts = []
    if (mitraGps) pts.push([mitraGps.lat, mitraGps.lng])
    if (order.merchant?.lat) pts.push([parseFloat(order.merchant.lat), parseFloat(order.merchant.lng)])
    if (order.delivery_lat)  pts.push([parseFloat(order.delivery_lat), parseFloat(order.delivery_lng)])
    if (pts.length >= 2) fitPoints(mapRef.current?.getMap(), pts, 70)
    else if (pts.length === 1) mapRef.current?.getMap()?.flyTo({ center: [pts[0][1], pts[0][0]], zoom: 15 })
  }, [order, mitraGps])

  useEffect(() => { if (order && mapLoaded.current) fitMap() }, [order?.status]) // eslint-disable-line

  // ── Jarak mitra ke tujuan saat ini ──────────────────────────────────────────
  const distToTarget = useMemo(() => {
    if (!mitraGps || !routeTo) return null
    return distanceMeter(mitraGps.lat, mitraGps.lng, routeTo[0], routeTo[1])
  }, [mitraGps, routeTo])

  // ── ETA perjalanan (menit) ───────────────────────────────────────────────────
  const deliveryEtaMin = useMemo(() => {
    if (!distToTarget) return null
    return Math.max(1, Math.ceil(distToTarget / 1000 / 30 * 60))
  }, [distToTarget])

  const prepEtaRaw = order?.estimated_prep_minutes && ['merchant_accepted','preparing'].includes(order?.status)
    ? order.estimated_prep_minutes : null
  const prepEta = useEtaCountdown(prepEtaRaw)

  // ── Actions ──────────────────────────────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--k-bg)' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #F97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )
  if (!order) return null

  const sm          = STATUS_META[order.status] ?? STATUS_META.pending
  const stepIndex   = getStepIndex(order.status)
  const showMap     = !['cancelled','rejected'].includes(order.status)
  const showMitra   = mitraGps && ['mitra_on_pickup','picked_up','on_delivery','delivered'].includes(order.status)
  const showRoute   = showMitra && routeFrom && routeTo
  const isDone      = ['completed','cancelled','rejected'].includes(order.status)
  const panelH      = panelOpen ? 'calc(100dvh - 45vh)' : 72

  return (
    <div style={{ minHeight: '100dvh', background: '#0C0C16', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes spin      { to { transform:rotate(360deg) } }
        @keyframes blink     { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes pulseRing { 0%{transform:scale(.6);opacity:.8} 100%{transform:scale(1.8);opacity:0} }
        .maplibregl-ctrl-logo, .maplibregl-ctrl-attrib { display:none !important; }
      `}</style>

      {/* ── Notif status slide-in ── */}
      {notifStatus && <StatusNotif status={notifStatus} onDismiss={() => setNotifStatus(null)} />}

      {/* ── Toast ── */}
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

        {/* Badge jarak ke tujuan */}
        {distToTarget !== null && showMitra && (
          <div style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: 10, background: 'rgba(249,115,22,0.9)', backdropFilter: 'blur(8px)' }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{fmtDist(distToTarget)}</p>
          </div>
        )}
      </div>

      {/* ── Peta ── */}
      <div style={{ height: showMap ? '45vh' : '0px', minHeight: showMap ? 200 : 0, transition: 'height 0.3s', flexShrink: 0 }}>
        {showMap && (
          <Map
            ref={mapRef}
            initialViewState={{
              longitude: order.delivery_lng ?? 106.8456,
              latitude:  order.delivery_lat ?? -6.2088,
              zoom: 14,
            }}
            mapStyle={SATELLITE_STYLE}
            style={{ width: '100%', height: '100%' }}
            attributionControl={false}
            onLoad={() => { mapLoaded.current = true; fitMap() }}
          >
            {/* Route line */}
            {showRoute && (
              <Source id="food-route" type="geojson" data={routeGeoJson}>
                <Layer id="food-route-line" type="line"
                  paint={{ 'line-color': '#F97316', 'line-width': 5, 'line-opacity': 0.9 }}
                  layout={{ 'line-join': 'round', 'line-cap': 'round' }} />
              </Source>
            )}

            {/* Mitra marker — motor berdenyut */}
            {showMitra && (
              <Marker longitude={mitraGps.lng} latitude={mitraGps.lat} anchor="center">
                <div style={{ position: 'relative', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', width: 52, height: 52, borderRadius: '50%', background: 'rgba(249,115,22,0.2)', animation: 'pulseRing 2s ease-out infinite' }} />
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F97316', border: '3px solid #fff', boxShadow: '0 4px 12px rgba(249,115,22,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, zIndex: 1 }}>🏍️</div>
                </div>
              </Marker>
            )}

            {/* Merchant marker */}
            {order.merchant?.lat && order.merchant?.lng && (
              <Marker longitude={parseFloat(order.merchant.lng)} latitude={parseFloat(order.merchant.lat)} anchor="bottom">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#00C896', border: '3px solid #fff', boxShadow: '0 3px 10px rgba(0,200,150,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏪</div>
                  <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '8px solid #00C896' }} />
                </div>
              </Marker>
            )}

            {/* Destinasi marker */}
            {order.delivery_lat && order.delivery_lng && (
              <Marker longitude={parseFloat(order.delivery_lng)} latitude={parseFloat(order.delivery_lat)} anchor="bottom">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F56565', border: '3px solid #fff', boxShadow: '0 3px 10px rgba(245,101,101,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📍</div>
                  <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '8px solid #F56565' }} />
                </div>
              </Marker>
            )}
          </Map>
        )}
      </div>

      {/* ── Panel bawah ── */}
      <div style={{
        flex: 1,
        background: 'var(--k-bg)',
        borderRadius: showMap ? '22px 22px 0 0' : 0,
        marginTop: showMap ? -22 : 0,
        overflowY: 'auto',
        position: 'relative', zIndex: 10,
        boxShadow: '0 -6px 30px rgba(0,0,0,0.4)',
      }}>
        {/* Drag handle */}
        {showMap && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--k-border2)' }} />
          </div>
        )}

        <div style={{ padding: '14px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── Status badge besar ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16, flexShrink: 0,
              background: `${sm.color}18`, border: `2px solid ${sm.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            }}>{sm.icon}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 17, fontWeight: 900, color: sm.color, lineHeight: 1.2 }}>{sm.label}</p>
              {/* ETA label */}
              {prepEta !== null && prepEta > 0 && (
                <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 3 }}>⏱ Estimasi siap ~{prepEta} menit lagi</p>
              )}
              {deliveryEtaMin !== null && ['on_delivery','mitra_on_pickup','picked_up'].includes(order.status) && (
                <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 3 }}>🏁 Estimasi tiba ~{deliveryEtaMin} menit</p>
              )}
            </div>
            {/* Blinking dot untuk status aktif */}
            {!isDone && (
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: sm.color, animation: 'blink 2s infinite', flexShrink: 0 }} />
            )}
          </div>

          {/* ── Progress stepper ── */}
          {!['cancelled','rejected'].includes(order.status) && (
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '14px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {STEPS.map((step, i) => {
                  const done    = i < stepIndex
                  const current = i === stepIndex
                  const color   = done || current ? '#F97316' : 'var(--k-border2)'
                  return (
                    <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      {/* Connector line left */}
                      {i > 0 && (
                        <div style={{
                          position: 'absolute', top: 14, right: '50%', left: '-50%',
                          height: 3, background: i <= stepIndex ? '#F97316' : 'var(--k-border)',
                          transition: 'background 0.4s',
                        }} />
                      )}
                      {/* Circle */}
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', zIndex: 1,
                        background: done ? '#F97316' : current ? 'var(--k-bg)' : 'var(--k-card2)',
                        border: `3px solid ${color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: done ? 13 : 14,
                        transition: 'all 0.4s',
                        boxShadow: current ? `0 0 0 4px ${sm.color}22` : 'none',
                      }}>
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

          {/* ── Info mitra (saat sudah assign) ── */}
          {order.mitra && ['mitra_on_pickup','picked_up','on_delivery','delivered'].includes(order.status) && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(249,115,22,0.12)', border: '1.5px solid rgba(249,115,22,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏍️</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{order.mitra?.name ?? 'Mitra'}</p>
                <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{order.mitra?.role === 'mitra_motor' ? 'Motor' : 'Mobil'} · Mitra Delivery</p>
              </div>
              {distToTarget !== null && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#F97316' }}>{fmtDist(distToTarget)}</p>
                  <p style={{ fontSize: 10, color: 'var(--k-muted)' }}>dari lokasi Anda</p>
                </div>
              )}
            </div>
          )}

          {/* ── Info warung ── */}
          <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,200,150,0.1)', border: '1.5px solid rgba(0,200,150,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏪</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--k-text)' }}>{order.merchant?.name}</p>
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
                  <span>Ongkir</span><span>{fmtRp(order.delivery_fee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15 }}>
                  <span>Total</span>
                  <span style={{ color: '#F97316' }}>{fmtRp(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tombol konfirmasi terima ── */}
          {order.status === 'delivered' && (
            <div>
              <button onClick={handleConfirm} disabled={confirming} style={{
                width: '100%', padding: '16px', borderRadius: 16, border: 'none',
                background: confirming ? 'var(--k-border)' : 'linear-gradient(135deg, #00C896, #00A87D)',
                color: '#fff', fontWeight: 800, fontSize: 16, cursor: confirming ? 'not-allowed' : 'pointer',
                boxShadow: confirming ? 'none' : '0 4px 20px rgba(0,200,150,.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {confirming ? <><span style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Mengkonfirmasi...</> : '✓ Konfirmasi Pesanan Diterima'}
              </button>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', textAlign: 'center', marginTop: 8 }}>
                Pesanan akan otomatis terkonfirmasi jika tidak ada aksi
              </p>
            </div>
          )}

          {/* ── Batalkan (hanya saat pending) ── */}
          {order.status === 'pending' && (
            <button onClick={handleCancel} style={{
              width: '100%', padding: '14px', borderRadius: 14, border: '1px solid rgba(245,101,101,0.3)',
              background: 'rgba(245,101,101,0.06)', color: '#F56565', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>Batalkan Pesanan</button>
          )}

          {/* ── Rating ── */}
          {order.status === 'completed' && !rated && (
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '18px 16px' }}>
              <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Bagaimana pesananmu?</p>
              <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 16 }}>Bantu warung dan mitra kami berkembang</p>
              <StarRow label={`🏪 ${order.merchant?.name ?? 'Warung'}`} value={rating.merchant_score}
                onChange={s => setRating(r => ({ ...r, merchant_score: s }))} />
              {order.mitra_id && (
                <StarRow label="🏍️ Mitra Delivery" value={rating.mitra_score}
                  onChange={s => setRating(r => ({ ...r, mitra_score: s }))} />
              )}
              <button onClick={handleRate} style={{
                width: '100%', marginTop: 4, padding: '14px', borderRadius: 14, border: 'none',
                background: rating.merchant_score ? '#F97316' : 'var(--k-card2)',
                color: rating.merchant_score ? '#fff' : 'var(--k-muted)',
                fontWeight: 700, fontSize: 14, cursor: rating.merchant_score ? 'pointer' : 'not-allowed',
              }}>Kirim Rating ⭐</button>
            </div>
          )}

          {/* Rated confirmation */}
          {order.status === 'completed' && rated && (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <p style={{ fontSize: 28, marginBottom: 6 }}>⭐</p>
              <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Rating sudah dikirim. Terima kasih!</p>
            </div>
          )}

          {/* Status cancelled/rejected info */}
          {['cancelled','rejected'].includes(order.status) && (
            <div style={{ padding: 16, borderRadius: 14, background: 'rgba(245,101,101,0.07)', border: '1px solid rgba(245,101,101,0.2)', textAlign: 'center' }}>
              <p style={{ fontSize: 28 }}>{sm.icon}</p>
              <p style={{ fontWeight: 700, color: '#F56565', marginTop: 8 }}>{sm.label}</p>
              {order.cancellation_reason && <p style={{ fontSize: 13, color: 'var(--k-muted)', marginTop: 6 }}>{order.cancellation_reason}</p>}
              {order.rejection_reason    && <p style={{ fontSize: 13, color: 'var(--k-muted)', marginTop: 6 }}>{order.rejection_reason}</p>}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
