import useAppInfo from '../hooks/useAppInfo'

// Versi APK yang sedang berjalan — update setiap build
export const APP_VERSION = '1.0.6'

function parseVersion(v) {
  return (v || '0.0.0').split('.').map(Number)
}

function isOutdated(current, minimum) {
  const c = parseVersion(current)
  const m = parseVersion(minimum)
  for (let i = 0; i < 3; i++) {
    if (c[i] < m[i]) return true
    if (c[i] > m[i]) return false
  }
  return false
}

const APK_URL = (import.meta.env.VITE_API_URL || '') + '/zasaqu.apk'

export default function ForceUpdateScreen() {
  const { app_min_version } = useAppInfo()

  if (!isOutdated(APP_VERSION, app_min_version)) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'var(--k-bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 32px', textAlign: 'center', gap: 16,
    }}>
      <div style={{ fontSize: 64, marginBottom: 8 }}>🔄</div>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--k-text)', lineHeight: 1.3 }}>
        Pembaruan Diperlukan
      </h2>
      <p style={{ fontSize: 14, color: 'var(--k-muted)', lineHeight: 1.7, maxWidth: 300 }}>
        Versi aplikasi Anda ({APP_VERSION}) sudah tidak didukung.
        Unduh versi terbaru untuk melanjutkan.
      </p>
      <a
        href={APK_URL}
        style={{
          marginTop: 8,
          display: 'block',
          padding: '14px 36px',
          borderRadius: 16,
          background: 'linear-gradient(135deg, #00C896, #00A87D)',
          color: '#fff',
          fontWeight: 800,
          fontSize: 16,
          textDecoration: 'none',
          boxShadow: '0 4px 20px rgba(0,200,150,0.4)',
        }}
      >
        Unduh Sekarang
      </a>
      <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>
        Versi minimum: {app_min_version}
      </p>
    </div>
  )
}
