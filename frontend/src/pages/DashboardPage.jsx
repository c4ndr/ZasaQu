import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BottomNav from '../components/BottomNav'
import api from '../services/api'
import { requestNotifPermission } from '../utils/systemNotif'
import useNotifCount from '../hooks/useNotifCount'
import { useTheme } from '../hooks/useTheme'
import useAppInfo from '../hooks/useAppInfo'

const ROLE_LABELS = {
  pelanggan: 'Pelanggan', mitra_motor: 'Mitra Motor',
  mitra_mobil: 'Mitra Mobil', admin: 'Admin',
}

const DEFAULT_BANNERS = [
  {
    gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    emoji: '🎉', title: 'Selamat Datang di ZasaQu!',
    subtitle: 'Kirim barang, pesan makanan, semua dalam satu aplikasi.',
  },
  {
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    emoji: '📦', title: 'ZasaGo — Kurir Lokal Andalan',
    subtitle: 'Pengiriman cepat ke seluruh area, harga transparan.',
  },
  {
    gradient: 'linear-gradient(135deg, #00C896 0%, #00A87D 100%)',
    emoji: '🍜', title: 'ZasaFood — Pesan Dari Warung Lokal',
    subtitle: 'Hemat ongkir dengan fitur sesi kuliner bersama.',
  },
]

const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')

function getGreeting() {
  const h = new Date().getHours()
  if (h < 11) return { text: 'Selamat Pagi', emoji: '☀️' }
  if (h < 15) return { text: 'Selamat Siang', emoji: '🌤️' }
  if (h < 18) return { text: 'Selamat Sore', emoji: '🌇' }
  return { text: 'Selamat Malam', emoji: '🌙' }
}

function getDateStr() {
  return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatRp(v) {
  return new Intl.NumberFormat('id-ID').format(Number(v || 0))
}

const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
)

/* ── Kartu layanan dengan background tematik ── */
function ServiceCard({ to, emoji, bgDecor, title, desc, badge, badgeColor, badgeBg, gradient, borderColor, active = true }) {
  const inner = (
    <div style={{
      background: gradient,
      border: `1.5px solid ${borderColor}`,
      borderRadius: 20, padding: '16px 14px',
      position: 'relative', overflow: 'hidden',
      opacity: active ? 1 : 0.55,
      transition: 'transform 0.15s, box-shadow 0.15s',
      cursor: active ? 'pointer' : 'default',
      minHeight: 138,
    }}>
      {/* Ikon dekorasi besar di sudut kanan atas */}
      <div style={{
        position: 'absolute', right: -6, top: -4,
        fontSize: 72, lineHeight: 1,
        opacity: 0.13, transform: 'rotate(12deg)',
        pointerEvents: 'none', userSelect: 'none',
      }}>{bgDecor || emoji}</div>

      {/* Blob bulat di kiri bawah */}
      <div style={{
        position: 'absolute', left: -24, bottom: -24,
        width: 80, height: 80, borderRadius: '50%',
        background: borderColor, opacity: 0.25,
        pointerEvents: 'none',
      }} />

      {/* Konten */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 28, marginBottom: 8, lineHeight: 1 }}>{emoji}</div>
        <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)', marginBottom: 2 }}>{title}</p>
        <p style={{ fontSize: 11, color: 'var(--k-sub)', marginBottom: 10, lineHeight: 1.4 }}>{desc}</p>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 9px',
          borderRadius: 100, background: badgeBg, color: badgeColor,
          letterSpacing: '0.04em',
        }}>{badge}</span>
      </div>
    </div>
  )

  if (!active || !to) return inner
  return <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>
}

/* ── Kartu aksi utama (besar) ── */
function MainCard({ to, emoji, bgDecor, title, desc, gradient, borderColor }) {
  return (
    <Link to={to} style={{ textDecoration: 'none', flex: 1 }}>
      <div style={{
        background: gradient, border: `1.5px solid ${borderColor}`,
        borderRadius: 20, padding: '18px 16px',
        position: 'relative', overflow: 'hidden',
        transition: 'transform 0.15s',
      }}>
        <div style={{
          position: 'absolute', right: -10, top: -10,
          fontSize: 68, lineHeight: 1, opacity: 0.1,
          transform: 'rotate(-10deg)',
          pointerEvents: 'none', userSelect: 'none',
        }}>{bgDecor || emoji}</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span style={{ fontSize: 28 }}>{emoji}</span>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)', marginTop: 10, marginBottom: 4 }}>{title}</p>
          <p style={{ fontSize: 11, color: 'var(--k-sub)', lineHeight: 1.4 }}>{desc}</p>
        </div>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const isMitra   = user?.role?.startsWith('mitra')

  const [walletData,    setWalletData]    = useState(null)
  const [locationName,  setLocationName]  = useState(null)
  const [bannerIdx,     setBannerIdx]     = useState(0)
  const [promos,        setPromos]        = useState(DEFAULT_BANNERS)
  const touchStartX = useRef(null)
  const { count: notifCount } = useNotifCount()
  const { isDark, toggle: toggleTheme } = useTheme()
  const { app_logo_url, app_name } = useAppInfo()
  const greeting = getGreeting()

  useEffect(() => {
    if (user?.role === 'admin') return
    api.get('/wallet/summary').then(r => setWalletData(r.data)).catch(() => {})
  }, [user])

  useEffect(() => {
    if (user?.role === 'admin') navigate('/admin', { replace: true })
  }, [user, navigate])

  useEffect(() => { requestNotifPermission() }, [])

  // Fetch promo banners dari API (public endpoint, no auth)
  useEffect(() => {
    const base = (import.meta.env.VITE_API_URL || '') + '/api'
    fetch(`${base}/promos`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (Array.isArray(data) && data.length > 0) setPromos(data) })
      .catch(() => {})
  }, [])

  // Reverse geocode lokasi user
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lon } = pos.coords
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
        .then(r => r.json())
        .then(d => {
          const a = d.address || {}
          const name = a.suburb || a.village || a.town || a.city_district || a.city || a.county || null
          if (name) setLocationName(name)
        })
        .catch(() => {})
    }, () => {})
  }, [])

  // Auto-slide banner setiap 4 detik
  useEffect(() => {
    if (promos.length <= 1) return
    const t = setInterval(() => setBannerIdx(i => (i + 1) % promos.length), 4000)
    return () => clearInterval(t)
  }, [promos.length])

  if (user?.role === 'admin') return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 100 }}>

      {/* ── Header ─────────────────────────────────── */}
      <div style={{
        background: 'var(--k-header-bg)',
        borderBottom: '1px solid var(--k-border)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Dekorasi blob */}
        <div style={{ position:'absolute', right:-32, top:-32, width:140, height:140, borderRadius:'50%', background:'var(--k-header-blob1)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', left:-24, bottom:-28, width:110, height:110, borderRadius:'50%', background:'var(--k-header-blob2)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', right:64, bottom:-20, width:70, height:70, borderRadius:'50%', background:'var(--k-header-blob3)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', right:-10, top:60, fontSize:96, opacity:0.04, transform:'rotate(15deg)', pointerEvents:'none', userSelect:'none', lineHeight:1 }}>🏠</div>

        {/* Strip atas: sapaan + lokasi */}
        <div style={{
          paddingTop: 48, paddingLeft: 20, paddingRight: 20, paddingBottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-sub)' }}>
            {greeting.emoji} {greeting.text}
          </span>
          {locationName && (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-sub)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 13 }}>📍</span>{locationName}
            </span>
          )}
        </div>

        {/* Baris logo + tombol kanan */}
        <div style={{
          padding: '10px 20px 4px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <img src={app_logo_url || '/logo-zasaqu.png'} alt={app_name || 'ZasaQu'}
            onError={e => { e.currentTarget.src = '/logo-zasaqu.png' }}
            style={{ height: 28, display: 'block' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Toggle mode gelap/terang */}
            <button
              onClick={toggleTheme}
              style={{
                width: 40, height: 40, borderRadius: 13,
                background: 'var(--k-input)', border: '1px solid var(--k-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 18,
              }}
              aria-label="Ganti tema"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Notifikasi */}
            <Link to="/notifications" style={{
              position: 'relative',
              width: 40, height: 40, borderRadius: 13,
              background: 'var(--k-input)', border: '1px solid var(--k-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none', fontSize: 18,
            }}>
              🔔
              {notifCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: 'var(--k-primary)', color: '#fff',
                  fontSize: 9, fontWeight: 900, minWidth: 16, height: 16,
                  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--k-surface)', padding: '0 2px',
                }}>
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Nama + role badge */}
        <div style={{ padding: '0 20px 18px' }}>
          <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--k-text)', lineHeight: 1.25, marginBottom: 8 }}>
            Halo, {user?.name?.split(' ')[0]} 👋
          </h1>
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: 100,
            background: 'rgba(249,115,22,0.10)', color: 'var(--k-primary)',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
          }}>
            {ROLE_LABELS[user?.role]}
          </span>
        </div>
      </div>

      {/* ── Banner Promo Slide ──────────────────────── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div
          style={{ borderRadius: 18, overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            if (touchStartX.current === null) return
            const dx = e.changedTouches[0].clientX - touchStartX.current
            if (dx < -40) setBannerIdx(i => (i + 1) % promos.length)
            else if (dx > 40) setBannerIdx(i => (i - 1 + promos.length) % promos.length)
            touchStartX.current = null
          }}
        >
          {/* Slide aktif */}
          {promos.map((b, i) => {
            const slideContent = (
              <div key={b.id ?? i} style={{
                display: i === bannerIdx ? 'flex' : 'none',
                background: b.gradient || '#1a1a2e',
                padding: '18px 20px',
                alignItems: 'center', gap: 14,
                minHeight: 88,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', right: -20, top: -20, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', right: 40, bottom: -30, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />

                {(b.image_data_url || b.image_path) ? (
                  <img src={b.image_data_url || `${STORAGE_URL}/${b.image_path}`} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0, position: 'relative', zIndex: 1 }} />
                ) : (
                  <span style={{ fontSize: 36, flexShrink: 0, position: 'relative', zIndex: 1 }}>{b.emoji ?? '🎉'}</span>
                )}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#fff', marginBottom: 3 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.82)', lineHeight: 1.4 }}>{b.subtitle ?? b.description ?? b.desc}</div>
                </div>
              </div>
            )
            if (b.link_url) {
              return <a key={b.id ?? i} href={b.link_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block' }}>{slideContent}</a>
            }
            return slideContent
          })}

          {/* Dot indikator */}
          {promos.length > 1 && (
            <div style={{
              position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: 5, zIndex: 2,
            }}>
              {promos.map((_, i) => (
                <span
                  key={i}
                  onClick={() => setBannerIdx(i)}
                  style={{
                    width: i === bannerIdx ? 18 : 6, height: 6, borderRadius: 3,
                    background: i === bannerIdx ? '#fff' : 'rgba(255,255,255,0.45)',
                    transition: 'width 0.25s ease, background 0.25s',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '12px 16px 0' }}>

        {/* ── Kartu Saldo ──────────────────────────── */}
        <div style={{
          borderRadius: 24,
          background: 'linear-gradient(135deg, #F97316 0%, #EA580C 55%, #C2410C 100%)',
          padding: '24px 24px 20px',
          position: 'relative', overflow: 'hidden',
          marginBottom: 16,
          boxShadow: '0 8px 24px rgba(249,115,22,0.30)',
        }}>
          {/* Dekorasi lingkaran */}
          <div style={{
            position: 'absolute', right: -40, top: -40,
            width: 160, height: 160, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', right: 30, bottom: -50,
            width: 120, height: 120, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', left: -20, top: -20,
            width: 90, height: 90, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
              Saldo Tersedia
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: 600 }}>Rp</span>
              <span style={{ color: '#fff', fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {formatRp(walletData?.available ?? user?.wallet?.balance)}
              </span>
            </div>
            {(walletData?.locked_balance ?? user?.wallet?.locked_balance) > 0 && (
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 4 }}>
                🔒 Terkunci: Rp {formatRp(walletData?.locked_balance ?? user?.wallet?.locked_balance)}
              </p>
            )}

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Link to="/topup" style={{
                flex: 1, textAlign: 'center', padding: '10px 8px',
                background: 'rgba(255,255,255,0.22)', borderRadius: 12,
                color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none',
                backdropFilter: 'blur(8px)',
              }}>Top Up</Link>
              {isMitra && (
                <Link to="/withdraw" style={{
                  flex: 1, textAlign: 'center', padding: '10px 8px',
                  background: 'rgba(255,255,255,0.12)', borderRadius: 12,
                  color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.25)',
                }}>Withdraw</Link>
              )}
              <Link to="/wallet" style={{
                flex: 1, textAlign: 'center', padding: '10px 8px',
                background: 'rgba(255,255,255,0.12)', borderRadius: 12,
                color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.25)',
              }}>Riwayat</Link>
            </div>
          </div>
        </div>

        {/* ── Aksi Utama Mitra ─────────────────────── */}
        {isMitra && (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Menu Utama
            </p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <MainCard
                to="/mitra/orders"
                emoji="📦"
                bgDecor="📦"
                title="Order Tersedia"
                desc="Terima order baru"
                gradient="linear-gradient(135deg, #EBF5FF 0%, #F0F9FF 100%)"
                borderColor="rgba(59,130,246,0.15)"
              />
              <MainCard
                to="/mitra/gps"
                emoji="📍"
                bgDecor="🗺️"
                title="GPS Saya"
                desc="Aktifkan tracking"
                gradient="linear-gradient(135deg, #F0FFF4 0%, #F0FDFA 100%)"
                borderColor="rgba(0,200,150,0.15)"
              />
            </div>
            <Link to="/mitra/orders" style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
              <div style={{
                background: 'var(--k-surface)', border: '1px solid var(--k-border)',
                borderRadius: 16, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: 'var(--k-shadow)',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: 'rgba(249,115,22,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>💼</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)', marginBottom: 2 }}>Mulai Bekerja</p>
                  <p style={{ fontSize: 12, color: 'var(--k-sub)' }}>Aktifkan GPS dan terima order baru hari ini</p>
                </div>
                <span style={{ color: 'var(--k-muted)' }}><IconArrowRight /></span>
              </div>
            </Link>
          </>
        )}

        {/* ── Aksi Utama Pelanggan ─────────────────── */}
        {!isMitra && (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Menu Utama
            </p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <MainCard
                to="/orders/create"
                emoji="🚀"
                bgDecor="📦"
                title="Kirim Sekarang"
                desc="Buat order pengiriman baru"
                gradient="linear-gradient(135deg, #FFF4EE 0%, #FFF8F5 100%)"
                borderColor="rgba(249,115,22,0.20)"
              />
              <MainCard
                to="/orders"
                emoji="📋"
                bgDecor="🗂️"
                title="Order Saya"
                desc="Lacak status pengiriman"
                gradient="linear-gradient(135deg, #EBF5FF 0%, #F0F9FF 100%)"
                borderColor="rgba(59,130,246,0.15)"
              />
            </div>
          </>
        )}

        {/* ── Layanan ZasaQu ───────────────────────── */}
        {!isMitra && (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Layanan ZasaQu
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>

              {/* ZasaGo */}
              <ServiceCard
                to="/jastip"
                emoji="📦"
                bgDecor="🚚"
                title="ZasaGo"
                desc="Kirim & titip barang"
                badge="AKTIF"
                badgeColor="#059669"
                badgeBg="rgba(0,200,150,0.12)"
                gradient="linear-gradient(145deg, #EBF5FF 0%, #F0FAFB 100%)"
                borderColor="rgba(59,130,246,0.15)"
              />

              {/* ZasaFood */}
              <ServiceCard
                to="/food"
                emoji="🍜"
                bgDecor="🍱"
                title="ZasaFood"
                desc="Makanan & minuman"
                badge="AKTIF"
                badgeColor="#EA580C"
                badgeBg="rgba(249,115,22,0.12)"
                gradient="linear-gradient(145deg, #FFF4EE 0%, #FFFBF7 100%)"
                borderColor="rgba(249,115,22,0.18)"
              />

              {/* ZasaMart */}
              <ServiceCard
                to={null}
                emoji="🛒"
                bgDecor="🏪"
                title="ZasaMart"
                desc="Belanja & grocery"
                badge="SEGERA"
                badgeColor="var(--k-muted)"
                badgeBg="var(--k-input)"
                gradient="linear-gradient(145deg, #F0FFF4 0%, #F7FFF9 100%)"
                borderColor="rgba(16,185,129,0.12)"
                active={false}
              />

              {/* ZasaRide */}
              <ServiceCard
                to={null}
                emoji="🛵"
                bgDecor="🗺️"
                title="ZasaRide"
                desc="Ojek & antar jemput"
                badge="SEGERA"
                badgeColor="var(--k-muted)"
                badgeBg="var(--k-input)"
                gradient="linear-gradient(145deg, #F5F3FF 0%, #FAF8FF 100%)"
                borderColor="rgba(139,92,246,0.12)"
                active={false}
              />
            </div>
          </>
        )}

      </div>

      <BottomNav />
    </div>
  )
}
