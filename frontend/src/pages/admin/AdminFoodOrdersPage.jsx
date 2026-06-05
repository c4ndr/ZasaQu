import { useState, useEffect, useCallback, useRef } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

function fmtRp(v)   { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
function fmtDate(d) { return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }

const STATUS_META = {
  pending:           { label: 'Menunggu Merchant', color: '#F6AD55', bg: 'rgba(246,173,85,0.12)',   icon: '⏳', pulse: true  },
  merchant_accepted: { label: 'Diterima',          color: '#63B3ED', bg: 'rgba(99,179,237,0.12)',   icon: '✅', pulse: false },
  preparing:         { label: 'Dimasak',           color: '#9F7AEA', bg: 'rgba(159,122,234,0.12)',  icon: '👨‍🍳', pulse: true  },
  ready_for_pickup:  { label: 'Siap Diambil',      color: '#00C896', bg: 'rgba(0,200,150,0.12)',    icon: '🎉', pulse: true  },
  mitra_on_pickup:   { label: 'Mitra Menuju Warung', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', icon: '🏍️', pulse: true  },
  picked_up:         { label: 'Diambil Mitra',     color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',   icon: '📦', pulse: false },
  on_delivery:       { label: 'Dalam Perjalanan',  color: '#F97316', bg: 'rgba(249,115,22,0.12)',   icon: '🚀', pulse: true  },
  delivered:         { label: 'Sampai Tujuan',     color: '#00C896', bg: 'rgba(0,200,150,0.15)',    icon: '🎊', pulse: true  },
  completed:         { label: 'Selesai',           color: '#00C896', bg: 'rgba(0,200,150,0.08)',    icon: '⭐', pulse: false },
  cancelled:         { label: 'Dibatalkan',        color: '#A0A0BC', bg: 'rgba(160,160,188,0.08)', icon: '❌', pulse: false },
  rejected:          { label: 'Ditolak Merchant',  color: '#F56565', bg: 'rgba(245,101,101,0.08)', icon: '❌', pulse: false },
}

const TABS = [
  { key: 'active',    label: 'Aktif',      statuses: ['pending','merchant_accepted','preparing','ready_for_pickup','mitra_on_pickup','picked_up','on_delivery','delivered'] },
  { key: 'completed', label: 'Selesai',    statuses: ['completed'] },
  { key: 'problem',   label: 'Bermasalah', statuses: ['cancelled','rejected'] },
  { key: 'all',       label: 'Semua',      statuses: null },
]

const ACTIVE_STATUSES = ['pending','merchant_accepted','preparing','ready_for_pickup','mitra_on_pickup','picked_up','on_delivery','delivered']

// ── Drawer detail keuangan ────────────────────────────────────────────────────
function OrderDrawer({ order, onClose }) {
  const sm = STATUS_META[order.status] ?? STATUS_META.pending
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--k-card)', height: '100%', overflowY: 'auto', padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>#{order.order_number}</div>
            <div style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 3 }}>{fmtDate(order.created_at)}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--k-sub)' }}>×</button>
        </div>

        <span style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 20, color: sm.color, background: sm.bg }}>
          {sm.icon} {sm.label}
        </span>

        {/* Rute pengiriman */}
        <div style={{ background: 'var(--k-input)', borderRadius: 12, padding: '14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2, gap: 2, flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C896' }} />
              <div style={{ width: 1.5, height: 16, background: 'var(--k-border)' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F56565' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 2 }}>Dari (Warung)</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 12 }}>🏪 {order.merchant?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 2 }}>Antar ke (Pelanggan)</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)' }}>📍 {order.delivery_address}</div>
            </div>
          </div>
        </div>

        {[
          ['Pelanggan',    order.customer?.name],
          ['Mitra',        order.mitra?.name ?? '— (belum assign)'],
          ['Metode Bayar', order.payment_method === 'wallet' ? 'Saldo ZasaQu' : 'COD (Tunai)'],
          ['Status Bayar', order.payment_status],
        ].map(([l, v]) => v && (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
            <span style={{ color: 'var(--k-sub)' }}>{l}</span>
            <span style={{ fontWeight: 600, maxWidth: '55%', textAlign: 'right' }}>{v}</span>
          </div>
        ))}

        {order.notes && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)', fontSize: 12, color: 'var(--k-sub)', marginBottom: 12 }}>
            📝 {order.notes}
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--k-border)', margin: '16px 0' }} />

        <div style={{ fontWeight: 700, marginBottom: 10 }}>Item Pesanan</div>
        {order.items?.map(i => (
          <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span>{i.item_name} ×{i.quantity}</span>
            <span>{fmtRp(i.item_price * i.quantity)}</span>
          </div>
        ))}

        <div style={{ borderTop: '1px solid var(--k-border)', margin: '12px 0' }} />

        {[
          ['Subtotal',         fmtRp(order.subtotal)],
          ['Ongkir',           fmtRp(order.delivery_fee)],
          ['Komisi Makanan',   fmtRp(order.platform_commission_food)],
          ['Komisi Ongkir',    fmtRp(order.platform_commission_delivery)],
          ['Merchant Terima',  fmtRp(order.merchant_income)],
          ['Mitra Terima',     fmtRp(order.mitra_income)],
        ].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--k-sub)' }}>{l}</span>
            <span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, marginTop: 8, borderTop: '1px solid var(--k-border)', paddingTop: 10 }}>
          <span>Total</span><span style={{ color: '#F97316' }}>{fmtRp(order.total_amount)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Halaman Utama ─────────────────────────────────────────────────────────────
export default function AdminFoodOrdersPage() {
  const [orders,       setOrders]       = useState([])
  const [meta,         setMeta]         = useState({})
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState('active')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [selected,     setSelected]     = useState(null)
  const [actionId,     setActionId]     = useState(null)
  const [showCancel,   setShowCancel]   = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [toast,        setToast]        = useState(null)
  const pollRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const activeTab = TABS.find(t => t.key === tab)
      const params    = { page }
      if (activeTab?.statuses) params.status = activeTab.statuses.join(',')
      if (search) params.search = search
      const res = await api.get('/admin/food/orders', { params })
      setOrders(res.data.data || [])
      setMeta(res.data.meta ?? {})
    } catch {} finally { setLoading(false) }
  }, [tab, search, page])

  useEffect(() => { setPage(1) }, [tab, search])
  useEffect(() => { load() }, [load])

  // Polling 30 detik untuk tab aktif
  useEffect(() => {
    if (tab !== 'active') return
    pollRef.current = setInterval(load, 30000)
    return () => clearInterval(pollRef.current)
  }, [tab, load])

  function showToast(type, msg) { setToast({ type, msg }); setTimeout(() => setToast(null), 3500) }

  async function forceComplete(id) {
    setActionId(id)
    try {
      await api.post(`/admin/food/orders/${id}/force-complete`)
      showToast('success', 'Order diselesaikan.')
      load()
    } catch (e) { showToast('error', e.response?.data?.message || 'Gagal.') }
    finally { setActionId(null) }
  }

  async function forceCancel(id) {
    if (!cancelReason.trim()) return
    setActionId(id)
    try {
      await api.post(`/admin/food/orders/${id}/force-cancel`, { reason: cancelReason })
      showToast('success', 'Order dibatalkan.')
      setShowCancel(null); setCancelReason('')
      load()
    } catch (e) { showToast('error', e.response?.data?.message || 'Gagal.') }
    finally { setActionId(null) }
  }

  return (
    <AdminLayout>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>

      {selected && <OrderDrawer order={selected} onClose={() => setSelected(null)} />}

      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 14,
          background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Order ZasaFood</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--k-muted)' }}>Monitor pesanan makanan dan minuman dari merchant</p>
        </div>
        <button onClick={load} style={{
          padding: '8px 16px', borderRadius: 10, border: '1px solid var(--k-border)',
          background: 'var(--k-card)', color: 'var(--k-sub)', fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>↻ Refresh</button>
      </div>

      {/* Tabs + Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 18px', borderRadius: 20, cursor: 'pointer',
            fontWeight: tab === t.key ? 700 : 500, fontSize: 13,
            border: `1px solid ${tab === t.key ? '#F9731640' : 'var(--k-border)'}`,
            background: tab === t.key ? 'rgba(249,115,22,0.12)' : 'var(--k-card)',
            color: tab === t.key ? '#F97316' : 'var(--k-sub)',
          }}>{t.label}</button>
        ))}
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nomor order, warung, atau pelanggan..."
          style={{
            marginLeft: 'auto', padding: '9px 16px', borderRadius: 10, fontSize: 13,
            border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)',
            boxSizing: 'border-box', outline: 'none', width: 320,
          }} />
      </div>

      {/* Order list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-muted)' }}>Memuat...</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 36, marginBottom: 10 }}>🍜</p>
          <p style={{ color: 'var(--k-text)', fontWeight: 700, marginBottom: 4 }}>Tidak ada order</p>
          <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Pesanan ZasaFood akan tampil di sini</p>
        </div>
      ) : (
          <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, overflow: 'hidden' }}>
            {orders.map((order, i) => {
              const sm     = STATUS_META[order.status] ?? STATUS_META.pending
              const isLive = ACTIVE_STATUSES.includes(order.status)
              const isFinal = ['completed','cancelled','rejected'].includes(order.status)
              const canComplete = order.status === 'delivered'
              const canCancel   = !isFinal

              return (
                <div key={order.id} onClick={() => setSelected(order)}
                  onMouseEnter={e => { if (!e.currentTarget.querySelector('input:focus')) e.currentTarget.style.background = 'var(--k-surface)' }}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  style={{ padding: '16px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--k-border)', cursor: 'pointer', transition: 'background .1s' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>

                    {/* Info utama */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Baris 1: nomor + status badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                        <code style={{ fontSize: 11, color: 'var(--k-muted)', background: 'var(--k-input)', padding: '2px 8px', borderRadius: 6 }}>
                          {order.order_number}
                        </code>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg }}>
                          {sm.pulse && isLive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: sm.color, animation: 'blink 2s infinite', flexShrink: 0 }} />}
                          {sm.icon} {sm.label}
                        </span>
                        <span style={{
                          padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                          background: order.payment_method === 'cod' ? 'rgba(249,115,22,0.1)' : 'rgba(0,200,150,0.1)',
                          color: order.payment_method === 'cod' ? '#F97316' : '#00C896',
                        }}>{order.payment_method === 'cod' ? 'COD' : 'Wallet'}</span>
                      </div>

                      {/* Baris 2: rute Warung → Alamat antar (seperti ZasaGo) */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3, gap: 2, flexShrink: 0 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00C896' }} />
                          <div style={{ width: 1.5, height: 14, background: 'var(--k-border)' }} />
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F56565' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            🏪 {order.merchant?.name}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--k-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📍 {order.delivery_address}
                          </p>
                        </div>
                      </div>

                      {/* Baris 3: pelanggan + mitra + waktu */}
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#F97316' }}>{fmtRp(order.total_amount)}</span>
                        <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>
                          👤 {order.customer?.name ?? '—'}
                        </span>
                        {order.mitra ? (
                          <span style={{ fontSize: 11, color: '#3B82F6', fontWeight: 600 }}>
                            🏍️ {order.mitra.name}
                          </span>
                        ) : isLive && ['ready_for_pickup','mitra_on_pickup','picked_up','on_delivery'].includes(order.status) ? (
                          <span style={{ fontSize: 11, color: '#F56565' }}>🏍️ Mitra belum assign</span>
                        ) : null}
                        <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>{fmtDate(order.created_at)}</span>
                        {/* Komisi platform */}
                        <span style={{ fontSize: 11, color: '#00C896' }}>+{fmtRp((order.platform_commission_food ?? 0) + (order.platform_commission_delivery ?? 0))}</span>
                      </div>
                    </div>

                    {/* Tombol aksi */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      {/* Force Complete: hanya saat delivered */}
                      {canComplete && (
                        <button onClick={e => { e.stopPropagation(); forceComplete(order.id) }} disabled={actionId === order.id}
                          style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                            background: 'rgba(0,200,150,0.1)', color: '#00C896',
                            border: '1px solid rgba(0,200,150,0.25)', cursor: 'pointer',
                            opacity: actionId === order.id ? 0.5 : 1 }}>
                          ✓ Selesaikan
                        </button>
                      )}
                      {/* Cancel */}
                      {canCancel && (
                        <button onClick={e => { e.stopPropagation(); setShowCancel(showCancel === order.id ? null : order.id); setCancelReason('') }}
                          style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                            background: 'rgba(245,101,101,0.08)', color: '#F56565',
                            border: '1px solid rgba(245,101,101,0.2)', cursor: 'pointer' }}>
                          ✕ Batalkan
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Form cancel */}
                  {showCancel === order.id && (
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <input value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                        style={{ flex: 1, padding: '8px 14px', fontSize: 13, borderRadius: 10, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)' }}
                        placeholder="Alasan pembatalan..." />
                      <button onClick={() => forceCancel(order.id)}
                        disabled={!cancelReason.trim() || actionId === order.id}
                        style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                          background: '#F56565', color: '#fff', border: 'none',
                          cursor: 'pointer', opacity: (!cancelReason.trim() || actionId === order.id) ? 0.5 : 1 }}>
                        Konfirmasi
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
            padding: '8px 16px', borderRadius: 10, border: '1.5px solid var(--k-border)', fontWeight: 600,
            background: 'transparent', color: page === 1 ? 'var(--k-sub)' : 'var(--k-text)', cursor: page === 1 ? 'default' : 'pointer',
          }}>‹ Sebelumnya</button>
          <span style={{ padding: '8px 14px', fontSize: 13, color: 'var(--k-sub)' }}>{page} / {meta.last_page}</span>
          <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page} style={{
            padding: '8px 16px', borderRadius: 10, border: '1.5px solid var(--k-border)', fontWeight: 600,
            background: 'transparent', color: page === meta.last_page ? 'var(--k-sub)' : 'var(--k-text)', cursor: page === meta.last_page ? 'default' : 'pointer',
          }}>Berikutnya ›</button>
        </div>
      )}
    </AdminLayout>
  )
}
