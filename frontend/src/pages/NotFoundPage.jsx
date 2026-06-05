import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NotFoundPage() {
  const navigate  = useNavigate()
  const { user }  = useAuth()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--k-bg, #0C0C16)', textAlign: 'center' }}>
      <div style={{ fontSize: 80, marginBottom: 8, lineHeight: 1 }}>🗺️</div>
      <h1 style={{ fontSize: 72, fontWeight: 900, color: 'var(--k-accent, #00C896)', margin: '0 0 8px', lineHeight: 1 }}>404</h1>
      <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text, #fff)', margin: '0 0 8px' }}>Halaman Tidak Ditemukan</p>
      <p style={{ fontSize: 14, color: 'var(--k-muted, #888)', margin: '0 0 32px', maxWidth: 280, lineHeight: 1.6 }}>
        Halaman yang kamu cari tidak ada atau sudah dipindahkan.
      </p>
      <button
        onClick={() => navigate(user ? '/dashboard' : '/login', { replace: true })}
        style={{ padding: '14px 32px', borderRadius: 14, border: 'none', background: 'var(--k-accent, #00C896)', color: '#0C0C16', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}
      >
        {user ? 'Kembali ke Dashboard' : 'Ke Halaman Login'}
      </button>
    </div>
  )
}
