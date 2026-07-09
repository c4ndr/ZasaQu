import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import ReportComplaintModal from '../../components/ReportComplaintModal'

const COMPLAINT_WINDOW_HOURS = 24

function Stars({ score, onChange, size = 28 }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)} style={{
          fontSize: size, background: 'none', border: 'none', cursor: 'pointer',
          opacity: s <= score ? 1 : 0.25, transition: 'opacity 0.15s', padding: 0,
        }}>⭐</button>
      ))}
    </div>
  )
}

function ServRatingModal({ order, onClose, onDone }) {
  const [score,   setScore]   = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const submit = async () => {
    setLoading(true); setError(null)
    try {
      await api.post(`/serv/orders/${order.id}/rate`, { score, comment: comment || undefined })
      onDone()
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal mengirim rating.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--k-card)', borderRadius: '22px 22px 0 0', padding: '22px 18px 36px', width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <p style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>Beri Rating Teknisi</p>
        <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 20 }}>{order.provider?.name}</p>
        <Stars score={score} onChange={setScore} />
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Komentar (opsional)" rows={3}
          style={{ width: '100%', marginTop: 14, background: 'var(--k-input)', color: 'var(--k-text)', border: '1.5px solid var(--k-border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
        {error && <p style={{ fontSize: 13, color: '#EF4444', marginTop: 8 }}>{error}</p>}
        <button onClick={submit} disabled={loading} style={{
          marginTop: 18, width: '100%', padding: '14px', borderRadius: 14,
          background: '#059669', color: '#fff', fontSize: 15, fontWeight: 800,
          border: 'none', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
        }}>{loading ? 'Mengirim...' : 'Kirim Rating'}</button>
      </div>
    </div>
  )
}

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
  pending: '#F59E0B', confirmed: '#3B82F6', traveling: '#8B5CF6',
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
  const [canceling,  setCanceling]   = useState(false)
  const [showCancel, setShowCancel]  = useState(false)
  const [reason,     setReason]      = useState('')
  const [showRating, setShowRating]  = useState(false)
  const [ratedIds,   setRatedIds]    = useState(() => new Set(
    JSON.parse(sessionStorage.getItem('serv_rated_ids') || '[]')
  ))
  const [showComplaint, setShowComplaint] = useState(false)
  const [complaintSent, setComplaintSent] = useState(false)

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

  const stepIdx  = STATUS_STEPS.indexOf(order.status)
  const isDone   = order.status === 'completed' || order.status === 'cancelled'
  const canComplain = order.status === 'completed' && order.completed_at
    && (Date.now() - new Date(order.completed_at).getTime()) / 36e5 <= COMPLAINT_WINDOW_HOURS
    && !complaintSent
  const isRated  = ratedIds.has(order.id) || !!order.rated_at

  function handleRateDone() {
    setRatedIds(prev => {
      const next = new Set(prev)
      next.add(order.id)
      sessionStorage.setItem('serv_rated_ids', JSON.stringify([...next]))
      return next
    })
    setShowRating(false)
    setOrder(o => ({ ...o, rated_at: new Date().toISOString() }))
  }

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
          {order.status !== 'cancelled' && (
            <button
              onClick={() => navigate(`/serv/orders/${id}/chat`, { state: { otherName: order.provider?.name } })}
              style={{
                display: 'block', width: '100%', marginTop: 12, padding: '10px',
                borderRadius: 12, border: '1.5px solid rgba(5,150,105,0.4)',
                background: 'rgba(5,150,105,0.06)', color: '#059669',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
              💬 Hubungi Teknisi via Chat
            </button>
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

        {/* Rating — hanya untuk completed */}
        {order.status === 'completed' && !isRated && (
          <button onClick={() => setShowRating(true)} style={{
            width: '100%', padding: 14, borderRadius: 14, border: 'none',
            background: 'rgba(5,150,105,0.1)', color: '#059669',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 14,
          }}>⭐ Beri Rating Teknisi</button>
        )}
        {order.status === 'completed' && isRated && (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--k-muted)', marginBottom: 14 }}>✓ Sudah memberi rating</p>
        )}

        {canComplain && (
          <button onClick={() => setShowComplaint(true)} style={{
            width: '100%', padding: 14, borderRadius: 14, border: '1.5px solid rgba(246,173,85,0.4)',
            background: 'rgba(246,173,85,0.06)', color: '#F6AD55',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 14,
          }}>⚠️ Laporkan Masalah</button>
        )}
        {complaintSent && (
          <p style={{ textAlign: 'center', fontSize: 13, color: '#059669', fontWeight: 700, marginBottom: 14 }}>✓ Laporan sudah dikirim</p>
        )}
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

      {showRating && (
        <ServRatingModal order={order} onClose={() => setShowRating(false)} onDone={handleRateDone} />
      )}

      {showComplaint && (
        <ReportComplaintModal
          orderType="zasaserv"
          orderId={order.id}
          onClose={() => setShowComplaint(false)}
          onSuccess={() => { setShowComplaint(false); setComplaintSent(true) }}
        />
      )}
    </div>
  )
}
