import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const fmtRp   = v => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtTime = d => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const fmtDate = d => d ? new Date(d).toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'

const STATUS_META = {
  pending:     { label: 'Order Baru',          color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', icon: '🔔' },
  confirmed:   { label: 'Dikonfirmasi',         color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', icon: '✅' },
  traveling:   { label: 'Menuju Lokasi',        color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.35)', icon: '🛵' },
  in_progress: { label: 'Sedang Dikerjakan',    color: '#EC4899', bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.35)', icon: '🔧' },
  completed:   { label: 'Selesai',              color: '#22C55E', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)',  icon: '🎉' },
  cancelled:   { label: 'Dibatalkan',           color: '#EF4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',   icon: '❌' },
}

const FLOW = [
  { key: 'pending',     label: 'Baru'     },
  { key: 'confirmed',   label: 'Konfirm'  },
  { key: 'traveling',   label: 'Berangkat'},
  { key: 'in_progress', label: 'Kerja'    },
  { key: 'completed',   label: 'Selesai'  },
]

function nextStatus(current) {
  const map = { pending: 'confirmed', confirmed: 'traveling', traveling: 'in_progress', in_progress: 'completed' }
  return map[current] ?? null
}
function nextLabel(current) {
  const map = { pending: 'Konfirmasi Order', confirmed: 'Berangkat ke Lokasi', traveling: 'Mulai Kerjakan', in_progress: 'Tandai Selesai' }
  return map[current] ?? ''
}
function canCancel(status) { return status === 'pending' || status === 'confirmed' }

function FlowBar({ status }) {
  if (status === 'cancelled') return null
  const sm  = STATUS_META[status] ?? STATUS_META.pending
  const idx = FLOW.findIndex(s => s.key === status)
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
        {FLOW.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= idx ? sm.color : 'var(--k-border)' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {FLOW.map((s, i) => (
          <span key={i} style={{ fontSize: 9, color: i <= idx ? sm.color : 'var(--k-muted)', fontWeight: i === idx ? 700 : 400 }}>{s.label}</span>
        ))}
      </div>
    </div>
  )
}

function CancelSheet({ onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--k-card)', borderRadius: '20px 20px 0 0', padding: '24px 20px', zIndex: 901, paddingBottom: 'calc(24px + env(safe-area-inset-bottom,0px))' }}>
        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--k-text)', marginBottom: 12 }}>Batalkan Order?</p>
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Alasan (opsional)"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--k-border)', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>Tidak</button>
          <button onClick={() => onConfirm(reason || 'Dibatalkan oleh teknisi')} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Ya, Batalkan</button>
        </div>
      </div>
    </>
  )
}

function OrderCard({ order, onUpdateStatus }) {
  const [busy,       setBusy]       = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const sm      = STATUS_META[order.status] ?? STATUS_META.pending
  const next    = nextStatus(order.status)
  const isPend  = order.status === 'pending'

  async function handleNext() {
    setBusy(true)
    await onUpdateStatus(order.id, next, null)
    setBusy(false)
  }
  async function handleCancel(reason) {
    setShowCancel(false)
    setBusy(true)
    await onUpdateStatus(order.id, 'cancelled', reason)
    setBusy(false)
  }

  const openMaps = () => {
    if (!order.lat && !order.lng && !order.address) return
    const dest = order.lat && order.lng ? `${order.lat},${order.lng}` : encodeURIComponent(order.address)
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank')
  }

  return (
    <>
      {showCancel && <CancelSheet onConfirm={handleCancel} onClose={() => setShowCancel(false)} />}
      <div style={{ borderRadius: 18, background: 'var(--k-card)', border: `2px solid ${sm.border}`, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ background: sm.bg, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: sm.color }}>{sm.icon} {sm.label}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--k-muted)', fontFamily: 'monospace' }}>#{order.order_number}</span>
        </div>

        <div style={{ padding: 14 }}>
          <FlowBar status={order.status} />

          {/* Customer info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--k-input)', border: '1px solid var(--k-border)', marginBottom: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(5,150,105,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)' }}>{order.customer?.name ?? '—'}</p>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {order.address}</p>
              {order.scheduled_at && (
                <p style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 2 }}>🕐 {fmtDate(order.scheduled_at)}</p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', textAlign: 'right' }}>{fmtTime(order.created_at)}</p>
              {(order.lat || order.address) && (
                <button onClick={openMaps} style={{ padding: '3px 10px', borderRadius: 8, border: '1px solid rgba(5,150,105,0.4)', background: 'rgba(5,150,105,0.08)', color: '#059669', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
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
                <p style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{fmtRp(item.subtotal)}</p>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--k-border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 12, color: 'var(--k-muted)', fontWeight: 600 }}>Total</p>
              <p style={{ fontWeight: 800, fontSize: 15, color: '#059669' }}>{fmtRp(order.total_price)}</p>
            </div>
          </div>

          {order.notes && (
            <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.15)', fontSize: 12, color: 'var(--k-muted)', marginBottom: 12 }}>
              📝 {order.notes}
            </div>
          )}

          {/* Action buttons */}
          {next && (
            <div style={{ display: 'flex', gap: 8 }}>
              {canCancel(order.status) && (
                <button onClick={() => setShowCancel(true)} disabled={busy}
                  style={{ flex: 1, padding: '12px 10px', borderRadius: 12, border: '1.5px solid rgba(239,68,68,0.35)', cursor: busy ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
                  Batalkan
                </button>
              )}
              <button onClick={handleNext} disabled={busy}
                style={{ flex: 2, padding: '12px 10px', borderRadius: 12, border: 'none', cursor: busy ? 'default' : 'pointer', fontWeight: 800, fontSize: 13, background: busy ? 'var(--k-border)' : '#059669', color: busy ? 'var(--k-muted)' : '#fff', animation: !busy && isPend ? 'pulse 2s infinite' : 'none' }}>
                {busy ? '...' : nextLabel(order.status)}
              </button>
            </div>
          )}

          {order.status === 'completed' && (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.25)', textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>🎉 Selesai! Pendapatan +{fmtRp(order.provider_income)} dikreditkan ke wallet.</p>
            </div>
          )}
          {order.status === 'cancelled' && order.cancel_reason && (
            <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#EF4444' }}>
              Alasan: {order.cancel_reason}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function ServProviderDashboardPage() {
  const navigate = useNavigate()
  const [provider,      setProvider]      = useState(null)
  const [allOrders,     setAllOrders]     = useState([])
  const [consultations, setConsultations] = useState([])
  const [tab,           setTab]           = useState('pending')
  const [loading,       setLoading]       = useState(true)
  const [toast,         setToast]         = useState(null)
  const pollRef = useRef(null)

  const loadOrders = useCallback(async () => {
    try {
      const [ordersRes, consultRes] = await Promise.all([
        api.get('/serv/provider/orders?per_page=100'),
        api.get('/serv/provider/consultations'),
      ])
      setAllOrders(ordersRes.data.data ?? [])
      setConsultations(consultRes.data.data ?? [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    api.get('/serv/provider/profile').then(r => setProvider(r.data.data)).catch(() => {})
    loadOrders()
    pollRef.current = setInterval(loadOrders, 30000)
    return () => clearInterval(pollRef.current)
  }, [loadOrders])

  async function handleToggleOpen() {
    try {
      const res = await api.post('/serv/provider/toggle-open')
      setProvider(p => ({ ...p, is_open: res.data.is_open }))
      showToast('success', res.data.message)
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal.') }
  }

  async function updateStatus(orderId, status, cancelReason) {
    try {
      const res = await api.patch(`/serv/provider/orders/${orderId}/status`, { status, cancel_reason: cancelReason })
      setAllOrders(os => os.map(o => o.id === orderId ? res.data.data : o))
      showToast('success', 'Status diperbarui.')
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal.') }
  }

  function showToast(type, msg) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  const ACTIVE_STATUSES = ['confirmed', 'traveling', 'in_progress']
  const pending = allOrders.filter(o => o.status === 'pending')
  const active  = allOrders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const history = allOrders.filter(o => o.status === 'completed' || o.status === 'cancelled')

  const todayIncome    = history.filter(o => o.status === 'completed' && new Date(o.completed_at).toDateString() === new Date().toDateString()).reduce((s, o) => s + (o.provider_income ?? 0), 0)
  const todayCompleted = history.filter(o => o.status === 'completed' && new Date(o.completed_at).toDateString() === new Date().toDateString()).length

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '11px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, background: toast.type === 'success' ? '#059669' : '#EF4444', color: '#fff', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {toast.msg}
        </div>
      )}

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#064e3b 0%,#065f46 60%,#047857 100%)', padding: '52px 20px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, position: 'relative' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🔧</div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 16, color: '#fff', lineHeight: 1.2 }}>{provider?.name ?? '...'}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2, textTransform: 'capitalize' }}>{provider?.category ?? ''}</p>
            </div>
          </div>

          {provider?.status === 'active' && (
            <button onClick={handleToggleOpen} style={{ padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12, background: provider?.is_open ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.12)', color: provider?.is_open ? '#4ade80' : 'rgba(255,255,255,0.7)' }}>
              {provider?.is_open ? '● Buka' : '○ Tutup'}
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, position: 'relative' }}>
          {[
            { label: 'Pendapatan', value: fmtRp(todayIncome), sub: 'hari ini', color: '#4ade80' },
            { label: 'Selesai',    value: todayCompleted,      sub: 'hari ini', color: '#60a5fa' },
            { label: 'Aktif',      value: active.length + pending.length, sub: 'order', color: '#fb923c' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 3 }}>{s.value}</p>
              <p style={{ fontSize: 10, color: s.color, fontWeight: 700 }}>{s.label}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {provider?.status === 'pending' && (
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#fbbf24', position: 'relative' }}>
            ⏳ Akun menunggu persetujuan admin
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex' }}>
          {[
            ['pending',       '🔔', 'Order Baru',  pending.length      ],
            ['active',        '⚡', 'Aktif',        active.length       ],
            ['history',       '📋', 'Riwayat',      0                   ],
            ['consultations', '💬', 'Konsultasi',   consultations.length],
          ].map(([k, emoji, label, count]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: '11px 4px 9px', border: 'none', cursor: 'pointer', background: 'transparent', color: tab === k ? '#059669' : 'var(--k-muted)', borderBottom: tab === k ? '2.5px solid #059669' : '2.5px solid transparent', fontWeight: tab === k ? 700 : 400, fontSize: 11 }}>
              <div style={{ fontSize: 17, lineHeight: 1, position: 'relative', display: 'inline-block' }}>
                {emoji}
                {count > 0 && (
                  <span style={{ position: 'absolute', top: -5, right: -8, background: k === 'pending' ? '#EF4444' : '#059669', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 4px', borderRadius: 20, lineHeight: 1.4, animation: k === 'pending' ? 'blink 2s infinite' : 'none' }}>
                    {count}
                  </span>
                )}
              </div>
              <div style={{ marginTop: 3 }}>{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-muted)' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #059669', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13 }}>Memuat...</p>
          </div>
        ) : (
          <>
            {tab === 'pending' && (
              pending.length === 0
                ? <EmptyState icon="🔔" title="Belum ada order baru" sub="Order dari pelanggan akan muncul di sini" />
                : pending.map(o => <OrderCard key={o.id} order={o} onUpdateStatus={updateStatus} />)
            )}
            {tab === 'active' && (
              active.length === 0
                ? <EmptyState icon="⚡" title="Tidak ada order aktif" sub="Order yang sedang diproses muncul di sini" />
                : active.map(o => <OrderCard key={o.id} order={o} onUpdateStatus={updateStatus} />)
            )}
            {tab === 'consultations' && (
              consultations.length === 0
                ? <EmptyState icon="💬" title="Belum ada konsultasi" sub="Pelanggan yang konsultasi sebelum order akan muncul di sini" />
                : consultations.map(c => (
                    <div key={c.id} onClick={() => navigate(`/serv/provider/consults/${c.id}`, { state: { otherName: c.customer?.name } })}
                      style={{ padding: 14, borderRadius: 14, background: 'var(--k-card)', border: '1px solid var(--k-border)', marginBottom: 10, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)' }}>{c.customer?.name ?? 'Pelanggan'}</p>
                        {c.last_message && (
                          <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.last_message.sender_name}: {c.last_message.content}
                          </p>
                        )}
                      </div>
                      {c.last_message && (
                        <p style={{ fontSize: 10, color: 'var(--k-muted)', flexShrink: 0 }}>{fmtTime(c.last_message.created_at)}</p>
                      )}
                    </div>
                  ))
            )}
            {tab === 'history' && (
              history.length === 0
                ? <EmptyState icon="📋" title="Belum ada riwayat" sub="" />
                : history.map(order => {
                    const sm = STATUS_META[order.status] ?? STATUS_META.completed
                    return (
                      <div key={order.id} style={{ padding: 14, borderRadius: 16, background: 'var(--k-card)', border: '1px solid var(--k-border)', marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)' }}>{order.customer?.name ?? '—'}</p>
                            <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 1, fontFamily: 'monospace' }}>#{order.order_number}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg }}>
                              {sm.icon} {sm.label}
                            </span>
                            {order.status === 'completed' && order.provider_income > 0 && (
                              <p style={{ fontSize: 13, color: '#059669', fontWeight: 800, marginTop: 4 }}>+{fmtRp(order.provider_income)}</p>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 8 }}>
                          {order.items?.map(i => `${i.service_name} ${i.quantity}${i.unit}`).join(', ')}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{fmtTime(order.created_at)}</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{fmtRp(order.total_price)}</p>
                        </div>
                      </div>
                    )
                  })
            )}
          </>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'var(--k-card)', borderTop: '1px solid var(--k-border)', display: 'flex', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {[
          { icon: '📋', label: 'Dashboard', path: null },
          { icon: '🔧', label: 'Layanan',   path: '/serv/provider/services' },
          { icon: '👤', label: 'Akun',      path: '/serv/provider/settings' },
        ].map(item => (
          <button key={item.label} onClick={() => item.path && navigate(item.path)}
            style={{ flex: 1, padding: '10px 4px 8px', border: 'none', cursor: 'pointer', background: 'transparent', color: !item.path ? '#059669' : 'var(--k-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: !item.path ? 700 : 400 }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-muted)' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontWeight: 600, color: 'var(--k-text)', marginBottom: 6 }}>{title}</p>
      {sub && <p style={{ fontSize: 13 }}>{sub}</p>}
    </div>
  )
}
