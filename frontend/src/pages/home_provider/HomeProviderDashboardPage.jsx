import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { STATUS_META as BASE_STATUS_META, FLOW_STEPS, getNextActions, getCategoryConfig } from '../../utils/homeServiceConfig'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtRp   = v => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtTime = d => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Tambah border/bg untuk dashboard (melengkapi STATUS_META dari shared config)
const STATUS_EXTRA = {
  pending:     { bg: '#FFFBEB', border: '#F6AD5555', label: 'Order Baru' },
  confirmed:   { bg: '#EEF2FF', border: '#6366F155' },
  picked_up:   { bg: '#FAF5FF', border: '#8B5CF655' },
  processing:  { bg: '#FFF7ED', border: '#F9731655' },
  ready:       { bg: '#ECFDF3', border: '#00C89655' },
  delivering:  { bg: '#EFF6FF', border: '#3B82F655' },
  traveling:   { bg: '#FAF5FF', border: '#8B5CF655' },
  in_progress: { bg: '#FFF7ED', border: '#F9731655' },
  completed:   { bg: '#ECFDF3', border: '#00C89655' },
  cancelled:   { bg: '#F9FAFB', border: '#E5E7EB', color: '#6B7280' },
}

function getStatusMeta(status) {
  const base  = BASE_STATUS_META[status] ?? { label: status, color: '#A0A0BC', icon: '?' }
  const extra = STATUS_EXTRA[status] ?? {}
  return { ...base, ...extra }
}

// ── Progress stepper ──────────────────────────────────────────────────────────
function FlowSteps({ status, category }) {
  const cfg   = getCategoryConfig(category)
  const steps = FLOW_STEPS[cfg.flow]
  const meta  = getStatusMeta(status)
  const idx   = steps.findIndex(s => s.key === status)
  if (idx < 0 || ['cancelled'].includes(status)) return null

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
        {steps.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= idx ? meta.color : 'var(--k-border)' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {steps.map((s, i) => (
          <span key={i} style={{ fontSize: 9, color: i <= idx ? meta.color : 'var(--k-muted)', fontWeight: i === idx ? 700 : 400 }}>{s.label}</span>
        ))}
      </div>
    </div>
  )
}

// ── Cancel modal ──────────────────────────────────────────────────────────────
function CancelSheet({ onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--k-surface)', borderRadius: '20px 20px 0 0', padding: '24px 20px', zIndex: 901, paddingBottom: 'calc(24px + env(safe-area-inset-bottom,0px))' }}>
        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--k-text)', marginBottom: 12 }}>Tolak / Batalkan Order?</p>
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Alasan (opsional)"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>Batal</button>
          <button onClick={() => onConfirm(reason || 'Ditolak oleh provider')} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#F56565', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Tolak Order</button>
        </div>
      </div>
    </>
  )
}

// ── Single order card ─────────────────────────────────────────────────────────
function OrderCard({ order, onUpdateStatus }) {
  const navigate = useNavigate()
  const [busy,       setBusy]       = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const category = order.provider?.category ?? 'laundry'
  const cfg      = getCategoryConfig(category)
  const sm       = getStatusMeta(order.status)
  const actions  = getNextActions(order)
  const isPending = order.status === 'pending'
  const isOnSite  = cfg.flow === 'on_site'

  async function handleAction(nextStatus) {
    if (nextStatus === 'cancelled') { setShowCancel(true); return }
    setBusy(true)
    await onUpdateStatus(order.id, nextStatus, null)
    setBusy(false)
  }

  async function handleCancel(reason) {
    setShowCancel(false)
    setBusy(true)
    await onUpdateStatus(order.id, 'cancelled', reason)
    setBusy(false)
  }

  return (
    <>
      {showCancel && <CancelSheet onConfirm={handleCancel} onClose={() => setShowCancel(false)} />}

      <div style={{ borderRadius: 18, background: 'var(--k-card)', border: `2px solid ${sm.border}`, overflow: 'hidden', marginBottom: 14 }}>
        {/* Status banner */}
        <div style={{ background: sm.bg, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: sm.color }}>{sm.icon} {sm.label}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--k-muted)', fontFamily: 'monospace' }}>#{order.order_number}</span>
        </div>

        <div style={{ padding: 14 }}>
          {/* Progress bar */}
          <FlowSteps status={order.status} category={category} />

          {/* Customer info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--k-input)', border: '1px solid var(--k-border)', marginBottom: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)' }}>{order.customer?.name}</p>
                {isOnSite ? (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, flexShrink: 0, background: 'rgba(99,102,241,0.12)', color: '#6366F1' }}>
                    {cfg.icon} On-Site
                  </span>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, flexShrink: 0,
                    background: order.pickup_type === 'antar_jemput' ? 'rgba(59,130,246,0.12)' : 'rgba(160,160,188,0.12)',
                    color: order.pickup_type === 'antar_jemput' ? '#3B82F6' : 'var(--k-muted)' }}>
                    {order.pickup_type === 'antar_jemput' ? '🚚 Antar Jemput' : '🏃 Mandiri'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📍 {order.pickup_address}
              </p>
              {order.scheduled_pickup_at && (
                <p style={{ fontSize: 11, color: '#6366F1', fontWeight: 600, marginTop: 2 }}>
                  🕐 {new Date(order.scheduled_pickup_at).toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{fmtTime(order.created_at)}</p>
              {order.status !== 'cancelled' && (
                <button
                  onClick={() => navigate(`/home/provider/orders/${order.id}/chat`, { state: { otherName: order.customer?.name } })}
                  style={{ padding: '3px 10px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.08)', color: '#6366F1', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  💬 Chat
                </button>
              )}
              {isOnSite && (order.pickup_lat && order.pickup_lng || order.pickup_address) && (
                <button
                  onClick={() => {
                    const dest = order.pickup_lat && order.pickup_lng
                      ? `${order.pickup_lat},${order.pickup_lng}`
                      : encodeURIComponent(order.pickup_address)
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank')
                  }}
                  style={{ padding: '3px 10px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.08)', color: '#16a34a', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  🗺️ Maps
                </button>
              )}
            </div>
          </div>

          {/* Items */}
          <div style={{ borderRadius: 10, background: 'var(--k-input)', padding: '10px 12px', marginBottom: 12 }}>
            {order.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: i < order.items.length - 1 ? 6 : 0 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)' }}>{item.service_name}</p>
                  <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{item.quantity} {item.unit}</p>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#6366F1' }}>{fmtRp(item.subtotal)}</p>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--k-border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 12, color: 'var(--k-muted)', fontWeight: 600 }}>Total</p>
              <p style={{ fontWeight: 800, fontSize: 15, color: '#6366F1' }}>{fmtRp(order.total_price)}</p>
            </div>
          </div>

          {order.notes && (
            <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, color: 'var(--k-muted)', marginBottom: 12 }}>
              📝 {order.notes}
            </div>
          )}

          {/* Action buttons */}
          {actions.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {actions.map(a => (
                <button key={a.status} onClick={() => handleAction(a.status)} disabled={busy}
                  style={{
                    flex: 1, padding: '13px 10px', borderRadius: 12, border: a.danger ? `1.5px solid rgba(245,101,101,0.35)` : 'none',
                    cursor: busy ? 'default' : 'pointer', fontWeight: 800, fontSize: 13,
                    background: busy ? 'var(--k-border)' : a.danger ? 'rgba(245,101,101,0.08)' : a.color,
                    color: busy ? 'var(--k-muted)' : a.danger ? '#F56565' : '#fff',
                    animation: !busy && !a.danger && isPending ? 'pulse 2s infinite' : 'none',
                  }}>
                  {busy ? '...' : a.label}
                </button>
              ))}
            </div>
          )}

          {/* Done state */}
          {order.status === 'completed' && (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.25)', textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#027A48' }}>🎉 Order selesai! Pendapatan dikreditkan ke wallet.</p>
            </div>
          )}
          {order.status === 'cancelled' && order.cancel_reason && (
            <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(245,101,101,0.06)', border: '1px solid rgba(245,101,101,0.2)', fontSize: 12, color: '#F56565' }}>
              Alasan: {order.cancel_reason}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomeProviderDashboardPage() {
  const navigate = useNavigate()
  const [provider,  setProvider]  = useState(null)
  const [allOrders, setAllOrders] = useState([])
  const [tab,       setTab]       = useState('active')
  const [loading,   setLoading]   = useState(true)
  const [toast,     setToast]     = useState(null)
  const pollRef = useRef(null)

  const loadOrders = useCallback(async () => {
    try {
      const res = await api.get('/home/provider/orders?per_page=100')
      setAllOrders(res.data.data ?? [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    api.get('/home/provider/profile').then(r => setProvider(r.data.data)).catch(() => {})
    loadOrders()
    pollRef.current = setInterval(loadOrders, 30000)
    return () => clearInterval(pollRef.current)
  }, [loadOrders])

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
      setAllOrders(os => os.map(o => o.id === orderId ? res.data.data : o))
      showToast('success', 'Status diperbarui.')
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal.') }
  }

  function showToast(type, msg) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  const ACTIVE_STATUSES  = ['confirmed', 'picked_up', 'processing', 'ready', 'delivering', 'traveling', 'in_progress']
  const HISTORY_STATUSES = ['completed', 'cancelled']

  const pending = allOrders.filter(o => o.status === 'pending')
  const active  = allOrders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const history = allOrders.filter(o => HISTORY_STATUSES.includes(o.status))

  const todayIncome    = history.filter(o => o.status === 'completed' && new Date(o.completed_at).toDateString() === new Date().toDateString()).reduce((s, o) => s + (o.provider_income ?? 0), 0)
  const todayCompleted = history.filter(o => o.status === 'completed' && new Date(o.completed_at).toDateString() === new Date().toDateString()).length
  const cfg            = getCategoryConfig(provider?.category)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '11px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {toast.msg}
        </div>
      )}

      {/* ── Hero card ── */}
      <div style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#4c1d95 100%)', padding: '52px 20px 20px', position: 'relative', overflow: 'hidden' }}>
        {/* decorative circles */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, position: 'relative' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
              {cfg.icon}
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 16, color: '#fff', lineHeight: 1.2 }}>{provider?.name ?? '...'}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2, textTransform: 'capitalize' }}>{provider?.category ?? ''}</p>
            </div>
          </div>

          {provider?.status === 'active' && (
            <button onClick={handleToggleOpen} style={{
              padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12,
              background: provider?.is_open ? 'rgba(0,200,150,0.2)' : 'rgba(255,255,255,0.12)',
              color: provider?.is_open ? '#00C896' : 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(4px)',
            }}>
              {provider?.is_open ? '● Buka' : '○ Tutup'}
            </button>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, position: 'relative' }}>
          <StatCard label="Pendapatan" value={fmtRp(todayIncome)} sub="hari ini" color="#00C896" />
          <StatCard label="Selesai" value={todayCompleted} sub="hari ini" color="#6366F1" />
          <StatCard label="Aktif" value={active.length + pending.length} sub="order" color="#F97316" />
        </div>

        {provider?.status === 'pending' && (
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(246,173,85,0.15)', border: '1px solid rgba(246,173,85,0.3)', fontSize: 12, color: '#F6AD55', position: 'relative' }}>
            ⏳ Akun menunggu persetujuan admin
          </div>
        )}
      </div>

      {/* ── Sticky Tabs ── */}
      <div style={{ background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex' }}>
          {[
            ['pending', '🔔', 'Order Baru', pending.length],
            ['active',  '⚡', 'Aktif',      active.length ],
            ['history', '📋', 'Riwayat',    0             ],
          ].map(([k, emoji, label, count]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: '11px 4px 9px', border: 'none', cursor: 'pointer', background: 'transparent',
              color: tab === k ? '#6366F1' : 'var(--k-sub)',
              borderBottom: tab === k ? '2.5px solid #6366F1' : '2.5px solid transparent',
              fontWeight: tab === k ? 700 : 400, fontSize: 11,
            }}>
              <div style={{ fontSize: 17, lineHeight: 1, position: 'relative', display: 'inline-block' }}>
                {emoji}
                {count > 0 && (
                  <span style={{ position: 'absolute', top: -5, right: -8, background: k === 'pending' ? '#F56565' : '#6366F1', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 4px', borderRadius: 20, lineHeight: 1.4, animation: k === 'pending' ? 'blink 2s infinite' : 'none' }}>
                    {count}
                  </span>
                )}
              </div>
              <div style={{ marginTop: 3 }}>{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '14px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13 }}>Memuat...</p>
          </div>
        ) : (
          <>
            {tab === 'pending' && (
              pending.length === 0 ? <EmptyState icon="🔔" title="Belum ada order baru" sub="Order masuk akan muncul di sini" /> :
              pending.map(order => <OrderCard key={order.id} order={order} onUpdateStatus={updateStatus} />)
            )}
            {tab === 'active' && (
              active.length === 0 ? <EmptyState icon="⚡" title="Tidak ada order aktif" sub="Order yang sedang diproses muncul di sini" /> :
              active.map(order => <OrderCard key={order.id} order={order} onUpdateStatus={updateStatus} />)
            )}
            {tab === 'history' && (
              history.length === 0 ? <EmptyState icon="📋" title="Belum ada riwayat" sub="" /> :
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map(order => {
                  const sm = getStatusMeta(order.status)
                  return (
                    <div key={order.id} style={{ padding: 14, borderRadius: 16, background: 'var(--k-card)', border: '1px solid var(--k-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)' }}>{order.customer?.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 1, fontFamily: 'monospace' }}>#{order.order_number}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg }}>
                            {sm.icon} {sm.label}
                          </span>
                          {order.status === 'completed' && order.provider_income > 0 && (
                            <p style={{ fontSize: 13, color: '#027A48', fontWeight: 800, marginTop: 4 }}>+{fmtRp(order.provider_income)}</p>
                          )}
                        </div>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 8 }}>
                        {order.items?.map(i => `${i.service_name} ${i.quantity}${i.unit}`).join(', ')}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{fmtTime(order.created_at)}</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#6366F1' }}>{fmtRp(order.total_price)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Bottom Navigation ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--k-card)', borderTop: '1px solid var(--k-border)',
        display: 'flex', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {[
          { icon: '📋', label: 'Dashboard', action: null          },
          { icon: '🧺', label: 'Layanan',   action: '/home/provider/services'  },
          { icon: '👤', label: 'Akun',      action: '/home/provider/settings'  },
        ].map(item => (
          <button key={item.label} onClick={() => item.action && navigate(item.action)}
            style={{
              flex: 1, padding: '10px 4px 8px', border: 'none', cursor: 'pointer', background: 'transparent',
              color: !item.action ? '#6366F1' : 'var(--k-sub)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: !item.action ? 700 : 400 }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 10px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 3 }}>{value}</p>
      <p style={{ fontSize: 10, color: color, fontWeight: 700 }}>{label}</p>
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
    </div>
  )
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontWeight: 600, color: 'var(--k-text)', marginBottom: 6 }}>{title}</p>
      {sub && <p style={{ fontSize: 13 }}>{sub}</p>}
    </div>
  )
}
