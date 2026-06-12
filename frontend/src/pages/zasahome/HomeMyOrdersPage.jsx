import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { STATUS_META } from '../../utils/homeServiceConfig'

export default function HomeMyOrdersPage() {
  const navigate = useNavigate()
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('active') // active | done

  useEffect(() => {
    api.get('/home/orders')
      .then(r => setOrders(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const active = orders.filter(o => !['completed','cancelled'].includes(o.status))
  const done   = orders.filter(o =>  ['completed','cancelled'].includes(o.status))
  const list   = tab === 'active' ? active : done

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#4c1d95 100%)', padding: '52px 20px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <button onClick={() => navigate('/home')} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: '6px 14px', borderRadius: 20 }}>
          ← ZasaHome
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 4 }}>Pesanan Saya</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{orders.length} total pesanan</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)' }}>
        {[
          { key: 'active', label: 'Berlangsung', count: active.length },
          { key: 'done',   label: 'Riwayat',     count: done.length   },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '13px 4px 11px', border: 'none', cursor: 'pointer', background: 'transparent',
            color: tab === t.key ? '#6366F1' : 'var(--k-sub)',
            borderBottom: tab === t.key ? '2.5px solid #6366F1' : '2.5px solid transparent',
            fontWeight: tab === t.key ? 700 : 400, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {t.label}
            {t.count > 0 && (
              <span style={{ fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 20, background: tab === t.key ? '#6366F1' : 'var(--k-input)', color: tab === t.key ? '#fff' : 'var(--k-muted)' }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 130, borderRadius: 20, background: 'linear-gradient(90deg,var(--k-card) 25%,var(--k-input) 50%,var(--k-card) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-muted)', animation: 'fadeUp 0.4s ease' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{tab === 'active' ? '📋' : '🕐'}</div>
            <p style={{ fontWeight: 700, color: 'var(--k-text)', marginBottom: 8 }}>
              {tab === 'active' ? 'Belum ada pesanan aktif' : 'Belum ada riwayat'}
            </p>
            {tab === 'active' && (
              <button onClick={() => navigate('/home')} style={{ marginTop: 8, padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700 }}>
                Cari Layanan
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.3s ease' }}>
            {list.map(order => <OrderCard key={order.id} order={order} onClick={() => navigate(`/home/orders/${order.id}`)} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function OrderCard({ order, onClick }) {
  const si = STATUS_META[order.status] ?? { label: order.status, color: '#A0A0BC', bg: 'rgba(160,160,188,0.12)', icon: '?' }
  const isActive = !['completed','cancelled'].includes(order.status)

  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', background: 'var(--k-card)',
      border: isActive ? `1.5px solid ${si.color}50` : '1px solid var(--k-border)',
      borderRadius: 20, padding: 0, cursor: 'pointer', overflow: 'hidden',
      boxShadow: isActive ? `0 4px 20px ${si.color}18` : '0 1px 6px rgba(0,0,0,0.04)',
    }}>
      {/* Status bar top */}
      <div style={{ height: 4, background: si.color, opacity: isActive ? 1 : 0.4 }} />

      <div style={{ padding: '14px 16px' }}>
        {/* Row 1: status + date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: si.bg, color: si.color }}>
            {si.icon} {si.label}
          </span>
          <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>
            {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* Row 2: provider name */}
        <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--k-text)', marginBottom: 2 }}>{order.provider?.name}</p>
        <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: order.scheduled_pickup_at ? 8 : 10, fontFamily: 'monospace' }}>#{order.order_number}</p>

        {/* Jadwal on-site */}
        {order.scheduled_pickup_at && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', marginBottom: 10 }}>
            <span style={{ fontSize: 12 }}>🕐</span>
            <span style={{ fontSize: 12, color: '#6366F1', fontWeight: 600 }}>
              {new Date(order.scheduled_pickup_at).toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Items preview */}
        {order.items?.length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 10, lineHeight: 1.4 }}>
            {order.items.map(i => `${i.service_name} (${i.quantity} ${i.unit})`).join(' · ')}
          </p>
        )}

        {/* Row bottom: count + total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--k-border)' }}>
          <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{order.items?.length ?? 0} layanan</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#6366F1' }}>Rp {order.total_price.toLocaleString('id')}</p>
        </div>
      </div>
    </button>
  )
}
