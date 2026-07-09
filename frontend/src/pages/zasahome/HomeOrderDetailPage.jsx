import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { STATUS_META as BASE_STATUS_META, FLOW_STEPS, getCategoryConfig } from '../../utils/homeServiceConfig'
import ReportComplaintModal from '../../components/ReportComplaintModal'

const COMPLAINT_WINDOW_HOURS = 24

const UNIT_LABEL = { kg: 'kg', item: 'item', jam: 'jam', sesi: 'sesi' }

function fmtDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HomeOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order,      setOrder]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showComplaint, setShowComplaint] = useState(false)
  const [complaintSent, setComplaintSent] = useState(false)

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
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--k-muted)' }}>{loading ? 'Memuat...' : 'Pesanan tidak ditemukan.'}</p>
    </div>
  )

  const cfg        = getCategoryConfig(order.provider?.category)
  const flowSteps  = FLOW_STEPS[cfg.flow]
  const sm         = BASE_STATUS_META[order.status] ?? { label: order.status, color: '#A0A0BC', icon: '?' }
  const isCancelled = order.status === 'cancelled'
  const isActive    = !['completed', 'cancelled'].includes(order.status)
  const canComplain = order.status === 'completed' && order.completed_at
    && (Date.now() - new Date(order.completed_at).getTime()) / 36e5 <= COMPLAINT_WINDOW_HOURS
    && !complaintSent
  const canChat     = !['cancelled'].includes(order.status)
  const stepIdx     = flowSteps.findIndex(s => s.key === order.status)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 20px', background: 'linear-gradient(160deg,#0F1E25 0%,var(--k-bg) 100%)' }}>
        <button onClick={() => navigate('/home/orders')} style={{ background: 'none', border: 'none', color: 'var(--k-muted)', fontSize: 14, cursor: 'pointer', marginBottom: 12, padding: 0 }}>
          ← Pesanan Saya
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Detail Pesanan</h1>
            <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>{order.order_number}</p>
          </div>
          {canChat && (
            <button
              onClick={() => navigate(`/home/orders/${id}/chat`, { state: { otherName: order.provider?.name } })}
              style={{
                padding: '8px 16px', borderRadius: 12, border: '1.5px solid #6366F1',
                background: 'rgba(99,102,241,0.1)', color: '#6366F1',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
              💬 Chat
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Status card */}
        <div style={{ background: 'var(--k-card)', border: `1.5px solid ${sm.color}30`, borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isCancelled ? 0 : 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${sm.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              {flowSteps.find(s => s.key === order.status)?.icon ?? '?'}
            </div>
            <div>
              <p style={{ fontWeight: 700, color: sm.color, fontSize: 15 }}>{sm.label}</p>
              <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>
                Dipesan {fmtDate(order.created_at)}
              </p>
              {order.cancel_reason && <p style={{ fontSize: 12, color: '#F56565', marginTop: 4 }}>Alasan: {order.cancel_reason}</p>}
            </div>
            {cfg.flow === 'on_site' ? (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, flexShrink: 0, background: 'rgba(99,102,241,0.12)', color: '#6366F1' }}>
                {cfg.icon} On-Site
              </span>
            ) : (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, flexShrink: 0,
                background: order.pickup_type === 'antar_jemput' ? 'rgba(59,130,246,0.12)' : 'rgba(160,160,188,0.12)',
                color: order.pickup_type === 'antar_jemput' ? '#3B82F6' : 'var(--k-muted)',
              }}>
                {order.pickup_type === 'antar_jemput' ? '🚚 Antar Jemput' : '🏃 Antar Sendiri'}
              </span>
            )}
          </div>

          {/* Scheduled time untuk on_site */}
          {order.scheduled_pickup_at && (
            <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13 }}>🕐</span>
              <span style={{ fontSize: 12, color: '#6366F1', fontWeight: 600 }}>
                {fmtDate(order.scheduled_pickup_at)}
              </span>
            </div>
          )}

          {/* Timeline progress — hanya tampil jika tidak dibatalkan */}
          {!isCancelled && (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 4,
                minWidth: cfg.flow === 'on_site' ? 280 : 400 }}>
                {flowSteps.map((step, i) => {
                  const smStep  = BASE_STATUS_META[step.key] ?? {}
                  const done    = stepIdx > i
                  const current = stepIdx === i
                  return (
                    <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < flowSteps.length - 1 ? 1 : 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 13,
                          background: done ? '#6366F1' : current ? sm.color : 'var(--k-input)',
                          border: current ? `2px solid ${sm.color}` : 'none',
                          color: done || current ? '#fff' : 'var(--k-muted)',
                        }}>
                          {done ? '✓' : (smStep.icon ?? step.label[0])}
                        </div>
                        <span style={{ fontSize: 9, color: current ? sm.color : done ? '#6366F1' : 'var(--k-muted)', fontWeight: current ? 700 : 400, whiteSpace: 'nowrap' }}>
                          {step.label}
                        </span>
                      </div>
                      {i < flowSteps.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: done ? '#6366F1' : 'var(--k-border)', margin: '0 4px', marginBottom: 18 }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Timestamps */}
          {order.ready_at && (
            <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 8 }}>📦 Siap: {fmtDate(order.ready_at)}</p>
          )}
          {order.completed_at && (
            <p style={{ fontSize: 11, color: '#00C896', marginTop: 4 }}>✓ Selesai: {fmtDate(order.completed_at)}</p>
          )}
        </div>

        {/* Provider — tanpa nomor telepon */}
        <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 6 }}>Provider</p>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--k-text)', marginBottom: 2 }}>{order.provider?.name}</p>
          <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: canChat ? 12 : 0 }}>📍 {order.provider?.address}</p>
          {canChat && (
            <button
              onClick={() => navigate(`/home/orders/${id}/chat`, { state: { otherName: order.provider?.name } })}
              style={{
                width: '100%', padding: '10px', borderRadius: 12,
                border: '1.5px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.06)',
                color: '#6366F1', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
              💬 Hubungi Provider via Chat
            </button>
          )}
        </div>

        {/* Items */}
        <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: 16 }}>
          <p style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Layanan</p>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: i < order.items.length-1 ? 10 : 0 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)' }}>{item.service_name}</p>
                <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{item.quantity} {UNIT_LABEL[item.unit] ?? item.unit} × Rp {item.price.toLocaleString('id')}</p>
              </div>
              <p style={{ fontWeight: 700, fontSize: 14 }}>Rp {item.subtotal.toLocaleString('id')}</p>
            </div>
          ))}
          {order.pickup_fee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <p style={{ fontSize: 13, color: 'var(--k-muted)' }}>🚚 Biaya antar jemput</p>
              <p style={{ fontSize: 13, color: 'var(--k-text)' }}>Rp {order.pickup_fee.toLocaleString('id')}</p>
            </div>
          )}
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
        {isActive && ['pending', 'confirmed'].includes(order.status) && (
          <button onClick={handleCancel} disabled={cancelling} style={{
            padding: '13px', borderRadius: 14, border: '1.5px solid rgba(245,101,101,0.4)',
            background: 'rgba(245,101,101,0.06)', color: '#F56565',
            fontWeight: 700, fontSize: 14, cursor: cancelling ? 'default' : 'pointer',
          }}>
            {cancelling ? 'Membatalkan...' : 'Batalkan Pesanan'}
          </button>
        )}

        {/* Laporkan masalah — hanya order completed, dalam 24 jam */}
        {canComplain && (
          <button onClick={() => setShowComplaint(true)} style={{
            padding: '13px', borderRadius: 14, border: '1.5px solid rgba(246,173,85,0.4)',
            background: 'rgba(246,173,85,0.06)', color: '#F6AD55',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            ⚠️ Laporkan Masalah
          </button>
        )}
        {complaintSent && (
          <p style={{ textAlign: 'center', fontSize: 12, color: '#00C896', fontWeight: 700 }}>
            ✓ Laporan sudah dikirim, tim kami akan meninjau
          </p>
        )}
      </div>

      {showComplaint && (
        <ReportComplaintModal
          orderType="zasahome"
          orderId={order.id}
          onClose={() => setShowComplaint(false)}
          onSuccess={() => { setShowComplaint(false); setComplaintSent(true) }}
        />
      )}
    </div>
  )
}
