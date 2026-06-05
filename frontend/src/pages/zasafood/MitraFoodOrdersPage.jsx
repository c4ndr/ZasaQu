import { useState, useEffect, useRef, useCallback } from 'react'
import BottomNav from '../../components/BottomNav'
import api from '../../services/api'
import echo from '../../services/echo'
import { useAuth } from '../../context/AuthContext'

function fmtRp(v)   { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
function fmtTime(d) { return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }

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

// ── Step indicator pengiriman ─────────────────────────────────────────────────
const STEPS = ['Menuju Warung', 'Ambil Pesanan', 'Antar', 'Selesai']
function stepIndex(status) {
  return { mitra_on_pickup: 0, picked_up: 1, on_delivery: 2, delivered: 3 }[status] ?? 0
}
function DeliverySteps({ status }) {
  const idx = stepIndex(status)
  const sm  = STATUS_META[status] ?? STATUS_META.mitra_on_pickup
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
        {[0,1,2,3].map(i => (
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

// ── Tombol navigasi (buka Google Maps navigasi) ───────────────────────────────
function NavButton({ label, lat, lng, address }) {
  if (!lat && !lng) return null
  const url = lat && lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    : `https://www.google.com/maps/search/${encodeURIComponent(address)}`
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10,
        background: '#EFF6FF', color: '#1D4ED8', textDecoration: 'none',
        fontWeight: 700, fontSize: 12, border: '1px solid #BFDBFE',
      }}>
      🗺️ {label}
    </a>
  )
}

// ── Modal konfirmasi (gantikan window.confirm) ────────────────────────────────
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

export default function MitraFoodOrdersPage() {
  const [available,      setAvailable]      = useState([])
  const [myOrders,       setMyOrders]       = useState([])
  const [jastipSession,  setJastipSession]  = useState(undefined)
  const [loading,        setLoading]        = useState(true)
  const [accepting,      setAccepting]      = useState(null)
  const [updating,       setUpdating]       = useState(null)
  const [pickingUp,      setPickingUp]      = useState(null)
  const [startingSession,setStartingSession]= useState(false)
  const [closingSession, setClosingSession] = useState(false)
  const [tab,            setTab]            = useState('active')
  const [toast,          setToast]          = useState(null)
  const [confirm,        setConfirm]        = useState(null)
  const [sessionForm,    setSessionForm]    = useState(SESSION_FORM_DEFAULT)
  const [gettingGps,     setGettingGps]    = useState(false)
  const pollRef = useRef(null)
  const { user } = useAuth()

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
          .then(data => {
            setSessionForm(f => ({
              ...f, origin_lat: la, origin_lng: lo,
              origin_address: f.origin_address || data.display_name || `${la.toFixed(5)}, ${lo.toFixed(5)}`,
            }))
          })
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
        origin_lat:          sessionForm.origin_lat,
        origin_lng:          sessionForm.origin_lng,
        origin_address:      sessionForm.origin_address,
        destination_address: sessionForm.destination_address,
        corridor_width:      Number(sessionForm.corridor_width),
        max_orders:          Number(sessionForm.max_orders),
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
  const history = myOrders.filter(o => ['completed','cancelled','delivered'].includes(o.status))

  const ordersByMerchant = {}
  ;(jastipSession?.food_orders || []).forEach(o => {
    const mid = o.merchant_id
    if (!ordersByMerchant[mid]) ordersByMerchant[mid] = { merchant: o.merchant, orders: [] }
    ordersByMerchant[mid].orders.push(o)
  })
  const merchantGroups = Object.values(ordersByMerchant)

  const pendingAvail = available.length
  const todayEarning = history
    .filter(o => o.status === 'completed')
    .reduce((s, o) => s + (o.mitra_income ?? 0), 0)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          padding: '11px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13,
          background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', whiteSpace: 'nowrap',
        }}>{toast.msg}</div>
      )}

      {/* Confirm modal */}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}

      {/* ── Header ── */}
      <div style={{ background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 50 }}>
        {/* Info ringkas */}
        <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--k-text)' }}>Delivery Makanan 🍜</div>
            {todayEarning > 0 && <div style={{ fontSize: 12, color: '#027A48', fontWeight: 600 }}>Hari ini: +{fmtRp(todayEarning)}</div>}
          </div>
          {jastipSession && (
            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(0,200,150,0.12)', color: '#027A48' }}>● Sesi Aktif</span>
          )}
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
              fontWeight: tab === k ? 700 : 400, fontSize: 11, position: 'relative',
            }}>
              <div style={{ fontSize: 18, lineHeight: 1, position: 'relative', display: 'inline-block' }}>
                {emoji}
                {count > 0 && (
                  <span style={{
                    position: 'absolute', top: -5, right: -8,
                    background: k === 'sesi_kuliner' ? '#00C896' : '#DC2626',
                    color: '#fff', fontSize: 9, fontWeight: 800,
                    padding: '1px 4px', borderRadius: 20, lineHeight: 1.4,
                    animation: k === 'available' && pendingAvail > 0 ? 'blink 2s infinite' : 'none',
                  }}>{k === 'sesi_kuliner' ? '●' : count}</span>
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

            {/* ── Tab: ORDER AKTIF ── */}
            {tab === 'active' && (
              active.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
                  <div style={{ fontSize: 52, marginBottom: 12 }}>🏍️</div>
                  <p style={{ fontWeight: 600, color: 'var(--k-text)', marginBottom: 6 }}>Tidak ada order aktif</p>
                  <p style={{ fontSize: 13, marginBottom: 20 }}>Cek tab "Order Baru" untuk ambil order.</p>
                  <button onClick={() => setTab('available')} style={{
                    padding: '11px 24px', borderRadius: 20, border: 'none', background: '#F97316', color: '#fff', fontWeight: 700, cursor: 'pointer',
                  }}>Lihat Order Baru</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {active.map(order => {
                    const sm  = STATUS_META[order.status] ?? STATUS_META.mitra_on_pickup
                    const nx  = NEXT_STATUS[order.status]
                    const isCOD = order.payment_method === 'cod'
                    const goToMerchant = order.status === 'mitra_on_pickup'
                    const destination  = goToMerchant
                      ? { label: 'Navigasi ke Warung', lat: order.merchant?.lat, lng: order.merchant?.lng, address: order.merchant?.address }
                      : { label: 'Navigasi ke Pelanggan', lat: order.delivery_lat, lng: order.delivery_lng, address: order.delivery_address }

                    return (
                      <div key={order.id} style={{
                        borderRadius: 16, background: 'var(--k-card)',
                        border: `2px solid ${sm.border}`,
                        overflow: 'hidden',
                      }}>
                        {/* Status banner */}
                        <div style={{ background: sm.bg, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 800, fontSize: 13, color: sm.color }}>{sm.icon} {sm.label}</span>
                          {isCOD && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>
                              💵 COD — siapkan kembalian
                            </span>
                          )}
                        </div>

                        <div style={{ padding: '12px 14px' }}>
                          {/* Step indicator */}
                          <DeliverySteps status={order.status} />

                          {/* Rute: Warung → Pelanggan */}
                          <div style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
                            <div style={{
                              flex: 1, padding: '10px 12px', borderRadius: '10px 0 0 10px',
                              background: goToMerchant ? 'rgba(249,115,22,0.1)' : 'var(--k-input)',
                              border: `1.5px solid ${goToMerchant ? '#F97316' : 'var(--k-border)'}`,
                              borderRight: 'none',
                            }}>
                              <div style={{ fontSize: 10, color: 'var(--k-sub)', fontWeight: 600, marginBottom: 2 }}>AMBIL DI</div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{order.merchant?.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--k-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.merchant?.address || '—'}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--k-input)', padding: '0 6px', fontSize: 14 }}>›</div>
                            <div style={{
                              flex: 1, padding: '10px 12px', borderRadius: '0 10px 10px 0',
                              background: !goToMerchant && order.status !== 'mitra_on_pickup' ? 'rgba(29,78,216,0.08)' : 'var(--k-input)',
                              border: `1.5px solid ${!goToMerchant ? '#3B82F6' : 'var(--k-border)'}`,
                              borderLeft: 'none',
                            }}>
                              <div style={{ fontSize: 10, color: 'var(--k-sub)', fontWeight: 600, marginBottom: 2 }}>ANTAR KE</div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{order.customer?.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--k-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.delivery_address || '—'}</div>
                            </div>
                          </div>

                          {/* Tombol navigasi */}
                          <div style={{ marginBottom: 12 }}>
                            <NavButton label={destination.label} lat={destination.lat} lng={destination.lng} address={destination.address} />
                          </div>

                          {/* Item list ringkas */}
                          <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 12, padding: '8px 10px', borderRadius: 8, background: 'var(--k-input)' }}>
                            🛍 {order.items?.map(i => `${i.item_name} ×${i.quantity}`).join(' · ')}
                          </div>

                          {/* Pendapatan */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Pendapatanmu</div>
                              <div style={{ fontWeight: 800, fontSize: 16, color: '#F97316' }}>{fmtRp(order.mitra_income)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Total order</div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{fmtRp(order.total_amount)}</div>
                            </div>
                          </div>

                          {/* Tombol update status */}
                          {nx && (
                            <button onClick={() => handleUpdateStatus(order.id, nx.value)} disabled={updating === order.id} style={{
                              width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                              cursor: updating === order.id ? 'default' : 'pointer',
                              background: updating === order.id ? 'var(--k-border)' : nx.bg,
                              color: updating === order.id ? 'var(--k-sub)' : nx.color,
                              fontWeight: 800, fontSize: 14,
                            }}>
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

            {/* ── Tab: ORDER TERSEDIA ── */}
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
                    return (
                      <div key={order.id} style={{
                        borderRadius: 16, background: 'var(--k-card)',
                        border: '2px solid rgba(0,200,150,0.35)',
                        overflow: 'hidden',
                      }}>
                        {/* Banner */}
                        <div style={{ background: 'rgba(0,200,150,0.08)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,200,150,0.2)' }}>
                          <span style={{ fontWeight: 800, fontSize: 13, color: '#027A48' }}>🟢 Siap Diambil</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {isCOD && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>💵 COD</span>}
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(99,179,237,0.15)', color: '#1D4ED8' }}>#{order.order_number}</span>
                          </div>
                        </div>

                        <div style={{ padding: '12px 14px' }}>
                          {/* Rute */}
                          <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, marginBottom: 12 }}>
                            {/* Garis rute visual */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00C896', border: '2px solid #fff', boxShadow: '0 0 0 2px #00C896' }} />
                              <div style={{ width: 2, flex: 1, background: '#E5E7EB', margin: '3px 0' }} />
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F97316', border: '2px solid #fff', boxShadow: '0 0 0 2px #F97316' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 10, color: 'var(--k-sub)', fontWeight: 600 }}>PICKUP</div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{order.merchant?.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>{order.merchant?.address || '—'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, color: 'var(--k-sub)', fontWeight: 600 }}>ANTAR</div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{order.customer?.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--k-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.delivery_address}</div>
                              </div>
                            </div>
                          </div>

                          {/* Items */}
                          <div style={{ fontSize: 12, color: 'var(--k-sub)', padding: '7px 10px', borderRadius: 8, background: 'var(--k-input)', marginBottom: 12 }}>
                            🛍 {order.items?.map(i => `${i.item_name} ×${i.quantity}`).join(' · ')}
                          </div>

                          {/* COD warning */}
                          {isCOD && (
                            <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 9, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', fontWeight: 600, marginBottom: 12 }}>
                              ⚠️ Pembayaran COD — kamu terima uang tunai {fmtRp(order.total_amount)} dari pelanggan.
                            </div>
                          )}

                          {/* Pendapatan + tombol ambil */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Pendapatanmu</div>
                              <div style={{ fontWeight: 800, fontSize: 18, color: '#F97316' }}>{fmtRp(order.mitra_income)}</div>
                            </div>
                            <button onClick={() => handleAccept(order.id)} disabled={accepting === order.id} style={{
                              padding: '12px 24px', borderRadius: 12, border: 'none',
                              background: accepting === order.id ? 'var(--k-border)' : '#00C896',
                              color: '#fff', fontWeight: 800, fontSize: 14, cursor: accepting === order.id ? 'default' : 'pointer',
                            }}>
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

            {/* ── Tab: SESI KULINER ── */}
            {tab === 'sesi_kuliner' && (
              jastipSession ? (
                <div>
                  {/* Info sesi aktif */}
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
                    <button onClick={askCloseSession} disabled={closingSession} style={{
                      width: '100%', padding: '11px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: 'rgba(220,38,38,0.08)', color: '#DC2626', fontWeight: 700, fontSize: 14,
                    }}>
                      {closingSession ? 'Menutup...' : '🔴 Tutup Sesi'}
                    </button>
                  </div>

                  {/* Order per warung */}
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
                            {/* Header warung */}
                            <div style={{ padding: '10px 14px', background: allPickedUp ? 'rgba(0,200,150,0.08)' : 'rgba(249,115,22,0.06)', borderBottom: '1px solid var(--k-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: 14 }}>🏪 {merchant?.name || 'Warung'}</div>
                                {merchant?.lat && <a href={`https://maps.google.com/maps?q=${merchant.lat},${merchant.lng}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#1D4ED8' }}>📍 Buka peta</a>}
                              </div>
                              {allPickedUp
                                ? <span style={{ fontSize: 12, fontWeight: 700, color: '#027A48' }}>✓ Diambil</span>
                                : <span style={{ fontSize: 12, fontWeight: 700, color: '#F97316' }}>{orders.length} order</span>
                              }
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
                                  <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>👤 {o.customer?.name} — {o.delivery_address}</div>
                                </div>
                              ))}

                              {!allPickedUp && (
                                <button
                                  onClick={() => {
                                    const unpicked = orders.find(o => !o.mitra_picked_up_from_merchant_at)
                                    if (unpicked) handlePickupFromMerchant(unpicked.id)
                                  }}
                                  disabled={pickingUp !== null}
                                  style={{
                                    width: '100%', padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                    background: 'rgba(124,58,237,0.1)', color: '#7C3AED', fontWeight: 700, fontSize: 13, marginTop: 10,
                                  }}>
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
                /* Belum ada sesi */
                <div>
                  <div style={{ padding: '14px 16px', borderRadius: 14, marginBottom: 18, background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#F97316', marginBottom: 4 }}>💡 Apa itu Sesi Kuliner?</div>
                    <div style={{ fontSize: 12, color: 'var(--k-sub)', lineHeight: 1.6 }}>
                      Buka sesi dengan rute tertentu. Pelanggan bisa memesan dari warung-warung dalam koridor rute kamu,
                      berbagi ongkir bersama. Kamu keliling warung, pickup semua, lalu antar satu per satu.
                    </div>
                  </div>

                  <div style={{ padding: '20px', borderRadius: 16, background: 'var(--k-card)', border: '1.5px solid var(--k-border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>🚀 Buka Sesi Kuliner</div>

                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 6 }}>Lokasi Awal (posisi kamu sekarang)</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={sessionForm.origin_address} onChange={e => setSessionForm(f => ({ ...f, origin_address: e.target.value }))}
                          placeholder="Nama lokasi awal..."
                          style={{ flex: 1, padding: '10px 12px', borderRadius: 10, fontSize: 13, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)' }}
                        />
                        <button onClick={getGps} disabled={gettingGps} style={{
                          padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                          background: sessionForm.origin_lat ? 'rgba(0,200,150,0.15)' : 'var(--k-input)',
                          color: sessionForm.origin_lat ? '#027A48' : 'var(--k-sub)', fontWeight: 700, fontSize: 13,
                        }}>
                          {gettingGps ? <div style={{ width: 14, height: 14, border: '2px solid #F97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : sessionForm.origin_lat ? '✓' : '📍 GPS'}
                        </button>
                      </div>
                      {sessionForm.origin_lat && <div style={{ fontSize: 11, color: '#027A48', marginTop: 4 }}>✓ Koordinat terdeteksi</div>}
                    </div>

                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 6 }}>Area / Tujuan Rute</div>
                      <input value={sessionForm.destination_address} onChange={e => setSessionForm(f => ({ ...f, destination_address: e.target.value }))}
                        placeholder="cth: Perumahan Griya Utama, Kel. Sukamaju..."
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, boxSizing: 'border-box', border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 6 }}>Lebar Koridor</div>
                        <select value={sessionForm.corridor_width} onChange={e => setSessionForm(f => ({ ...f, corridor_width: e.target.value }))}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)' }}>
                          <option value={500}>500 m</option>
                          <option value={1000}>1 km</option>
                          <option value={1500}>1.5 km</option>
                          <option value={2000}>2 km</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 6 }}>Maks Order</div>
                        <select value={sessionForm.max_orders} onChange={e => setSessionForm(f => ({ ...f, max_orders: e.target.value }))}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)' }}>
                          {[3,4,5,6,7,8,10].map(n => <option key={n} value={n}>{n} order</option>)}
                        </select>
                      </div>
                    </div>

                    <button onClick={handleStartSession} disabled={startingSession} style={{
                      padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: startingSession ? 'var(--k-border)' : '#F97316',
                      color: '#fff', fontWeight: 800, fontSize: 15,
                    }}>
                      {startingSession ? 'Memulai sesi...' : '🚀 Mulai Sesi Kuliner'}
                    </button>
                  </div>
                </div>
              )
            )}

            {/* ── Tab: RIWAYAT ── */}
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
                        <div style={{ fontSize: 12, color: 'var(--k-sub)', marginTop: 2 }}>
                          📍 {order.delivery_address}
                        </div>
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
