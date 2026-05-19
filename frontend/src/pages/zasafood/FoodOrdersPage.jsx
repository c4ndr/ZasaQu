import { useState, useEffect } from 'react'
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

const ACTIVE_STATUSES = ['pending','merchant_accepted','preparing','ready_for_pickup','mitra_on_pickup','picked_up','on_delivery','delivered']

export default function FoodOrdersPage() {
  const navigate = useNavigate()
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('active')

  useEffect(() => {
    setLoading(true)
    api.get('/food/orders')
      .then(r => setOrders(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = tab === 'active'
    ? orders.filter(o => ACTIVE_STATUSES.includes(o.status))
    : orders.filter(o => ['completed','cancelled','rejected'].includes(o.status))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      <div style={{ padding: '20px 16px 0', background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)' }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 14 }}>Pesanan Makanan</div>
        <div style={{ display: 'flex', gap: 8, paddingBottom: 14 }}>
          {[['active','Aktif'],['history','Riwayat']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: tab === k ? 700 : 400, fontSize: 13,
              background: tab === k ? '#FF7A45' : 'var(--k-input)',
              color: tab === k ? '#fff' : 'var(--k-sub)',
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--k-sub)', padding: '40px 0' }}>Memuat...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
            <div>{tab === 'active' ? 'Tidak ada pesanan aktif.' : 'Belum ada riwayat.'}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(order => {
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
                    <span style={{ fontWeight: 700, color: '#FF7A45' }}>{fmtRp(order.total_amount)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
