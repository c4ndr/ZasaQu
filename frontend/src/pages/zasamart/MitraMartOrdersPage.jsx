import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import api from '../../services/api'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtTime = (d) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const STORAGE  = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')

const STATUS_META = {
  packed:      { label: 'Siap Diambil',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  picking_up:  { label: 'Menuju Toko',     color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  on_delivery: { label: 'Sedang Antar',    color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
  delivered:   { label: 'Terkirim',        color: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
  completed:   { label: 'Selesai',         color: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
  cancelled:   { label: 'Dibatalkan',      color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
}

const NEXT_STATUS = {
  picking_up:  { label: '✅ Sudah di Toko — Ambil Pesanan', value: 'on_delivery', color: '#6366F1' },
  on_delivery: { label: '🏁 Sudah Diantar ke Customer',     value: 'delivered',   color: '#22C55E' },
}

function MapsLink({ label, lat, lng }) {
  if (!lat || !lng) return <span style={{ fontSize: 12, color: 'var(--k-sub)' }}>{label}</span>
  return (
    <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
       target="_blank" rel="noopener noreferrer"
       style={{ fontSize: 12, color: '#6366F1', textDecoration: 'none' }}>
      📍 {label}
    </a>
  )
}

export default function MitraMartOrdersPage() {
  const navigate    = useNavigate()
  const [tab,       setTab]       = useState('available') // available | active
  const [available, setAvailable] = useState([])
  const [myOrders,  setMyOrders]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [accepting, setAccepting] = useState(null)
  const [updating,  setUpdating]  = useState(null)
  const [toast,     setToast]     = useState(null)

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [avRes, myRes] = await Promise.all([
        api.get('/mart/mitra/orders/available'),
        api.get('/mart/mitra/orders/my'),
      ])
      setAvailable(avRes.data ?? [])
      setMyOrders(myRes.data ?? [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-switch ke active jika ada order aktif
  useEffect(() => {
    if (myOrders.length > 0) setTab('active')
  }, [myOrders.length])

  const accept = async (id) => {
    setAccepting(id)
    try {
      await api.post(`/mart/mitra/orders/${id}/accept`)
      showToast('success', 'Pesanan diterima! Segera menuju toko.')
      await load()
      setTab('active')
    } catch (e) {
      showToast('error', e.response?.data?.message || 'Gagal menerima pesanan.')
    } finally { setAccepting(null) }
  }

  const updateStatus = async (id, status) => {
    setUpdating(id)
    try {
      await api.patch(`/mart/mitra/orders/${id}/status`, { status })
      showToast('success', status === 'delivered' ? 'Pesanan berhasil diantar! 🎉' : 'Status diperbarui.')
      await load()
    } catch (e) {
      showToast('error', e.response?.data?.message || 'Gagal update status.')
    } finally { setUpdating(null) }
  }

  const hasActive = myOrders.length > 0

  return (
    <div style={{ background: 'var(--k-bg)', minHeight: '100dvh', paddingBottom: 80 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '52px 16px 0', background: 'linear-gradient(160deg,#1a1a2e 0%,var(--k-bg) 100%)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--k-text)', marginBottom: 4 }}>ZasaShop Kurir</h1>
        <p style={{ fontSize: 13, color: 'var(--k-muted)', marginBottom: 16 }}>Antar pesanan belanja ke customer</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)' }}>
        {[
          { key: 'available', label: `Tersedia (${available.length})` },
          { key: 'active',    label: `Aktif${hasActive ? ` (${myOrders.length})` : ''}` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? '#6366F1' : 'var(--k-muted)', borderBottom: tab === t.key ? '2px solid #6366F1' : '2px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '14px 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 24, height: 24, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : tab === 'available' ? (
          available.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>Tidak ada pesanan tersedia</p>
              <p style={{ fontSize: 12 }}>Pesanan akan muncul ketika seller sudah mengemas barang</p>
              <button onClick={load} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>🔄 Refresh</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {available.map(order => {
                const sm = STATUS_META[order.status] ?? { label: order.status, color: '#888', bg: 'transparent' }
                return (
                  <div key={order.id} style={{ background: 'var(--k-card)', borderRadius: 16, border: '1px solid var(--k-border)', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 14px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {order.seller?.logo_path
                            ? <img src={`${STORAGE}/${order.seller.logo_path}`} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
                            : <div style={{ width: 32, height: 32, borderRadius: 8, background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏪</div>
                          }
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{order.seller?.name}</p>
                            <p style={{ fontSize: 10, color: 'var(--k-muted)' }}>{order.order_number}</p>
                          </div>
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 800, color: '#6366F1' }}>{fmtRp(order.total)}</p>
                      </div>

                      {/* Items summary */}
                      <p style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 8 }}>
                        {order.items?.length ?? 0} produk · dikemas {fmtTime(order.packed_at || order.updated_at)}
                      </p>

                      {/* Locations */}
                      <div style={{ background: 'var(--k-card2)', borderRadius: 10, padding: '8px 10px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>🏪</span>
                          <MapsLink label={order.seller?.address || 'Alamat toko'} lat={order.seller_lat} lng={order.seller_lng} />
                        </div>
                        <div style={{ width: 1, height: 10, background: 'var(--k-border)', marginLeft: 10 }} />
                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>📦</span>
                          <MapsLink label={order.delivery_address} lat={order.delivery_lat} lng={order.delivery_lng} />
                        </div>
                      </div>

                      <button onClick={() => accept(order.id)} disabled={!!accepting || hasActive}
                        style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: (accepting || hasActive) ? 'var(--k-border)' : 'linear-gradient(135deg,#6366F1,#7C3AED)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: (accepting || hasActive) ? 'not-allowed' : 'pointer' }}>
                        {accepting === order.id ? '⏳ Memproses...' : hasActive ? '⚠️ Selesaikan order aktif dulu' : '✅ Terima Pesanan Ini'}
                      </button>
                    </div>
                  </div>
                )
              })}
              <button onClick={load} style={{ padding: '10px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'none', color: 'var(--k-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🔄 Refresh</button>
            </div>
          )
        ) : (
          // Active orders tab
          myOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛵</div>
              <p style={{ fontWeight: 600 }}>Tidak ada pengiriman aktif</p>
              <p style={{ fontSize: 12, marginTop: 6 }}>Ambil pesanan dari tab Tersedia</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myOrders.map(order => {
                const sm   = STATUS_META[order.status] ?? { label: order.status, color: '#888', bg: 'transparent' }
                const next = NEXT_STATUS[order.status]
                return (
                  <div key={order.id} style={{ background: 'var(--k-card)', borderRadius: 16, border: `2px solid ${sm.color}40`, overflow: 'hidden' }}>
                    <div style={{ background: sm.bg, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: sm.color }}>{sm.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>{order.order_number}</span>
                    </div>

                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--k-text)' }}>{order.seller?.name}</p>
                          <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{order.items?.length ?? 0} produk</p>
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 800, color: '#6366F1' }}>{fmtRp(order.total)}</p>
                      </div>

                      <div style={{ background: 'var(--k-card2)', borderRadius: 10, padding: '10px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 2 }}>JEMPUT DI</p>
                          <MapsLink label={order.seller?.address || 'Alamat toko'} lat={order.seller_lat} lng={order.seller_lng} />
                        </div>
                        <div style={{ borderTop: '1px solid var(--k-border)', paddingTop: 8 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 2 }}>ANTAR KE</p>
                          <MapsLink label={order.delivery_address} lat={order.delivery_lat} lng={order.delivery_lng} />
                          {order.customer?.name && <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 2 }}>👤 {order.customer.name} {order.delivery_phone ? `· ${order.delivery_phone}` : ''}</p>}
                        </div>
                      </div>

                      {order.notes && (
                        <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 10, fontStyle: 'italic' }}>📝 "{order.notes}"</p>
                      )}

                      {next && (
                        <button onClick={() => updateStatus(order.id, next.value)} disabled={updating === order.id}
                          style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: updating === order.id ? 'var(--k-border)' : next.color, color: '#fff', fontWeight: 800, fontSize: 14, cursor: updating === order.id ? 'not-allowed' : 'pointer' }}>
                          {updating === order.id ? '⏳ Memproses...' : next.label}
                        </button>
                      )}

                      {order.status === 'delivered' && (
                        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center' }}>
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
      </div>

      <BottomNav />
    </div>
  )
}
