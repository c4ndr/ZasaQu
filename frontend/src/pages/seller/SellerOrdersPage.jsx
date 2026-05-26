import { useState, useEffect } from 'react'
import MartSellerLayout from '../../components/MartSellerLayout'
import api from '../../services/api'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const STORAGE = import.meta.env.VITE_STORAGE_URL

const TABS = [
  { value: 'pending',     label: 'Baru' },
  { value: 'confirmed',   label: 'Dikonfirmasi' },
  { value: 'packed',      label: 'Dikemas' },
  { value: '',            label: 'Semua' },
  { value: 'completed',   label: 'Selesai' },
  { value: 'cancelled',   label: 'Batal' },
]

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

export default function SellerOrdersPage() {
  const [tab, setTab]       = useState('pending')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [acting, setActing]     = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelId, setCancelId] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/mart/seller/orders', { params: { status: tab || undefined } })
      .then(r => setOrders(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [tab])

  const act = async (id, action, body = {}) => {
    setActing(true)
    try { await api.post(`/mart/seller/orders/${id}/${action}`, body); load() } finally { setActing(false) }
  }

  return (
    <MartSellerLayout title="Pesanan">
      {/* Tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
            style={{ padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.value ? 700 : 500, color: tab === t.value ? '#6366F1' : 'var(--k-muted)', borderBottom: tab === t.value ? '2px solid #6366F1' : '2px solid transparent', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '14px 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 24, height: 24, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 14, fontWeight: 600 }}>Tidak ada pesanan</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.map(order => {
              const sm  = STATUS_META[order.status] ?? { label: order.status, color: '#888' }
              const exp = expanded === order.id
              return (
                <div key={order.id} style={{ background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', overflow: 'hidden' }}>
                  <div onClick={() => setExpanded(exp ? null : order.id)} style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-text)' }}>{order.order_number}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: `${sm.color}20`, color: sm.color }}>{sm.label}</span>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{order.customer?.name} · {fmtDate(order.created_at)}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#6366F1' }}>{fmtRp(order.total)}</p>
                      <p style={{ fontSize: 10, color: 'var(--k-muted)', marginTop: 1 }}>{exp ? '▲' : '▼'}</p>
                    </div>
                  </div>

                  {exp && (
                    <div style={{ borderTop: '1px solid var(--k-border)', padding: '12px 14px' }}>
                      {/* Items */}
                      {order.items?.map(item => (
                        <div key={item.id} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
                            {item.product_image
                              ? <img src={`${STORAGE}/${item.product_image}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🛍️</div>
                            }
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-text)' }}>{item.product_name}</p>
                            <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{item.quantity}× · {fmtRp(item.price)}</p>
                          </div>
                        </div>
                      ))}

                      {/* Delivery info */}
                      <div style={{ background: 'var(--k-card2)', borderRadius: 8, padding: '8px 10px', marginBottom: 10, fontSize: 11, color: 'var(--k-sub)' }}>
                        <p>📍 {order.delivery_address}</p>
                        {order.delivery_phone && <p>📞 {order.delivery_phone}</p>}
                        {order.notes && <p style={{ fontStyle: 'italic', marginTop: 2 }}>"{order.notes}"</p>}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {order.status === 'pending' && (
                          <>
                            <button onClick={() => act(order.id, 'confirm')} disabled={acting}
                              style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#3B82F6', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                              ✅ Konfirmasi
                            </button>
                            <button onClick={() => setCancelId(order.id)}
                              style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #EF4444', background: 'none', color: '#EF4444', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                              Tolak
                            </button>
                          </>
                        )}
                        {order.status === 'confirmed' && (
                          <>
                            <button onClick={() => act(order.id, 'pack')} disabled={acting}
                              style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#8B5CF6', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                              📦 Tandai Dikemas
                            </button>
                            <button onClick={() => setCancelId(order.id)}
                              style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #EF4444', background: 'none', color: '#EF4444', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                              Batal
                            </button>
                          </>
                        )}
                        {order.status === 'packed' && (
                          <p style={{ fontSize: 12, color: '#8B5CF6', fontWeight: 600, width: '100%' }}>📦 Menunggu kurir mengambil pesanan</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cancel modal */}
      {cancelId && (
        <>
          <div onClick={() => setCancelId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--k-surface)', borderRadius: '20px 20px 0 0', padding: '24px 20px', zIndex: 901, paddingBottom: 'calc(24px + env(safe-area-inset-bottom,0px))' }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--k-text)', marginBottom: 12 }}>Tolak / Batalkan Pesanan</p>
            <input value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Alasan penolakan..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setCancelId(null); setCancelReason('') }} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>Kembali</button>
              <button onClick={() => { act(cancelId, 'cancel', { reason: cancelReason || 'Ditolak penjual' }); setCancelId(null); setCancelReason('') }} disabled={acting}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Batalkan</button>
            </div>
          </div>
        </>
      )}
    </MartSellerLayout>
  )
}
