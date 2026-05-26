import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/seller',           emoji: '📊', label: 'Dashboard',  exact: true },
  { to: '/seller/orders',    emoji: '📦', label: 'Pesanan'  },
  { to: '/seller/products',  emoji: '🛍️', label: 'Produk'   },
  { to: '/seller/settings',  emoji: '⚙️', label: 'Pengaturan' },
]

export default function MartSellerLayout({ children, title }) {
  const { logout } = useAuth()
  const navigate   = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 50 }}>
        <span style={{ fontSize: 22 }}>🏪</span>
        <p style={{ color: '#fff', fontWeight: 800, fontSize: 15, flex: 1 }}>{title || 'ZasaMart Seller'}</p>
        <button onClick={logout} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Keluar</button>
      </div>

      {/* Content */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 72 }}>
        {children}
      </main>

      {/* Bottom nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--k-surface)', borderTop: '1px solid var(--k-border)', display: 'flex', paddingBottom: 'env(safe-area-inset-bottom,0px)', zIndex: 50 }}>
        {NAV.map(({ to, emoji, label, exact }) => (
          <NavLink key={to} to={to} end={exact} style={{ flex: 1, textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 10, paddingBottom: 10, gap: 2 }}>
                <span style={{ fontSize: 20 }}>{emoji}</span>
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? '#6366F1' : 'var(--k-muted)', transition: 'color 0.18s' }}>{label}</span>
                <span style={{ height: 3, borderRadius: 3, width: isActive ? 20 : 0, background: '#6366F1', transition: 'width 0.2s ease', marginTop: 1 }} />
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
