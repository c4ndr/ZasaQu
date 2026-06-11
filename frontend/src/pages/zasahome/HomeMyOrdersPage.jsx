import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { STATUS_META } from '../../utils/homeServiceConfig'

export default function HomeMyOrdersPage() {
  const navigate = useNavigate()
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/home/orders')
      .then(r => setOrders(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      <div style={{ padding: '52px 20px 20px', background: 'linear-gradient(160deg,#0F1E25 0%,var(--k-bg) 100%)' }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: 'var(--k-muted)', fontSize: 14, cursor: 'pointer', marginBottom: 12, padding: 0 }}>
          ← ZasaHome
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--k-text)' }}>Pesanan Saya</h1>
        <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>{orders.length} pesanan</p>
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading ? (
          [1,2,3].map(i => <div key={i} style={{ height: 100, borderRadius: 16, background: 'var(--k-card)', marginBottom: 12, animation: 'pulse 1.5s infinite' }} />)
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p style={{ fontWeight: 600 }}>Belum ada pesanan</p>
            <button onClick={() => navigate('/home')} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700 }}>
              Cari Layanan
            </button>
          </div>
        ) : orders.map(order => {
          const si = STATUS_META[order.status] ?? { label: order.status, color: '#A0A0BC', bg: 'rgba(160,160,188,0.12)', icon: '?' }
          const isActive = !['completed', 'cancelled'].includes(order.status)
          return (
            <button key={order.id} onClick={() => navigate(`/home/orders/${order.id}`)}
              style={{
                width: '100%', textAlign: 'left', background: 'var(--k-card)',
                border: isActive ? `1.5px solid ${si.color}40` : '1px solid var(--k-border)',
                borderRadius: 16, padding: 16, marginBottom: 12, cursor: 'pointer',
              }}>
              {/* Status banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: si.bg, color: si.color }}>
                  {si.icon} {si.label}
                </span>
                <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>
                  {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              {/* Provider name + order number */}
              <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--k-text)', marginBottom: 2 }}>{order.provider?.name}</p>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 8 }}>{order.order_number}</p>

              {/* Scheduled time jika ada */}
              {order.scheduled_pickup_at && (
                <p style={{ fontSize: 12, color: '#6366F1', fontWeight: 600, marginBottom: 4 }}>
                  🕐 {new Date(order.scheduled_pickup_at).toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}

              {/* Items summary */}
              {order.items?.length > 0 && (
                <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 8 }}>
                  {order.items.map(i => `${i.service_name} (${i.quantity} ${i.unit})`).join(', ')}
                </p>
              )}

              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{order.items?.length ?? 0} layanan</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#6366F1' }}>Rp {order.total_price.toLocaleString('id')}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
