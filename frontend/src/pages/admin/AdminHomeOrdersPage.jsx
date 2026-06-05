import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

function fmtDate(d) { return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
function fmtRp(v)   { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

const STATUS_META = {
  pending:    { label: 'Pending',      color: '#F6AD55', bg: 'rgba(246,173,85,0.12)'   },
  confirmed:  { label: 'Dikonfirmasi', color: '#6366F1', bg: 'rgba(99,102,241,0.12)'   },
  picked_up:  { label: 'Dijemput',     color: '#6366F1', bg: 'rgba(99,102,241,0.1)'    },
  processing: { label: 'Diproses',     color: '#F97316', bg: 'rgba(249,115,22,0.1)'    },
  ready:      { label: 'Siap',         color: '#00C896', bg: 'rgba(0,200,150,0.1)'     },
  delivering: { label: 'Diantar',      color: '#6366F1', bg: 'rgba(99,102,241,0.1)'    },
  completed:  { label: 'Selesai',      color: '#00C896', bg: 'rgba(0,200,150,0.12)'    },
  cancelled:  { label: 'Dibatalkan',   color: '#F56565', bg: 'rgba(245,101,101,0.12)'  },
}

const STATUS_TABS = [
  { key: 'all',       label: 'Semua'   },
  { key: 'pending',   label: 'Pending' },
  { key: 'processing',label: 'Proses'  },
  { key: 'completed', label: 'Selesai' },
  { key: 'cancelled', label: 'Batal'   },
]

function OrderDetail({ order, onCancel, onClose }) {
  const [cancelling, setCancelling] = useState(false)
  const [reason,     setReason]     = useState('')
  const [showCancel, setShowCancel] = useState(false)
  const sm = STATUS_META[order.status] ?? { label: order.status, color: '#A0A0BC', bg: 'var(--k-input)' }

  async function handleCancel() {
    if (!reason.trim()) return
    setCancelling(true)
    await onCancel(order.id, reason)
    setCancelling(false)
    setShowCancel(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--k-card)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontWeight: 800, fontSize: 16 }}>{order.order_number}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--k-muted)' }}>×</button>
        </div>
        <span style={{ display: 'inline-block', marginBottom: 16, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: sm.bg, color: sm.color }}>{sm.label}</span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16, fontSize: 13, color: 'var(--k-muted)' }}>
          <p>🏠 <strong style={{ color: 'var(--k-text)' }}>{order.provider?.name}</strong></p>
          <p>👤 {order.customer?.name}</p>
          <p>📍 {order.pickup_address}</p>
          {order.notes && <p>📝 {order.notes}</p>}
          <p style={{ fontSize: 12 }}>Dibuat: {fmtDate(order.created_at)}</p>
          {order.cancel_reason && <p style={{ color: '#F56565' }}>Alasan batal: {order.cancel_reason}</p>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 8 }}>LAYANAN</p>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--k-border)' }}>
              <p style={{ fontSize: 13 }}>{item.service_name} × {item.quantity} {item.unit}</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{fmtRp(item.subtotal)}</p>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, fontWeight: 700 }}>
            <p>Total</p><p style={{ color: '#6366F1' }}>{fmtRp(order.total_price)}</p>
          </div>
        </div>

        {!['completed', 'cancelled'].includes(order.status) && (
          showCancel ? (
            <div>
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Alasan pembatalan..." rows={2}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, resize: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowCancel(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-muted)', cursor: 'pointer' }}>Batal</button>
                <button onClick={handleCancel} disabled={cancelling || !reason.trim()} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'rgba(245,101,101,0.1)', color: '#F56565', fontWeight: 700, cursor: 'pointer' }}>
                  {cancelling ? 'Membatalkan...' : 'Konfirmasi Batalkan'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCancel(true)} style={{ width: '100%', padding: '11px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(245,101,101,0.08)', color: '#F56565', fontWeight: 700, fontSize: 13 }}>
              Force Cancel Order
            </button>
          )
        )}
      </div>
    </div>
  )
}

export default function AdminHomeOrdersPage() {
  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('all')
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)
  const [toast,    setToast]    = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (tab !== 'all') params.set('status', tab)
    if (search) params.set('search', search)
    api.get('/admin/home/orders?' + params)
      .then(r => setOrders(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab, search])

  useEffect(() => { load() }, [load])

  async function handleCancel(orderId, reason) {
    try {
      await api.post(`/admin/home/orders/${orderId}/force-cancel`, { reason })
      showToast('success', 'Order dibatalkan.')
      setSelected(null)
      load()
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal.') }
  }

  function showToast(type, msg) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  const sm = s => STATUS_META[s] ?? { label: s, color: '#A0A0BC', bg: 'var(--k-input)' }

  return (
    <AdminLayout title="ZasaHome — Pesanan">
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff' }}>{toast.msg}</div>}
      {selected && <OrderDetail order={selected} onCancel={handleCancel} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Pesanan ZasaHome</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--k-muted)' }}>Monitor dan kelola pesanan layanan rumah</p>
      </div>

      {/* Tabs + Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
              border: `1px solid ${tab === t.key ? '#6366F140' : 'var(--k-border)'}`,
              cursor: 'pointer', background: tab === t.key ? 'rgba(99,102,241,0.12)' : 'var(--k-card)',
              color: tab === t.key ? '#6366F1' : 'var(--k-sub)',
            }}>
            {t.label}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nomor order, provider, atau pelanggan..."
          style={{ marginLeft: 'auto', padding: '9px 14px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, width: 300, outline: 'none' }} />
      </div>

      {loading ? (
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Memuat...</p>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 36, marginBottom: 10 }}>🏠</p>
          <p style={{ color: 'var(--k-text)', fontWeight: 700, marginBottom: 4 }}>Tidak ada pesanan</p>
          <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Pesanan ZasaHome akan tampil di sini</p>
        </div>
      ) : (
        <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--k-border)', textAlign: 'left', background: 'var(--k-surface)' }}>
                  {['No. Order', 'Provider', 'Pelanggan', 'Status', 'Total', 'Dibuat'].map(h => (
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
                      <td style={{ padding: '13px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--k-muted)' }}>{o.order_number}</td>
                      <td style={{ padding: '13px 14px', fontWeight: 600, color: 'var(--k-text)' }}>{o.provider?.name}</td>
                      <td style={{ padding: '13px 14px', color: 'var(--k-muted)' }}>{o.customer?.name}</td>
                      <td style={{ padding: '13px 14px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
                      </td>
                      <td style={{ padding: '13px 14px', fontWeight: 700, color: '#6366F1' }}>{fmtRp(o.total_price)}</td>
                      <td style={{ padding: '13px 14px', color: 'var(--k-muted)', fontSize: 11 }}>{fmtDate(o.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
