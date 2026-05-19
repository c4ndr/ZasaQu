import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BottomNav from '../components/BottomNav'
import api from '../services/api'
import { requestNotifPermission } from '../utils/systemNotif'
import useNotifCount from '../hooks/useNotifCount'

const ROLE_LABELS = {
  pelanggan: 'Pelanggan', mitra_motor: 'Mitra Motor',
  mitra_mobil: 'Mitra Mobil', admin: 'Admin',
}

const ROLE_COLORS = {
  pelanggan:   { bg: 'rgba(0,200,150,0.1)',  color: '#00C896' },
  mitra_motor: { bg: 'rgba(99,179,237,0.1)', color: '#63B3ED' },
  mitra_mobil: { bg: 'rgba(99,179,237,0.1)', color: '#63B3ED' },
}

function formatRp(v) {
  return new Intl.NumberFormat('id-ID').format(Number(v || 0))
}

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
)

function MenuCard({ to, emoji, title, desc, accent }) {
  return (
    <Link to={to} style={{
      display: 'block', textDecoration: 'none',
      background: accent ? 'var(--k-accent)' : 'var(--k-card)',
      border: accent ? 'none' : '1px solid var(--k-border)',
      borderRadius: 20, padding: '18px 16px',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <span style={{ fontSize: 26, display: 'block', marginBottom: 10 }}>{emoji}</span>
      <p style={{
        color: accent ? '#0C0C16' : 'var(--k-text)',
        fontWeight: 700, fontSize: 14, marginBottom: 4,
      }}>{title}</p>
      <p style={{
        color: accent ? 'rgba(12,12,22,0.65)' : 'var(--k-muted)',
        fontSize: 12, lineHeight: 1.4,
      }}>{desc}</p>
    </Link>
  )
}

function QuickBtn({ to, label, variant }) {
  const styles = {
    primary:   { background: 'var(--k-accent)',  color: '#0C0C16', border: 'none' },
    secondary: { background: 'var(--k-card2)',    color: 'var(--k-text)', border: '1px solid var(--k-border2)' },
  }
  return (
    <Link to={to} style={{
      flex: 1, display: 'block', textDecoration: 'none',
      padding: '12px 8px', borderRadius: 14, textAlign: 'center',
      fontSize: 13, fontWeight: 700, transition: 'opacity 0.2s',
      ...styles[variant],
    }}>
      {label}
    </Link>
  )
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate  = useNavigate()
  const isMitra   = user?.role?.startsWith('mitra')
  const roleColor = ROLE_COLORS[user?.role] || ROLE_COLORS.pelanggan

  const [walletData, setWalletData] = useState(null)
  const { count: notifCount } = useNotifCount()

  useEffect(() => {
    if (user?.role === 'admin') return
    api.get('/wallet/summary').then(r => setWalletData(r.data)).catch(() => {})
  }, [user])

  useEffect(() => {
    if (user?.role === 'admin') navigate('/admin', { replace: true })
  }, [user, navigate])

  // Minta izin notifikasi sistem untuk semua user
  useEffect(() => { requestNotifPermission() }, [])

  if (user?.role === 'admin') return null

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } finally {
      logout(); navigate('/login')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 100 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{
        padding: '56px 24px 24px',
        background: 'linear-gradient(180deg, #0F1C22 0%, var(--k-bg) 100%)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ color: 'var(--k-muted)', fontSize: 12, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            ZasaQu
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--k-text)', marginBottom: 8, lineHeight: 1.2 }}>
            Halo, {user?.name?.split(' ')[0]} 👋
          </h1>
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: 100,
            background: roleColor.bg, color: roleColor.color,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
          }}>
            {ROLE_LABELS[user?.role]}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Bell notifikasi */}
          <Link to="/notifications" style={{
            position: 'relative',
            width: 42, height: 42, borderRadius: 14,
            background: 'var(--k-card)', border: '1px solid var(--k-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--k-muted)', textDecoration: 'none', fontSize: 18,
          }}>
            🔔
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: 'var(--k-accent)', color: '#0C0C16',
                fontSize: 9, fontWeight: 900, minWidth: 16, height: 16,
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--k-bg)', padding: '0 2px',
              }}>
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </Link>

          <button onClick={handleLogout} style={{
            width: 42, height: 42, borderRadius: 14,
            background: 'var(--k-card)', border: '1px solid var(--k-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--k-muted)', cursor: 'pointer', transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#F56565'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--k-muted)'}
          >
            <IconLogout />
          </button>
        </div>
      </div>

      {/* Balance card */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{
          borderRadius: 24,
          background: 'linear-gradient(135deg, #0D2A22 0%, #0F1E2A 50%, var(--k-card) 100%)',
          border: '1px solid rgba(0,200,150,0.2)',
          padding: '24px 24px 20px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Lingkaran dekorasi */}
          <div style={{
            position: 'absolute', right: -30, top: -30,
            width: 120, height: 120, borderRadius: '50%',
            background: 'rgba(0,200,150,0.06)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', right: 20, bottom: -40,
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(0,200,150,0.04)',
            pointerEvents: 'none',
          }} />

          <p style={{ color: 'var(--k-muted)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Saldo Tersedia
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
            <span style={{ color: 'var(--k-sub)', fontSize: 18, fontWeight: 600 }}>Rp</span>
            <span style={{ color: 'var(--k-text)', fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {formatRp(walletData?.available ?? user?.wallet?.balance)}
            </span>
          </div>
          {(walletData?.locked_balance ?? user?.wallet?.locked_balance) > 0 && (
            <p style={{ color: 'var(--k-muted)', fontSize: 12, marginBottom: 4 }}>
              🔒 Terkunci: Rp {formatRp(walletData?.locked_balance ?? user?.wallet?.locked_balance)}
            </p>
          )}

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <QuickBtn to="/topup" label="Top Up" variant="primary" />
            {isMitra && <QuickBtn to="/withdraw" label="Withdraw" variant="secondary" />}
            <QuickBtn to="/wallet" label="Riwayat" variant="secondary" />
          </div>
        </div>
      </div>

      {/* Menu utama */}
      <div style={{ padding: '0 20px 16px' }}>
        <p style={{ color: 'var(--k-muted)', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
          Layanan
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {isMitra ? (
            <>
              <MenuCard to="/mitra/orders" emoji="📦" title="Order Tersedia"  desc="Terima order baru" />
              <MenuCard to="/mitra/gps"    emoji="📍" title="GPS Saya"       desc="Aktifkan tracking" />
            </>
          ) : (
            <>
              <MenuCard to="/orders/create" emoji="🚀" title="Kirim Sekarang" desc="Buat order baru" accent />
              <MenuCard to="/orders"         emoji="📋" title="Order Saya"     desc="Lacak pengiriman" />
            </>
          )}
        </div>
      </div>

      {/* ── Layanan ZasaQu ── */}
      {!isMitra && (
        <div style={{ padding: '0 20px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Layanan ZasaQu
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* ZasaGo — Aktif */}
            <a href="/jastip" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--k-card)', border: '1px solid rgba(0,200,150,0.3)',
                borderRadius: 16, padding: '14px 14px',
              }}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>📦</div>
                <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', marginBottom: 2 }}>ZasaGo</p>
                <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 8 }}>Kirim & titip barang</p>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: 'rgba(0,200,150,0.1)', color: 'var(--k-accent)' }}>AKTIF</span>
              </div>
            </a>
            {/* ZasaFood — Coming soon */}
            <div style={{
              background: 'var(--k-card)', border: '1px solid var(--k-border)',
              borderRadius: 16, padding: '14px 14px', opacity: 0.6,
            }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>🍜</div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', marginBottom: 2 }}>ZasaFood</p>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 8 }}>Makanan & minuman</p>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: 'var(--k-card2)', color: 'var(--k-muted)' }}>SEGERA</span>
            </div>
            {/* ZasaMart — Coming soon */}
            <div style={{
              background: 'var(--k-card)', border: '1px solid var(--k-border)',
              borderRadius: 16, padding: '14px 14px', opacity: 0.6,
            }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>🛒</div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', marginBottom: 2 }}>ZasaMart</p>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 8 }}>Belanja & grocery</p>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: 'var(--k-card2)', color: 'var(--k-muted)' }}>SEGERA</span>
            </div>
            {/* ZasaRide — Coming soon */}
            <div style={{
              background: 'var(--k-card)', border: '1px solid var(--k-border)',
              borderRadius: 16, padding: '14px 14px', opacity: 0.6,
            }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>🛵</div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', marginBottom: 2 }}>ZasaRide</p>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 8 }}>Ojek & antar jemput</p>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: 'var(--k-card2)', color: 'var(--k-muted)' }}>SEGERA</span>
            </div>
          </div>
        </div>
      )}

      {/* Info untuk mitra */}
      {isMitra && (
        <div style={{ padding: '0 20px' }}>
          <Link to="/mitra/orders" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--k-card)', border: '1px solid var(--k-border)',
              borderRadius: 20, padding: '16px 18px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'rgba(99,179,237,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>
                💼
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--k-text)', fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
                  Mulai Bekerja
                </p>
                <p style={{ color: 'var(--k-muted)', fontSize: 12 }}>
                  Aktifkan GPS dan terima order baru hari ini
                </p>
              </div>
              <span style={{ color: 'var(--k-muted)' }}><IconArrowRight /></span>
            </div>
          </Link>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
