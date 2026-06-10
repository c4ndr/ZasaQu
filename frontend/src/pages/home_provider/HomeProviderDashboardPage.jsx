import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtRp   = v => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtTime = d => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:    { label: 'Order Baru',     color: '#F6AD55', bg: '#FFFBEB', border: '#F6AD5555', icon: '🔔', step: 0 },
  confirmed:  { label: 'Dikonfirmasi',   color: '#6366F1', bg: '#EEF2FF', border: '#6366F155', icon: '✅', step: 1 },
  picked_up:  { label: 'Sudah Dijemput', color: '#8B5CF6', bg: '#FAF5FF', border: '#8B5CF655', icon: '🚚', step: 2 },
  processing: { label: 'Sedang Diproses',color: '#F97316', bg: '#FFF7ED', border: '#F9731655', icon: '⚙️', step: 3 },
  ready:      { label: 'Siap Diantar',   color: '#00C896', bg: '#ECFDF3', border: '#00C89655', icon: '📦', step: 4 },
  delivering: { label: 'Sedang Diantar', color: '#3B82F6', bg: '#EFF6FF', border: '#3B82F655', icon: '🛵', step: 5 },
  completed:  { label: 'Selesai',        color: '#027A48', bg: '#ECFDF3', border: '#00C89655', icon: '✓',  step: 6 },
  cancelled:  { label: 'Dibatalkan',     color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB',   icon: '✕',  step: -1 },
}

const NEXT_ACTION = {
  pending:    [{ status: 'confirmed',  label: '✓ Terima Order',          color: '#6366F1' },
               { status: 'cancelled', label: '✗ Tolak',                  color: '#F56565', danger: true }],
  confirmed:  [{ status: 'picked_up', label: '🚚 Sudah Jemput Laundry',  color: '#8B5CF6' }],
  picked_up:  [{ status: 'processing',label: '⚙️ Mulai Cuci',            color: '#F97316' }],
  processing: [{ status: 'ready',     label: '📦 Selesai, Siap Antar',   color: '#00C896' }],
  ready:      [{ status: 'delivering',label: '🛵 Berangkat Antar',        color: '#3B82F6' },
               { status: 'completed', label: '✓ Selesai di Lokasi',      color: '#027A48' }],
  delivering: [{ status: 'completed', label: '✓ Sudah Sampai ke Customer',color: '#027A48' }],
}

// Step labels for progress bar
const STEPS = ['Terima', 'Jemput', 'Proses', 'Siap', 'Antar', 'Selesai']

// ── Progress stepper ──────────────────────────────────────────────────────────
function FlowSteps({ status }) {
  const meta = STATUS_META[status]
  if (!meta || meta.step < 0) return null
  const idx = meta.step  // 0=pending,1=confirmed,2=picked_up,3=processing,4=ready,5=delivering,6=completed
  // Map step index (0-6) to stepper index (0-5)
  const stepperIdx = Math.max(0, idx - 1) // confirmed=0, picked_up=1, processing=2, ready=3, delivering=4, completed=5
  const filled = status === 'pending' ? -1 : stepperIdx

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= filled ? meta.color : 'var(--k-border)' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {STEPS.map((l, i) => (
          <span key={i} style={{ fontSize: 9, color: i <= filled ? meta.color : 'var(--k-muted)', fontWeight: i === filled ? 700 : 400 }}>{l}</span>
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
  const [busy,       setBusy]       = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const sm      = STATUS_META[order.status] ?? STATUS_META.cancelled
  const actions = NEXT_ACTION[order.status] ?? []
  const isPending = order.status === 'pending'

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
          <FlowSteps status={order.status} />

          {/* Customer info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--k-input)', border: '1px solid var(--k-border)', marginBottom: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)' }}>{order.customer?.name}</p>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {order.pickup_address}</p>
            </div>
            <p style={{ fontSize: 12, color: 'var(--k-muted)', flexShrink: 0 }}>{fmtTime(order.created_at)}</p>
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

  const ACTIVE_STATUSES  = ['confirmed', 'picked_up', 'processing', 'ready', 'delivering']
  const HISTORY_STATUSES = ['completed', 'cancelled']

  const pending = allOrders.filter(o => o.status === 'pending')
  const active  = allOrders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const history = allOrders.filter(o => HISTORY_STATUSES.includes(o.status))

  const todayIncome = history
    .filter(o => o.status === 'completed' && new Date(o.completed_at).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + (o.provider_income ?? 0), 0)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '11px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ padding: '14px 16px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: 17, color: 'var(--k-text)' }}>🏠 ZasaHome Provider</p>
              <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 1 }}>{provider?.name ?? '...'}</p>
              {todayIncome > 0 && <p style={{ fontSize: 12, color: '#027A48', fontWeight: 600, marginTop: 1 }}>Hari ini: +{fmtRp(todayIncome)}</p>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              {provider?.status === 'active' && (
                <button onClick={handleToggleOpen} style={{
                  padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                  background: provider?.is_open ? 'rgba(245,101,101,0.12)' : 'rgba(0,200,150,0.12)',
                  color: provider?.is_open ? '#F56565' : '#00C896',
                }}>
                  {provider?.is_open ? '● Tutup' : '● Buka'}
                </button>
              )}
              <button onClick={() => navigate('/home/provider/services')} style={{ padding: '7px 10px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-sub)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                🧺 Layanan
              </button>
              <button onClick={() => navigate('/home/provider/settings')} style={{ padding: '7px 10px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-sub)', fontSize: 16, cursor: 'pointer' }}>
                ⚙️
              </button>
            </div>
          </div>

          {provider?.status === 'pending' && (
            <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(246,173,85,0.1)', border: '1px solid rgba(246,173,85,0.3)', fontSize: 12, color: '#F6AD55', marginBottom: 4 }}>
              ⏳ Akun sedang menunggu persetujuan admin.
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--k-border)' }}>
          {[
            ['pending', '🔔', 'Order Baru', pending.length],
            ['active',  '⚙️', 'Aktif',      active.length ],
            ['history', '📜', 'Riwayat',    0             ],
          ].map(([k, emoji, label, count]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, padding: '10px 4px 8px', border: 'none', cursor: 'pointer', background: 'transparent',
              color: tab === k ? '#6366F1' : 'var(--k-sub)',
              borderBottom: tab === k ? '2.5px solid #6366F1' : '2.5px solid transparent',
              fontWeight: tab === k ? 700 : 400, fontSize: 11,
            }}>
              <div style={{ fontSize: 18, lineHeight: 1, position: 'relative', display: 'inline-block' }}>
                {emoji}
                {count > 0 && (
                  <span style={{ position: 'absolute', top: -5, right: -8, background: k === 'pending' ? '#F56565' : '#6366F1', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 4px', borderRadius: 20, lineHeight: 1.4, animation: k === 'pending' && count > 0 ? 'blink 2s infinite' : 'none' }}>
                    {count}
                  </span>
                )}
              </div>
              <div style={{ marginTop: 2 }}>{label}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13 }}>Memuat...</p>
          </div>
        ) : (
          <>
            {/* ── Tab: Order Baru ── */}
            {tab === 'pending' && (
              pending.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
                  <p style={{ fontWeight: 600, color: 'var(--k-text)', marginBottom: 6 }}>Belum ada order baru</p>
                  <p style={{ fontSize: 13 }}>Order masuk akan muncul di sini.</p>
                </div>
              ) : (
                pending.map(order => <OrderCard key={order.id} order={order} onUpdateStatus={updateStatus} />)
              )
            )}

            {/* ── Tab: Aktif ── */}
            {tab === 'active' && (
              active.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>⚙️</div>
                  <p style={{ fontWeight: 600, color: 'var(--k-text)', marginBottom: 6 }}>Tidak ada order aktif</p>
                  <p style={{ fontSize: 13 }}>Order yang sedang diproses akan muncul di sini.</p>
                </div>
              ) : (
                active.map(order => <OrderCard key={order.id} order={order} onUpdateStatus={updateStatus} />)
              )
            )}

            {/* ── Tab: Riwayat ── */}
            {tab === 'history' && (
              history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📜</div>
                  <p>Belum ada riwayat order.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {history.map(order => {
                    const sm = STATUS_META[order.status] ?? STATUS_META.cancelled
                    return (
                      <div key={order.id} style={{ padding: 14, borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: 14 }}>{order.customer?.name}</p>
                            <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 1, fontFamily: 'monospace' }}>#{order.order_number}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ display: 'block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg }}>
                              {sm.icon} {sm.label}
                            </span>
                            {order.status === 'completed' && order.provider_income > 0 && (
                              <p style={{ fontSize: 13, color: '#027A48', fontWeight: 800, marginTop: 4 }}>+{fmtRp(order.provider_income)}</p>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>
                          {order.items?.map(i => `${i.service_name} ${i.quantity}${i.unit}`).join(', ')}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                          <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{fmtTime(order.created_at)}</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#6366F1' }}>{fmtRp(order.total_price)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}
