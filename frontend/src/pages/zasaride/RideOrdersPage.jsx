import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n)

const STATUS_BADGE = {
  pending:   { label: 'Mencari Driver', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  accepted:  { label: 'Driver Menuju',  color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  on_pickup: { label: 'Driver Tiba',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  on_ride:   { label: 'Dalam Perjalanan', color: '#00C896', bg: 'rgba(0,200,150,0.1)' },
  completed: { label: 'Selesai',        color: '#00C896', bg: 'rgba(0,200,150,0.1)' },
  cancelled: { label: 'Dibatalkan',     color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
}

function OrderCard({ order }) {
  const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending
  const date  = new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <div style={{
      background: 'var(--k-card)', border: '1px solid var(--k-border)',
      borderRadius: 16, padding: '14px 16px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 12, color: 'var(--k-muted)', fontFamily: 'monospace' }}>#{order.order_number}</p>
        <div style={{
          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100,
          color: badge.color, background: badge.bg,
        }}>{badge.label}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 14 }}>📍</span>
          <p style={{ fontSize: 13, color: 'var(--k-text)', flex: 1 }}>{order.pickup_address}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🏁</span>
          <p style={{ fontSize: 13, color: 'var(--k-text)', flex: 1 }}>{order.destination_address}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--k-muted)' }}>
            {order.vehicle_type === 'mobil' ? '🚗' : '🏍️'} {order.vehicle_type === 'mobil' ? 'Mobil' : 'Motor'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--k-muted)' }}>{order.distance_km} km</span>
          <span style={{ fontSize: 12, color: 'var(--k-muted)' }}>{date}</span>
        </div>
        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--k-accent)' }}>Rp {fmt(order.fare)}</p>
      </div>
    </div>
  )
}

export default function RideOrdersPage() {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [meta,    setMeta]    = useState(null)

  useEffect(() => {
    setLoading(true)
    api.get('/ride/orders', { params: { page } })
      .then(r => { setOrders(r.data.data || []); setMeta(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', color: 'var(--k-text)', fontFamily: 'system-ui,sans-serif' }}>
      <nav style={{
        background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <Link to="/ride" style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--k-card)', border: '1px solid var(--k-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--k-muted)', textDecoration: 'none', fontSize: 18,
        }}>←</Link>
        <p style={{ fontWeight: 800, fontSize: 16 }}>Riwayat ZasaRide</p>
      </nav>

      <div style={{ padding: '16px 16px 32px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 28, height: 28, border: '2.5px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>🚗</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--k-text)', marginBottom: 6 }}>Belum ada perjalanan</p>
            <p style={{ fontSize: 13, color: 'var(--k-muted)', marginBottom: 20 }}>Mulai perjalanan pertamamu!</p>
            <Link to="/ride" style={{
              background: 'var(--k-accent)', color: '#0C0C16', textDecoration: 'none',
              padding: '12px 24px', borderRadius: 14, fontWeight: 700, fontSize: 14,
            }}>Pesan ZasaRide</Link>
          </div>
        ) : (
          <>
            {orders.map(o => <OrderCard key={o.id} order={o} />)}
            {meta && meta.current_page < meta.last_page && (
              <button onClick={() => setPage(p => p + 1)} style={{
                width: '100%', padding: '12px', borderRadius: 14, marginTop: 8,
                background: 'var(--k-card)', border: '1px solid var(--k-border)',
                color: 'var(--k-text)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Muat lebih banyak</button>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
