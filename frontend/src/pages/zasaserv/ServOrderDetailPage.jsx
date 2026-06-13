import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'

const STATUS_STEPS = ['pending', 'confirmed', 'traveling', 'in_progress', 'completed']
const STATUS_LABEL = {
  pending:     '⏳ Menunggu konfirmasi teknisi',
  confirmed:   '✅ Dikonfirmasi — teknisi akan datang',
  traveling:   '🛵 Teknisi dalam perjalanan',
  in_progress: '🔧 Sedang dikerjakan',
  completed:   '🎉 Selesai',
  cancelled:   '❌ Dibatalkan',
}
const STATUS_COLOR = {
  pending: '#F59E0B', confirmed: '#3B82F6', travelling: '#8B5CF6',
  in_progress: '#EC4899', completed: '#22C55E', cancelled: '#EF4444',
}

function fmt(n) { return 'Rp ' + Number(n).toLocaleString('id') }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-' }
const UNIT_LABEL = { item: 'item', jam: 'jam', sesi: 'sesi', titik: 'titik', meter: 'meter' }

export default function ServOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order,    setOrder]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [canceling,setCanceling]= useState(false)
  const [showCancel,setShowCancel] = useState(false)
  const [reason,   setReason]   = useState('')

  useEffect(() => {
    api.get(`/serv/orders/${id}`)
      .then(r => setOrder(r.data.data))
      .catch(() => navigate('/serv/orders', { replace: true }))
      .finally(() => setLoading(false))
  }, [id])

  async function cancel() {
    setCanceling(true)
    try {
      const res = await api.post(`/serv/orders/${id}/cancel`, { reason })
      setOrder(res.data.data)
      setShowCancel(false)
    } catch (e) {
      alert(e.response?.data?.message ?? 'Gagal membatalkan')
    } finally { setCanceling(false) }
  }

  if (loading) return <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--k-muted)' }}>Memuat...</div>
  if (!order) return null

  const stepIdx = STATUS_STEPS.indexOf(order.status)
  const isDone  = order.status === 'completed' || order.status === 'cancelled'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#064e3b,#059669)', padding: '52px 16px 20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>← Kembali</button>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#fff' }}>Detail Pesanan</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>{order.order_number}</div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Status */}
        <div style={{ background: 'var(--k-card)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Status Pesanan</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: STATUS_COLOR[order.status] ?? '#059669', marginBottom: 14 }}>
            {STATUS_LABEL[order.status] ?? order.status}
          </div>
          {order.status !== 'cancelled' && (
            <div style={{ display: 'flex', gap: 0 }}>
              {STATUS_STEPS.map((s, i) => (
                <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: i <= stepIdx ? '#059669' : 'var(--k-input)', border: `2px solid ${i <= stepIdx ? '#059669' : 'var(--k-border)'}`, zIndex: 1 }} />
                  {i < STATUS_STEPS.length - 1 && (
                    <div style={{ position: 'relative', top: -8, width: '100%', height: 2, background: i < stepIdx ? '#059669' : 'var(--k-input)', marginLeft: '50%' }} />
                  )}
                  <div style={{ fontSize: 9, color: i <= stepIdx ? '#059669' : 'var(--k-muted)', marginTop: 4, textAlign: 'center', fontWeight: i === stepIdx ? 700 : 400 }}>
                    {s === 'in_progress' ? 'Kerja' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {order.cancel_reason && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '8px 12px' }}>
              Alasan: {order.cancel_reason}
            </div>
          )}
        </div>

        {/* Provider */}
        <div style={{ background: 'var(--k-card)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Teknisi</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{order.provider?.name}</div>
          <div style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 2 }}>{order.provider?.address}</div>
          {order.provider?.phone && (
            <a href={`tel:${order.provider.phone}`} style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: '#059669', fontWeight: 600 }}>📞 {order.provider.phone}</a>
          )}
        </div>

        {/* Alamat */}
        <div style={{ background: 'var(--k-card)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Lokasi Servis</div>
          <div style={{ fontSize: 13 }}>{order.address}</div>
          {order.scheduled_at && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--k-muted)' }}>Dijadwalkan: {fmtDate(order.scheduled_at)}</div>
          )}
          {order.notes && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--k-muted)', fontStyle: 'italic' }}>Catatan: {order.notes}</div>
          )}
        </div>

        {/* Items */}
        <div style={{ background: 'var(--k-card)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Rincian Layanan</div>
          {order.items?.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.service_name}</div>
                <div style={{ fontSize: 11, color: 'var(--k-muted)' }}>{item.quantity} {UNIT_LABEL[item.unit] ?? item.unit} × {fmt(item.price)}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#059669' }}>{fmt(item.subtotal)}</div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--k-border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span style={{ fontWeight: 800, color: '#059669', fontSize: 16 }}>{fmt(order.total_price)}</span>
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--k-muted)', textAlign: 'center', marginBottom: 14 }}>Dibuat: {fmtDate(order.created_at)}</div>
      </div>

      {/* Cancel modal */}
      {showCancel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}>
          <div style={{ background: 'var(--k-card)', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', boxSizing: 'border-box' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Batalkan Pesanan?</div>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Alasan pembatalan (opsional)" rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, boxSizing: 'border-box', resize: 'none' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => setShowCancel(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1.5px solid var(--k-border)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>Tidak</button>
              <button onClick={cancel} disabled={canceling} style={{ flex: 1, padding: 12, borderRadius: 12, background: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                {canceling ? 'Membatalkan...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer button */}
      {!isDone && order.status !== 'in_progress' && order.status !== 'traveling' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'var(--k-card)', borderTop: '1px solid var(--k-border)' }}>
          <button onClick={() => setShowCancel(true)} style={{ width: '100%', padding: 12, background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>
            Batalkan Pesanan
          </button>
        </div>
      )}
    </div>
  )
}
