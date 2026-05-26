import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleString('id-ID')
const STORAGE = import.meta.env.VITE_STORAGE_URL

const STATUS_META = {
  pending:     { label: 'Menunggu Konfirmasi Penjual', color: '#F59E0B', icon: '⏳' },
  confirmed:   { label: 'Pesanan Dikonfirmasi',        color: '#3B82F6', icon: '✅' },
  packed:      { label: 'Sedang Dikemas',              color: '#8B5CF6', icon: '📦' },
  picking_up:  { label: 'Kurir Menuju Penjual',        color: '#F97316', icon: '🛵' },
  on_delivery: { label: 'Dalam Pengiriman',            color: '#6366F1', icon: '🚀' },
  delivered:   { label: 'Pesanan Terkirim',            color: '#10B981', icon: '🎉' },
  completed:   { label: 'Pesanan Selesai',             color: '#22C55E', icon: '✨' },
  cancelled:   { label: 'Pesanan Dibatalkan',          color: '#EF4444', icon: '❌' },
}

const STEPS = ['pending','confirmed','packed','picking_up','on_delivery','delivered','completed']

export default function MartOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder]         = useState(null)
  const [acting, setActing]       = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [reviews, setReviews]     = useState({})
  const [cancelReason, setCancelReason] = useState('')
  const [showCancel, setShowCancel] = useState(false)

  const load = () => api.get(`/mart/orders/${id}`).then(r => setOrder(r.data))
  useEffect(() => { load() }, [id])

  const receive = async () => {
    setActing(true)
    try { await api.post(`/mart/orders/${id}/receive`); load() } finally { setActing(false) }
  }

  const cancel = async () => {
    setActing(true)
    try { await api.post(`/mart/orders/${id}/cancel`, { reason: cancelReason }); setShowCancel(false); load() } finally { setActing(false) }
  }

  const submitReviews = async () => {
    const payload = Object.entries(reviews).map(([order_item_id, r]) => ({ order_item_id: Number(order_item_id), ...r }))
    if (!payload.length) return
    setActing(true)
    try { await api.post('/mart/reviews', { order_id: order.id, reviews: payload }); setShowReview(false); load() } finally { setActing(false) }
  }

  if (!order) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const sm        = STATUS_META[order.status] ?? { label: order.status, color: '#888', icon: '📋' }
  const stepIdx   = STEPS.indexOf(order.status)
  const canCancel = ['pending', 'confirmed'].includes(order.status)
  const canReceive = order.status === 'delivered'
  const canReview  = order.status === 'completed' && order.reviews?.length < order.items?.length
  const reviewed   = order.reviews?.map(r => r.order_item_id) ?? []

  return (
    <div style={{ background: 'var(--k-bg)', minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: 'var(--k-text)' }}>←</button>
        <div>
          <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--k-text)' }}>Detail Pesanan</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{order.order_number}</p>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Status */}
        <div style={{ background: 'var(--k-card)', borderRadius: 16, padding: '16px', border: '1px solid var(--k-border)', marginBottom: 14, textAlign: 'center' }}>
          <p style={{ fontSize: 36, marginBottom: 6 }}>{sm.icon}</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: sm.color }}>{sm.label}</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 4 }}>{fmtDate(order.created_at)}</p>

          {/* Progress bar */}
          {order.status !== 'cancelled' && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 16, gap: 2 }}>
              {STEPS.map((s, i) => (
                <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= stepIdx ? '#6366F1' : 'var(--k-border)', transition: 'background 0.3s' }} />
              ))}
            </div>
          )}
        </div>

        {/* Seller */}
        <div style={{ background: 'var(--k-card)', borderRadius: 14, padding: '14px', border: '1px solid var(--k-border)', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Penjual</p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {order.seller?.logo_path
              ? <img src={`${STORAGE}/${order.seller.logo_path}`} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
              : <div style={{ width: 40, height: 40, borderRadius: 10, background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏪</div>
            }
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{order.seller?.name}</p>
              {order.seller?.phone && <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{order.seller.phone}</p>}
            </div>
          </div>
        </div>

        {/* Items */}
        <div style={{ background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', marginBottom: 14, overflow: 'hidden' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', padding: '12px 14px 0', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Produk</p>
          {order.items?.map((item, i) => (
            <div key={item.id} style={{ padding: '10px 14px', display: 'flex', gap: 10, borderTop: i === 0 ? 'none' : '1px solid var(--k-border)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
                {item.product_image
                  ? <img src={`${STORAGE}/${item.product_image}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🛍️</div>
                }
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-text)' }}>{item.product_name}</p>
                <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{item.quantity}x · {fmtRp(item.price)}</p>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{fmtRp(item.subtotal)}</p>
            </div>
          ))}
        </div>

        {/* Delivery */}
        <div style={{ background: 'var(--k-card)', borderRadius: 14, padding: '14px', border: '1px solid var(--k-border)', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Pengiriman</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)', marginBottom: 2 }}>{order.delivery_name}</p>
          <p style={{ fontSize: 12, color: 'var(--k-sub)', lineHeight: 1.5 }}>{order.delivery_address}</p>
          {order.delivery_phone && <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 4 }}>{order.delivery_phone}</p>}
          {order.notes && <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 6, fontStyle: 'italic' }}>"{order.notes}"</p>}
        </div>

        {/* Payment summary */}
        <div style={{ background: 'var(--k-card)', borderRadius: 14, padding: '14px', border: '1px solid var(--k-border)', marginBottom: 14 }}>
          {[
            { label: 'Subtotal', value: fmtRp(order.subtotal) },
            { label: 'Ongkir', value: fmtRp(order.shipping_fee) },
          ].map((r, i) => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--k-border)' }}>
              <p style={{ fontSize: 13, color: 'var(--k-muted)' }}>{r.label}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)' }}>{r.value}</p>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0' }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)' }}>Total</p>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#6366F1' }}>{fmtRp(order.total)}</p>
          </div>
        </div>

        {order.cancel_reason && (
          <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', marginBottom: 4 }}>Alasan Pembatalan</p>
            <p style={{ fontSize: 12, color: '#EF4444' }}>{order.cancel_reason}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--k-surface)', borderTop: '1px solid var(--k-border)', padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom,0px))', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {canReceive && (
          <button onClick={receive} disabled={acting}
            style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: '#22C55E', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
            ✅ Konfirmasi Pesanan Diterima
          </button>
        )}
        {canReview && (
          <button onClick={() => setShowReview(true)}
            style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: '#6366F1', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
            ⭐ Beri Ulasan
          </button>
        )}
        {canCancel && (
          <button onClick={() => setShowCancel(true)}
            style={{ width: '100%', padding: '11px', borderRadius: 12, border: '1px solid #EF4444', background: 'none', color: '#EF4444', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Batalkan Pesanan
          </button>
        )}
      </div>

      {/* Cancel modal */}
      {showCancel && (
        <>
          <div onClick={() => setShowCancel(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--k-surface)', borderRadius: '20px 20px 0 0', padding: '24px 20px', zIndex: 901, paddingBottom: 'calc(24px + env(safe-area-inset-bottom,0px))' }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--k-text)', marginBottom: 12 }}>Batalkan Pesanan?</p>
            <input value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Alasan pembatalan (opsional)"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowCancel(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>Kembali</button>
              <button onClick={cancel} disabled={acting} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Batalkan</button>
            </div>
          </div>
        </>
      )}

      {/* Review modal */}
      {showReview && (
        <>
          <div onClick={() => setShowReview(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--k-surface)', borderRadius: '20px 20px 0 0', padding: '24px 20px', zIndex: 901, maxHeight: '80vh', overflowY: 'auto', paddingBottom: 'calc(24px + env(safe-area-inset-bottom,0px))' }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--k-text)', marginBottom: 16 }}>Beri Ulasan ⭐</p>
            {order.items?.filter(i => !reviewed.includes(i.id)).map(item => (
              <div key={item.id} style={{ background: 'var(--k-card)', borderRadius: 12, padding: '12px', marginBottom: 12, border: '1px solid var(--k-border)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 8 }}>{item.product_name}</p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setReviews(p => ({ ...p, [item.id]: { ...(p[item.id] || {}), rating: s } }))}
                      style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: (reviews[item.id]?.rating || 0) >= s ? '#F59E0B' : '#D1D5DB' }}>★</button>
                  ))}
                </div>
                <input value={reviews[item.id]?.comment || ''} onChange={e => setReviews(p => ({ ...p, [item.id]: { ...(p[item.id] || {}), comment: e.target.value } }))}
                  placeholder="Komentar (opsional)"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-card2)', color: 'var(--k-text)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <button onClick={submitReviews} disabled={acting}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: '#6366F1', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              Kirim Ulasan
            </button>
          </div>
        </>
      )}
    </div>
  )
}
