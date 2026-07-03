import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import MartSellerLayout from '../../components/MartSellerLayout'
import api from '../../services/api'
import echo from '../../services/echo'
import { useAuth } from '../../context/AuthContext'
import { playNewOrderChime, setupChimeUnlock } from '../../utils/systemNotif'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const STORAGE = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')

export default function SellerDashboardPage() {
  const navigate = useNavigate()
  const { user }   = useAuth()
  const [profile,  setProfile]  = useState(null)
  const [stats,    setStats]    = useState(null)
  const [wallet,   setWallet]   = useState(null)
  const [pending,  setPending]  = useState([])
  const [toggling, setToggling] = useState(false)

  const load = useCallback(() => {
    api.get('/mart/seller/profile').then(r => setProfile(r.data))
    api.get('/wallet/summary').then(r => setWallet(r.data)).catch(() => {})
    // Stats: ambil beberapa tab order untuk hitung
    Promise.all([
      api.get('/mart/seller/orders', { params: { status: 'pending', page: 1 } }),
      api.get('/mart/seller/orders', { params: { status: 'picking_up,on_delivery', page: 1 } }).catch(() => ({ data: { data: [] } })),
      api.get('/mart/seller/orders', { params: { status: 'completed', page: 1 } }).catch(() => ({ data: { data: [] } })),
    ]).then(([pend, active, done]) => {
      const pendOrders   = pend.data.data ?? []
      const activeOrders = active.data.data ?? []
      const doneOrders   = done.data.data ?? []
      const today = new Date().toDateString()
      const todayRevenue = doneOrders
        .filter(o => new Date(o.updated_at).toDateString() === today)
        .reduce((s, o) => s + (o.total ?? 0), 0)
      setPending(pendOrders.slice(0, 4))
      setStats({
        pending:  pendOrders.length,
        active:   activeOrders.length,
        done:     doneOrders.length,
        revenue:  todayRevenue,
      })
    })
  }, [])

  useEffect(() => {
    setupChimeUnlock()
    load()
    const ch = echo.channel(`App.Models.User.${user?.id}`)
    ch.listen('.mart.order.created', () => { playNewOrderChime(); load() })
    return () => echo.leave(`App.Models.User.${user?.id}`)
  }, [load, user?.id])

  const toggleOpen = async () => {
    if (!profile) return
    setToggling(true)
    try {
      const r = await api.post('/mart/seller/toggle-open')
      setProfile(p => ({ ...p, is_open: r.data.is_open }))
    } finally { setToggling(false) }
  }

  const isActive = profile?.status === 'active'
  const isOpen   = profile?.is_open

  return (
    <MartSellerLayout title="Dashboard">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Store Hero Card ───────────────────────────────────────────── */}
        <div style={{ borderRadius: 20, overflow: 'hidden', background: isOpen ? 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)' : 'linear-gradient(135deg,#1F2937 0%,#374151 100%)', position: 'relative' }}>
          {/* Dekorasi */}
          <div style={{ position: 'absolute', right: -30, top: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 40, bottom: -40, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

          {profile?.banner_path && (
            <img src={`${STORAGE}/${profile.banner_path}`} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.15 }} />
          )}

          <div style={{ position: 'relative', padding: '18px 18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,255,255,0.2)' }}>
                {profile?.logo_path
                  ? <img src={`${STORAGE}/${profile.logo_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🏪</div>
                }
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600 }}>TOKO SAYA</p>
                <p style={{ color: '#fff', fontSize: 17, fontWeight: 900, lineHeight: 1.2, marginTop: 2 }}>{profile?.name ?? '—'}</p>
                {profile?.average_rating > 0 && (
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>⭐ {profile.average_rating.toFixed(1)} · {profile.total_ratings} ulasan</p>
                )}
              </div>
              <button onClick={toggleOpen} disabled={toggling || !isActive}
                style={{ padding: '10px 16px', borderRadius: 12, border: '2px solid rgba(255,255,255,0.3)', background: isOpen ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: isActive ? 'pointer' : 'not-allowed', opacity: !isActive ? 0.5 : 1, flexShrink: 0 }}>
                {toggling ? '...' : isOpen ? '🟢 Buka' : '🔴 Tutup'}
              </button>
            </div>

            {!isActive && (
              <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)' }}>
                <p style={{ color: '#FCD34D', fontSize: 12, fontWeight: 600 }}>⏳ Toko menunggu verifikasi admin</p>
              </div>
            )}

            {isActive && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {[
                  { label: 'Pesanan Baru',  value: stats?.pending  ?? '—', color: '#FCD34D' },
                  { label: 'Dalam Proses',  value: stats?.active   ?? '—', color: '#93C5FD' },
                  { label: 'Hari ini',      value: stats?.revenue ? fmtRp(stats.revenue) : 'Rp 0', color: '#86EFAC', small: true },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 8px', textAlign: 'center', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p style={{ fontSize: s.small ? 12 : 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Saldo dompet ──────────────────────────────────────────────── */}
        <div onClick={() => navigate('/seller/wallet')} style={{ borderRadius: 16, padding: '16px 18px', background: 'linear-gradient(135deg,#1E1B4B,#312E81)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, marginBottom: 3 }}>💰 Saldo Dompet</p>
            <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px' }}>
              {wallet ? fmtRp(wallet.available ?? wallet.balance) : '—'}
            </p>
            {wallet?.locked > 0 && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>🔒 Rp {Number(wallet.locked).toLocaleString('id-ID')} dikunci</p>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>›</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: 8 }}>Tarik saldo</span>
          </div>
        </div>

        {/* ── Menu aksi cepat ───────────────────────────────────────────── */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Menu</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            {[
              { emoji: '📦', label: 'Pesanan',  to: '/seller/orders',      badge: stats?.pending },
              { emoji: '🛍️', label: 'Produk',   to: '/seller/products',    badge: null },
              { emoji: '💬', label: 'Chat',      to: '/seller/mart/chats',  badge: null },
              { emoji: '⚙️', label: 'Pengaturan', to: '/seller/settings',   badge: null },
              { emoji: '💰', label: 'Dompet',   to: '/seller/wallet',       badge: null },
            ].map(m => (
              <button key={m.label} onClick={() => navigate(m.to)}
                style={{ borderRadius: 14, padding: '14px 6px', background: 'var(--k-card)', border: '1px solid var(--k-border)', cursor: 'pointer', textAlign: 'center', position: 'relative' }}>
                <div style={{ fontSize: 26, marginBottom: 4 }}>{m.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--k-text)' }}>{m.label}</div>
                {m.badge > 0 && (
                  <span style={{ position: 'absolute', top: 6, right: 6, background: '#DC2626', color: '#fff', fontSize: 10, fontWeight: 800, minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{m.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Produk stats ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {[
            { label: 'Total Produk',    value: profile?.all_products?.length ?? '—',      icon: '🛍️', color: '#6366F1' },
            { label: 'Terjual Total',   value: profile?.all_products?.reduce((s, p) => s + (p.total_sold ?? 0), 0) ?? '—', icon: '🔥', color: '#F97316' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--k-card)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 28 }}>{s.icon}</div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 2 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Pesanan menunggu ──────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)' }}>Pesanan Baru</p>
            <button onClick={() => navigate('/seller/orders')} style={{ background: 'none', border: 'none', color: '#6366F1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Lihat semua →</button>
          </div>

          {pending.length === 0 ? (
            <div style={{ background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', padding: '28px', textAlign: 'center', color: 'var(--k-muted)' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📭</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>Tidak ada pesanan baru</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Pesanan customer akan muncul di sini</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pending.map(o => (
                <div key={o.id} onClick={() => navigate('/seller/orders')}
                  style={{ background: 'var(--k-card)', borderRadius: 12, padding: '13px 14px', border: '2px solid rgba(99,102,241,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📦</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-text)' }}>#{o.order_number}</p>
                    <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{o.customer?.name} · {o.items?.length ?? 0} produk</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#6366F1' }}>{fmtRp(o.total)}</p>
                    {o.payment_method === 'cod' && <span style={{ fontSize: 10, color: '#DC2626', fontWeight: 700 }}>COD</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Warning: lokasi belum diset ──────────────────────────────── */}
        {isActive && (!profile?.lat || !profile?.lng) && (
          <div onClick={() => navigate('/seller/settings')} style={{ borderRadius: 14, padding: '14px 16px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', gap: 10, cursor: 'pointer' }}>
            <span style={{ fontSize: 20 }}>📍</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 2 }}>Lokasi Toko Belum Diatur!</p>
              <p style={{ fontSize: 12, color: 'var(--k-sub)', lineHeight: 1.5 }}>Pembeli tidak bisa checkout sebelum kamu mengatur koordinat toko. Tap untuk ke Pengaturan.</p>
            </div>
          </div>
        )}

        {/* ── Tips: toko tutup ──────────────────────────────────────────── */}
        {isActive && !isOpen && (
          <div style={{ borderRadius: 14, padding: '14px 16px', background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#F97316', marginBottom: 2 }}>Toko Sedang Tutup</p>
              <p style={{ fontSize: 12, color: 'var(--k-sub)', lineHeight: 1.5 }}>Buka toko agar pembeli bisa memesan produkmu sekarang.</p>
            </div>
          </div>
        )}
      </div>
    </MartSellerLayout>
  )
}
