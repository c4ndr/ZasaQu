import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const STORAGE = import.meta.env.VITE_STORAGE_URL

const STATUS_META = {
  pending:     { label: 'Menunggu',    color: '#F59E0B' },
  confirmed:   { label: 'Dikonfirmasi', color: '#3B82F6' },
  packed:      { label: 'Dikemas',     color: '#8B5CF6' },
  picking_up:  { label: 'Dijemput',   color: '#F97316' },
  on_delivery: { label: 'Dikirim',    color: '#6366F1' },
  delivered:   { label: 'Terkirim',   color: '#10B981' },
  completed:   { label: 'Selesai',    color: '#22C55E' },
  cancelled:   { label: 'Dibatalkan', color: '#EF4444' },
}

export default function AdminMartOrdersPage() {
  const [tab, setTab]       = useState('')
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling]     = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/admin/mart/orders', { params: { status: tab || undefined, search: search || undefined } })
      .then(r => setOrders(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [tab, search])

  const forceCancel = async (id) => {
    if (!cancelReason.trim()) return
    setCancelling(true)
    try { await api.post(`/admin/mart/orders/${id}/force-cancel`, { reason: cancelReason }); setSelected(null); setCancelReason(''); load() }
    catch (e) { alert(e.response?.data?.message || 'Gagal') } finally { setCancelling(false) }
  }

  const sel = selected ? orders.find(o => o.id === selected) : null

  return (
    <AdminLayout>
      <div style={{ padding: '0 0 80px' }}>
        <div style={{ display: 'flex', overflowX: 'auto', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', scrollbarWidth: 'none' }}>
          {[{ v: '', l: 'Semua' }, { v: 'pending', l: 'Menunggu' }, { v: 'confirmed', l: 'Dikonfirmasi' }, { v: 'packed', l: 'Dikemas' }, { v: 'on_delivery', l: 'Dikirim' }, { v: 'completed', l: 'Selesai' }, { v: 'cancelled', l: 'Batal' }].map(t => (
            <button key={t.v} onClick={() => setTab(t.v)}
              style={{ padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.v ? 700 : 500, color: tab === t.v ? 'var(--k-accent)' : 'var(--k-muted)', borderBottom: tab === t.v ? '2px solid var(--k-accent)' : '2px solid transparent', whiteSpace: 'nowrap' }}>
              {t.l}
            </button>
          ))}
        </div>

        <div style={{ padding: '14px 16px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari no. pesanan / nama pembeli..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 13, outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />

          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '3px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {orders.map(o => {
                const sm = STATUS_META[o.status] ?? { label: o.status, color: '#888' }
                return (
                  <div key={o.id} onClick={() => setSelected(o.id === selected ? null : o.id)}
                    style={{ background: 'var(--k-card)', borderRadius: 12, border: `1px solid ${selected === o.id ? 'var(--k-accent)' : 'var(--k-border)'}`, padding: '12px 14px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-text)' }}>{o.order_number}</p>
                        <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{o.customer?.name} → {o.seller?.name}</p>
                        <p style={{ fontSize: 10, color: 'var(--k-muted)' }}>{fmtDate(o.created_at)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: `${sm.color}20`, color: sm.color, marginBottom: 4 }}>{sm.label}</span>
                        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-accent)' }}>{fmtRp(o.total)}</p>
                      </div>
                    </div>

                    {selected === o.id && (
                      <div style={{ marginTop: 12, borderTop: '1px solid var(--k-border)', paddingTop: 12 }}>
                        {o.items?.map(item => (
                          <div key={item.id} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
                              {item.product_image
                                ? <img src={`${STORAGE}/${item.product_image}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>🛍️</div>
                              }
                            </div>
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-text)' }}>{item.product_name}</p>
                              <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{item.quantity}× · {fmtRp(item.price)}</p>
                            </div>
                          </div>
                        ))}

                        <div style={{ background: 'var(--k-card2)', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: 'var(--k-sub)', marginBottom: 10 }}>
                          <p>📍 {o.delivery_address}</p>
                        </div>

                        {!['completed', 'cancelled'].includes(o.status) && (
                          <div>
                            <input value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Alasan force cancel..."
                              onClick={e => e.stopPropagation()}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                            <button onClick={e => { e.stopPropagation(); forceCancel(o.id) }} disabled={cancelling || !cancelReason.trim()}
                              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: !cancelReason.trim() ? 0.5 : 1 }}>
                              🚫 Force Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
