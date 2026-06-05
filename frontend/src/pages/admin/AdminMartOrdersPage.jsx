import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const STORAGE = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')

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
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Order ZasaShop</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--k-muted)' }}>Monitor pesanan dari marketplace produk lokal</p>
        </div>
        <button onClick={load} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-sub)', fontSize: 13, cursor: 'pointer' }}>↻ Refresh</button>
      </div>

      {/* Tabs + Search */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {[{ v: '', l: 'Semua', c: 'var(--k-sub)' }, { v: 'pending', l: 'Menunggu', c: '#F59E0B' }, { v: 'confirmed', l: 'Dikonfirmasi', c: '#3B82F6' }, { v: 'packed', l: 'Dikemas', c: '#8B5CF6' }, { v: 'on_delivery', l: 'Dikirim', c: '#6366F1' }, { v: 'completed', l: 'Selesai', c: '#22C55E' }, { v: 'cancelled', l: 'Batal', c: '#EF4444' }].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: tab === t.v ? 700 : 500,
              border: `1px solid ${tab === t.v ? t.c + '40' : 'var(--k-border)'}`,
              cursor: 'pointer', background: tab === t.v ? `${t.c}18` : 'var(--k-card)',
              color: tab === t.v ? t.c : 'var(--k-sub)', whiteSpace: 'nowrap',
            }}>{t.l}</button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari no. pesanan / nama pembeli..."
          style={{ marginLeft: 'auto', padding: '9px 14px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, outline: 'none', width: 260 }} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 24, height: 24, border: '3px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 36, marginBottom: 10 }}>🛒</p>
          <p style={{ color: 'var(--k-text)', fontWeight: 700, marginBottom: 4 }}>Tidak ada pesanan</p>
          <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Pesanan ZasaShop akan tampil di sini</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map(o => {
            const sm = STATUS_META[o.status] ?? { label: o.status, color: '#888' }
            return (
              <div key={o.id} onClick={() => setSelected(o.id === selected ? null : o.id)}
                style={{ background: 'var(--k-card)', borderRadius: 14, border: `1.5px solid ${selected === o.id ? 'var(--k-accent)' : 'var(--k-border)'}`, padding: '14px 16px', cursor: 'pointer', transition: 'border-color .15s' }}>
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

                        <div style={{ background: 'var(--k-card2)', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: 'var(--k-sub)', marginBottom: 8 }}>
                          <p>📍 {o.delivery_address}</p>
                          {o.delivery_phone && <p style={{ marginTop: 3 }}>📞 {o.delivery_phone}</p>}
                          {o.notes && <p style={{ marginTop: 3, fontStyle: 'italic' }}>💬 "{o.notes}"</p>}
                        </div>

                        {/* Komisi breakdown */}
                        {o.commission_rate > 0 && (
                          <div style={{ background: 'var(--k-card2)', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: 'var(--k-sub)', marginBottom: 8, display: 'flex', gap: 14 }}>
                            <span>Subtotal: <b>{fmtRp(o.subtotal)}</b></span>
                            <span>Komisi ({o.commission_rate}%): <b style={{ color: '#F59E0B' }}>-{fmtRp(o.platform_commission)}</b></span>
                            <span>Income seller: <b style={{ color: '#22C55E' }}>{fmtRp(o.seller_income)}</b></span>
                          </div>
                        )}

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
    </AdminLayout>
  )
}
