import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const NAV_ITEMS = [
  { to: '/admin',                 emoji: '📊', label: 'Dashboard',   exact: true },
  { to: '/admin/orders',          emoji: '📦', label: 'Order ZasaGo' },
  { to: '/admin/food/merchants',  emoji: '🍜', label: 'Merchant Food' },
  { to: '/admin/topup',           emoji: '💰', label: 'Top Up' },
  { to: '/admin/withdraw',        emoji: '💸', label: 'Withdraw' },
  { to: '/admin/users',           emoji: '👥', label: 'Pengguna' },
  { to: '/admin/settings',        emoji: '⚙️', label: 'Pengaturan' },
  { to: '/admin/audit-logs',      emoji: '📋', label: 'Log Audit' },
]

const PAGE_TITLE = {
  '/admin':                   'Dashboard',
  '/admin/orders':            'Manajemen Order ZasaGo',
  '/admin/food/merchants':    'Merchant ZasaFood',
  '/admin/topup':             'Top Up',
  '/admin/withdraw':          'Withdraw',
  '/admin/users':             'Pengguna',
  '/admin/settings':          'Pengaturan',
  '/admin/audit-logs':        'Log Audit',
}

const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2.2} strokeLinecap="round">
    <line x1="3" y1="6"  x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2.2} strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6"  y1="6" x2="18" y2="18" />
  </svg>
)

const IconLogout = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

export default function AdminLayout({ children }) {
  const { logout, user } = useAuth()
  const navigate         = useNavigate()
  const location         = useLocation()
  const [open, setOpen]  = useState(false)

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } finally { logout(); navigate('/login') }
  }

  const pageTitle = PAGE_TITLE[location.pathname] ?? 'Admin Panel'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', color: 'var(--k-text)' }}>
      <style>{`
        /* Sidebar drawer */
        .adm-drawer {
          position: fixed; top: 0; left: 0; bottom: 0; width: 260px;
          background: var(--k-surface); border-right: 1px solid var(--k-border);
          z-index: 200; display: flex; flex-direction: column;
          transform: translateX(-100%);
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          box-shadow: none;
        }
        .adm-drawer.open {
          transform: translateX(0);
          box-shadow: 8px 0 40px rgba(0,0,0,0.45);
        }
        /* Overlay */
        .adm-overlay {
          display: none; position: fixed; inset: 0;
          background: rgba(0,0,0,0.6); z-index: 190;
          backdrop-filter: blur(2px);
        }
        .adm-overlay.visible { display: block; }
        /* Nav links */
        .adm-link {
          display: flex; align-items: center; gap: 12;
          padding: 11px 14px; border-radius: 12px; margin-bottom: 2px;
          font-size: 14px; font-weight: 600; text-decoration: none;
          color: var(--k-muted); transition: all 0.15s;
        }
        .adm-link:hover { background: rgba(255,255,255,0.05); color: var(--k-text); }
        .adm-link.active { background: var(--k-glow); color: var(--k-accent); }
        .adm-link.active .adm-emoji { filter: none; opacity: 1; }
        .adm-emoji { font-size: 16px; opacity: 0.7; transition: opacity 0.15s; }
        .adm-link:hover .adm-emoji { opacity: 1; }
      `}</style>

      {/* ── Overlay ── */}
      <div className={`adm-overlay ${open ? 'visible' : ''}`} onClick={() => setOpen(false)} />

      {/* ── Sidebar Drawer ── */}
      <aside className={`adm-drawer ${open ? 'open' : ''}`}>
        {/* Header drawer */}
        <div style={{ padding: '18px 16px', borderBottom: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: 'var(--k-accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 17, color: '#0C0C16', boxShadow: '0 3px 10px rgba(0,200,150,0.35)' }}>Z</div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--k-text)', lineHeight: 1.2 }}>ZasaQu</p>
              <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>Admin Panel</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--k-card)', border: '1px solid var(--k-border)', color: 'var(--k-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconClose />
          </button>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 4px 10px' }}>Menu</p>
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} end={item.exact}
              className={({ isActive }) => `adm-link${isActive ? ' active' : ''}`}
              onClick={() => setOpen(false)}>
              <span className="adm-emoji">{item.emoji}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Profil + Logout */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--k-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: 'var(--k-card)', marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,200,150,0.15)', border: '2px solid rgba(0,200,150,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'var(--k-accent)', flexShrink: 0 }}>
              {(user?.name ?? 'A')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name ?? 'Admin'}</p>
              <p style={{ fontSize: 10, color: 'var(--k-muted)' }}>Administrator</p>
            </div>
          </div>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'var(--k-danger)', background: 'rgba(245,101,101,0.07)', border: 'none', cursor: 'pointer' }}>
            <IconLogout /> Keluar
          </button>
        </div>
      </aside>

      {/* ── Topbar ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', padding: '0 24px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Kiri: logo + judul halaman */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: 'var(--k-accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#0C0C16' }}>Z</div>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-accent)' }}>ZasaQu</span>
          </div>
          <span style={{ color: 'var(--k-border)', fontSize: 18 }}>|</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--k-text)' }}>{pageTitle}</span>
        </div>

        {/* Kanan: tombol hamburger ≡ */}
        <button
          onClick={() => setOpen(true)}
          style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--k-card)', border: '1px solid var(--k-border)', color: 'var(--k-sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--k-card2)'; e.currentTarget.style.color = 'var(--k-text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--k-card)';  e.currentTarget.style.color = 'var(--k-sub)'  }}
        >
          <IconMenu />
        </button>
      </header>

      {/* ── Konten halaman ── */}
      <main style={{ padding: '28px 28px 40px', maxWidth: 1100, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
