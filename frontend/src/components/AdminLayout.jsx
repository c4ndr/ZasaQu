import { useState, useEffect, useCallback, useRef } from 'react'
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import useAppInfo from '../hooks/useAppInfo'

// ── Grup navigasi ─────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: null,
    items: [
      { to: '/admin',         emoji: '📊', label: 'Dashboard',     exact: true },
      { to: '/admin/pending', emoji: '🔔', label: 'Pending Review', badgeKey: 'total' },
    ],
  },
  {
    label: 'Layanan',
    items: [
      { to: '/admin/orders',      emoji: '📦', label: 'ZasaGo'   },
      { to: '/admin/food/orders', emoji: '🍜', label: 'ZasaFood' },
      { to: '/admin/home/orders', emoji: '🏠', label: 'ZasaHome' },
      { to: '/admin/serv/orders', emoji: '🔧', label: 'ZasaServ' },
      { to: '/admin/mart/orders', emoji: '🛒', label: 'ZasaShop' },
    ],
  },
  {
    label: 'Merchant & Mitra',
    items: [
      { to: '/admin/food/merchants', emoji: '🍽️', label: 'Merchant Food' },
      { to: '/admin/food/review',    emoji: '⏳', label: 'Review Food',    badgeKey: 'food'  },
      { to: '/admin/home/providers', emoji: '🧺', label: 'Provider Home' },
      { to: '/admin/home/review',    emoji: '⏳', label: 'Review Home',    badgeKey: 'home'  },
      { to: '/admin/serv/providers', emoji: '🔧', label: 'Provider Serv' },
      { to: '/admin/serv/review',    emoji: '⏳', label: 'Review Pending', badgeKey: 'serv'  },
      { to: '/admin/mart/sellers',   emoji: '🛍️', label: 'Seller Mart'   },
      { to: '/admin/mart/review',    emoji: '⏳', label: 'Review Seller',  badgeKey: 'mart'  },
      { to: '/admin/mart/products',  emoji: '📋', label: 'Produk Mart'   },
      { to: '/admin/mitra/verify',   emoji: '✅', label: 'Verif Mitra'   },
      { to: '/admin/mitra/review',   emoji: '⏳', label: 'Review Mitra',   badgeKey: 'mitra' },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { to: '/admin/topup',    emoji: '💰', label: 'Top Up'      },
      { to: '/admin/withdraw', emoji: '💸', label: 'Withdraw'    },
      { to: '/admin/wallet',   emoji: '🏦', label: 'Adjust Saldo'},
    ],
  },
  {
    label: 'Sistem',
    items: [
      { to: '/admin/users',      emoji: '👥', label: 'Pengguna'      },
      { to: '/admin/promos',     emoji: '📢', label: 'Promo & Iklan' },
      { to: '/admin/modules',    emoji: '🧩', label: 'Modul Layanan' },
      { to: '/admin/settings',   emoji: '⚙️', label: 'Pengaturan'   },
      { to: '/admin/audit-logs', emoji: '📋', label: 'Log Audit'     },
    ],
  },
]

const ALL_ITEMS  = NAV_GROUPS.flatMap(g => g.items)
const PAGE_TITLE = Object.fromEntries(ALL_ITEMS.map(i => [i.to, i.label]))
const SIDEBAR_W  = 260

// ── Hook: pending counts ──────────────────────────────────────────────────────
function usePendingCounts() {
  const [counts, setCounts] = useState({ food: 0, home: 0, serv: 0, mart: 0, mitra: 0 })

  const fetchAll = useCallback(async () => {
    const [food, home, serv, mart, mitra] = await Promise.allSettled([
      api.get('/admin/food/merchants?status=pending'),
      api.get('/admin/home/providers?status=pending'),
      api.get('/admin/serv/providers?status=pending'),
      api.get('/admin/mart/sellers?status=pending'),
      api.get('/admin/mitra/pending'),
    ])
    setCounts({
      food:  food.status  === 'fulfilled' ? (food.value.data.meta?.total  ?? 0) : 0,
      home:  home.status  === 'fulfilled' ? (home.value.data.meta?.total  ?? 0) : 0,
      serv:  serv.status  === 'fulfilled' ? (serv.value.data.meta?.total  ?? 0) : 0,
      mart:  mart.status  === 'fulfilled' ? (mart.value.data.meta?.total  ?? 0) : 0,
      mitra: mitra.status === 'fulfilled' ? (mitra.value.data.meta?.total ?? 0) : 0,
    })
  }, [])

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, 60_000)
    return () => clearInterval(id)
  }, [fetchAll])

  return counts
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ n }) {
  if (!n) return null
  return (
    <span style={{
      flexShrink: 0, minWidth: 18, height: 18, borderRadius: 9,
      background: '#EF4444', color: '#fff',
      fontSize: 10, fontWeight: 800, lineHeight: '18px',
      textAlign: 'center', padding: '0 5px',
    }}>
      {n > 99 ? '99+' : n}
    </span>
  )
}

// ── Pending popover di topbar ─────────────────────────────────────────────────
const PENDING_MODULES = [
  { key: 'food',  label: 'Merchant Food', to: '/admin/food/review',  emoji: '🍜' },
  { key: 'home',  label: 'Provider Home', to: '/admin/home/review',  emoji: '🏠' },
  { key: 'serv',  label: 'Provider Serv', to: '/admin/serv/review',  emoji: '🔧' },
  { key: 'mart',  label: 'Seller Mart',   to: '/admin/mart/review',  emoji: '🛒' },
  { key: 'mitra', label: 'Mitra ZasaGo',  to: '/admin/mitra/review', emoji: '🏍️' },
]

function PendingPopover({ counts }) {
  const navigate        = useNavigate()
  const [open, setOpen] = useState(false)
  const ref             = useRef(null)
  const total = Object.values(counts).reduce((s, n) => s + n, 0)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (total === 0) return null

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
        borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
        background: open ? 'rgba(239,68,68,0.1)' : 'transparent',
        cursor: 'pointer', color: '#EF4444', fontWeight: 700, fontSize: 12,
        transition: 'background 0.15s',
      }}>
        <span style={{ fontSize: 14 }}>🔔</span>
        <span>{total} pending</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 300,
          background: 'var(--k-surface)', border: '1px solid var(--k-border)',
          borderRadius: 12, padding: '6px', minWidth: 220,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '6px 10px 8px' }}>
            Antrian Review
          </p>
          {PENDING_MODULES.map(m => {
            const n = counts[m.key] ?? 0
            if (n === 0) return null
            return (
              <button key={m.key} onClick={() => { navigate(m.to); setOpen(false) }} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent',
                cursor: 'pointer', gap: 8,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--k-input)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontSize: 13, color: 'var(--k-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {m.emoji} {m.label}
                </span>
                <Badge n={n} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── User dropdown di topbar ───────────────────────────────────────────────────
function UserMenu() {
  const { logout, user }  = useAuth()
  const navigate          = useNavigate()
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleLogout() {
    try { await api.post('/auth/logout') } finally { logout(); navigate('/login') }
  }

  const initial = (user?.name ?? 'A')[0].toUpperCase()

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 5px',
        borderRadius: 10, border: '1px solid var(--k-border)',
        background: open ? 'var(--k-input)' : 'transparent',
        cursor: 'pointer', transition: 'background 0.15s',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'rgba(249,115,22,0.15)', border: '1.5px solid rgba(249,115,22,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: '#F97316',
        }}>{initial}</div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-text)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{user?.name ?? 'Admin'}</p>
          <p style={{ fontSize: 10, color: 'var(--k-muted)', lineHeight: 1 }}>Administrator</p>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--k-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 300,
          background: 'var(--k-surface)', border: '1px solid var(--k-border)',
          borderRadius: 12, minWidth: 200, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--k-border)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 2 }}>{user?.name}</p>
            <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{user?.email}</p>
          </div>
          <div style={{ padding: '6px' }}>
            <button onClick={handleLogout} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 10px', borderRadius: 8, border: 'none',
              background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: '#EF4444',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span>🚪</span> Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Nav item ──────────────────────────────────────────────────────────────────
function NavItem({ item, counts, onClick }) {
  const badgeCount = item.badgeKey ? (counts[item.badgeKey] ?? 0) : 0
  return (
    <NavLink to={item.to} end={item.exact} onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', borderRadius: 8, textDecoration: 'none',
        fontSize: 13, fontWeight: isActive ? 700 : 400,
        color: isActive ? '#F97316' : 'var(--k-sub)',
        background: isActive ? 'rgba(249,115,22,0.1)' : 'transparent',
        borderLeft: isActive ? '3px solid #F97316' : '3px solid transparent',
        marginBottom: 1, transition: 'all 0.12s',
      })}
      onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'var(--k-input)' }}
      onMouseLeave={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ fontSize: 15, width: 22, textAlign: 'center', flexShrink: 0 }}>{item.emoji}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
      <Badge n={badgeCount} />
    </NavLink>
  )
}

// ── Sidebar content ───────────────────────────────────────────────────────────
function SidebarContent({ onNavClick, counts }) {
  const { app_name } = useAppInfo()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Link to="/admin" style={{ textDecoration: 'none' }}>
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--k-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, background: 'linear-gradient(135deg,#F97316,#EF4444)', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 20, color: '#fff', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(249,115,22,0.4)',
            }}>Z</div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--k-text)', lineHeight: 1.2 }}>{app_name || 'ZasaQu'}</p>
              <p style={{ fontSize: 10, color: 'var(--k-muted)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Admin Panel</p>
            </div>
          </div>
        </div>
      </Link>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px', scrollbarWidth: 'none' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 6 }}>
            {group.label && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 12px 6px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
                  {group.label}
                </p>
                <div style={{ flex: 1, height: 1, background: 'var(--k-border)' }} />
              </div>
            )}
            {group.items.map(item => (
              <NavItem key={item.to} item={item} counts={counts} onClick={onNavClick} />
            ))}
          </div>
        ))}
        <div style={{ height: 20 }} />
      </nav>
    </div>
  )
}

// ── Layout utama ──────────────────────────────────────────────────────────────
export default function AdminLayout({ children, title }) {
  const location              = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const rawCounts             = usePendingCounts()
  const counts                = { ...rawCounts, total: Object.values(rawCounts).reduce((s, n) => s + n, 0) }

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  // Breadcrumb: cari grup + label dari path
  const currentItem  = ALL_ITEMS.find(i => i.exact ? location.pathname === i.to : location.pathname.startsWith(i.to) && (location.pathname[i.to.length] === '/' || location.pathname.length === i.to.length))
  const currentGroup = NAV_GROUPS.find(g => g.items.some(i => i.to === currentItem?.to))
  const pageTitle    = title ?? currentItem?.label ?? 'Admin Panel'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', color: 'var(--k-text)', fontFamily: 'system-ui,sans-serif' }}>
      <style>{`
        @keyframes slideInLeft { from { transform: translateX(-100%) } to { transform: translateX(0) } }
        @keyframes fadeInBg    { from { opacity: 0 } to { opacity: 1 } }
        nav::-webkit-scrollbar { display: none }

        @media (min-width: 1024px) {
          .adm-sidebar { display: flex !important; }
          .adm-wrapper { margin-left: ${SIDEBAR_W}px !important; }
          .adm-burger  { display: none !important; }
          .adm-username { display: block !important; }
        }
        @media (max-width: 1023px) {
          .adm-sidebar { display: none !important; }
          .adm-wrapper { margin-left: 0 !important; }
          .adm-burger  { display: flex !important; }
          .adm-username { display: none !important; }
        }
      `}</style>

      {/* Sidebar desktop */}
      <aside className="adm-sidebar" style={{
        display: 'none', position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W,
        background: 'var(--k-surface)', borderRight: '1px solid var(--k-border)',
        flexDirection: 'column', zIndex: 100,
      }}>
        <SidebarContent onNavClick={null} counts={counts} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 200, backdropFilter: 'blur(3px)', animation: 'fadeInBg 0.2s ease',
          }} />
          <aside style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W,
            background: 'var(--k-surface)', borderRight: '1px solid var(--k-border)',
            zIndex: 210, display: 'flex', flexDirection: 'column',
            animation: 'slideInLeft 0.22s ease',
          }}>
            <SidebarContent onNavClick={() => setDrawerOpen(false)} counts={counts} />
          </aside>
        </>
      )}

      {/* Main wrapper */}
      <div className="adm-wrapper" style={{ marginLeft: 0, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

        {/* Topbar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 90,
          background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)',
          height: 56, display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 12, flexShrink: 0,
        }}>
          {/* Hamburger mobile */}
          <button className="adm-burger" onClick={() => setDrawerOpen(true)} style={{
            display: 'none', width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'var(--k-card)', border: '1px solid var(--k-border)',
            color: 'var(--k-sub)', cursor: 'pointer',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="3" y1="6"  x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            {currentGroup?.label && (
              <>
                <span style={{ fontSize: 12, color: 'var(--k-muted)', whiteSpace: 'nowrap', fontWeight: 500 }}>{currentGroup.label}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ color: 'var(--k-border)', flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </>
            )}
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pageTitle}
            </span>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <PendingPopover counts={rawCounts} />
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '28px 28px 56px', maxWidth: 1280, width: '100%', boxSizing: 'border-box' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
