import { useState, useEffect, useCallback } from 'react'
import MartSellerLayout from '../../components/MartSellerLayout'
import api from '../../services/api'
import echo from '../../services/echo'
import { useAuth } from '../../context/AuthContext'
import { playNewOrderChime, setupChimeUnlock } from '../../utils/systemNotif'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const STORAGE = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')

const TABS = [
  { value: 'pending',   label: 'Baru',       emoji: '🔔' },
  { value: 'confirmed', label: 'Dikonfirmasi',emoji: '✅' },
  { value: 'packed',    label: 'Dikemas',     emoji: '📦' },
  { value: 'shipping',  label: 'Dikirim',     emoji: '🚚' },
  { value: 'done',      label: 'Selesai',     emoji: '🏁' },
  { value: '',          label: 'Semua',       emoji: '📋' },
]

const STATUS_META = {
  pending:     { label: 'Menunggu',      color: '#F59E0B', bg: '#FFFBEB', border: '#F59E0B55' },
  confirmed:   { label: 'Dikonfirmasi',  color: '#3B82F6', bg: '#EFF6FF', border: '#3B82F655' },
  packed:      { label: 'Dikemas',       color: '#8B5CF6', bg: '#FAF5FF', border: '#8B5CF655' },
  picking_up:  { label: 'Dijemput',      color: '#F97316', bg: '#FFF7ED', border: '#F9731655' },
  on_delivery: { label: 'Dikirim',       color: '#6366F1', bg: '#EEF2FF', border: '#6366F155' },
  delivered:   { label: 'Terkirim',      color: '#10B981', bg: '#ECFDF5', border: '#10B98155' },
  completed:   { label: 'Selesai',       color: '#22C55E', bg: '#F0FDF4', border: '#22C55E55' },
  cancelled:   { label: 'Dibatalkan',    color: '#EF4444', bg: '#FEF2F2', border: '#EF444455' },
}

const FLOW_STEPS = ['Baru', 'Konfirmasi', 'Kemas', 'Kurir', 'Dikirim', 'Selesai']
function flowStep(s) {
  return { pending: 0, confirmed: 1, packed: 2, picking_up: 3, on_delivery: 4, delivered: 5, completed: 5 }[s] ?? 0
}

function OrderFlow({ status }) {
  const sm  = STATUS_META[status] ?? STATUS_META.pending
  const idx = flowStep(status)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
        {[0,1,2,3,4,5].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= idx ? sm.color : '#E5E7EB' }} />)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {FLOW_STEPS.map((l, i) => <span key={i} style={{ fontSize: 9, color: i <= idx ? sm.color : '#9CA3AF', fontWeight: i === idx ? 700 : 400 }}>{l}</span>)}
      </div>
    </div>
  )
}

// Tab query map
function tabToQuery(tab) {
  if (tab === 'shipping') return 'picking_up,on_delivery,delivered'
  if (tab === 'done')     return 'completed'
  return tab || undefined
}

export default function SellerOrdersPage() {
  const [tab,       setTab]       = useState('pending')
  const [orders,    setOrders]    = useState([])
  const [counts,    setCounts]    = useState({})
  const [loading,   setLoading]   = useState(true)
  const [expanded,  setExpanded]  = useState(null)
  const [acting,    setActing]    = useState(false)
  const [cancelId,  setCancelId]  = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [toast,     setToast]     = useState(null)
  const { user }    = useAuth()

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(() => {
    setLoading(true)
    api.get('/mart/seller/orders', { params: { status: tabToQuery(tab) } })
      .then(r => setOrders(r.data.data ?? []))
      .finally(() => setLoading(false))
  }, [tab])

  useEffect(() => { load() }, [load])

  // Notifikasi order baru — bunyi 3x agar penjual pasti dengar walau tidak menatap layar
  useEffect(() => {
    setupChimeUnlock()
    const ch = echo.channel(`App.Models.User.${user?.id}`)
    ch.listen('.mart.order.created', () => { playNewOrderChime(); load() })
    return () => echo.leave(`App.Models.User.${user?.id}`)
  }, [load, user?.id])

  // Fetch counts for tab badges
  useEffect(() => {
    Promise.all([
      api.get('/mart/seller/orders', { params: { status: 'pending' } }),
      api.get('/mart/seller/orders', { params: { status: 'packed' } }),
    ]).then(([pend, packed]) => {
      setCounts({ pending: pend.data.data?.length ?? 0, packed: packed.data.data?.length ?? 0 })
    }).catch(() => {})
  }, [])

  const act = async (id, action, body = {}) => {
    setActing(true)
    try {
      await api.post(`/mart/seller/orders/${id}/${action}`, body)
      showToast('success', action === 'confirm' ? 'Pesanan dikonfirmasi!' : action === 'pack' ? 'Pesanan ditandai siap diambil!' : 'Pesanan dibatalkan.')
      load()
      setExpanded(null)
    } catch (e) {
      showToast('error', e.response?.data?.message || 'Terjadi kesalahan.')
    } finally { setActing(false) }
  }

  return (
    <MartSellerLayout title="Pesanan">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '11px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', overflowX: 'auto', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', scrollbarWidth: 'none' }}>
        {TABS.map(t => {
          const badge = t.value === 'pending' ? counts.pending : t.value === 'packed' ? counts.packed : 0
          return (
            <button key={t.value} onClick={() => { setTab(t.value); setExpanded(null) }}
              style={{ padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.value ? 700 : 500, color: tab === t.value ? '#6366F1' : 'var(--k-muted)', borderBottom: tab === t.value ? '2px solid #6366F1' : '2px solid transparent', whiteSpace: 'nowrap', position: 'relative' }}>
              {t.emoji} {t.label}
              {badge > 0 && (
                <span style={{ marginLeft: 5, background: '#DC2626', color: '#fff', fontSize: 10, fontWeight: 800, padding: '1px 5px', borderRadius: 20, lineHeight: 1.4 }}>{badge}</span>
              )}
            </button>
          )
        })}
      </div>

      <div style={{ padding: '14px 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 24, height: 24, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--k-text)', marginBottom: 6 }}>Tidak ada pesanan</p>
            <p style={{ fontSize: 12 }}>Pesanan akan muncul saat customer membeli produkmu</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.map(order => {
              const sm  = STATUS_META[order.status] ?? { label: order.status, color: '#888', bg: '#f9f9f9', border: '#eee' }
              const exp = expanded === order.id
              return (
                <div key={order.id} style={{ background: 'var(--k-card)', borderRadius: 16, border: `1.5px solid ${exp ? sm.border : 'var(--k-border)'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>

                  {/* Header baris — tap expand */}
                  <div onClick={() => setExpanded(exp ? null : order.id)}
                    style={{ padding: '13px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: sm.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, border: `1.5px solid ${sm.border}` }}>
                      {{pending:'🔔',confirmed:'✅',packed:'📦',picking_up:'🛵',on_delivery:'🚀',delivered:'🏠',completed:'⭐',cancelled:'✕'}[order.status] ?? '📋'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>#{order.order_number}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}>{sm.label}</span>
                        {order.payment_method === 'cod' && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>COD</span>}
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{order.customer?.name} · {fmtDate(order.created_at)}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#6366F1' }}>{fmtRp(order.total)}</p>
                      <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 1 }}>{order.items?.length ?? 0} produk {exp ? '▲' : '▼'}</p>
                    </div>
                  </div>

                  {/* Detail expanded */}
                  {exp && (
                    <div style={{ borderTop: '1px solid var(--k-border)', padding: '14px' }}>
                      {/* Flow stepper */}
                      <OrderFlow status={order.status} />

                      {/* Items */}
                      <div style={{ marginBottom: 12 }}>
                        {order.items?.map(item => (
                          <div key={item.id} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                            <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', background: 'var(--k-input)', flexShrink: 0, border: '1px solid var(--k-border)' }}>
                              {item.product_image
                                ? <img src={`${STORAGE}/${item.product_image}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🛍️</div>
                              }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)', lineHeight: 1.3 }}>{item.product_name}</p>
                              <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 2 }}>{item.quantity}× · {fmtRp(item.price)} = <b style={{ color: '#6366F1' }}>{fmtRp(item.quantity * item.price)}</b></p>
                              {item.notes && <p style={{ fontSize: 11, color: 'var(--k-sub)', marginTop: 2, fontStyle: 'italic' }}>📝 {item.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Ringkasan biaya */}
                      <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--k-input)', marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--k-sub)', marginBottom: 4 }}>
                          <span>Subtotal produk</span>
                          <span>{fmtRp(order.subtotal ?? order.total)}</span>
                        </div>
                        {(order.shipping_fee ?? 0) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--k-sub)', marginBottom: 4 }}>
                            <span>Ongkir</span>
                            <span>{fmtRp(order.shipping_fee)}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, color: 'var(--k-text)', paddingTop: 6, borderTop: '1px solid var(--k-border)', marginTop: 4 }}>
                          <span>Total</span>
                          <span style={{ color: '#6366F1' }}>{fmtRp(order.total)}</span>
                        </div>
                        {order.payment_method === 'cod' && (
                          <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)' }}>
                            <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 700 }}>💵 Pembayaran COD — kurir tagih ke customer saat tiba</p>
                          </div>
                        )}
                      </div>

                      {/* Info pengiriman */}
                      <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--k-input)', marginBottom: 14 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 6, letterSpacing: '0.05em' }}>📍 ALAMAT PENGIRIMAN</p>
                        <p style={{ fontSize: 13, color: 'var(--k-text)', fontWeight: 600, lineHeight: 1.4 }}>{order.delivery_address}</p>
                        {order.customer?.name && <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 4 }}>👤 {order.customer.name}</p>}
                        {order.delivery_phone && (
                          <a href={`tel:${order.delivery_phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 12, color: '#027A48', textDecoration: 'none', fontWeight: 700, background: 'rgba(0,200,150,0.1)', padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(0,200,150,0.2)' }}>
                            📞 {order.delivery_phone}
                          </a>
                        )}
                        {order.notes && (
                          <p style={{ fontSize: 12, color: 'var(--k-sub)', marginTop: 6, fontStyle: 'italic' }}>📝 Catatan: "{order.notes}"</p>
                        )}
                      </div>

                      {/* Info kurir (jika sudah ada) */}
                      {order.mitra && (
                        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', marginBottom: 14 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#F97316', marginBottom: 5, letterSpacing: '0.05em' }}>🛵 KURIR PENGIRIMAN</p>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{order.mitra.name}</p>
                            </div>
                            {order.mitra.phone && (
                              <a href={`tel:${order.mitra.phone}`} style={{ fontSize: 12, color: '#027A48', textDecoration: 'none', fontWeight: 700, background: 'rgba(0,200,150,0.1)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(0,200,150,0.2)' }}>
                                📞 Hubungi
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tombol aksi */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {order.status === 'pending' && (
                          <>
                            <button onClick={() => act(order.id, 'confirm')} disabled={acting}
                              style={{ flex: 1, padding: '12px', borderRadius: 11, border: 'none', background: acting ? 'var(--k-border)' : '#3B82F6', color: '#fff', fontWeight: 700, fontSize: 13, cursor: acting ? 'not-allowed' : 'pointer' }}>
                              ✅ Konfirmasi Pesanan
                            </button>
                            <button onClick={() => { setCancelId(order.id); setExpanded(null) }}
                              style={{ padding: '12px 16px', borderRadius: 11, border: '1.5px solid #EF4444', background: 'none', color: '#EF4444', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                              Tolak
                            </button>
                          </>
                        )}
                        {order.status === 'confirmed' && (
                          <>
                            <button onClick={() => act(order.id, 'pack')} disabled={acting}
                              style={{ flex: 1, padding: '12px', borderRadius: 11, border: 'none', background: acting ? 'var(--k-border)' : '#8B5CF6', color: '#fff', fontWeight: 700, fontSize: 13, cursor: acting ? 'not-allowed' : 'pointer' }}>
                              📦 Tandai Sudah Dikemas
                            </button>
                            <button onClick={() => { setCancelId(order.id); setExpanded(null) }}
                              style={{ padding: '12px 16px', borderRadius: 11, border: '1.5px solid #EF4444', background: 'none', color: '#EF4444', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                              Batal
                            </button>
                          </>
                        )}
                        {order.status === 'packed' && (
                          <div style={{ width: '100%', padding: '12px 14px', borderRadius: 11, background: 'rgba(139,92,246,0.08)', border: '1.5px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>⏳</span>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#8B5CF6' }}>Menunggu kurir mengambil barang</p>
                              <p style={{ fontSize: 11, color: 'var(--k-sub)' }}>Siapkan paket di depan toko</p>
                            </div>
                          </div>
                        )}
                        {['picking_up', 'on_delivery'].includes(order.status) && (
                          <div style={{ width: '100%', padding: '12px 14px', borderRadius: 11, background: 'rgba(99,102,241,0.07)', border: '1.5px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20, animation: 'none' }}>🚚</span>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#6366F1' }}>
                                {order.status === 'picking_up' ? 'Kurir sedang menuju toko' : 'Pesanan sedang diantarkan'}
                              </p>
                              <p style={{ fontSize: 11, color: 'var(--k-sub)' }}>
                                {order.status === 'picking_up' ? 'Pastikan barang siap diambil' : 'Estimasi tiba dalam beberapa saat'}
                              </p>
                            </div>
                          </div>
                        )}
                        {order.status === 'delivered' && (
                          <div style={{ width: '100%', padding: '12px 14px', borderRadius: 11, background: 'rgba(34,197,94,0.08)', border: '1.5px solid rgba(34,197,94,0.3)', textAlign: 'center' }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#22C55E' }}>🎉 Sudah diterima customer! Menunggu konfirmasi.</p>
                          </div>
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
          <div onClick={() => { setCancelId(null); setCancelReason('') }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 900 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--k-surface)', borderRadius: '22px 22px 0 0', padding: '24px 20px', zIndex: 901, paddingBottom: 'calc(24px + env(safe-area-inset-bottom,0px))' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--k-border)' }} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--k-text)', marginBottom: 5 }}>Tolak / Batalkan Pesanan</p>
            <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 14 }}>Customer akan mendapat refund otomatis ke dompet.</p>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Tulis alasan penolakan (opsional)..."
              rows={3} style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1.5px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'none', marginBottom: 14, fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setCancelId(null); setCancelReason('') }} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid var(--k-border)', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>Kembali</button>
              <button onClick={() => { act(cancelId, 'cancel', { reason: cancelReason || 'Ditolak penjual' }); setCancelId(null); setCancelReason('') }} disabled={acting}
                style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: acting ? 'var(--k-border)' : '#EF4444', color: '#fff', cursor: acting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 800 }}>
                {acting ? 'Memproses...' : 'Batalkan Pesanan'}
              </button>
            </div>
          </div>
        </>
      )}
    </MartSellerLayout>
  )
}
