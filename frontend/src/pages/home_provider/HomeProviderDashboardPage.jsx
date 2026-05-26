import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const STATUS_INFO = {
  pending:    { label: 'Menunggu',      color: '#F6AD55', next: [{ status: 'confirmed', label: '✓ Konfirmasi' }, { status: 'cancelled', label: '✗ Tolak', danger: true }] },
  confirmed:  { label: 'Dikonfirmasi', color: '#6366F1', next: [{ status: 'picked_up', label: '🚚 Sudah Dijemput' }] },
  picked_up:  { label: 'Dijemput',     color: '#6366F1', next: [{ status: 'processing', label: '⚙️ Mulai Proses' }] },
  processing: { label: 'Diproses',     color: '#F97316', next: [{ status: 'ready', label: '📦 Selesai, Siap Antar' }] },
  ready:      { label: 'Siap',         color: '#00C896', next: [{ status: 'completed', label: '✓ Selesai' }] },
  delivering: { label: 'Diantar',      color: '#6366F1', next: [{ status: 'completed', label: '✓ Selesai' }] },
  completed:  { label: 'Selesai',      color: '#00C896', next: [] },
  cancelled:  { label: 'Dibatalkan',   color: '#F56565', next: [] },
}

const STATUS_TABS = [
  { value: '',           label: 'Semua' },
  { value: 'pending',    label: 'Baru' },
  { value: 'confirmed',  label: 'Konfirmasi' },
  { value: 'processing', label: 'Proses' },
  { value: 'ready',      label: 'Siap' },
  { value: 'completed',  label: 'Selesai' },
]

export default function HomeProviderDashboardPage() {
  const navigate = useNavigate()
  const [provider, setProvider] = useState(null)
  const [orders,   setOrders]   = useState([])
  const [tab,      setTab]      = useState('')
  const [loading,  setLoading]  = useState(true)
  const [toast,    setToast]    = useState(null)

  useEffect(() => {
    api.get('/home/provider/profile')
      .then(r => setProvider(r.data.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = tab ? `?status=${tab}` : ''
    api.get('/home/provider/orders' + params)
      .then(r => setOrders(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab])

  async function handleToggleOpen() {
    try {
      const res = await api.post('/home/provider/toggle-open')
      setProvider(p => ({ ...p, is_open: res.data.is_open }))
      showToast('success', res.data.message)
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal.') }
  }

  async function updateStatus(orderId, status, cancelReason) {
    try {
      const res = await api.patch(`/home/provider/orders/${orderId}/status`, { status, cancel_reason: cancelReason })
      setOrders(os => os.map(o => o.id === orderId ? res.data.data : o))
      showToast('success', 'Status diperbarui.')
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal.') }
  }

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ padding: '52px 20px 20px', background: 'linear-gradient(160deg,#0F1E25 0%,var(--k-bg) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Dashboard</h1>
            <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>{provider?.name ?? 'ZasaHome Provider'}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {provider?.status === 'active' && (
              <button onClick={handleToggleOpen} style={{
                padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                background: provider?.is_open ? 'rgba(245,101,101,0.12)' : 'rgba(0,200,150,0.12)',
                color: provider?.is_open ? '#F56565' : '#00C896',
              }}>
                {provider?.is_open ? 'Tutup' : 'Buka'}
              </button>
            )}
            <button onClick={() => navigate('/home/provider/settings')} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-muted)', fontSize: 13, cursor: 'pointer' }}>
              ⚙️
            </button>
          </div>
        </div>

        {provider?.status === 'pending' && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(246,173,85,0.1)', border: '1px solid rgba(246,173,85,0.3)', fontSize: 13, color: '#F6AD55' }}>
            ⏳ Akun Anda sedang menunggu persetujuan admin.
          </div>
        )}
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 12px', WebkitOverflowScrolling: 'touch' }}>
        {STATUS_TABS.map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
            style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: tab === t.value ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : 'var(--k-card)',
              color: tab === t.value ? '#fff' : 'var(--k-sub)',
              position: 'relative',
            }}>
            {t.label}
            {t.value === 'pending' && pendingCount > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: '#F56565', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading ? (
          [1,2,3].map(i => <div key={i} style={{ height: 100, borderRadius: 14, background: 'var(--k-card)', marginBottom: 10, animation: 'pulse 1.5s infinite' }} />)
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--k-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
            <p style={{ fontWeight: 600 }}>Belum ada pesanan</p>
          </div>
        ) : orders.map(order => (
          <OrderCard key={order.id} order={order} onUpdateStatus={updateStatus} />
        ))}
      </div>
    </div>
  )
}

function OrderCard({ order, onUpdateStatus }) {
  const [expanded, setExpanded] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const si = STATUS_INFO[order.status] ?? { label: order.status, color: '#A0A0BC', next: [] }

  async function handleNext(nextStatus) {
    let reason = null
    if (nextStatus === 'cancelled') {
      reason = prompt('Alasan pembatalan:') ?? 'Dibatalkan oleh provider'
    }
    setCancelling(true)
    await onUpdateStatus(order.id, nextStatus, reason)
    setCancelling(false)
  }

  return (
    <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
      <button onClick={() => setExpanded(e => !e)} style={{ width: '100%', textAlign: 'left', padding: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{order.order_number}</p>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${si.color}15`, color: si.color }}>
            {si.label}
          </span>
        </div>
        <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--k-text)', marginBottom: 2 }}>{order.customer?.name}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{new Date(order.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#6366F1' }}>Rp {order.total_price.toLocaleString('id')}</p>
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--k-border)', padding: '12px 14px' }}>
          {/* Items */}
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 13, color: 'var(--k-text)' }}>{item.service_name} × {item.quantity} {item.unit}</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>Rp {item.subtotal.toLocaleString('id')}</p>
            </div>
          ))}
          <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 8 }}>📍 {order.pickup_address}</p>
          {order.notes && <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 4 }}>📝 {order.notes}</p>}

          {/* Action buttons */}
          {si.next.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {si.next.map(n => (
                <button key={n.status} onClick={() => handleNext(n.status)} disabled={cancelling}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                    background: n.danger ? 'rgba(245,101,101,0.1)' : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                    color: n.danger ? '#F56565' : '#fff',
                  }}>
                  {n.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
