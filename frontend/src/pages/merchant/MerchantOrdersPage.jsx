import { useState, useEffect, useRef, useCallback } from 'react'
import MerchantLayout from '../../components/MerchantLayout'
import api from '../../services/api'
import echo from '../../services/echo'
import { useAuth } from '../../context/AuthContext'
import { playNewOrderChime, setupChimeUnlock } from '../../utils/systemNotif'

function fmtRp(v)   { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
function fmtTime(d) { return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }

const STATUS_META = {
  pending:           { label: 'Pesanan Baru!',       color: '#DC2626', bg: '#FEF2F2', border: '#F56565',   icon: '🔔', ring: true  },
  merchant_accepted: { label: 'Diterima — Siap Masak', color: '#7C3AED', bg: '#FAF5FF', border: '#9F7AEA', icon: '✅', ring: false },
  preparing:         { label: 'Sedang Dimasak',       color: '#7C3AED', bg: '#FAF5FF', border: '#9F7AEA',  icon: '👨‍🍳', ring: false },
  ready_for_pickup:  { label: 'Siap — Menunggu Mitra', color: '#027A48', bg: '#ECFDF3', border: '#00C896', icon: '🎉', ring: false },
  mitra_on_pickup:   { label: 'Mitra Menuju Warung',  color: '#1D4ED8', bg: '#EFF6FF', border: '#3B82F6',  icon: '🏍️', ring: false },
  picked_up:         { label: 'Pesanan Diambil Mitra', color: '#1D4ED8', bg: '#EFF6FF', border: '#3B82F6', icon: '📦', ring: false },
  on_delivery:       { label: 'Sedang Dikirim',        color: '#92400E', bg: '#FFFBEB', border: '#F59E0B', icon: '🚀', ring: false },
  delivered:         { label: 'Sampai ke Pelanggan',   color: '#027A48', bg: '#ECFDF3', border: '#00C896', icon: '🎊', ring: false },
  completed:         { label: 'Selesai',               color: '#374151', bg: '#F9FAFB', border: '#E5E7EB', icon: '⭐', ring: false },
  cancelled:         { label: 'Dibatalkan',            color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', icon: '✕',  ring: false },
  rejected:          { label: 'Ditolak',               color: '#DC2626', bg: '#FEF2F2', border: '#F56565', icon: '✕',  ring: false },
}

const ACTIVE = ['pending','merchant_accepted','preparing','ready_for_pickup','mitra_on_pickup','picked_up','on_delivery','delivered']

// ── Progress bar 5 tahap versi merchant ───────────────────────────────────────
const STAGE_LABELS = ['Masuk', 'Masak', 'Siap', 'Dikirim', 'Selesai']
function merchantProgress(status) {
  const map = {
    pending: 0, merchant_accepted: 1,
    preparing: 1,
    ready_for_pickup: 2, mitra_on_pickup: 2, picked_up: 2,
    on_delivery: 3,
    delivered: 4, completed: 4,
  }
  return map[status] ?? 0
}

function MiniProgress({ status }) {
  const idx = merchantProgress(status)
  const sm  = STATUS_META[status] ?? STATUS_META.pending
  return (
    <div style={{ margin: '10px 0 4px' }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= idx ? sm.color : '#E5E7EB',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {STAGE_LABELS.map((l, i) => (
          <span key={i} style={{ fontSize: 10, color: i <= idx ? sm.color : '#9CA3AF', fontWeight: i === idx ? 700 : 400 }}>{l}</span>
        ))}
      </div>
    </div>
  )
}

// ── Countdown timer prep_minutes ───────────────────────────────────────────────
function PrepCountdown({ acceptedAt, prepMinutes }) {
  const [secs, setSecs] = useState(null)
  useEffect(() => {
    if (!acceptedAt || !prepMinutes) return
    const deadline = new Date(acceptedAt).getTime() + prepMinutes * 60000
    const tick = () => setSecs(Math.max(0, Math.round((deadline - Date.now()) / 1000)))
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t)
  }, [acceptedAt, prepMinutes])

  if (secs === null) return null
  const m = Math.floor(secs / 60), s = secs % 60
  const over = secs === 0
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
      borderRadius: 10, background: over ? 'rgba(220,38,38,0.1)' : 'rgba(124,58,237,0.08)',
      border: `1px solid ${over ? '#F56565' : '#DDD6FE'}`, marginBottom: 10,
    }}>
      <span style={{ fontSize: 18 }}>{over ? '⚠️' : '⏱️'}</span>
      <div>
        <p style={{ fontSize: 11, color: over ? '#DC2626' : '#7C3AED', fontWeight: 700 }}>
          {over ? 'Waktu masak habis!' : 'Sisa waktu masak'}
        </p>
        <p style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', color: over ? '#DC2626' : '#111827', lineHeight: 1 }}>
          {over ? '00:00' : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
        </p>
      </div>
    </div>
  )
}

// ── Modal Terima (set prep minutes) ───────────────────────────────────────────
function PrepModal({ order, onClose, onAccepted }) {
  const [mins, setMins] = useState(15)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')
  const sub = useRef(false)

  async function submit() {
    if (sub.current) return
    sub.current = true; setBusy(true); setErr('')
    try {
      await api.post(`/food/merchant/orders/${order.id}/accept`, { prep_minutes: mins })
      onAccepted()
    } catch (e) { setErr(e.response?.data?.message || 'Gagal.'); sub.current = false }
    finally { setBusy(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--k-card)', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxWidth: 480 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>Terima #{order.order_number}</div>
        <div style={{ fontSize: 13, color: 'var(--k-sub)', marginBottom: 18 }}>Berapa menit estimasi pesanan siap?</div>
        {err && <div style={{ color: '#F56565', fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {[10,15,20,30,45,60].map(m => (
            <button key={m} onClick={() => setMins(m)} style={{
              padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: mins === m ? '#F97316' : 'var(--k-input)',
              color: mins === m ? '#fff' : 'var(--k-sub)', fontWeight: mins === m ? 700 : 500, fontSize: 14,
            }}>{m} mnt</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid var(--k-border)', background: 'transparent', color: 'var(--k-sub)', cursor: 'pointer', fontWeight: 600 }}>Batal</button>
          <button onClick={submit} disabled={busy} style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#00C896', color: '#fff', fontWeight: 800, fontSize: 15 }}>
            {busy ? 'Menyimpan...' : '✓ Terima Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Tolak ───────────────────────────────────────────────────────────────
function RejectModal({ order, onClose, onRejected }) {
  const [reason, setReason] = useState('')
  const [busy,   setBusy]   = useState(false)
  const [err,    setErr]    = useState('')
  const sub = useRef(false)

  async function submit() {
    if (sub.current) return
    sub.current = true; setBusy(true); setErr('')
    try {
      await api.post(`/food/merchant/orders/${order.id}/reject`, { reason })
      onRejected()
    } catch (e) { setErr(e.response?.data?.message || 'Gagal.'); sub.current = false }
    finally { setBusy(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--k-card)', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxWidth: 480 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 14 }}>Tolak #{order.order_number}</div>
        {err && <div style={{ color: '#F56565', fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Alasan penolakan (opsional)..."
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 14 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid var(--k-border)', background: 'transparent', color: 'var(--k-sub)', cursor: 'pointer', fontWeight: 600 }}>Batal</button>
          <button onClick={submit} disabled={busy} style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#FEF2F2', color: '#DC2626', fontWeight: 800, fontSize: 15 }}>
            {busy ? 'Memproses...' : 'Tolak Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Detail Order ────────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose }) {
  const sm = STATUS_META[order.status] ?? STATUS_META.pending
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--k-card)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '88dvh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 800, color: sm.color }}>{sm.icon} {sm.label}</span>
            <p style={{ fontSize: 11, color: 'var(--k-sub)', fontFamily: 'monospace', marginTop: 2 }}>#{order.order_number}</p>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--k-input)', cursor: 'pointer', fontSize: 20, color: 'var(--k-sub)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '16px 18px', flex: 1 }}>

          {/* Pelanggan */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--k-muted)', letterSpacing: '0.07em', marginBottom: 8 }}>Pelanggan</p>
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--k-text)', marginBottom: 4 }}>{order.customer?.name}</p>
            {order.customer?.phone && (
              <a href={`tel:${order.customer.phone}`} style={{ fontSize: 13, color: '#1D4ED8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                📞 {order.customer.phone}
              </a>
            )}
          </div>

          {/* Alamat pengiriman */}
          {order.delivery_address && (
            <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 10, background: 'var(--k-input)', border: '1px solid var(--k-border)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--k-muted)', letterSpacing: '0.07em', marginBottom: 6 }}>Alamat Pengiriman</p>
              <p style={{ fontSize: 13, color: 'var(--k-text)', lineHeight: 1.6 }}>📍 {order.delivery_address}</p>
            </div>
          )}

          {/* Item dengan catatan per-item */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--k-muted)', letterSpacing: '0.07em', marginBottom: 8 }}>Item Pesanan</p>
            {order.items?.map(i => (
              <div key={i.id} style={{ marginBottom: 8, padding: '10px 12px', borderRadius: 10, background: 'var(--k-input)', border: '1px solid var(--k-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: i.notes ? 5 : 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)' }}>{i.quantity}× {i.item_name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#F97316', flexShrink: 0, marginLeft: 8 }}>{fmtRp(i.item_price * i.quantity)}</span>
                </div>
                {i.notes && (
                  <p style={{ fontSize: 12, color: 'var(--k-sub)', fontStyle: 'italic', marginTop: 3 }}>📝 {i.notes}</p>
                )}
              </div>
            ))}
          </div>

          {/* Catatan global */}
          {order.notes && (
            <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 10, background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#C2410C', marginBottom: 4 }}>Catatan Pesanan</p>
              <p style={{ fontSize: 13, color: 'var(--k-text)' }}>{order.notes}</p>
            </div>
          )}

          {/* Pembayaran */}
          <div style={{ borderTop: '1px solid var(--k-border)', paddingTop: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--k-sub)', marginBottom: 4 }}>
              <span>Subtotal</span><span>{fmtRp(order.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--k-sub)', marginBottom: 8 }}>
              <span>Ongkir</span><span>{fmtRp(order.delivery_fee)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800 }}>
              <span style={{ color: 'var(--k-text)' }}>Total</span>
              <span style={{ color: '#F97316' }}>{fmtRp(order.total_amount)}</span>
            </div>
            {order.merchant_income > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 5 }}>
                <span style={{ color: 'var(--k-sub)' }}>Pendapatanmu (setelah komisi)</span>
                <span style={{ fontWeight: 700, color: '#027A48' }}>+{fmtRp(order.merchant_income)}</span>
              </div>
            )}
          </div>

          {/* Waktu */}
          <div style={{ borderTop: '1px solid var(--k-border)', paddingTop: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--k-muted)', letterSpacing: '0.07em', marginBottom: 8 }}>Waktu</p>
            {order.created_at  && <p style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 4 }}>📥 Masuk: {fmtTime(order.created_at)}</p>}
            {order.accepted_at && <p style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 4 }}>✅ Diterima: {fmtTime(order.accepted_at)}</p>}
          </div>
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--k-border)', flexShrink: 0 }}>
          <button onClick={onClose} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: 'var(--k-input)', color: 'var(--k-text)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Tutup</button>
        </div>
      </div>
    </div>
  )
}

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order, onAccept, onReject, onAction, onDetail }) {
  const sm  = STATUS_META[order.status] ?? STATUS_META.pending
  const isDone = ['completed','cancelled','rejected'].includes(order.status)
  const isActive = ACTIVE.includes(order.status)

  const nextAction = {
    merchant_accepted: { label: '🍳 Mulai Masak',  endpoint: 'preparing', color: '#7C3AED', bg: '#EDE9FE' },
    preparing:         { label: '✓ Pesanan Siap',  endpoint: 'ready',     color: '#027A48', bg: '#DCFCE7' },
  }[order.status]

  return (
    <div onClick={() => onDetail(order)} style={{
      borderRadius: 16, background: 'var(--k-card)',
      border: `2px solid ${sm.border}`,
      overflow: 'hidden', cursor: 'pointer',
      boxShadow: order.status === 'pending'
        ? `0 0 0 4px rgba(220,38,38,0.12), 0 4px 20px rgba(220,38,38,0.1)`
        : '0 2px 8px rgba(0,0,0,0.06)',
      animation: order.status === 'pending' ? 'ring 2s infinite' : 'none',
    }}>

      {/* ── Status banner ── */}
      <div style={{ background: sm.bg, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${sm.border}40` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {sm.ring && <div style={{ width: 8, height: 8, borderRadius: '50%', background: sm.color, animation: 'blink 1s infinite', flexShrink: 0 }} />}
          <span style={{ fontSize: 13, fontWeight: 800, color: sm.color }}>{sm.icon} {sm.label}</span>
        </div>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{fmtTime(order.created_at)}</span>
      </div>

      <div style={{ padding: '14px 16px' }}>

        {/* ── Progress bar (hanya aktif) ── */}
        {isActive && <MiniProgress status={order.status} />}

        {/* ── Countdown (saat preparing) ── */}
        {(order.status === 'preparing' || order.status === 'merchant_accepted') && order.prep_minutes && (
          <PrepCountdown acceptedAt={order.accepted_at} prepMinutes={order.prep_minutes} />
        )}

        {/* ── Info pelanggan ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--k-border)' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'rgba(249,115,22,0.1)', border: '1.5px solid rgba(249,115,22,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>👤</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)' }}>{order.customer?.name}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: order.payment_method === 'cod' ? 'rgba(249,115,22,0.1)' : 'rgba(0,200,150,0.1)',
                color: order.payment_method === 'cod' ? '#C2410C' : '#027A48',
              }}>{order.payment_method === 'cod' ? '💵 COD' : '💳 Wallet'}</span>
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>#{order.order_number}</div>
            {order.delivery_address && (
              <div style={{ fontSize: 12, color: 'var(--k-sub)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📍 {order.delivery_address}
              </div>
            )}
          </div>
        </div>

        {/* ── Daftar item ── */}
        <div style={{ marginBottom: 12 }}>
          {order.items?.map(i => (
            <div key={i.id} style={{ marginBottom: i.notes ? 8 : 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--k-text)' }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
                  <span style={{ fontWeight: 600 }}>{i.quantity}×</span> {i.item_name}
                </span>
                <span style={{ fontWeight: 500, flexShrink: 0, color: 'var(--k-sub)' }}>{fmtRp(i.item_price * i.quantity)}</span>
              </div>
              {i.notes && (
                <div style={{ fontSize: 12, color: '#D97706', fontStyle: 'italic', marginTop: 3, paddingLeft: 2, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                  <span>📝</span>
                  <span>{i.notes}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Catatan ── */}
        {order.notes && (
          <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 9, background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)', fontSize: 12, color: 'var(--k-text)' }}>
            📝 <span style={{ fontWeight: 600 }}>Catatan:</span> {order.notes}
          </div>
        )}

        {/* ── Info mitra (saat sudah assign) ── */}
        {order.mitra && ['mitra_on_pickup','picked_up','on_delivery','delivered'].includes(order.status) && (
          <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 9, background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ fontSize: 18 }}>🏍️</span>
            <div>
              <span style={{ fontWeight: 700, color: '#1D4ED8' }}>{order.mitra.name}</span>
              <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 6 }}>
                {order.status === 'mitra_on_pickup' ? '— menuju warung' : order.status === 'picked_up' ? '— pesanan diambil' : '— sedang dikirim'}
              </span>
            </div>
          </div>
        )}

        {/* ── Ringkasan keuangan ── */}
        <div style={{ borderTop: '1px solid var(--k-border)', paddingTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--k-sub)', marginBottom: 3 }}>
            <span>Subtotal</span><span>{fmtRp(order.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--k-sub)', marginBottom: 6 }}>
            <span>Ongkir (ditanggung pelanggan)</span><span>{fmtRp(order.delivery_fee)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, marginBottom: order.merchant_income ? 4 : 0 }}>
            <span style={{ color: 'var(--k-text)' }}>Total</span>
            <span style={{ color: '#F97316' }}>{fmtRp(order.total_amount)}</span>
          </div>
          {order.merchant_income > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
              <span style={{ color: '#9CA3AF' }}>Pendapatanmu (setelah komisi)</span>
              <span style={{ fontWeight: 700, color: '#027A48' }}>+{fmtRp(order.merchant_income)}</span>
            </div>
          )}

          {/* ── Tombol aksi ── */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {order.status === 'pending' && (
              <>
                <button onClick={e => { e.stopPropagation(); onReject(order) }} style={{
                  flex: 1, padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: 13,
                }}>Tolak</button>
                <button onClick={e => { e.stopPropagation(); onAccept(order) }} style={{
                  flex: 2, padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: '#00C896', color: '#fff', fontWeight: 800, fontSize: 14,
                }}>✓ Terima Order</button>
              </>
            )}

            {nextAction && (
              <button onClick={e => { e.stopPropagation(); onAction(order.id, nextAction.endpoint) }} style={{
                flex: 1, padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: nextAction.bg, color: nextAction.color, fontWeight: 700, fontSize: 13,
              }}>{nextAction.label}</button>
            )}

            {isDone && (
              <div style={{ flex: 1, textAlign: 'center', color: 'var(--k-sub)', fontSize: 13, padding: '11px 0' }}>
                {order.status === 'completed' ? '✓ Order selesai' : order.status === 'rejected' ? 'Sudah ditolak' : 'Sudah dibatalkan'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function MerchantOrdersPage() {
  const [orders,    setOrders]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('active')
  const [modal,     setModal]     = useState(null) // { type: 'accept'|'reject', order }
  const [detail,    setDetail]    = useState(null) // order object
  const [toast,     setToast]     = useState(null)
  const [syncError, setSyncError] = useState(false)
  const pollRef = useRef(null)
  const { user }  = useAuth()

  const load = useCallback(() => {
    api.get('/food/merchant/orders')
      .then(r => { setOrders(r.data.data || []); setSyncError(false) })
      .catch(() => setSyncError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setupChimeUnlock()
    load()
    const ch = echo.channel(`App.Models.User.${user?.id}`)
    ch.listen('.food.order.created', () => { playNewOrderChime(); load() })
    ch.listen('.food.order.status',  () => load())
    pollRef.current = setInterval(load, 30000)
    return () => { clearInterval(pollRef.current); echo.leave(`App.Models.User.${user?.id}`) }
  }, [load, user?.id])

  function showToast(ok, msg) { setToast({ ok, msg }); setTimeout(() => setToast(null), 3200) }

  async function doAction(orderId, endpoint) {
    try {
      await api.post(`/food/merchant/orders/${orderId}/${endpoint}`)
      showToast(true, 'Status diperbarui.')
      load()
    } catch (e) { showToast(false, e.response?.data?.message || 'Gagal.') }
  }

  const filtered = tab === 'active'
    ? orders.filter(o => ACTIVE.includes(o.status))
    : orders.filter(o => ['completed','cancelled','rejected'].includes(o.status))

  const pendingCount = orders.filter(o => o.status === 'pending').length

  return (
    <MerchantLayout title="Order Masuk" pendingCount={pendingCount}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes ring  { 0%,100%{box-shadow:0 0 0 4px rgba(220,38,38,0.12),0 4px 20px rgba(220,38,38,0.1)} 50%{box-shadow:0 0 0 8px rgba(220,38,38,0.18),0 4px 24px rgba(220,38,38,0.18)} }
        @keyframes spin  { to{transform:rotate(360deg)} }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '11px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13,
          background: toast.ok ? '#00C896' : '#F56565', color: '#fff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', whiteSpace: 'nowrap',
        }}>{toast.msg}</div>
      )}

      {/* Modal */}
      {modal?.type === 'accept' && <PrepModal      order={modal.order} onClose={() => setModal(null)} onAccepted={() => { setModal(null); showToast(true, 'Order diterima!'); load() }} />}
      {modal?.type === 'reject' && <RejectModal    order={modal.order} onClose={() => setModal(null)} onRejected={() => { setModal(null); showToast(true, 'Order ditolak.'); load() }} />}
      {detail                   && <OrderDetailModal order={detail}    onClose={() => setDetail(null)} />}

      <div style={{ maxWidth: 620 }}>

        {/* Sync error */}
        {syncError && (
          <div style={{ padding: '11px 14px', borderRadius: 10, marginBottom: 14, background: 'rgba(245,101,101,0.1)', color: '#F56565', fontSize: 13, fontWeight: 600 }}>
            ⚠ Gagal memuat data. Periksa koneksi.
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--k-border)', marginBottom: 18 }}>
          {[['active','Aktif'],['history','Riwayat']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: '11px', border: 'none', cursor: 'pointer',
              background: 'transparent', fontWeight: tab === k ? 700 : 500, fontSize: 14,
              color: tab === k ? '#F97316' : 'var(--k-sub)',
              borderBottom: tab === k ? '2.5px solid #F97316' : '2.5px solid transparent',
              marginBottom: -2,
            }}>
              {l}{k === 'active' && pendingCount > 0 && (
                <span style={{ marginLeft: 6, background: '#DC2626', color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 20 }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
            <div style={{ width: 26, height: 26, border: '3px solid #F97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13 }}>Memuat order...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🛎️</div>
            <p style={{ fontWeight: 600, color: 'var(--k-text)', marginBottom: 6 }}>
              {tab === 'active' ? 'Belum ada order aktif' : 'Belum ada riwayat order'}
            </p>
            <p style={{ fontSize: 13 }}>{tab === 'active' ? 'Order baru akan muncul di sini secara real-time.' : ''}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onAccept={o => setModal({ type: 'accept', order: o })}
                onReject={o => setModal({ type: 'reject', order: o })}
                onAction={doAction}
                onDetail={o => setDetail(o)}
              />
            ))}
          </div>
        )}
      </div>
    </MerchantLayout>
  )
}
