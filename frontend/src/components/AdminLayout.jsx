import { useState, useEffect, useCallback, useRef } from 'react'
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import useAppInfo from '../hooks/useAppInfo'

// ── Navigasi ──────────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'Layanan',
    items: [
      { to: '/admin/orders',      emoji: '🏍️', label: 'ZasaGo'   },
      { to: '/admin/food/orders', emoji: '🍜', label: 'ZasaFood' },
      { to: '/admin/home/orders', emoji: '🏠', label: 'ZasaHome' },
      { to: '/admin/serv/orders', emoji: '🔧', label: 'ZasaServis' },
      { to: '/admin/mart/orders', emoji: '🛒', label: 'ZasaShop' },
      { to: '/admin/ride',        emoji: '🚗', label: 'ZasaRide' },
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
      { to: '/admin/serv/review',    emoji: '⏳', label: 'Review Serv',    badgeKey: 'serv'  },
      { to: '/admin/mart/sellers',   emoji: '🛍️', label: 'Seller Mart'   },
      { to: '/admin/mart/review',    emoji: '⏳', label: 'Review Mart',    badgeKey: 'mart'  },
      { to: '/admin/mart/products',  emoji: '📋', label: 'Produk Mart'   },
      { to: '/admin/mitra/verify',   emoji: '✅', label: 'Verif Mitra'   },
      { to: '/admin/mitra/review',   emoji: '⏳', label: 'Review Mitra',   badgeKey: 'mitra' },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { to: '/admin/topup',      emoji: '💰', label: 'Top Up'      },
      { to: '/admin/withdraw',   emoji: '💸', label: 'Withdraw'    },
      { to: '/admin/wallet',     emoji: '🏦', label: 'Adjust Saldo'},
      { to: '/admin/complaints', emoji: '⚠️', label: 'Laporan Masalah' },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { to: '/admin/users',      emoji: '👥', label: 'Pengguna'        },
      { to: '/admin/promos',     emoji: '📢', label: 'Promo & Iklan'  },
      { to: '/admin/vouchers',   emoji: '🎟', label: 'Voucher Diskon' },
      { to: '/admin/broadcast',  emoji: '🔔', label: 'Broadcast Notif'},
      { to: '/admin/modules',    emoji: '🧩', label: 'Modul Layanan'  },
      { to: '/admin/settings',   emoji: '⚙️', label: 'Pengaturan'    },
      { to: '/admin/audit-logs', emoji: '📋', label: 'Log Audit'      },
    ],
  },
]

const ALL_ITEMS = [
  { to: '/admin',         label: 'Dashboard',      exact: true },
  { to: '/admin/pending', label: 'Pending Review', badgeKey: 'total' },
  ...NAV_GROUPS.flatMap(g => g.items),
]

const SIDEBAR_W = 256

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
      minWidth: 18, height: 18, borderRadius: 9, flexShrink: 0,
      background: '#EF4444', color: '#fff',
      fontSize: 10, fontWeight: 800, lineHeight: '18px',
      textAlign: 'center', padding: '0 5px',
    }}>
      {n > 99 ? '99+' : n}
    </span>
  )
}

// ── Nav item ──────────────────────────────────────────────────────────────────
function NavItem({ to, emoji, label, badgeKey, exact, counts, onClick }) {
  const badgeCount = badgeKey ? (counts[badgeKey] ?? 0) : 0
  return (
    <NavLink
      to={to}
      end={exact}
      onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 10px', borderRadius: 7, textDecoration: 'none',
        fontSize: 13, fontWeight: isActive ? 600 : 400,
        color: isActive ? '#F97316' : 'var(--k-sub)',
        background: isActive ? 'rgba(249,115,22,0.08)' : 'transparent',
        borderLeft: isActive ? '3px solid #F97316' : '3px solid transparent',
        marginBottom: 2, transition: 'background 0.12s, color 0.12s',
      })}
      onMouseEnter={e => {
        if (e.currentTarget.getAttribute('aria-current') !== 'page') {
          e.currentTarget.style.background = 'var(--k-input)'
        }
      }}
      onMouseLeave={e => {
        if (e.currentTarget.getAttribute('aria-current') !== 'page') {
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>{emoji}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <Badge n={badgeCount} />
    </NavLink>
  )
}

// ── Pending popover di topbar ─────────────────────────────────────────────────
const PENDING_MODULES = [
  { key: 'food',  label: 'Review Food',  to: '/admin/food/review',  emoji: '🍜' },
  { key: 'home',  label: 'Review Home',  to: '/admin/home/review',  emoji: '🏠' },
  { key: 'serv',  label: 'Review Serv',  to: '/admin/serv/review',  emoji: '🔧' },
  { key: 'mart',  label: 'Review Mart',  to: '/admin/mart/review',  emoji: '🛒' },
  { key: 'mitra', label: 'Review Mitra', to: '/admin/mitra/review', emoji: '🏍️' },
]

function PendingPopover({ counts }) {
  const navigate        = useNavigate()
  const [open, setOpen] = useState(false)
  const ref             = useRef(null)
  const total = Object.values(counts).reduce((s, n) => s + n, 0)

  useEffect(() => {
    if (!open) return
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (total === 0) return null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
        borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
        background: open ? 'rgba(239,68,68,0.1)' : 'transparent',
        cursor: 'pointer', color: '#EF4444', fontWeight: 700, fontSize: 12,
      }}>
        <span>🔔</span>
        <span>{total} pending</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 400,
          background: 'var(--k-surface)', border: '1px solid var(--k-border)',
          borderRadius: 12, padding: 6, minWidth: 220,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '6px 10px 8px' }}>
            Antrian Review
          </p>
          {PENDING_MODULES.map(m => {
            const n = counts[m.key] ?? 0
            if (!n) return null
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

// ── User menu ─────────────────────────────────────────────────────────────────
function UserMenu() {
  const { logout, user } = useAuth()
  const navigate         = useNavigate()
  const [open, setOpen]  = useState(false)
  const ref              = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleLogout() {
    try { await api.post('/auth/logout') } finally { logout(); navigate('/login') }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 5px',
        borderRadius: 10, border: '1px solid var(--k-border)',
        background: open ? 'var(--k-input)' : 'transparent',
        cursor: 'pointer',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: 'rgba(249,115,22,0.12)', border: '1.5px solid rgba(249,115,22,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, color: '#F97316',
        }}>
          {(user?.name ?? 'A')[0].toUpperCase()}
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-text)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
            {user?.name ?? 'Admin'}
          </p>
          <p style={{ fontSize: 10, color: 'var(--k-muted)', lineHeight: 1 }}>Administrator</p>
        </div>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--k-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 400,
          background: 'var(--k-surface)', border: '1px solid var(--k-border)',
          borderRadius: 12, minWidth: 200, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--k-border)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 2 }}>{user?.name}</p>
            <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{user?.email}</p>
          </div>
          <div style={{ padding: 6 }}>
            <button onClick={handleLogout} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 8, border: 'none',
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

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ onNavClick, counts }) {
  const { app_name } = useAppInfo()

  return (
    <>
      {/* Logo */}
      <Link to="/admin" style={{
        textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10,
        height: 56, padding: '0 16px', flexShrink: 0,
        borderBottom: '1px solid var(--k-border)',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg,#F97316,#EF4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 17, color: '#fff',
          boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
        }}>Z</div>
        <div>
          <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--k-text)', lineHeight: 1.25 }}>{app_name || 'ZasaQu'}</p>
          <p style={{ fontSize: 9, color: 'var(--k-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin Panel</p>
        </div>
      </Link>

      {/* Pinned: Dashboard & Pending Review */}
      <div style={{ padding: '6px 8px', flexShrink: 0, borderBottom: '1px solid var(--k-border)' }}>
        <NavItem to="/admin" emoji="📊" label="Dashboard" exact counts={counts} onClick={onNavClick} />
        <NavItem to="/admin/pending" emoji="🔔" label="Pending Review" badgeKey="total" counts={counts} onClick={onNavClick} />
      </div>

      {/* Scrollable nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', scrollbarWidth: 'none' }}>
        <style>{`#adm-nav::-webkit-scrollbar{display:none}`}</style>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 8px 4px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {group.label}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--k-border)' }} />
            </div>
            {group.items.map(item => (
              <NavItem key={item.to} {...item} counts={counts} onClick={onNavClick} />
            ))}
          </div>
        ))}
        <div style={{ height: 24 }} />
      </nav>
    </>
  )
}

// ── Layout utama ──────────────────────────────────────────────────────────────
export default function AdminLayout({ children, title }) {
  const location              = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const rawCounts             = usePendingCounts()
  const counts                = { ...rawCounts, total: Object.values(rawCounts).reduce((s, n) => s + n, 0) }

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    const prev = root.style.maxWidth
    const prevMargin = root.style.margin
    root.style.maxWidth = 'none'
    root.style.margin = '0'
    return () => {
      root.style.maxWidth = prev
      root.style.margin = prevMargin
    }
  }, [])

  const currentItem  = ALL_ITEMS.find(i =>
    i.exact
      ? location.pathname === i.to
      : location.pathname.startsWith(i.to) &&
        (location.pathname[i.to.length] === '/' || location.pathname.length === i.to.length)
  )
  const currentGroup = NAV_GROUPS.find(g => g.items.some(i => i.to === currentItem?.to))
  const pageTitle    = title ?? currentItem?.label ?? 'Admin Panel'

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--k-bg)', color: 'var(--k-text)', fontFamily: 'system-ui,sans-serif' }}>
      <style>{`
        @keyframes slideInLeft { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        @keyframes fadeInBg    { from{opacity:0} to{opacity:1} }

        .adm-sidebar {
          display: none;
          position: fixed; top: 0; left: 0; bottom: 0; width: ${SIDEBAR_W}px;
          background: var(--k-surface); border-right: 1px solid var(--k-border);
          flex-direction: column; z-index: 100; overflow: hidden;
        }
        .adm-burger { display: flex; }

        @media (min-width: 1024px) {
          .adm-sidebar { display: flex !important; }
          .adm-burger  { display: none !important; }
          .adm-main    { margin-left: ${SIDEBAR_W}px; }
        }
      `}</style>

      {/* Sidebar desktop */}
      <aside className="adm-sidebar">
        <Sidebar onNavClick={null} counts={counts} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 200, animation: 'fadeInBg 0.2s ease',
          }} />
          <aside style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W,
            background: 'var(--k-surface)', borderRight: '1px solid var(--k-border)',
            display: 'flex', flexDirection: 'column', zIndex: 210, overflow: 'hidden',
            animation: 'slideInLeft 0.22s ease',
          }}>
            <Sidebar onNavClick={() => setMobileOpen(false)} counts={counts} />
          </aside>
        </>
      )}

      {/* Main area */}
      <div className="adm-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100dvh', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 90,
          background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)',
          height: 56, display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 12, flexShrink: 0,
        }}>
          <button className="adm-burger" onClick={() => setMobileOpen(true)} style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: 'var(--k-card)', border: '1px solid var(--k-border)',
            color: 'var(--k-sub)', cursor: 'pointer',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="3" y1="6"  x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            {currentGroup?.label && (
              <>
                <span style={{ fontSize: 12, color: 'var(--k-muted)', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  {currentGroup.label}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ color: 'var(--k-border)', flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </>
            )}
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pageTitle}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <PendingPopover counts={rawCounts} />
            <UserMenu />
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '24px 28px 48px', boxSizing: 'border-box' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
