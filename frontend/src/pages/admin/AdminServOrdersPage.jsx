import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

function fmtDate(d) { return d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-' }
function fmtRp(v)   { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

const STATUS_META = {
  pending:     { label: 'Pending',          color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  confirmed:   { label: 'Dikonfirmasi',     color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  traveling:   { label: 'Menuju Lokasi',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
  in_progress: { label: 'Sedang Dikerjakan',color: '#EC4899', bg: 'rgba(236,72,153,0.12)'  },
  completed:   { label: 'Selesai',          color: '#059669', bg: 'rgba(5,150,105,0.12)'   },
  cancelled:   { label: 'Dibatalkan',       color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
}

const STATUS_TABS = [
  { key: 'all',         label: 'Semua'    },
  { key: 'pending',     label: 'Pending'  },
  { key: 'confirmed',   label: 'Konfirm'  },
  { key: 'traveling',   label: 'Berangkat'},
  { key: 'in_progress', label: 'Proses'   },
  { key: 'completed',   label: 'Selesai'  },
  { key: 'cancelled',   label: 'Batal'    },
]

// ── Modal Detail Order ────────────────────────────────────────────────────────
function OrderDetail({ order, onCancel, onClose }) {
  const [showCancel,  setShowCancel]  = useState(false)
  const [reason,      setReason]      = useState('')
  const [cancelling,  setCancelling]  = useState(false)
  const sm   = STATUS_META[order.status] ?? { label: order.status, color: '#94A3B8', bg: 'var(--k-input)' }
  const done = order.status === 'completed' || order.status === 'cancelled'

  async function handleCancel() {
    if (!reason.trim()) return
    setCancelling(true)
    await onCancel(order.id, reason)
    setCancelling(false)
    setShowCancel(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--k-card)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 16, margin: 0, marginBottom: 4, fontFamily: 'monospace' }}>{order.order_number}</h2>
            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sm.bg, color: sm.color }}>{sm.label}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--k-muted)', lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16, fontSize: 13, color: 'var(--k-muted)' }}>
          <p>🔧 <strong style={{ color: 'var(--k-text)' }}>{order.provider?.name}</strong></p>
          <p>👤 {order.customer?.name}</p>
          <p>📍 {order.address}</p>
          {order.scheduled_at && <p>🕐 Jadwal: {fmtDate(order.scheduled_at)}</p>}
          {order.notes && <p>📝 {order.notes}</p>}
          <p style={{ fontSize: 12 }}>Dibuat: {fmtDate(order.created_at)}</p>
          {order.confirmed_at   && <p style={{ fontSize: 12 }}>Dikonfirmasi: {fmtDate(order.confirmed_at)}</p>}
          {order.traveling_at   && <p style={{ fontSize: 12 }}>Berangkat: {fmtDate(order.traveling_at)}</p>}
          {order.in_progress_at && <p style={{ fontSize: 12 }}>Mulai kerja: {fmtDate(order.in_progress_at)}</p>}
          {order.completed_at   && <p style={{ fontSize: 12 }}>Selesai: {fmtDate(order.completed_at)}</p>}
          {order.cancel_reason  && <p style={{ color: '#EF4444' }}>Alasan batal: {order.cancel_reason}</p>}
        </div>

        {/* Items */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Layanan</p>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--k-border)' }}>
              <p style={{ fontSize: 13, color: 'var(--k-text)' }}>{item.service_name} × {item.quantity} {item.unit}</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{fmtRp(item.subtotal)}</p>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, fontWeight: 700 }}>
            <p>Total</p>
            <p style={{ color: '#059669' }}>{fmtRp(order.total_price)}</p>
          </div>
        </div>

        {/* Finansial */}
        {order.commission_rate > 0 && (
          <div style={{ background: 'var(--k-input)', borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center' }}>
            {[
              ['Komisi Platform', `${order.commission_rate}%`],
              ['Fee Platform',    fmtRp(order.platform_commission)],
              ['Pendapatan Teknisi', fmtRp(order.provider_income)],
            ].map(([l, v]) => (
              <div key={l}>
                <p style={{ fontSize: 10, color: 'var(--k-muted)', marginBottom: 3 }}>{l}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{v}</p>
              </div>
            ))}
          </div>
        )}

        {/* Force cancel */}
        {!done && (
          showCancel ? (
            <div>
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Alasan pembatalan (wajib)..." rows={2}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, resize: 'none', boxSizing: 'border-box', marginBottom: 8, outline: 'none' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowCancel(false)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-muted)', cursor: 'pointer', fontWeight: 600 }}>
                  Batal
                </button>
                <button onClick={handleCancel} disabled={cancelling || !reason.trim()}
                  style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: reason.trim() ? 'rgba(239,68,68,0.1)' : 'var(--k-border)', color: reason.trim() ? '#EF4444' : 'var(--k-muted)', fontWeight: 700, cursor: reason.trim() ? 'pointer' : 'default' }}>
                  {cancelling ? 'Membatalkan...' : 'Konfirmasi Batalkan'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCancel(true)} style={{ width: '100%', padding: 11, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontWeight: 700, fontSize: 13 }}>
              Force Cancel Order
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function AdminServOrdersPage() {
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('all')
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total,    setTotal]    = useState(0)
  const [selected, setSelected] = useState(null)
  const [toast,    setToast]    = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (tab !== 'all') params.set('status', tab)
    if (search) params.set('search', search)
    params.set('page', page)
    api.get('/admin/serv/orders?' + params)
      .then(r => {
        setOrders(r.data.data ?? [])
        setLastPage(r.data.meta?.last_page ?? 1)
        setTotal(r.data.meta?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab, search, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [tab, search])

  async function handleCancel(orderId, reason) {
    try {
      await api.post(`/admin/serv/orders/${orderId}/force-cancel`, { reason })
      showToast('success', 'Order berhasil dibatalkan.')
      setSelected(null)
      load()
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal.') }
  }

  function showToast(type, msg) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }
  const sm = s => STATUS_META[s] ?? { label: s, color: '#94A3B8', bg: 'var(--k-input)' }

  return (
    <AdminLayout title="ZasaServis — Pesanan">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: toast.type === 'success' ? '#059669' : '#EF4444', color: '#fff' }}>
          {toast.msg}
        </div>
      )}
      {selected && <OrderDetail order={selected} onCancel={handleCancel} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Pesanan ZasaServis</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--k-muted)' }}>
          Monitor pesanan servis panggilan · {total} total
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {STATUS_TABS.map(t => {
          const meta = STATUS_META[t.key]
          const color = meta?.color ?? '#059669'
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500,
              border: `1px solid ${active ? (color + '40') : 'var(--k-border)'}`,
              cursor: 'pointer', background: active ? (color + '18') : 'var(--k-card)',
              color: active ? color : 'var(--k-muted)',
            }}>
              {t.label}
            </button>
          )
        })}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nomor order, provider, atau pelanggan..."
          style={{ marginLeft: 'auto', padding: '8px 14px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, width: 300, outline: 'none' }} />
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Memuat...</p>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 40, marginBottom: 10 }}>🔧</p>
          <p style={{ color: 'var(--k-text)', fontWeight: 700, marginBottom: 4 }}>Tidak ada pesanan</p>
          <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Coba ubah filter atau tunggu pesanan masuk</p>
        </div>
      ) : (
        <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--k-border)', textAlign: 'left', background: 'var(--k-surface)' }}>
                  {['No. Order', 'Teknisi', 'Pelanggan', 'Jadwal', 'Status', 'Total', 'Dibuat'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', color: 'var(--k-muted)', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => {
                  const s = sm(o.status)
                  return (
                    <tr key={o.id} onClick={() => setSelected(o)}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--k-surface)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      style={{ borderTop: i === 0 ? 'none' : '1px solid var(--k-border)', cursor: 'pointer', transition: 'background .1s' }}>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: 'var(--k-muted)' }}>{o.order_number}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--k-text)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.provider?.name}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--k-muted)' }}>{o.customer?.name}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--k-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {o.scheduled_at ? fmtDate(o.scheduled_at) : <span style={{ color: 'var(--k-border)' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>{fmtRp(o.total_price)}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--k-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(o.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', cursor: page === 1 ? 'default' : 'pointer', color: page === 1 ? 'var(--k-muted)' : 'var(--k-text)', fontWeight: 600 }}>
            ‹ Prev
          </button>
          <span style={{ padding: '8px 14px', fontSize: 13, color: 'var(--k-muted)' }}>{page} / {lastPage}</span>
          <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage}
            style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', cursor: page === lastPage ? 'default' : 'pointer', color: page === lastPage ? 'var(--k-muted)' : 'var(--k-text)', fontWeight: 600 }}>
            Next ›
          </button>
        </div>
      )}
    </AdminLayout>
  )
}
