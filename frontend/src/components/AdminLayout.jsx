import { useState, useEffect, useCallback } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import useAppInfo from '../hooks/useAppInfo'

// ── Grup navigasi ─────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: null,
    items: [
      { to: '/admin',         emoji: '📊', label: 'Dashboard',  exact: true },
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
      { to: '/admin/food/review',   emoji: '⏳', label: 'Review Food',    badgeKey: 'food'  },
      { to: '/admin/home/providers', emoji: '🧺', label: 'Provider Home' },
      { to: '/admin/home/review',   emoji: '⏳', label: 'Review Home',    badgeKey: 'home'  },
      { to: '/admin/serv/providers', emoji: '🔧', label: 'Provider Serv' },
      { to: '/admin/serv/review',   emoji: '⏳', label: 'Review Pending', badgeKey: 'serv'  },
      { to: '/admin/mart/sellers',   emoji: '🛍️', label: 'Seller Mart'   },
      { to: '/admin/mart/review',   emoji: '⏳', label: 'Review Seller',  badgeKey: 'mart'  },
      { to: '/admin/mart/products',  emoji: '📋', label: 'Produk Mart'   },
      { to: '/admin/mitra/verify',   emoji: '✅', label: 'Verif Mitra'   },
      { to: '/admin/mitra/review',  emoji: '⏳', label: 'Review Mitra',   badgeKey: 'mitra' },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { to: '/admin/topup',    emoji: '💰', label: 'Top Up'   },
      { to: '/admin/withdraw', emoji: '💸', label: 'Withdraw' },
      { to: '/admin/wallet',   emoji: '🏦', label: 'Adjust Saldo' },
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
const SIDEBAR_W  = 240

// ── Hook: ambil jumlah pending untuk semua review queue ───────────────────────
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

// ── Badge total pending di topbar ─────────────────────────────────────────────
const PENDING_MODULES = [
  { key: 'food',  label: 'Merchant Food', to: '/admin/food/review',  emoji: '🍜' },
  { key: 'home',  label: 'Provider Home', to: '/admin/home/review',  emoji: '🏠' },
  { key: 'serv',  label: 'Provider Serv', to: '/admin/serv/review',  emoji: '🔧' },
  { key: 'mart',  label: 'Seller Mart',   to: '/admin/mart/review',  emoji: '🛒' },
  { key: 'mitra', label: 'Mitra ZasaGo',  to: '/admin/mitra/review', emoji: '🏍️' },
]

function PendingBadge({ counts }) {
  const navigate           = useNavigate()
  const [open, setOpen]    = useState(false)
  const total = Object.values(counts).reduce((s, n) => s + n, 0)

  // Tutup popover saat klik di luar
  useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    setTimeout(() => window.addEventListener('click', handler), 0)
    return () => window.removeEventListener('click', handler)
  }, [open])

  if (total === 0) return null

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 20, border: '1.5px solid rgba(239,68,68,0.35)',
          background: 'rgba(239,68,68,0.08)', cursor: 'pointer',
          color: '#EF4444', fontWeight: 700, fontSize: 12,
        }}
      >
        🔔 <span>{total} pending</span>
      </button>

      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
            background: 'var(--k-surface)', border: '1px solid var(--k-border)',
            borderRadius: 14, padding: '8px', minWidth: 210,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px 8px' }}>
            Antrian Review
          </p>
          {PENDING_MODULES.map(m => {
            const n = counts[m.key] ?? 0
            if (n === 0) return null
            return (
              <button key={m.key} onClick={() => { navigate(m.to); setOpen(false) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 10, border: 'none', background: 'transparent',
                  cursor: 'pointer', gap: 8, transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--k-input)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: 13, color: 'var(--k-text)', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span>{m.emoji}</span> {m.label}
                </span>
                <span style={{
                  minWidth: 20, height: 20, borderRadius: 10,
                  background: '#EF4444', color: '#fff',
                  fontSize: 11, fontWeight: 800, lineHeight: '20px',
                  textAlign: 'center', padding: '0 6px',
                }}>{n > 99 ? '99+' : n}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Isi sidebar (dipakai di desktop & mobile drawer) ─────────────────────────
function SidebarContent({ onNavClick, counts }) {
  const { logout, user } = useAuth()
  const navigate         = useNavigate()
  const { app_name }     = useAppInfo()

  async function handleLogout() {
    try { await api.post('/auth/logout') } finally { logout(); navigate('/login') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '18px 14px 14px', borderBottom: '1px solid var(--k-border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, background: '#F97316', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 18, color: '#fff', flexShrink: 0,
          }}>Z</div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--k-text)', lineHeight: 1.2 }}>{app_name || 'ZasaQu'}</p>
            <p style={{ fontSize: 10, color: 'var(--k-muted)' }}>Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', scrollbarWidth: 'thin' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 4 }}>
            {group.label && (
              <p style={{
                fontSize: 10, fontWeight: 700, color: 'var(--k-muted)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '8px 10px 4px',
              }}>{group.label}</p>
            )}
            {group.items.map(item => {
              const badgeCount = item.badgeKey ? (counts[item.badgeKey] ?? 0) : 0
              return (
                <NavLink key={item.to} to={item.to} end={item.exact}
                  onClick={onNavClick}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px', borderRadius: 10, textDecoration: 'none',
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#F97316' : 'var(--k-sub)',
                    background: isActive ? 'rgba(249,115,22,0.1)' : 'transparent',
                    marginBottom: 1, transition: 'all 0.15s',
                  })}
                >
                  <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.emoji}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                  {badgeCount > 0 && (
                    <span style={{
                      flexShrink: 0, minWidth: 18, height: 18, borderRadius: 9,
                      background: '#EF4444', color: '#fff',
                      fontSize: 10, fontWeight: 800, lineHeight: '18px',
                      textAlign: 'center', padding: '0 5px',
                    }}>
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--k-border)', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
          borderRadius: 10, background: 'var(--k-input)', marginBottom: 6,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(249,115,22,0.15)', border: '2px solid rgba(249,115,22,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#F97316',
          }}>{(user?.name ?? 'A')[0].toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name ?? 'Admin'}</p>
            <p style={{ fontSize: 10, color: 'var(--k-muted)' }}>Administrator</p>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          width: '100%', padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: '#F56565',
          background: 'rgba(245,101,101,0.07)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>🚪</span> Keluar
        </button>
      </div>
    </div>
  )
}

// ── Layout utama ──────────────────────────────────────────────────────────────
export default function AdminLayout({ children }) {
  const location              = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const rawCounts             = usePendingCounts()
  const counts                = { ...rawCounts, total: Object.values(rawCounts).reduce((s, n) => s + n, 0) }

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  const pageTitle    = PAGE_TITLE[location.pathname] ?? 'Admin Panel'
  const currentGroup = NAV_GROUPS.find(g => g.items.some(i => i.to === location.pathname))

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', color: 'var(--k-text)', fontFamily: 'system-ui,sans-serif' }}>
      <style>{`
        @keyframes slideInLeft { from { transform: translateX(-100%) } to { transform: translateX(0) } }
        @keyframes fadeInBg    { from { opacity: 0 } to { opacity: 1 } }

        /* Desktop: sidebar fixed + konten geser kanan */
        @media (min-width: 1024px) {
          .adm-sidebar  { display: flex !important; }
          .adm-wrapper  { margin-left: ${SIDEBAR_W}px !important; }
          .adm-burger   { display: none !important; }
        }
        /* Mobile: tidak ada sidebar, ada hamburger */
        @media (max-width: 1023px) {
          .adm-sidebar  { display: none !important; }
          .adm-wrapper  { margin-left: 0 !important; }
          .adm-burger   { display: flex !important; }
        }
      `}</style>

      {/* ── Sidebar desktop — selalu tampil ≥ 1024px ── */}
      <aside className="adm-sidebar" style={{
        display: 'none',
        position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W,
        background: 'var(--k-surface)', borderRight: '1px solid var(--k-border)',
        flexDirection: 'column', zIndex: 100,
      }}>
        <SidebarContent onNavClick={null} counts={counts} />
      </aside>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            zIndex: 200, backdropFilter: 'blur(2px)',
            animation: 'fadeInBg 0.2s ease',
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

      {/* ── Wrapper (topbar + konten), bergeser di desktop ── */}
      <div className="adm-wrapper" style={{ marginLeft: 0, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

        {/* Topbar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 90,
          background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)',
          height: 52, display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 12, flexShrink: 0,
        }}>
          {/* Hamburger — mobile only */}
          <button className="adm-burger" onClick={() => setDrawerOpen(true)} style={{
            display: 'none', width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'var(--k-card)', border: '1px solid var(--k-border)',
            color: 'var(--k-sub)', cursor: 'pointer',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <line x1="3" y1="6"  x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Breadcrumb + judul */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            {currentGroup?.label && (
              <>
                <span style={{ fontSize: 12, color: 'var(--k-muted)', whiteSpace: 'nowrap' }}>{currentGroup.label}</span>
                <span style={{ color: 'var(--k-border)' }}>›</span>
              </>
            )}
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pageTitle}
            </span>
          </div>

          {/* Total pending badge */}
          <PendingBadge counts={rawCounts} />
        </header>

        {/* Konten halaman */}
        <main style={{ flex: 1, padding: '24px 24px 48px', maxWidth: 1200, width: '100%', boxSizing: 'border-box' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
