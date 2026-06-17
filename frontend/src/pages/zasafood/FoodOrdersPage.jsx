import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import api from '../../services/api'
import echo from '../../services/echo'

// ── Rating Modal ──────────────────────────────────────────────────────────────
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

function FoodRatingModal({ order, onClose, onDone }) {
  const hasMitra = !!order.mitra_id
  const [merchantScore,   setMerchantScore]   = useState(5)
  const [merchantComment, setMerchantComment] = useState('')
  const [mitraScore,      setMitraScore]      = useState(5)
  const [mitraComment,    setMitraComment]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const submit = async () => {
    setLoading(true); setError(null)
    try {
      await api.post(`/food/orders/${order.id}/rate`, {
        merchant_score:   merchantScore,
        merchant_comment: merchantComment || undefined,
        ...(hasMitra ? { mitra_score: mitraScore, mitra_comment: mitraComment || undefined } : {}),
      })
      onDone()
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal mengirim rating.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--k-surface)', borderRadius: '22px 22px 0 0', padding: '22px 18px 36px', width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <p style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>Beri Ulasan</p>
        <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 20 }}>{order.merchant?.name}</p>

        {/* Merchant */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 8 }}>🏪 Penilaian Warung</p>
          <Stars score={merchantScore} onChange={setMerchantScore} />
          <textarea value={merchantComment} onChange={e => setMerchantComment(e.target.value)}
            placeholder="Komentar untuk warung (opsional)" rows={2}
            style={{ width: '100%', marginTop: 10, background: 'var(--k-card)', color: 'var(--k-text)', border: '1.5px solid var(--k-border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        {/* Mitra (jika ada) */}
        {hasMitra && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 8 }}>🛵 Penilaian Pengantar</p>
            <Stars score={mitraScore} onChange={setMitraScore} />
            <textarea value={mitraComment} onChange={e => setMitraComment(e.target.value)}
              placeholder="Komentar untuk mitra (opsional)" rows={2}
              style={{ width: '100%', marginTop: 10, background: 'var(--k-card)', color: 'var(--k-text)', border: '1.5px solid var(--k-border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {error && <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 12 }}>{error}</p>}

        <button onClick={submit} disabled={loading} style={{
          width: '100%', padding: '14px', borderRadius: 14,
          background: '#F97316', color: '#fff',
          fontSize: 15, fontWeight: 800, border: 'none', cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}>{loading ? 'Mengirim...' : 'Kirim Ulasan'}</button>
      </div>
    </div>
  )
}

function fmtRp(v)   { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
function fmtDate(d) { return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }

const STATUS_META = {
  pending:           { label: 'Menunggu Konfirmasi',  color: '#E88B00', bg: '#FFF8EC', border: '#F6AD5540', icon: '⏳', pulse: true  },
  merchant_accepted: { label: 'Pesanan Diterima',     color: '#027A48', bg: '#ECFDF3', border: '#00C89640', icon: '✅', pulse: false },
  preparing:         { label: 'Sedang Dimasak',       color: '#6B21A8', bg: '#FAF5FF', border: '#9F7AEA40', icon: '👨‍🍳', pulse: true  },
  ready_for_pickup:  { label: 'Siap, Mencari Mitra',  color: '#027A48', bg: '#ECFDF3', border: '#00C89640', icon: '🎉', pulse: true  },
  mitra_on_pickup:   { label: 'Mitra Menuju Warung',  color: '#1D4ED8', bg: '#EFF6FF', border: '#3B82F640', icon: '🏍️', pulse: true  },
  picked_up:         { label: 'Pesanan Diambil',      color: '#1D4ED8', bg: '#EFF6FF', border: '#3B82F640', icon: '📦', pulse: false },
  on_delivery:       { label: 'Dalam Perjalanan',     color: '#C2410C', bg: '#FFF7ED', border: '#F9731640', icon: '🚀', pulse: true  },
  delivered:         { label: 'Pesanan Tiba!',        color: '#027A48', bg: '#ECFDF3', border: '#00C89655', icon: '🎊', pulse: true  },
  completed:         { label: 'Selesai',              color: '#374151', bg: '#F9FAFB', border: '#E5E7EB',   icon: '⭐', pulse: false },
  cancelled:         { label: 'Dibatalkan',           color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB',   icon: '✕',  pulse: false },
  rejected:          { label: 'Ditolak Merchant',     color: '#DC2626', bg: '#FEF2F2', border: '#F5656540', icon: '✕',  pulse: false },
}

const ACTIVE_STATUSES = ['pending','merchant_accepted','preparing','ready_for_pickup','mitra_on_pickup','picked_up','on_delivery','delivered']

// ── Progress bar mini (5 tahap) ───────────────────────────────────────────────
const STEPS = ['pending', 'preparing', 'ready_for_pickup', 'on_delivery', 'delivered']
function progressIndex(status) {
  const map = {
    pending: 0, merchant_accepted: 0,
    preparing: 1,
    ready_for_pickup: 2, mitra_on_pickup: 2, picked_up: 2,
    on_delivery: 3,
    delivered: 4, completed: 4,
  }
  return map[status] ?? 0
}

function MiniProgress({ status }) {
  const idx = progressIndex(status)
  const sm  = STATUS_META[status] ?? STATUS_META.pending
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 12 }}>
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i <= idx ? sm.color : '#E5E7EB',
          transition: 'background 0.4s',
        }} />
      ))}
    </div>
  )
}

// ── Order Card (ShopeeFood style) ─────────────────────────────────────────────
function OrderCard({ order, onTrack, onConfirm, onReorder, onRate, confirming, isRated }) {
  const sm     = STATUS_META[order.status] ?? STATUS_META.pending
  const isLive = ACTIVE_STATUSES.includes(order.status)
  const isDone = ['completed','cancelled','rejected'].includes(order.status)

  return (
    <div onClick={() => onTrack(order.id)} style={{
      borderRadius: 16, background: '#fff',
      border: `1.5px solid ${sm.border}`,
      overflow: 'hidden', cursor: 'pointer',
      boxShadow: order.status === 'delivered'
        ? '0 4px 24px rgba(0,200,150,0.15)'
        : '0 1px 4px rgba(0,0,0,0.06)',
    }}>

      {/* ── Status banner ── */}
      <div style={{
        background: sm.bg,
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${sm.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {sm.pulse && isLive && (
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: sm.color, flexShrink: 0, animation: 'blink 2s infinite' }} />
          )}
          <span style={{ fontSize: 13, fontWeight: 700, color: sm.color }}>{sm.icon} {sm.label}</span>
        </div>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{fmtDate(order.created_at)}</span>
      </div>

      {/* ── Progress bar mini (hanya saat aktif) ── */}
      {isLive && (
        <div style={{ padding: '10px 14px 0' }}>
          <MiniProgress status={order.status} />
        </div>
      )}

      {/* ── Info warung ── */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #F3F4F6' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))',
          border: '1.5px solid rgba(249,115,22,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>🏪</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{order.merchant?.name}</p>
          <p style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 1 }}>{order.order_number}</p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
          background: order.payment_method === 'cod' ? 'rgba(249,115,22,0.1)' : 'rgba(0,200,150,0.1)',
          color: order.payment_method === 'cod' ? '#C2410C' : '#027A48',
        }}>{order.payment_method === 'cod' ? 'COD' : 'Wallet'}</span>
      </div>

      {/* ── Daftar item ── */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6' }}>
        {order.items?.slice(0, 3).map(i => (
          <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5, color: '#374151' }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
              {i.item_name}
              <span style={{ color: '#9CA3AF', marginLeft: 4 }}>×{i.quantity}</span>
            </span>
            <span style={{ fontWeight: 500, flexShrink: 0 }}>{fmtRp(i.item_price * i.quantity)}</span>
          </div>
        ))}
        {(order.items?.length ?? 0) > 3 && (
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>+{order.items.length - 3} item lainnya</p>
        )}
      </div>

      {/* ── Ringkasan biaya ── */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', marginBottom: 3 }}>
          <span>Subtotal</span><span>{fmtRp(order.subtotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
          <span>Ongkos kirim</span><span>{fmtRp(order.delivery_fee)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: '#F97316' }}>
          <span>Total</span><span>{fmtRp(order.total_amount)}</span>
        </div>
      </div>

      {/* ── Tombol aksi ── */}
      <div style={{ padding: '10px 14px', display: 'flex', gap: 8 }}>

        {/* Pesan Lagi — selalu ada kecuali pending/active */}
        {isDone && (
          <button onClick={e => { e.stopPropagation(); onReorder(order) }} style={{
            flex: 1, padding: '10px', borderRadius: 10,
            border: '1.5px solid #E5E7EB', background: '#fff',
            fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer',
          }}>Pesan Lagi</button>
        )}

        {/* Lacak — saat aktif tapi belum tiba */}
        {isLive && order.status !== 'delivered' && (
          <button onClick={e => { e.stopPropagation(); onTrack(order.id) }} style={{
            flex: 2, padding: '10px', borderRadius: 10, border: 'none',
            background: '#F97316', color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>📍 Lacak Pesanan</button>
        )}

        {/* Konfirmasi terima — saat delivered */}
        {order.status === 'delivered' && (
          <button onClick={e => { e.stopPropagation(); onConfirm(order.id) }} disabled={confirming === order.id} style={{
            flex: 2, padding: '10px', borderRadius: 10, border: 'none',
            background: confirming === order.id ? '#9CA3AF' : '#00C896',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: confirming === order.id ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {confirming === order.id ? 'Memproses...' : '✓ Konfirmasi Terima'}
          </button>
        )}

        {/* Detail — selalu ada */}
        <button onClick={e => { e.stopPropagation(); onTrack(order.id) }} style={{
          flex: isDone ? 1 : 0,
          padding: isDone ? '10px' : '10px 14px',
          borderRadius: 10, border: '1.5px solid #E5E7EB',
          background: '#fff', fontSize: 13, fontWeight: 600,
          color: '#374151', cursor: 'pointer',
        }}>{isDone ? 'Detail' : '›'}</button>

      </div>

      {/* Beri Rating — hanya saat completed & belum dirating */}
      {order.status === 'completed' && !isRated && (
        <div style={{ padding: '0 14px 12px' }}>
          <button onClick={e => { e.stopPropagation(); onRate(order) }} style={{
            width: '100%', padding: '10px', borderRadius: 10, border: 'none',
            background: 'rgba(249,115,22,0.08)', color: '#F97316',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>⭐ Beri Ulasan</button>
        </div>
      )}
      {order.status === 'completed' && isRated && (
        <div style={{ padding: '0 14px 12px' }}>
          <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>✓ Sudah diulasi</p>
        </div>
      )}

    </div>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function FoodOrdersPage() {
  const navigate = useNavigate()
  const [tab,        setTab]       = useState('active')
  const [orders,     setOrders]    = useState([])
  const [meta,       setMeta]      = useState(null)
  const [page,       setPage]      = useState(1)
  const [loading,    setLoading]   = useState(true)
  const [loadMore,   setLoadMore]  = useState(false)
  const [confirming, setConfirming] = useState(null)
  const [toast,      setToast]     = useState(null)
  const [ratingOrder, setRatingOrder] = useState(null)
  const [ratedIds,    setRatedIds]    = useState(() => new Set(
    JSON.parse(sessionStorage.getItem('food_rated_ids') || '[]')
  ))
  const channelsRef = useRef({})

  const fetchOrders = useCallback(async (currentPage = 1, append = false) => {
    append ? setLoadMore(true) : setLoading(true)
    try {
      const params = tab === 'active' ? { active_only: true } : { page: currentPage }
      const r = await api.get('/food/orders', { params })
      const newOrders = r.data.data || []
      setOrders(prev => append ? [...prev, ...newOrders] : newOrders)
      setMeta(r.data.meta ?? null)
    } catch {} finally {
      append ? setLoadMore(false) : setLoading(false)
    }
  }, [tab])

  useEffect(() => { setOrders([]); setPage(1); fetchOrders(1, false) }, [tab]) // eslint-disable-line

  // WebSocket real-time status update
  useEffect(() => {
    if (tab !== 'active') return
    const subscribe = (orderId) => {
      if (channelsRef.current[orderId]) return
      const ch = echo.channel(`food.${orderId}`)
      ch.listen('.food.order.status', e => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: e.status } : o))
      })
      channelsRef.current[orderId] = ch
    }
    orders.forEach(o => { if (ACTIVE_STATUSES.includes(o.status)) subscribe(o.id) })
    return () => {
      Object.keys(channelsRef.current).forEach(id => echo.leave(`food.${id}`))
      channelsRef.current = {}
    }
  }, [orders.map(o => o.id).join(','), tab]) // eslint-disable-line

  function showToast(msg, ok = true) {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000)
  }

  async function handleConfirm(orderId) {
    setConfirming(orderId)
    try {
      await api.post(`/food/orders/${orderId}/confirm`)
      showToast('Pesanan dikonfirmasi!')
      fetchOrders(1, false)
    } catch (e) {
      showToast(e.response?.data?.message || 'Gagal konfirmasi.', false)
    } finally { setConfirming(null) }
  }

  function handleRateDone() {
    const id = ratingOrder.id
    setRatedIds(prev => {
      const next = new Set(prev)
      next.add(id)
      sessionStorage.setItem('food_rated_ids', JSON.stringify([...next]))
      return next
    })
    setRatingOrder(null)
    showToast('Ulasan berhasil dikirim!')
  }

  function handleReorder(order) {
    navigate(`/food/merchants/${order.merchant_id}`, {
      state: { reorderItems: order.items },
    })
  }

  const handleLoadMore = () => { const next = page + 1; setPage(next); fetchOrders(next, true) }
  const hasMore = meta && page < meta.last_page

  return (
    <div style={{ minHeight: '100dvh', background: '#F9FAFB', paddingBottom: 88 }}>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '11px 20px', borderRadius: 12,
          background: toast.ok ? '#00C896' : '#F56565',
          color: '#fff', fontWeight: 700, fontSize: 13,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', whiteSpace: 'nowrap',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '20px 16px 0', position: 'sticky', top: 0, zIndex: 50 }}>
        <p style={{ fontWeight: 800, fontSize: 18, color: '#111827', marginBottom: 14 }}>Pesanan Saya</p>
        <div style={{ display: 'flex', gap: 0 }}>
          {[['active','Aktif'],['history','Riwayat']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
              background: 'transparent', fontWeight: tab === k ? 700 : 500,
              fontSize: 14, color: tab === k ? '#F97316' : '#9CA3AF',
              borderBottom: tab === k ? '2.5px solid #F97316' : '2.5px solid transparent',
              transition: 'all 0.2s',
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 14px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #F97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ fontSize: 13 }}>Memuat pesanan...</p>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>🍽️</div>
            <p style={{ fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              {tab === 'active' ? 'Tidak ada pesanan aktif' : 'Belum ada riwayat pesanan'}
            </p>
            <p style={{ fontSize: 13 }}>
              {tab === 'active' ? 'Yuk pesan makanan sekarang!' : 'Pesanan selesai akan muncul di sini.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onTrack={id => navigate(`/food/orders/${id}`)}
                  onConfirm={handleConfirm}
                  onReorder={handleReorder}
                  onRate={setRatingOrder}
                  confirming={confirming}
                  isRated={ratedIds.has(order.id)}
                />
              ))}
            </div>

            {tab === 'history' && hasMore && (
              <button onClick={handleLoadMore} disabled={loadMore} style={{
                display: 'block', width: '100%', marginTop: 14, padding: '12px',
                borderRadius: 12, border: '1.5px solid #E5E7EB',
                background: '#fff', color: '#6B7280',
                fontSize: 13, fontWeight: 600, cursor: loadMore ? 'default' : 'pointer',
              }}>{loadMore ? 'Memuat...' : 'Muat Lebih'}</button>
            )}
          </>
        )}
      </div>

      <BottomNav />

      {ratingOrder && (
        <FoodRatingModal
          order={ratingOrder}
          onClose={() => setRatingOrder(null)}
          onDone={handleRateDone}
        />
      )}
    </div>
  )
}
