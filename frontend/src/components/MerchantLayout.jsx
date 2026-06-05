import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const NAV_ITEMS = [
  { to: '/merchant',          emoji: '📊', label: 'Dashboard', exact: true },
  { to: '/merchant/orders',   emoji: '🛎️', label: 'Order'     },
  { to: '/merchant/menu',     emoji: '🍽️', label: 'Menu'      },
  { to: '/merchant/settings', emoji: '⚙️', label: 'Pengaturan' },
]

export default function MerchantLayout({ children, title, pendingCount = 0 }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch {}
    logout(); navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--k-bg)', fontFamily: 'system-ui,sans-serif' }}>
      <style>{`
        @media (max-width: 767px) {
          .merchant-sidebar { display: none !important; }
          .merchant-bottomnav { display: flex !important; }
          .merchant-main { padding-bottom: 76px !important; }
          .merchant-topbar { display: flex !important; }
        }
        @media (min-width: 768px) {
          .merchant-sidebar { display: flex !important; }
          .merchant-bottomnav { display: none !important; }
          .merchant-topbar { display: none !important; }
        }
      `}</style>

      {/* ── Sidebar (desktop) ── */}
      <aside className="merchant-sidebar" style={{
        display: 'none', width: 220, flexDirection: 'column', flexShrink: 0,
        background: 'var(--k-card)', borderRight: '1px solid var(--k-border)',
        position: 'sticky', top: 0, height: '100dvh', overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🍜</span>
          <img src="/logo-zasaqu.png" alt="ZasaQu" style={{ height: 18 }} />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} end={item.exact} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 13px', borderRadius: 10, textDecoration: 'none',
              color: isActive ? '#F97316' : 'var(--k-sub)',
              background: isActive ? 'rgba(249,115,22,0.1)' : 'transparent',
              fontWeight: isActive ? 700 : 500, fontSize: 13,
              position: 'relative',
            })}>
              <span style={{ fontSize: 17 }}>{item.emoji}</span>
              <span>{item.label}</span>
              {item.to === '/merchant/orders' && pendingCount > 0 && (
                <span style={{
                  marginLeft: 'auto', background: '#DC2626', color: '#fff',
                  fontSize: 11, fontWeight: 800, padding: '2px 6px', borderRadius: 20, lineHeight: 1.4,
                }}>{pendingCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '10px', borderTop: '1px solid var(--k-border)' }}>
          <div style={{ padding: '6px 13px', fontSize: 12, color: 'var(--k-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name}
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 13px', borderRadius: 10, color: '#F56565',
            fontSize: 13, fontWeight: 500,
          }}>
            <span style={{ fontSize: 17 }}>🚪</span> Keluar
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="merchant-main" style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {/* Top bar (mobile only) */}
        <div className="merchant-topbar" style={{
          display: 'none', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: 'var(--k-card)',
          borderBottom: '1px solid var(--k-border)',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🍜</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--k-text)' }}>{title || 'Merchant'}</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--k-sub)' }}>{user?.name}</span>
        </div>

        {/* Header (desktop only) */}
        {title && (
          <header style={{ padding: '22px 28px 0', borderBottom: '1px solid var(--k-border)', background: 'var(--k-card)' }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--k-text)', paddingBottom: 16 }}>{title}</h1>
          </header>
        )}

        <div style={{ padding: '20px 16px' }} className="merchant-content">
          <style>{`@media(min-width:768px){.merchant-content{padding:24px 28px !important}}`}</style>
          {children}
        </div>
      </main>

      {/* ── Bottom Nav (mobile) ── */}
      <nav className="merchant-bottomnav" style={{
        display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--k-card)', borderTop: '1px solid var(--k-border)',
        zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} end={item.exact} style={({ isActive }) => ({
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '10px 4px 8px', textDecoration: 'none',
            color: isActive ? '#F97316' : 'var(--k-sub)', position: 'relative',
          })}>
            <div style={{ position: 'relative', lineHeight: 1 }}>
              <span style={{ fontSize: 20 }}>{item.emoji}</span>
              {item.to === '/merchant/orders' && pendingCount > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -8,
                  background: '#DC2626', color: '#fff',
                  fontSize: 9, fontWeight: 800, padding: '1px 4px', borderRadius: 20, lineHeight: 1.4,
                }}>{pendingCount}</span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, marginTop: 3 }}>{item.label}</span>
          </NavLink>
        ))}
        <button onClick={handleLogout} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '10px 4px 8px', border: 'none',
          background: 'none', cursor: 'pointer', color: '#F56565',
        }}>
          <span style={{ fontSize: 20 }}>🚪</span>
          <span style={{ fontSize: 10, fontWeight: 600, marginTop: 3 }}>Keluar</span>
        </button>
      </nav>
    </div>
  )
}
