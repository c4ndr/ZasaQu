import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'

const STATUS_INFO = {
  pending:    { label: 'Menunggu Konfirmasi', color: '#F6AD55', emoji: '⏳' },
  confirmed:  { label: 'Dikonfirmasi',        color: '#6366F1', emoji: '✅' },
  picked_up:  { label: 'Sudah Dijemput',      color: '#6366F1', emoji: '🚚' },
  processing: { label: 'Sedang Diproses',     color: '#F97316', emoji: '⚙️' },
  ready:      { label: 'Siap Diantar',        color: '#00C896', emoji: '📦' },
  delivering: { label: 'Sedang Diantar',      color: '#6366F1', emoji: '🚗' },
  completed:  { label: 'Selesai',             color: '#00C896', emoji: '✓' },
  cancelled:  { label: 'Dibatalkan',          color: '#F56565', emoji: '✗' },
}

const UNIT_LABEL = { kg: 'kg', item: 'item', jam: 'jam', sesi: 'sesi' }

export default function HomeOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order,   setOrder]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    api.get(`/home/orders/${id}`)
      .then(r => setOrder(r.data.data))
      .catch(() => navigate('/home/orders'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleCancel() {
    if (!confirm('Batalkan pesanan ini?')) return
    setCancelling(true)
    try {
      const res = await api.post(`/home/orders/${id}/cancel`)
      setOrder(res.data.data)
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membatalkan.')
    } finally { setCancelling(false) }
  }

  if (loading || !order) return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--k-muted)' }}>{loading ? 'Memuat...' : 'Pesanan tidak ditemukan.'}</p>
    </div>
  )

  const si = STATUS_INFO[order.status] ?? { label: order.status, color: '#A0A0BC', emoji: '?' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      <div style={{ padding: '52px 20px 20px', background: 'linear-gradient(160deg,#0F1E25 0%,var(--k-bg) 100%)' }}>
        <button onClick={() => navigate('/home/orders')} style={{ background: 'none', border: 'none', color: 'var(--k-muted)', fontSize: 14, cursor: 'pointer', marginBottom: 12, padding: 0 }}>
          ← Pesanan Saya
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Detail Pesanan</h1>
        <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>{order.order_number}</p>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Status */}
        <div style={{ background: 'var(--k-card)', border: `1.5px solid ${si.color}30`, borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: `${si.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
            {si.emoji}
          </div>
          <div>
            <p style={{ fontWeight: 700, color: si.color, fontSize: 15 }}>{si.label}</p>
            <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>
              {new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
            {order.cancel_reason && <p style={{ fontSize: 12, color: '#F56565', marginTop: 4 }}>Alasan: {order.cancel_reason}</p>}
          </div>
        </div>

        {/* Provider */}
        <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 4 }}>Provider</p>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--k-text)' }}>{order.provider?.name}</p>
          <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{order.provider?.address}</p>
          {order.provider?.phone && <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 4 }}>📞 {order.provider.phone}</p>}
        </div>

        {/* Items */}
        <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: 16 }}>
          <p style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Layanan</p>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: i < order.items.length-1 ? 10 : 0 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)' }}>{item.service_name}</p>
                <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{item.quantity} {UNIT_LABEL[item.unit]} × Rp {item.price.toLocaleString('id')}</p>
              </div>
              <p style={{ fontWeight: 700, fontSize: 14 }}>Rp {item.subtotal.toLocaleString('id')}</p>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--k-border)', paddingTop: 10, marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontWeight: 700 }}>Total</p>
            <p style={{ fontWeight: 800, color: '#6366F1', fontSize: 16 }}>Rp {order.total_price.toLocaleString('id')}</p>
          </div>
        </div>

        {/* Pickup address */}
        <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 4 }}>Alamat Pickup</p>
          <p style={{ fontSize: 14, color: 'var(--k-text)' }}>📍 {order.pickup_address}</p>
          {order.notes && <p style={{ fontSize: 13, color: 'var(--k-muted)', marginTop: 8 }}>📝 {order.notes}</p>}
        </div>

        {/* Cancel button */}
        {['pending', 'confirmed'].includes(order.status) && (
          <button onClick={handleCancel} disabled={cancelling} style={{
            padding: '13px', borderRadius: 14, border: '1.5px solid rgba(245,101,101,0.4)',
            background: 'rgba(245,101,101,0.06)', color: '#F56565',
            fontWeight: 700, fontSize: 14, cursor: cancelling ? 'default' : 'pointer',
          }}>
            {cancelling ? 'Membatalkan...' : 'Batalkan Pesanan'}
          </button>
        )}
      </div>
    </div>
  )
}
