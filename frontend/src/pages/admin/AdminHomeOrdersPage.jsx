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

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nomor order, provider, atau pelanggan..."
          style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, width: 280, outline: 'none' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
              background: tab === t.key ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : 'var(--k-card)',
              color: tab === t.key ? '#fff' : 'var(--k-sub)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Memuat...</p>
      ) : orders.length === 0 ? (
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Tidak ada pesanan.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--k-border)', textAlign: 'left' }}>
                {['No. Order', 'Provider', 'Pelanggan', 'Status', 'Total', 'Dibuat', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', color: 'var(--k-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const s = sm(o.status)
                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--k-border)' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: 12, color: 'var(--k-muted)' }}>{o.order_number}</td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{o.provider?.name}</td>
                    <td style={{ padding: '12px', color: 'var(--k-muted)' }}>{o.customer?.name}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#6366F1' }}>{fmtRp(o.total_price)}</td>
                    <td style={{ padding: '12px', color: 'var(--k-muted)', fontSize: 11 }}>{fmtDate(o.created_at)}</td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => setSelected(o)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(99,102,241,0.1)', color: '#6366F1', fontWeight: 700, fontSize: 12 }}>
                        Detail
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
