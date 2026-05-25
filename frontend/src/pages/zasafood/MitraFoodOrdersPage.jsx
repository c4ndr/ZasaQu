import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import api from '../../services/api'
import echo from '../../services/echo'
import { useAuth } from '../../context/AuthContext'

function fmtRp(v)   { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
function fmtTime(d) { return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }

const STATUS_META = {
  ready_for_pickup: { label: 'Siap Diambil',      color: '#00C896', bg: 'rgba(0,200,150,0.12)'  },
  mitra_on_pickup:  { label: 'Menuju Merchant',   color: '#F6AD55', bg: 'rgba(246,173,85,0.12)' },
  picked_up:        { label: 'Pesanan Diambil',   color: '#9F7AEA', bg: 'rgba(159,122,234,0.12)' },
  on_delivery:      { label: 'Diantarkan',        color: '#63B3ED', bg: 'rgba(99,179,237,0.12)' },
  delivered:        { label: 'Terkirim',          color: '#00C896', bg: 'rgba(0,200,150,0.12)'  },
  completed:        { label: 'Selesai',           color: '#00C896', bg: 'rgba(0,200,150,0.12)'  },
  cancelled:        { label: 'Dibatalkan',        color: '#A0A0BC', bg: 'rgba(160,160,188,0.12)'},
  rejected:         { label: 'Ditolak',           color: '#F56565', bg: 'rgba(245,101,101,0.12)'},
}

const NEXT_STATUS = {
  mitra_on_pickup: { label: 'Sudah di Merchant (Ambil)', value: 'picked_up', color: '#9F7AEA' },
  picked_up:       { label: 'Berangkat Antar',           value: 'on_delivery', color: '#63B3ED' },
  on_delivery:     { label: 'Sudah Diantar',             value: 'delivered',  color: '#00C896' },
}

const ACTIVE_STATUSES = ['mitra_on_pickup', 'picked_up', 'on_delivery']

function MapsLink({ address, lat, lng }) {
  if (!lat || !lng) return <span style={{ fontSize: 12, color: 'var(--k-sub)' }}>{address}</span>
  return (
    <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
      target="_blank" rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      style={{ fontSize: 12, color: '#63B3ED', textDecoration: 'none' }}>
      📍 {address}
    </a>
  )
}

const SESSION_FORM_DEFAULT = {
  origin_address:      '',
  origin_lat:          null,
  origin_lng:          null,
  destination_address: '',
  corridor_width:      1000,
  max_orders:          5,
}

export default function MitraFoodOrdersPage() {
  const navigate  = useNavigate()
  const [available,     setAvailable]     = useState([])
  const [myOrders,      setMyOrders]      = useState([])
  const [jastipSession, setJastipSession] = useState(undefined) // undefined = belum load
  const [loading,       setLoading]       = useState(true)
  const [accepting,     setAccepting]     = useState(null)
  const [updating,      setUpdating]      = useState(null)
  const [pickingUp,     setPickingUp]     = useState(null)
  const [startingSession, setStartingSession] = useState(false)
  const [closingSession,  setClosingSession]  = useState(false)
  const [tab,           setTab]           = useState('active')
  const [toast,         setToast]         = useState(null)
  const [sessionForm,   setSessionForm]   = useState(SESSION_FORM_DEFAULT)
  const [gettingGps,    setGettingGps]    = useState(false)
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
    // Tentukan vehicle type dari role (mitra_motor → motor, mitra_mobil → mobil)
    const vehicleType = user?.role?.replace('mitra_', '') ?? 'motor'
    // WebSocket: food order tersedia / diambil mitra lain
    const ch = echo.channel(`mitra.${vehicleType}`)
    ch.listen('.food.order.new',   () => load())
    ch.listen('.food.order.status', () => load())

    pollRef.current = setInterval(load, 30000)
    return () => {
      clearInterval(pollRef.current)
      echo.leave(`mitra.${vehicleType}`)
    }
  }, [load, user?.role])

  async function handleAccept(orderId) {
    setAccepting(orderId)
    try {
      await api.post(`/food/mitra/orders/${orderId}/accept`)
      showToast('success', 'Order diterima! Menuju merchant.')
      load()
    } catch (e) {
      showToast('error', e.response?.data?.message || 'Gagal menerima order.')
    } finally { setAccepting(null) }
  }

  async function handleUpdateStatus(orderId, status) {
    setUpdating(orderId)
    try {
      await api.patch(`/food/mitra/orders/${orderId}/status`, { status })
      showToast('success', 'Status diperbarui.')
      load()
    } catch (e) {
      showToast('error', e.response?.data?.message || 'Gagal.')
    } finally { setUpdating(null) }
  }

  async function handlePickupFromMerchant(orderId) {
    setPickingUp(orderId)
    try {
      await api.post(`/food/jastip/orders/${orderId}/pickup-from-merchant`)
      showToast('success', 'Pickup dari warung dicatat.')
      load()
    } catch (e) {
      showToast('error', e.response?.data?.message || 'Gagal mencatat pickup.')
    } finally { setPickingUp(null) }
  }

  function getGps() {
    setGettingGps(true)
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setSessionForm(f => ({
          ...f,
          origin_lat: pos.coords.latitude,
          origin_lng: pos.coords.longitude,
          origin_address: f.origin_address || `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
        }))
        setGettingGps(false)
      },
      () => { showToast('error', 'Gagal ambil GPS.'); setGettingGps(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleStartSession() {
    if (!sessionForm.origin_lat) return showToast('error', 'Ambil lokasi awal terlebih dahulu.')
    if (!sessionForm.destination_address.trim()) return showToast('error', 'Isi alamat tujuan rute.')
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
    } catch (e) {
      showToast('error', e.response?.data?.message || 'Gagal memulai sesi.')
    } finally { setStartingSession(false) }
  }

  async function handleCloseSession() {
    if (!window.confirm('Tutup sesi kuliner sekarang? Order yang sudah masuk tetap diproses.')) return
    setClosingSession(true)
    try {
      await api.delete('/food/jastip/sessions/current')
      showToast('success', 'Sesi ditutup.')
      load()
    } catch (e) {
      showToast('error', e.response?.data?.message || 'Gagal menutup sesi.')
    } finally { setClosingSession(false) }
  }

  function showToast(type, msg) {
    setToast({ type, msg }); setTimeout(() => setToast(null), 3000)
  }

  const active  = myOrders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const history = myOrders.filter(o => ['completed', 'cancelled', 'rejected', 'delivered'].includes(o.status))

  // Kelompokkan order jastip aktif per warung
  const ordersByMerchant = {}
  ;(jastipSession?.food_orders || []).forEach(o => {
    const mid = o.merchant_id
    if (!ordersByMerchant[mid]) ordersByMerchant[mid] = { merchant: o.merchant, orders: [] }
    ordersByMerchant[mid].orders.push(o)
  })
  const merchantGroups = Object.values(ordersByMerchant)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14,
          background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{
        padding: '20px 16px 0', background: 'var(--k-card)',
        borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 14 }}>Delivery Makanan 🍜</div>
        <div style={{ display: 'flex', gap: 8, paddingBottom: 14, overflowX: 'auto' }}>
          {[
            ['active',       'Aktif'],
            ['available',    'Tersedia'],
            ['sesi_kuliner', 'Sesi Kuliner'],
            ['history',      'Riwayat'],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: tab === k ? 700 : 400, fontSize: 13, whiteSpace: 'nowrap',
              background: tab === k ? '#F97316' : 'var(--k-input)',
              color: tab === k ? '#fff' : 'var(--k-sub)',
              position: 'relative',
            }}>
              {l}
              {k === 'available' && available.length > 0 && (
                <span style={{
                  marginLeft: 6, background: '#F56565', color: '#fff',
                  borderRadius: '50%', width: 18, height: 18, fontSize: 11, fontWeight: 800,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{available.length}</span>
              )}
              {k === 'sesi_kuliner' && jastipSession && (
                <span style={{
                  marginLeft: 6, width: 8, height: 8, borderRadius: '50%',
                  background: '#00C896', display: 'inline-block',
                }} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--k-sub)', padding: '40px 0' }}>Memuat...</p>
        ) : (
          <>
            {/* Tab: Order Tersedia */}
            {tab === 'available' && (
              available.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🍜</div>
                  <div>Belum ada pesanan siap diambil di sekitarmu.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {available.map(order => (
                    <div key={order.id} style={{
                      padding: '18px', borderRadius: 16, background: 'var(--k-card)',
                      border: '2px solid rgba(0,200,150,0.3)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>#{order.order_number}</div>
                        <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: '#00C896', background: 'rgba(0,200,150,0.12)' }}>Siap Diambil</span>
                      </div>

                      <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(0,200,150,0.06)', marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 4 }}>📦 Ambil di</div>
                        <div style={{ fontWeight: 700 }}>{order.merchant?.name}</div>
                        <MapsLink address={order.merchant?.address} lat={order.merchant?.lat} lng={order.merchant?.lng} />
                      </div>

                      <div style={{ fontSize: 13, color: 'var(--k-sub)', marginBottom: 10 }}>
                        {order.items?.map(i => `${i.item_name} ×${i.quantity}`).join(', ')}
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 12 }}>
                        🎯 Antar ke: <MapsLink address={order.delivery_address} lat={order.delivery_lat} lng={order.delivery_lng} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#F97316', fontSize: 15 }}>{fmtRp(order.mitra_income)}</div>
                          <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>pendapatanmu</div>
                        </div>
                        <button
                          onClick={() => handleAccept(order.id)}
                          disabled={accepting === order.id}
                          style={{
                            padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: accepting === order.id ? 'var(--k-border)' : '#F97316',
                            color: '#fff', fontWeight: 700, fontSize: 14,
                          }}>
                          {accepting === order.id ? 'Memproses...' : 'Ambil Order'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Tab: Order Aktif */}
            {tab === 'active' && (
              active.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🏍️</div>
                  <div>Tidak ada order aktif.</div>
                  <button onClick={() => setTab('available')} style={{
                    marginTop: 16, padding: '10px 20px', borderRadius: 20, border: 'none',
                    background: '#F97316', color: '#fff', fontWeight: 700, cursor: 'pointer',
                  }}>Cari Order Tersedia</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {active.map(order => {
                    const sm = STATUS_META[order.status]
                    const nx = NEXT_STATUS[order.status]
                    return (
                      <div key={order.id} style={{
                        padding: '18px', borderRadius: 16, background: 'var(--k-card)',
                        border: '1.5px solid var(--k-border)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ fontWeight: 800 }}>#{order.order_number}</div>
                          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: sm?.color, background: sm?.bg }}>{sm?.label}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                          <div style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--k-input)' }}>
                            <div style={{ fontSize: 11, color: 'var(--k-sub)', marginBottom: 3 }}>Ambil di</div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{order.merchant?.name}</div>
                            <MapsLink address={order.merchant?.address} lat={order.merchant?.lat} lng={order.merchant?.lng} />
                          </div>
                          <div style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--k-input)' }}>
                            <div style={{ fontSize: 11, color: 'var(--k-sub)', marginBottom: 3 }}>Antar ke</div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{order.customer?.name}</div>
                            <MapsLink address={order.delivery_address} lat={order.delivery_lat} lng={order.delivery_lng} />
                          </div>
                        </div>

                        <div style={{ fontSize: 13, color: 'var(--k-sub)', marginBottom: 12 }}>
                          {order.items?.map(i => `${i.item_name} ×${i.quantity}`).join(', ')}
                        </div>

                        {nx && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, nx.value)}
                            disabled={updating === order.id}
                            style={{
                              width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                              background: updating === order.id ? 'var(--k-border)' : nx.color + '22',
                              color: updating === order.id ? 'var(--k-sub)' : nx.color,
                              fontWeight: 700, fontSize: 14,
                            }}>
                            {updating === order.id ? 'Memperbarui...' : nx.label}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            )}

            {/* Tab: Sesi Kuliner */}
            {tab === 'sesi_kuliner' && (
              jastipSession ? (
                /* ── Ada sesi aktif ── */
                <div>
                  {/* Info sesi */}
                  <div style={{
                    padding: '16px', borderRadius: 16, background: 'var(--k-card)',
                    border: '2px solid rgba(0,200,150,0.3)', marginBottom: 16,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>
                        {jastipSession.vehicle_type === 'motor' ? '🛵' : '🚗'} Sesi Aktif
                      </div>
                      <span style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: 'rgba(0,200,150,0.15)', color: '#00C896',
                      }}>LIVE</span>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 6 }}>
                      📍 {jastipSession.origin_address} → {jastipSession.destination_address}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 14 }}>
                      {jastipSession.orders_count}/{jastipSession.max_orders} order &nbsp;·&nbsp; Koridor {jastipSession.corridor_width}m
                    </div>

                    <button
                      onClick={handleCloseSession}
                      disabled={closingSession}
                      style={{
                        width: '100%', padding: '11px', borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: closingSession ? 'var(--k-border)' : 'rgba(245,101,101,0.12)',
                        color: closingSession ? 'var(--k-sub)' : '#F56565',
                        fontWeight: 700, fontSize: 14,
                      }}>
                      {closingSession ? 'Menutup...' : '🔴 Tutup Sesi'}
                    </button>
                  </div>

                  {/* Daftar warung & order per warung */}
                  {merchantGroups.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--k-sub)' }}>
                      <div style={{ fontSize: 40, marginBottom: 10 }}>⏳</div>
                      <div>Belum ada pelanggan yang bergabung sesi ini.</div>
                      <div style={{ fontSize: 12, marginTop: 6 }}>Sesi aktif — pelanggan bisa memilih warung dalam rute kamu.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {merchantGroups.map(({ merchant, orders }) => {
                        const allPickedUp = orders.every(o => o.mitra_picked_up_from_merchant_at)
                        return (
                          <div key={merchant?.id} style={{
                            borderRadius: 16, background: 'var(--k-card)',
                            border: allPickedUp
                              ? '2px solid rgba(0,200,150,0.3)'
                              : '1.5px solid var(--k-border)',
                            overflow: 'hidden',
                          }}>
                            {/* Header warung */}
                            <div style={{
                              padding: '12px 16px',
                              background: allPickedUp
                                ? 'rgba(0,200,150,0.08)'
                                : 'rgba(249,115,22,0.08)',
                              borderBottom: '1px solid var(--k-border)',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: 15 }}>
                                  🏪 {merchant?.name || 'Warung'}
                                </div>
                                {merchant?.address && (
                                  <MapsLink address={merchant.address} lat={merchant.lat} lng={merchant.lng} />
                                )}
                              </div>
                              {allPickedUp ? (
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#00C896' }}>✓ Diambil</span>
                              ) : (
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#F97316' }}>{orders.length} order</span>
                              )}
                            </div>

                            {/* Order list per warung */}
                            <div style={{ padding: '12px 16px' }}>
                              {orders.map((o, idx) => (
                                <div key={o.id} style={{
                                  marginBottom: idx < orders.length - 1 ? 10 : 0,
                                  paddingBottom: idx < orders.length - 1 ? 10 : 0,
                                  borderBottom: idx < orders.length - 1 ? '1px solid var(--k-border)' : 'none',
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontWeight: 700, fontSize: 13 }}>
                                      #{o.jastip_pickup_sequence ? `Urutan ${o.jastip_pickup_sequence} · ` : ''}#{o.order_number}
                                    </span>
                                    {o.mitra_picked_up_from_merchant_at ? (
                                      <span style={{ fontSize: 11, color: '#00C896', fontWeight: 700 }}>✓ Sudah diambil</span>
                                    ) : (
                                      <span style={{ fontSize: 11, color: 'var(--k-sub)' }}>Belum diambil</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 2 }}>
                                    {o.items?.map(i => `${i.item_name} ×${i.quantity}`).join(', ')}
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>
                                    👤 {o.customer?.name} · 🎯 {o.delivery_address}
                                  </div>
                                </div>
                              ))}

                              {/* Tombol pickup per warung */}
                              {!allPickedUp && (
                                <button
                                  onClick={() => {
                                    const unpicked = orders.find(o => !o.mitra_picked_up_from_merchant_at)
                                    if (unpicked) handlePickupFromMerchant(unpicked.id)
                                  }}
                                  disabled={pickingUp !== null}
                                  style={{
                                    width: '100%', padding: '11px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                    background: pickingUp !== null ? 'var(--k-border)' : 'rgba(159,122,234,0.15)',
                                    color: pickingUp !== null ? 'var(--k-sub)' : '#9F7AEA',
                                    fontWeight: 700, fontSize: 13, marginTop: 12,
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
                /* ── Belum ada sesi ── */
                <div>
                  <div style={{
                    padding: '14px 16px', borderRadius: 14, marginBottom: 20,
                    background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#F97316', marginBottom: 4 }}>Apa itu Sesi Kuliner?</div>
                    <div style={{ fontSize: 12, color: 'var(--k-sub)', lineHeight: 1.6 }}>
                      Buka sesi dengan rute tertentu. Pelanggan bisa memesan dari warung-warung dalam koridor rute kamu,
                      berbagi ongkir bersama. Kamu keliling warung, pickup semua, lalu antar satu per satu.
                    </div>
                  </div>

                  {/* Form buka sesi */}
                  <div style={{
                    padding: '20px', borderRadius: 16, background: 'var(--k-card)',
                    border: '1.5px solid var(--k-border)',
                  }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18 }}>Buka Sesi Kuliner</div>

                    {/* Lokasi awal */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', display: 'block', marginBottom: 6 }}>
                        Lokasi Awal (posisi kamu sekarang)
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          value={sessionForm.origin_address}
                          onChange={e => setSessionForm(f => ({ ...f, origin_address: e.target.value }))}
                          placeholder="Nama atau alamat lokasi awal..."
                          style={{
                            flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 13,
                            border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)',
                          }}
                        />
                        <button
                          onClick={getGps}
                          disabled={gettingGps}
                          style={{
                            padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: sessionForm.origin_lat ? 'rgba(0,200,150,0.15)' : 'var(--k-input)',
                            color: sessionForm.origin_lat ? '#00C896' : 'var(--k-sub)',
                            fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
                          }}>
                          {gettingGps ? '...' : sessionForm.origin_lat ? '✓ GPS' : '📍 GPS'}
                        </button>
                      </div>
                    </div>

                    {/* Tujuan rute */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', display: 'block', marginBottom: 6 }}>
                        Area / Tujuan Rute
                      </label>
                      <input
                        value={sessionForm.destination_address}
                        onChange={e => setSessionForm(f => ({ ...f, destination_address: e.target.value }))}
                        placeholder="cth: Perumahan Griya Utama, Kel. Sukamaju..."
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, boxSizing: 'border-box',
                          border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)',
                        }}
                      />
                    </div>

                    {/* Koridor & maks order */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', display: 'block', marginBottom: 6 }}>
                          Lebar Koridor
                        </label>
                        <select
                          value={sessionForm.corridor_width}
                          onChange={e => setSessionForm(f => ({ ...f, corridor_width: e.target.value }))}
                          style={{
                            width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                            border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)',
                          }}>
                          <option value={500}>500m</option>
                          <option value={1000}>1 km</option>
                          <option value={1500}>1.5 km</option>
                          <option value={2000}>2 km</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', display: 'block', marginBottom: 6 }}>
                          Maks Order
                        </label>
                        <select
                          value={sessionForm.max_orders}
                          onChange={e => setSessionForm(f => ({ ...f, max_orders: e.target.value }))}
                          style={{
                            width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                            border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)',
                          }}>
                          {[3, 4, 5, 6, 7, 8, 10].map(n => (
                            <option key={n} value={n}>{n} order</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleStartSession}
                      disabled={startingSession}
                      style={{
                        width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: startingSession ? 'var(--k-border)' : '#F97316',
                        color: '#fff', fontWeight: 800, fontSize: 15,
                      }}>
                      {startingSession ? 'Memulai sesi...' : '🚀 Mulai Sesi Kuliner'}
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Tab: Riwayat */}
            {tab === 'history' && (
              history.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--k-sub)', padding: '40px 0' }}>Belum ada riwayat.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {history.map(order => {
                    const sm = STATUS_META[order.status]
                    return (
                      <div key={order.id} style={{
                        padding: '14px 18px', borderRadius: 14, background: 'var(--k-card)',
                        border: '1.5px solid var(--k-border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>#{order.order_number}</div>
                          <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>{order.merchant?.name} · {fmtTime(order.created_at)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: sm?.color, background: sm?.bg }}>{sm?.label}</span>
                          {order.status === 'completed' && (
                            <div style={{ fontSize: 12, color: '#F97316', fontWeight: 700, marginTop: 4 }}>{fmtRp(order.mitra_income)}</div>
                          )}
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
