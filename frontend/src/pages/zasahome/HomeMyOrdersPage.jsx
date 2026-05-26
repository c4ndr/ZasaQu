import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const STATUS_INFO = {
  pending:    { label: 'Menunggu',      color: '#F6AD55' },
  confirmed:  { label: 'Dikonfirmasi', color: '#6366F1' },
  picked_up:  { label: 'Dijemput',     color: '#6366F1' },
  processing: { label: 'Diproses',     color: '#F97316' },
  ready:      { label: 'Siap',         color: '#00C896' },
  delivering: { label: 'Diantar',      color: '#6366F1' },
  completed:  { label: 'Selesai',      color: '#00C896' },
  cancelled:  { label: 'Dibatalkan',   color: '#F56565' },
}

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
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      <div style={{ padding: '52px 20px 20px', background: 'linear-gradient(160deg,#0F1E25 0%,var(--k-bg) 100%)' }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: 'var(--k-muted)', fontSize: 14, cursor: 'pointer', marginBottom: 12, padding: 0 }}>
          ← ZasaHome
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--k-text)' }}>Pesanan Saya</h1>
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading ? (
          [1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: 14, background: 'var(--k-card)', marginBottom: 10, animation: 'pulse 1.5s infinite' }} />)
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p style={{ fontWeight: 600 }}>Belum ada pesanan</p>
            <button onClick={() => navigate('/home')} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700 }}>
              Cari Layanan
            </button>
          </div>
        ) : orders.map(order => {
          const si = STATUS_INFO[order.status] ?? { label: order.status, color: '#A0A0BC' }
          return (
            <button key={order.id} onClick={() => navigate(`/home/orders/${order.id}`)}
              style={{ width: '100%', textAlign: 'left', background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14, padding: 14, marginBottom: 10, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{order.order_number}</p>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${si.color}15`, color: si.color }}>
                  {si.label}
                </span>
              </div>
              <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--k-text)', marginBottom: 4 }}>{order.provider?.name}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>
                  {new Date(order.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#6366F1' }}>Rp {order.total_price.toLocaleString('id')}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
