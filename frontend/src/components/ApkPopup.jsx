import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { isNative } from '../utils/nativePlatform'
import { useAuth } from '../context/AuthContext'

const AUTH_PATHS = ['/login', '/register', '/forgot-password']
const ADMIN_PREFIX = '/admin'

let shownThisLoad = false

function useApkSize() {
  const [size, setSize] = useState(null)
  useEffect(() => {
    fetch('/zasaqu.apk', { method: 'HEAD' })
      .then(r => {
        const bytes = parseInt(r.headers.get('content-length') || '0', 10)
        if (bytes > 0) setSize((bytes / 1024 / 1024).toFixed(1) + ' MB')
      })
      .catch(() => {})
  }, [])
  return size
}

export default function ApkPopup() {
  const [visible, setVisible] = useState(false)
  const [animOut, setAnimOut] = useState(false)
  const { pathname } = useLocation()
  const { user } = useAuth()
  const apkSize = useApkSize()

  useEffect(() => {
    if (!user) { setVisible(false); return }
    if (AUTH_PATHS.includes(pathname)) { setVisible(false); return }
    if (pathname.startsWith(ADMIN_PREFIX)) { setVisible(false); return }
    if (isNative) return
    if (!shownThisLoad) {
      const t = setTimeout(() => setVisible(true), 2000)
      return () => clearTimeout(t)
    }
  }, [pathname, user])

  const dismiss = () => {
    shownThisLoad = true
    setAnimOut(true)
    setTimeout(() => setVisible(false), 280)
  }

  if (!visible || !user || AUTH_PATHS.includes(pathname)) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 998,
          background: 'rgba(0,0,0,0.45)',
          animation: animOut ? 'fadeOut 0.28s ease forwards' : 'fadeIn 0.25s ease',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        zIndex: 999,
        background: 'var(--k-surface)',
        borderRadius: '24px 24px 0 0',
        padding: '8px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.22)',
        animation: animOut ? 'slideDown 0.28s ease forwards' : 'slideUp 0.32s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 16 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--k-border)' }} />
        </div>

        <div style={{ padding: '0 24px 40px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 18, flexShrink: 0,
                background: 'linear-gradient(135deg, var(--k-accent), #00A87D)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(0,200,150,0.35)',
              }}>
                <span style={{ fontSize: 26, fontWeight: 900, color: '#0C0C16' }}>Z</span>
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--k-text)', margin: 0, lineHeight: 1.3 }}>
                  ZasaQu untuk Android
                </p>
                <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: '3px 0 0' }}>
                  Pengalaman lebih cepat & lengkap
                </p>
              </div>
            </div>
            <button
              onClick={dismiss}
              style={{
                background: 'var(--k-input)', border: 'none', borderRadius: 10,
                width: 32, height: 32, cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--k-muted)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Fitur */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {[
              { icon: '🔔', text: 'Notifikasi pesanan & chat real-time' },
              { icon: '📍', text: 'Lacak kurir langsung di peta' },
              { icon: '😎', text: 'Avatar emoji baru — tanpa upload foto' },
              { icon: '🛡️', text: 'Lebih stabil & aman — audit bug lengkap' },
              { icon: '⚡', text: 'Lebih cepat & ringan dari browser' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{icon}</span>
                <span style={{ fontSize: 13, color: 'var(--k-text-secondary, var(--k-muted))' }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Tombol Download */}
          <a
            href="/zasaqu.apk"
            download="ZasaQu.apk"
            onClick={dismiss}
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: 'var(--k-accent)',
              borderRadius: 16, padding: '15px 24px',
              boxShadow: '0 4px 16px rgba(0,200,150,0.35)',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 16l-4-4h3V4h2v8h3l-4 4z" fill="#0C0C16"/>
                <path d="M4 18h16v2H4v-2z" fill="#0C0C16"/>
              </svg>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#0C0C16' }}>
                Download APK{apkSize ? ` · ${apkSize}` : ''}
              </span>
            </div>
          </a>

          {/* Skip */}
          <button
            onClick={dismiss}
            style={{
              display: 'block', width: '100%', marginTop: 12,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--k-muted)', padding: '8px 0',
            }}
          >
            Lanjut pakai browser
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes slideUp   { from { transform: translateX(-50%) translateY(100%) } to { transform: translateX(-50%) translateY(0) } }
        @keyframes slideDown { from { transform: translateX(-50%) translateY(0) }    to { transform: translateX(-50%) translateY(100%) } }
      `}</style>
    </>
  )
}
