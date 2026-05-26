import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MartSellerLayout from '../../components/MartSellerLayout'
import api from '../../services/api'

const fmtRp = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')

export default function SellerDashboardPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [orders, setOrders]   = useState([])
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    api.get('/mart/seller/profile').then(r => setProfile(r.data))
    api.get('/mart/seller/orders', { params: { status: 'pending', page: 1 } }).then(r => setOrders(r.data.data?.slice(0, 5) ?? []))
  }, [])

  const toggleOpen = async () => {
    if (!profile) return
    setToggling(true)
    try {
      const r = await api.post('/mart/seller/toggle-open')
      setProfile(p => ({ ...p, is_open: r.data.is_open }))
    } finally { setToggling(false) }
  }

  return (
    <MartSellerLayout title="Dashboard">
      <div style={{ padding: '16px' }}>
        {/* Store status card */}
        <div style={{ background: profile?.is_open ? 'linear-gradient(135deg,#4F46E5,#7C3AED)' : 'linear-gradient(135deg,#374151,#1F2937)', borderRadius: 18, padding: '20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600 }}>Status Toko</p>
              <p style={{ color: '#fff', fontSize: 20, fontWeight: 900, marginTop: 2 }}>{profile?.name ?? '—'}</p>
            </div>
            <button onClick={toggleOpen} disabled={toggling || profile?.status !== 'active'}
              style={{ padding: '10px 18px', borderRadius: 12, border: 'none', background: profile?.is_open ? 'rgba(0,0,0,0.25)' : '#4F46E5', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: profile?.status !== 'active' ? 0.5 : 1 }}>
              {profile?.is_open ? '🟢 Buka' : '🔴 Tutup'}
            </button>
          </div>
          {profile?.status !== 'active' && (
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '6px 10px' }}>
              ⚠️ Toko menunggu persetujuan admin
            </p>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total Produk', value: profile?.all_products_count ?? '—', icon: '🛍️', color: '#6366F1' },
            { label: 'Pesanan Baru', value: orders.length ?? '—', icon: '📦', color: '#F59E0B' },
            { label: 'Rating', value: profile?.average_rating ? profile.average_rating.toFixed(1) + ' ⭐' : '—', icon: '⭐', color: '#F59E0B' },
            { label: 'Ulasan', value: profile?.total_ratings ?? '—', icon: '💬', color: '#8B5CF6' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--k-card)', borderRadius: 14, padding: '14px', border: '1px solid var(--k-border)' }}>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 6 }}>{s.icon} {s.label}</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Recent orders */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)' }}>Pesanan Menunggu</p>
            <button onClick={() => navigate('/seller/orders')} style={{ background: 'none', border: 'none', color: '#6366F1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Lihat semua →</button>
          </div>
          {orders.length === 0 ? (
            <div style={{ background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', padding: '24px', textAlign: 'center', color: 'var(--k-muted)' }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>📭</p>
              <p style={{ fontSize: 13 }}>Tidak ada pesanan baru</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {orders.map(o => (
                <div key={o.id} onClick={() => navigate('/seller/orders')}
                  style={{ background: 'var(--k-card)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--k-border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-text)' }}>{o.order_number}</p>
                    <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{o.customer?.name} · {o.items?.length ?? 0} produk</p>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#6366F1' }}>{fmtRp(o.total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MartSellerLayout>
  )
}
