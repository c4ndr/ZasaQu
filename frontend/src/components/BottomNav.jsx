import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function AvatarIcon({ name, isActive }) {
  const initial = (name ?? '?')[0].toUpperCase()
  const hue = [...(name ?? 'U')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%',
      background: isActive ? `hsl(${hue},60%,45%)` : '#D1D5DB',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 800, color: '#fff',
    }}>{initial}</div>
  )
}

const IconHome = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    {filled
      ? <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor"/>
      : <>
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
        </>
    }
  </svg>
)

const IconBox = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    {filled
      ? <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" fill="currentColor" opacity=".9"/>
      : <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
    }
  </svg>
)

const IconPin = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    {filled
      ? <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
      : <>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth={1.8}/>
        </>
    }
  </svg>
)

const IconWallet = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    {filled
      ? <path d="M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zm0 8H3V8h18v4zm-3 2a1 1 0 100 2 1 1 0 000-2z" fill="currentColor"/>
      : <>
          <rect x="1" y="4" width="22" height="16" rx="3" stroke="currentColor" strokeWidth={1.8}/>
          <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth={1.8}/>
          <circle cx="17" cy="15" r="1.5" fill="currentColor"/>
        </>
    }
  </svg>
)

const IconFood = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    {filled
      ? <path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-5.8-7.51-5.8-7.51 0H1v5h15.03v-5z" fill="currentColor"/>
      : <>
          <path d="M18 8h1a4 4 0 010 8h-1" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="6" y1="1" x2="6" y2="4" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"/>
          <line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"/>
          <line x1="14" y1="1" x2="14" y2="4" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"/>
        </>
    }
  </svg>
)

const PELANGGAN_ITEMS = (name) => [
  { to: '/dashboard', Icon: IconHome,   label: 'Beranda',  exact: true },
  { to: '/orders',    Icon: IconBox,    label: 'ZasaGo'  },
  { to: '/food',      Icon: IconFood,   label: 'ZasaFood' },
  { to: '/wallet',    Icon: IconWallet, label: 'Dompet'  },
  { to: '/profile',   Icon: null,       label: 'Akun',    avatar: true },
]

const MITRA_ITEMS = (name) => [
  { to: '/dashboard',         Icon: IconHome, label: 'Beranda',  exact: true },
  { to: '/mitra/orders',      Icon: IconBox,  label: 'ZasaGo'  },
  { to: '/mitra/food/orders', Icon: IconFood, label: 'ZasaFood' },
  { to: '/mitra/gps',         Icon: IconPin,  label: 'GPS'      },
  { to: '/profile',           Icon: null,     label: 'Akun',    avatar: true },
]

export default function BottomNav() {
  const { user } = useAuth()
  if (!user || user.role === 'admin' || user.role === 'merchant' || user.role === 'home_provider' || user.role === 'seller') return null

  const items = user.role?.startsWith('mitra') ? MITRA_ITEMS(user.name) : PELANGGAN_ITEMS(user.name)
  const centerIdx = 2

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, zIndex: 50,
      background: 'var(--k-surface)',
      boxShadow: '0 -1px 0 var(--k-border), 0 -4px 16px rgba(0,0,0,0.06)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        {items.map(({ to, Icon, label, exact, avatar }, idx) => {
          const isCenter = idx === centerIdx
          return (
            <NavLink
              key={to}
              to={to}
              end={exact}
              style={{ flex: 1, textDecoration: 'none' }}
            >
              {({ isActive }) => isCenter ? (
                /* Raised "airdrop" center button */
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  paddingBottom: 8, gap: 5,
                  transform: 'translateY(-14px)',
                }}>
                  <div style={{
                    width: 54, height: 54, borderRadius: 18,
                    background: isActive
                      ? 'linear-gradient(145deg, #F97316 0%, #C2410C 100%)'
                      : 'linear-gradient(145deg, #FB923C 0%, #F97316 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isActive
                      ? '0 6px 22px rgba(249,115,22,0.55), 0 2px 6px rgba(0,0,0,0.12)'
                      : '0 4px 16px rgba(249,115,22,0.38), 0 2px 6px rgba(0,0,0,0.10)',
                    border: '3px solid var(--k-surface)',
                    transition: 'box-shadow 0.2s, background 0.2s',
                    color: '#fff',
                  }}>
                    <Icon filled={true} />
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: isActive ? 700 : 600,
                    color: isActive ? 'var(--k-primary)' : 'var(--k-muted)',
                    transition: 'color 0.18s',
                    letterSpacing: '0.01em',
                  }}>{label}</span>
                </div>
              ) : (
                /* Regular flat items */
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  paddingTop: 10, paddingBottom: 10, gap: 3,
                }}>
                  <span style={{
                    color: isActive ? 'var(--k-primary)' : 'var(--k-muted)',
                    transition: 'color 0.18s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {avatar
                      ? <AvatarIcon name={user.name} isActive={isActive} />
                      : <Icon filled={isActive} />
                    }
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--k-primary)' : 'var(--k-muted)',
                    transition: 'color 0.18s',
                    letterSpacing: '0.01em',
                  }}>{label}</span>
                  <span style={{
                    height: 3, borderRadius: 3,
                    width: isActive ? 20 : 0,
                    background: 'var(--k-primary)',
                    transition: 'width 0.2s ease',
                    marginTop: 1,
                  }} />
                </div>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
