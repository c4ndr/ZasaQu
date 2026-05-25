import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import api from '../../services/api'

function fmtRp(v)   { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
function fmtDate(d) { return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }

const STATUS_META = {
  pending:           { label: 'Menunggu Merchant', color: '#F6AD55', bg: 'rgba(246,173,85,0.12)'  },
  merchant_accepted: { label: 'Diterima',          color: '#63B3ED', bg: 'rgba(99,179,237,0.12)'  },
  preparing:         { label: 'Dimasak',           color: '#9F7AEA', bg: 'rgba(159,122,234,0.12)' },
  ready_for_pickup:  { label: 'Siap Diambil',      color: '#00C896', bg: 'rgba(0,200,150,0.12)'   },
  mitra_on_pickup:   { label: 'Mitra Menuju',      color: '#63B3ED', bg: 'rgba(99,179,237,0.12)'  },
  picked_up:         { label: 'Diambil Mitra',     color: '#9F7AEA', bg: 'rgba(159,122,234,0.12)' },
  on_delivery:       { label: 'Dalam Perjalanan',  color: '#63B3ED', bg: 'rgba(99,179,237,0.12)'  },
  delivered:         { label: 'Tiba!',             color: '#00C896', bg: 'rgba(0,200,150,0.12)'   },
  completed:         { label: 'Selesai',           color: '#00C896', bg: 'rgba(0,200,150,0.12)'   },
  cancelled:         { label: 'Dibatalkan',        color: '#A0A0BC', bg: 'rgba(160,160,188,0.12)' },
  rejected:          { label: 'Ditolak',           color: '#F56565', bg: 'rgba(245,101,101,0.12)' },
}

export default function FoodOrdersPage() {
  const navigate = useNavigate()
  const [tab,      setTab]      = useState('active')
  const [orders,   setOrders]   = useState([])
  const [meta,     setMeta]     = useState(null)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [loadMore, setLoadMore] = useState(false)

  const fetchOrders = useCallback(async (currentPage = 1, append = false) => {
    append ? setLoadMore(true) : setLoading(true)
    try {
      const params = tab === 'active'
        ? { active_only: true }
        : { page: currentPage }
      const r = await api.get('/food/orders', { params })
      const newOrders = r.data.data || []
      setOrders(prev => append ? [...prev, ...newOrders] : newOrders)
      setMeta(r.data.meta ?? null)
    } catch {} finally {
      append ? setLoadMore(false) : setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    setOrders([])
    setPage(1)
    fetchOrders(1, false)
  }, [tab])

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    fetchOrders(next, true)
  }

  const hasMore = meta && page < meta.last_page

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      <div style={{ padding: '20px 16px 0', background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)' }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 14 }}>Pesanan Makanan</div>
        <div style={{ display: 'flex', gap: 8, paddingBottom: 14 }}>
          {[['active','Aktif'],['history','Riwayat']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: tab === k ? 700 : 400, fontSize: 13,
              background: tab === k ? '#F97316' : 'var(--k-input)',
              color: tab === k ? '#fff' : 'var(--k-sub)',
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--k-sub)', padding: '40px 0' }}>Memuat...</p>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
            <div>{tab === 'active' ? 'Tidak ada pesanan aktif.' : 'Belum ada riwayat.'}</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orders.map(order => {
                const sm = STATUS_META[order.status] ?? STATUS_META.pending
                return (
                  <div key={order.id} onClick={() => navigate(`/food/orders/${order.id}`)}
                    style={{
                      padding: '16px', borderRadius: 14, background: 'var(--k-card)',
                      border: '1.5px solid var(--k-border)', cursor: 'pointer',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{order.merchant?.name}</div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        color: sm.color, background: sm.bg,
                      }}>{sm.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--k-sub)', marginBottom: 6 }}>
                      {order.items?.map(i => `${i.item_name} ×${i.quantity}`).join(', ')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--k-sub)' }}>{fmtDate(order.created_at)}</span>
                      <span style={{ fontWeight: 700, color: '#F97316' }}>{fmtRp(order.total_amount)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {tab === 'history' && hasMore && (
              <button onClick={handleLoadMore} disabled={loadMore} style={{
                display: 'block', width: '100%', marginTop: 16, padding: '12px',
                borderRadius: 12, border: '1.5px solid var(--k-border)',
                background: 'var(--k-card)', color: 'var(--k-sub)',
                fontSize: 13, fontWeight: 600, cursor: loadMore ? 'default' : 'pointer',
              }}>
                {loadMore ? 'Memuat...' : 'Muat Lebih'}
              </button>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
