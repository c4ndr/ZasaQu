import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

function fmtRp(v)   { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
function fmtDate(d) { return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

const STATUS_META = {
  pending:           { label: 'Menunggu',       color: '#F6AD55', bg: 'rgba(246,173,85,0.12)'  },
  merchant_accepted: { label: 'Diterima',       color: '#63B3ED', bg: 'rgba(99,179,237,0.12)'  },
  preparing:         { label: 'Dimasak',        color: '#9F7AEA', bg: 'rgba(159,122,234,0.12)' },
  ready_for_pickup:  { label: 'Siap Diambil',   color: '#00C896', bg: 'rgba(0,200,150,0.12)'   },
  mitra_on_pickup:   { label: 'Mitra Menuju',   color: '#63B3ED', bg: 'rgba(99,179,237,0.12)'  },
  picked_up:         { label: 'Diambil',        color: '#9F7AEA', bg: 'rgba(159,122,234,0.12)' },
  on_delivery:       { label: 'Dikirim',        color: '#63B3ED', bg: 'rgba(99,179,237,0.12)'  },
  delivered:         { label: 'Terkirim',       color: '#00C896', bg: 'rgba(0,200,150,0.12)'   },
  completed:         { label: 'Selesai',        color: '#00C896', bg: 'rgba(0,200,150,0.12)'   },
  cancelled:         { label: 'Dibatalkan',     color: '#A0A0BC', bg: 'rgba(160,160,188,0.12)' },
  rejected:          { label: 'Ditolak',        color: '#F56565', bg: 'rgba(245,101,101,0.12)' },
}

const TABS = [
  { key: 'active',    label: 'Aktif',     statuses: ['pending','merchant_accepted','preparing','ready_for_pickup','mitra_on_pickup','picked_up','on_delivery','delivered'] },
  { key: 'completed', label: 'Selesai',   statuses: ['completed'] },
  { key: 'problem',   label: 'Bermasalah',statuses: ['cancelled','rejected'] },
  { key: 'all',       label: 'Semua',     statuses: null },
]

// ── Detail Drawer ─────────────────────────────────────────────────────────────
function OrderDrawer({ order, onClose }) {
  const sm = STATUS_META[order.status] ?? STATUS_META.pending
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--k-card)', height: '100%', overflowY: 'auto', padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>#{order.order_number}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--k-sub)' }}>×</button>
        </div>

        <span style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 20, color: sm.color, background: sm.bg }}>
          {sm.label}
        </span>

        {[
          ['Merchant',   order.merchant?.name],
          ['Pelanggan',  order.customer?.name],
          ['Mitra',      order.mitra?.name ?? '—'],
          ['Tgl Order',  fmtDate(order.created_at)],
          ['Alamat Antar', order.delivery_address],
          ['Metode Bayar', order.payment_method === 'wallet' ? 'Dompet ZasaQu' : 'COD'],
        ].map(([l, v]) => v && (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
            <span style={{ color: 'var(--k-sub)' }}>{l}</span>
            <span style={{ fontWeight: 600, maxWidth: '55%', textAlign: 'right' }}>{v}</span>
          </div>
        ))}

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
          ['Subtotal',    fmtRp(order.subtotal)],
          ['Ongkir',      fmtRp(order.delivery_fee)],
          ['Komisi Makanan', fmtRp(order.platform_commission_food)],
          ['Komisi Ongkir',  fmtRp(order.platform_commission_delivery)],
          ['Merchant Dapat', fmtRp(order.merchant_income)],
          ['Mitra Dapat',    fmtRp(order.mitra_income)],
        ].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--k-sub)' }}>{l}</span>
            <span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, marginTop: 8, borderTop: '1px solid var(--k-border)', paddingTop: 10 }}>
          <span>Total</span><span style={{ color: '#FF7A45' }}>{fmtRp(order.total_amount)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Halaman Utama ─────────────────────────────────────────────────────────────
export default function AdminFoodOrdersPage() {
  const [orders,   setOrders]   = useState([])
  const [meta,     setMeta]     = useState({})
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('active')
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(1)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const activeTab = TABS.find(t => t.key === tab)
      const params    = { page }
      if (activeTab?.statuses) params.status = activeTab.statuses.join(',')
      if (search) params.search = search

      // Re-use admin food orders endpoint (need to add it)
      const res = await api.get('/admin/food/orders', { params })
      setOrders(res.data.data || [])
      setMeta(res.data.meta ?? {})
    } catch {} finally { setLoading(false) }
  }, [tab, search, page])

  useEffect(() => { setPage(1) }, [tab, search])
  useEffect(() => { load() }, [load])

  return (
    <AdminLayout>
      {selected && <OrderDrawer order={selected} onClose={() => setSelected(null)} />}

      <div style={{ padding: '28px', maxWidth: 920 }}>
        <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 800 }}>Order ZasaFood</h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: tab === t.key ? 700 : 400, fontSize: 13,
              background: tab === t.key ? '#FF7A45' : 'var(--k-input)',
              color: tab === t.key ? '#fff' : 'var(--k-sub)',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Search */}
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nomor order, merchant, atau pelanggan..."
          style={{
            width: '100%', maxWidth: 380, padding: '10px 16px', borderRadius: 10, fontSize: 14,
            border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)',
            marginBottom: 20, boxSizing: 'border-box',
          }} />

        {/* Table-like list */}
        {loading ? (
          <p style={{ color: 'var(--k-sub)' }}>Memuat...</p>
        ) : orders.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--k-sub)', padding: '40px 0' }}>Tidak ada order.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.map(order => {
              const sm = STATUS_META[order.status] ?? STATUS_META.pending
              return (
                <div key={order.id} onClick={() => setSelected(order)} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)',
                  cursor: 'pointer',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>#{order.order_number}</span>
                      <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg }}>{sm.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>
                      {order.merchant?.name} → {order.customer?.name}
                      {order.mitra && ` · Mitra: ${order.mitra.name}`}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--k-sub)', marginTop: 2 }}>{fmtDate(order.created_at)}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#FF7A45' }}>{fmtRp(order.total_amount)}</div>
                    <div style={{ fontSize: 11, color: '#00C896' }}>+{fmtRp(order.platform_commission_food + order.platform_commission_delivery)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {meta.last_page > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
              padding: '8px 16px', borderRadius: 10, border: '1.5px solid var(--k-border)',
              background: 'transparent', color: page === 1 ? 'var(--k-sub)' : 'var(--k-text)', cursor: page === 1 ? 'default' : 'pointer',
            }}>‹ Sebelumnya</button>
            <span style={{ padding: '8px 14px', fontSize: 13, color: 'var(--k-sub)' }}>{page} / {meta.last_page}</span>
            <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page} style={{
              padding: '8px 16px', borderRadius: 10, border: '1.5px solid var(--k-border)',
              background: 'transparent', color: page === meta.last_page ? 'var(--k-sub)' : 'var(--k-text)', cursor: page === meta.last_page ? 'default' : 'pointer',
            }}>Berikutnya ›</button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
