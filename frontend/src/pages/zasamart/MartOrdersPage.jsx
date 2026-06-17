import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

// ── Rating Modal ──────────────────────────────────────────────────────────────
function Stars({ score, onChange, size = 26 }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)} style={{
          fontSize: size, background: 'none', border: 'none', cursor: 'pointer',
          opacity: s <= score ? 1 : 0.22, transition: 'opacity 0.15s', padding: 0,
        }}>⭐</button>
      ))}
    </div>
  )
}

function MartRatingModal({ order, onClose, onDone }) {
  const items = order.items ?? []
  const [scores,   setScores]   = useState(() => Object.fromEntries(items.map(i => [i.id, 5])))
  const [comments, setComments] = useState(() => Object.fromEntries(items.map(i => [i.id, ''])))
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const submit = async () => {
    setLoading(true); setError(null)
    try {
      await api.post('/mart/reviews', {
        order_id: order.id,
        reviews: items.map(i => ({
          order_item_id: i.id,
          rating:        scores[i.id] ?? 5,
          comment:       comments[i.id] || undefined,
        })),
      })
      onDone()
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal mengirim ulasan.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--k-surface)', borderRadius: '22px 22px 0 0', padding: '22px 18px 36px', width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <p style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>Beri Ulasan</p>
        <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 18 }}>{order.seller?.name}</p>

        {items.map((item, idx) => (
          <div key={item.id} style={{ marginBottom: 20, paddingBottom: 18, borderBottom: idx < items.length - 1 ? '1px solid var(--k-border)' : 'none' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 8 }}>
              🛍️ {item.product_name}
              <span style={{ fontWeight: 400, color: 'var(--k-muted)' }}> ×{item.quantity}</span>
            </p>
            <Stars score={scores[item.id]} onChange={v => setScores(p => ({ ...p, [item.id]: v }))} />
            <input
              value={comments[item.id]}
              onChange={e => setComments(p => ({ ...p, [item.id]: e.target.value }))}
              placeholder="Komentar (opsional)"
              style={{ marginTop: 8, width: '100%', background: 'var(--k-card)', color: 'var(--k-text)', border: '1.5px solid var(--k-border)', borderRadius: 10, padding: '9px 12px', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
        ))}

        {error && <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 12 }}>{error}</p>}

        <button onClick={submit} disabled={loading} style={{
          width: '100%', padding: '14px', borderRadius: 14,
          background: 'linear-gradient(135deg,#6366F1,#7C3AED)', color: '#fff',
          fontSize: 15, fontWeight: 800, border: 'none', cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}>{loading ? 'Mengirim...' : 'Kirim Ulasan'}</button>
      </div>
    </div>
  )
}

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
const STORAGE = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')

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
  const [tab,     setTab]     = useState('')
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [ratingOrder, setRatingOrder] = useState(null)
  const [toast,       setToast]       = useState(null)
  const [ratedIds,    setRatedIds]    = useState(() => new Set(
    JSON.parse(sessionStorage.getItem('mart_rated_ids') || '[]')
  ))

  useEffect(() => {
    setLoading(true)
    api.get('/mart/orders', { params: { status: tab || undefined } })
      .then(r => setOrders(r.data.data))
      .finally(() => setLoading(false))
  }, [tab])

  function showToast(msg) {
    setToast(msg); setTimeout(() => setToast(null), 2800)
  }

  function handleRateDone() {
    const id = ratingOrder.id
    setRatedIds(prev => {
      const next = new Set(prev)
      next.add(id)
      sessionStorage.setItem('mart_rated_ids', JSON.stringify([...next]))
      return next
    })
    setRatingOrder(null)
    showToast('Ulasan berhasil dikirim!')
  }

  return (
    <div style={{ background: 'var(--k-bg)', minHeight: '100dvh', paddingBottom: 80 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '11px 20px', borderRadius: 12, background: '#00C896', color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: order.status === 'completed' ? 10 : 0 }}>
                    <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{order.items?.length ?? 0} produk</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#6366F1' }}>{fmtRp(order.total)}</p>
                  </div>
                  {order.status === 'completed' && !ratedIds.has(order.id) && (
                    <button onClick={e => { e.stopPropagation(); setRatingOrder(order) }} style={{
                      width: '100%', padding: '9px', borderRadius: 10, border: 'none',
                      background: 'rgba(99,102,241,0.08)', color: '#6366F1',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>⭐ Beri Ulasan Produk</button>
                  )}
                  {order.status === 'completed' && ratedIds.has(order.id) && (
                    <p style={{ fontSize: 11, color: 'var(--k-muted)', textAlign: 'center' }}>✓ Sudah diulasi</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {ratingOrder && (
        <MartRatingModal
          order={ratingOrder}
          onClose={() => setRatingOrder(null)}
          onDone={handleRateDone}
        />
      )}
    </div>
  )
}
