import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import ReportComplaintModal from '../../components/ReportComplaintModal'

const COMPLAINT_WINDOW_HOURS = 24

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n)

const STATUS_BADGE = {
  pending:   { label: 'Mencari Driver', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  accepted:  { label: 'Driver Menuju',  color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  on_pickup: { label: 'Driver Tiba',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  on_ride:   { label: 'Dalam Perjalanan', color: '#00C896', bg: 'rgba(0,200,150,0.1)' },
  completed: { label: 'Selesai',        color: '#00C896', bg: 'rgba(0,200,150,0.1)' },
  cancelled: { label: 'Dibatalkan',     color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
}

function RatingModal({ order, onClose, onDone }) {
  const [score,   setScore]   = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const submit = async () => {
    setLoading(true); setError(null)
    try {
      await api.post(`/ride/orders/${order.id}/rate`, { score, comment: comment || undefined })
      onDone()
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal mengirim rating.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--k-surface)', borderRadius: '24px 24px 0 0',
        padding: '24px 20px 32px', width: '100%', maxWidth: 480,
      }} onClick={e => e.stopPropagation()}>
        <p style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Beri Rating Driver</p>
        <p style={{ fontSize: 13, color: 'var(--k-muted)', marginBottom: 20 }}>
          {order.pickup_address} → {order.destination_address}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {[1,2,3,4,5].map(s => (
            <button key={s} onClick={() => setScore(s)} style={{
              fontSize: 32, background: 'none', border: 'none', cursor: 'pointer',
              opacity: s <= score ? 1 : 0.3, transition: 'opacity 0.15s',
            }}>⭐</button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Komentar (opsional)"
          rows={3}
          style={{
            width: '100%', background: 'var(--k-card)', color: 'var(--k-text)',
            border: '1.5px solid var(--k-border)', borderRadius: 14,
            padding: '12px 14px', fontSize: 13, outline: 'none',
            resize: 'none', fontFamily: 'inherit', marginBottom: 16,
            boxSizing: 'border-box',
          }}
        />

        {error && <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 12 }}>{error}</p>}

        <button onClick={submit} disabled={loading} style={{
          width: '100%', padding: '14px', borderRadius: 16,
          background: 'var(--k-accent)', color: '#0C0C16',
          fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer',
          opacity: loading ? 0.7 : 1,
        }}>{loading ? 'Mengirim...' : `Kirim Rating ${score}★`}</button>
      </div>
    </div>
  )
}

function OrderCard({ order, onRate }) {
  const [showComplaint, setShowComplaint] = useState(false)
  const [complaintSent, setComplaintSent] = useState(false)
  const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending
  const date  = new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const canComplain = order.status === 'completed' && order.completed_at
    && (Date.now() - new Date(order.completed_at).getTime()) / 36e5 <= COMPLAINT_WINDOW_HOURS
    && !complaintSent
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

      {order.status === 'completed' && !order.my_rating && (
        <button onClick={() => onRate(order)} style={{
          marginTop: 12, width: '100%', padding: '10px', borderRadius: 12,
          background: 'var(--k-glow)', border: '1px solid rgba(0,200,150,0.25)',
          color: 'var(--k-accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>⭐ Beri Rating</button>
      )}
      {order.status === 'completed' && order.my_rating && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--k-muted)' }}>Rating kamu:</span>
          <span style={{ fontSize: 14, color: '#F59E0B', fontWeight: 700 }}>{'★'.repeat(order.my_rating.score)}{'☆'.repeat(5 - order.my_rating.score)}</span>
        </div>
      )}

      {canComplain && (
        <button onClick={() => setShowComplaint(true)} style={{
          marginTop: 8, width: '100%', padding: '10px', borderRadius: 12,
          background: 'rgba(246,173,85,0.06)', border: '1px solid rgba(246,173,85,0.3)',
          color: '#F6AD55', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>⚠️ Laporkan Masalah</button>
      )}
      {complaintSent && (
        <p style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: 'var(--k-accent)', fontWeight: 700 }}>✓ Laporan sudah dikirim</p>
      )}

      {showComplaint && (
        <ReportComplaintModal
          orderType="zasaride"
          orderId={order.id}
          onClose={() => setShowComplaint(false)}
          onSuccess={() => { setShowComplaint(false); setComplaintSent(true) }}
        />
      )}
    </div>
  )
}

export default function RideOrdersPage() {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [meta,    setMeta]    = useState(null)
  const [ratingOrder, setRatingOrder] = useState(null)

  const fetchOrders = (p = 1) => {
    setLoading(true)
    api.get('/ride/orders', { params: { page: p } })
      .then(r => { setOrders(r.data.data || []); setMeta(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchOrders(page) }, [page])

  const handleRateDone = () => {
    setRatingOrder(null)
    fetchOrders(page)
  }

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
            {orders.map(o => <OrderCard key={o.id} order={o} onRate={setRatingOrder} />)}
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

      {ratingOrder && (
        <RatingModal order={ratingOrder} onClose={() => setRatingOrder(null)} onDone={handleRateDone} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
