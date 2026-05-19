import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function AvatarIcon({ name, isActive }) {
  const initial = (name ?? '?')[0].toUpperCase()
  const hue = [...(name ?? 'U')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%',
      background: isActive ? `hsl(${hue},55%,35%)` : 'var(--k-muted)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 800, color: '#fff',
      outline: isActive ? `2px solid var(--k-accent)` : 'none',
      outlineOffset: 2,
    }}>{initial}</div>
  )
}

const IconHome = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

const IconBox = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)

const IconPin = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

const IconWallet = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="3"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
    <circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
)

const IconBolt = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)

const IconFood = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8h1a4 4 0 010 8h-1"/>
    <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
    <line x1="6" y1="1" x2="6" y2="4"/>
    <line x1="10" y1="1" x2="10" y2="4"/>
    <line x1="14" y1="1" x2="14" y2="4"/>
  </svg>
)

const PELANGGAN_ITEMS = (name) => [
  { to: '/dashboard', icon: <IconHome />,                    label: 'Beranda',  exact: true },
  { to: '/orders',    icon: <IconBox />,                     label: 'Order' },
  { to: '/food',      icon: <IconFood />,                    label: 'ZasaFood' },
  { to: '/wallet',    icon: <IconWallet />,                  label: 'Wallet' },
  { to: '/profile',   icon: <AvatarIcon name={name} />,      label: 'Akun', avatar: true },
]

const MITRA_ITEMS = (name) => [
  { to: '/dashboard',    icon: <IconHome />,               label: 'Beranda',  exact: true },
  { to: '/mitra/orders', icon: <IconBox />,                label: 'Order' },
  { to: '/mitra/jastip', icon: <IconBolt />,               label: 'JastipQu' },
  { to: '/mitra/gps',    icon: <IconPin />,                label: 'GPS' },
  { to: '/profile',      icon: <AvatarIcon name={name} />, label: 'Akun', avatar: true },
]

export default function BottomNav() {
  const { user } = useAuth()
  if (!user || user.role === 'admin') return null

  const items = user.role?.startsWith('mitra') ? MITRA_ITEMS(user.name) : PELANGGAN_ITEMS(user.name)

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, zIndex: 50,
      background: 'var(--k-surface)',
      borderTop: '1px solid var(--k-border)',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ display: 'flex' }}>
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 4, paddingTop: 10, paddingBottom: 14, textDecoration: 'none',
              transition: 'color 0.2s', fontSize: 11, fontWeight: 600, letterSpacing: '0.02em' }}
            className={({ isActive }) => isActive ? 'nav-active' : 'nav-inactive'}
          >
            {({ isActive }) => (
              <>
                <span style={{ color: isActive ? 'var(--k-accent)' : 'var(--k-muted)',
                  transition: 'color 0.2s', position: 'relative' }}>
                  {item.avatar ? <AvatarIcon name={user.name} isActive={isActive} /> : item.icon}
                  {isActive && (
                    <span style={{
                      position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
                      width: 4, height: 4, background: 'var(--k-accent)', borderRadius: '50%',
                    }} />
                  )}
                </span>
                <span style={{ color: isActive ? 'var(--k-accent)' : 'var(--k-muted)',
                  transition: 'color 0.2s', marginTop: 4 }}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
