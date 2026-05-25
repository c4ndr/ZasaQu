import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const NAV_ITEMS = [
  { to: '/merchant',         emoji: '📊', label: 'Dashboard', exact: true },
  { to: '/merchant/orders',  emoji: '🛎️', label: 'Order Masuk' },
  { to: '/merchant/menu',    emoji: '🍽️', label: 'Menu' },
  { to: '/merchant/settings',emoji: '⚙️', label: 'Pengaturan' },
]

export default function MerchantLayout({ children, title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch {}
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--k-bg)', fontFamily: 'system-ui,sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: open ? 220 : 60, transition: 'width .2s',
        background: 'var(--k-card)', borderRight: '1px solid var(--k-border)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
      }}>
        {/* Toggle */}
        <button onClick={() => setOpen(v => !v)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '18px 20px', textAlign: 'left', color: 'var(--k-text)',
          fontSize: 18, display: 'flex', alignItems: 'center', gap: 12,
          overflow: 'hidden',
        }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>🍜</span>
          {open && <img src="/logo-zasaqu.png" alt="ZasaQu" style={{ height: 20, display: 'block', flexShrink: 0 }} />}
        </button>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 8px' }}>
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} end={item.exact} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
              color: isActive ? '#F97316' : 'var(--k-sub)',
              background: isActive ? 'rgba(249,115,22,0.1)' : 'transparent',
              fontWeight: isActive ? 700 : 400, fontSize: 13, whiteSpace: 'nowrap',
              transition: 'all .15s',
            })}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.emoji}</span>
              {open && item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '8px', borderTop: '1px solid var(--k-border)' }}>
          {open && (
            <div style={{ padding: '8px 12px 6px', fontSize: 11, color: 'var(--k-sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </div>
          )}
          <button onClick={handleLogout} style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px', borderRadius: 10, color: '#F56565',
            fontSize: 13, whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🚪</span>
            {open && 'Keluar'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {title && (
          <header style={{
            padding: '20px 28px 0', borderBottom: '1px solid var(--k-border)',
            background: 'var(--k-card)', marginBottom: 0,
          }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--k-text)', paddingBottom: 16 }}>
              {title}
            </h1>
          </header>
        )}
        <div style={{ padding: 28 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
