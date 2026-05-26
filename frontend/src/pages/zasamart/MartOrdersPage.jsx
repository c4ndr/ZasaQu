import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
const STORAGE = import.meta.env.VITE_STORAGE_URL

const STATUS_TABS = [
  { value: '', label: 'Semua' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'confirmed', label: 'Dikonfirmasi' },
  { value: 'packed', label: 'Dikemas' },
  { value: 'on_delivery', label: 'Dikirim' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Batal' },
]

const STATUS_META = {
  pending:     { label: 'Menunggu',    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  confirmed:   { label: 'Dikonfirmasi', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  packed:      { label: 'Dikemas',     color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  picking_up:  { label: 'Dijemput',   color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
  on_delivery: { label: 'Dikirim',    color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
  delivered:   { label: 'Terkirim',   color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  completed:   { label: 'Selesai',    color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  cancelled:   { label: 'Dibatalkan', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
}

export default function MartOrdersPage() {
  const navigate = useNavigate()
  const [tab, setTab]       = useState('')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/mart/orders', { params: { status: tab || undefined } })
      .then(r => setOrders(r.data.data))
      .finally(() => setLoading(false))
  }, [tab])

  return (
    <div style={{ background: 'var(--k-bg)', minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: 'var(--k-text)' }}>←</button>
        <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--k-text)' }}>Pesanan Saya</p>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 0, overflowX: 'auto', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', scrollbarWidth: 'none' }}>
        {STATUS_TABS.map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
            style={{ padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.value ? 700 : 500, color: tab === t.value ? '#6366F1' : 'var(--k-muted)', borderBottom: tab === t.value ? '2px solid #6366F1' : '2px solid transparent', whiteSpace: 'nowrap', transition: 'all 0.18s' }}>
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
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 14, fontWeight: 600 }}>Belum ada pesanan</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.map(order => {
              const sm = STATUS_META[order.status] ?? { label: order.status, color: '#888', bg: '#eee' }
              const firstItem = order.items?.[0]
              return (
                <div key={order.id} onClick={() => navigate(`/mart/orders/${order.id}`)}
                  style={{ background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', padding: '14px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-text)' }}>{order.seller?.name}</p>
                      <p style={{ fontSize: 10, color: 'var(--k-muted)', marginTop: 1 }}>{order.order_number} · {fmtDate(order.created_at)}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: sm.bg, color: sm.color }}>{sm.label}</span>
                  </div>
                  {firstItem && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
                        {firstItem.product_image
                          ? <img src={`${STORAGE}/${firstItem.product_image}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🛍️</div>
                        }
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-text)' }}>{firstItem.product_name}</p>
                        {order.items.length > 1 && <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>+{order.items.length - 1} produk lainnya</p>}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{order.items?.length ?? 0} produk</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#6366F1' }}>{fmtRp(order.total)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
