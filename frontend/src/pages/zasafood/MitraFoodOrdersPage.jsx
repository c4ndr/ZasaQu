import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import api from '../../services/api'

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

export default function MitraFoodOrdersPage() {
  const navigate  = useNavigate()
  const [available, setAvailable] = useState([])
  const [myOrders,  setMyOrders]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [accepting, setAccepting] = useState(null)
  const [updating,  setUpdating]  = useState(null)
  const [tab,       setTab]       = useState('active')
  const [toast,     setToast]     = useState(null)
  const pollRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const [avRes, myRes] = await Promise.all([
        api.get('/food/mitra/orders/available'),
        api.get('/food/mitra/orders/my'),
      ])
      setAvailable(avRes.data.data || [])
      setMyOrders(myRes.data.data || [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    pollRef.current = setInterval(load, 10000)
    return () => clearInterval(pollRef.current)
  }, [load])

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

  function showToast(type, msg) {
    setToast({ type, msg }); setTimeout(() => setToast(null), 3000)
  }

  const active  = myOrders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const history = myOrders.filter(o => ['completed', 'cancelled', 'rejected', 'delivered'].includes(o.status))

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
        <div style={{ display: 'flex', gap: 8, paddingBottom: 14 }}>
          {[['active','Aktif'], ['available','Tersedia'], ['history','Riwayat']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: tab === k ? 700 : 400, fontSize: 13,
              background: tab === k ? '#FF7A45' : 'var(--k-input)',
              color: tab === k ? '#fff' : 'var(--k-sub)',
            }}>
              {l}
              {k === 'available' && available.length > 0 && (
                <span style={{
                  marginLeft: 6, background: '#F56565', color: '#fff',
                  borderRadius: '50%', width: 18, height: 18, fontSize: 11, fontWeight: 800,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{available.length}</span>
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

                      {/* Merchant */}
                      <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(0,200,150,0.06)', marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 4 }}>📦 Ambil di</div>
                        <div style={{ fontWeight: 700 }}>{order.merchant?.name}</div>
                        <MapsLink address={order.merchant?.address} lat={order.merchant?.lat} lng={order.merchant?.lng} />
                      </div>

                      {/* Item ringkas */}
                      <div style={{ fontSize: 13, color: 'var(--k-sub)', marginBottom: 10 }}>
                        {order.items?.map(i => `${i.item_name} ×${i.quantity}`).join(', ')}
                      </div>

                      {/* Antar ke */}
                      <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 12 }}>
                        🎯 Antar ke: <MapsLink address={order.delivery_address} lat={order.delivery_lat} lng={order.delivery_lng} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#FF7A45', fontSize: 15 }}>{fmtRp(order.mitra_income)}</div>
                          <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>pendapatanmu</div>
                        </div>
                        <button
                          onClick={() => handleAccept(order.id)}
                          disabled={accepting === order.id}
                          style={{
                            padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: accepting === order.id ? 'var(--k-border)' : '#FF7A45',
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
                    background: '#FF7A45', color: '#fff', fontWeight: 700, cursor: 'pointer',
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
                            <div style={{ fontSize: 12, color: '#FF7A45', fontWeight: 700, marginTop: 4 }}>{fmtRp(order.mitra_income)}</div>
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
