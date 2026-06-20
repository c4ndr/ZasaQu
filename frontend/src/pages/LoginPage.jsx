import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function LoginPage() {
  const [method, setMethod]   = useState('email')
  const [step, setStep]       = useState(1)
  const [form, setForm]       = useState({ email: '', phone: '', password: '', otp: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [demoOtp, setDemoOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { login }  = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const redirectTo = (() => { const r = new URLSearchParams(location.search).get('redirect') || ''; return r.startsWith('/') ? r : '/dashboard' })()
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSendOtp = async () => {
    setError(''); setLoading(true)
    try {
      const res = await api.post('/auth/otp/send', { phone: form.phone, type: 'login' })
      if (res.data.demo_otp) {
        setDemoOtp(res.data.demo_otp)
        setForm(f => ({ ...f, otp: res.data.demo_otp }))
      }
      setStep(2)
      if (res.data.message) setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirim OTP.')
    } finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = method === 'email'
        ? await api.post('/auth/login', { email: form.email, password: form.password })
        : await api.post('/auth/otp/login', { phone: form.phone, otp: form.otp })
      login(res.data.user, res.data.token)
      navigate(redirectTo)
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 45%, #24243e 100%)', overflowX: 'hidden' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:none } }
      `}</style>

      {/* Decorative blobs */}
      <div style={{ position: 'fixed', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: 100, left: -60, width: 180, height: 180, borderRadius: '50%', background: 'rgba(139,92,246,0.12)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '35%', right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(236,72,153,0.08)', pointerEvents: 'none' }} />

      {/* Logo + tagline (top half) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px 32px', minHeight: '32vh' }}>
        <div style={{ width: 84, height: 84, background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 60%, #EC4899 100%)', borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 16px 48px rgba(99,102,241,0.55), 0 0 0 14px rgba(99,102,241,0.1)' }}>
          <span style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>Z</span>
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 900, color: '#fff', letterSpacing: -0.5, marginBottom: 8, textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>ZasaQu</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, letterSpacing: 0.2 }}>Platform layanan lokal terpercaya</p>
      </div>

      {/* Bottom sheet */}
      <div style={{ background: 'var(--k-bg)', borderRadius: '32px 32px 0 0', padding: '12px 24px 40px', boxShadow: '0 -20px 60px rgba(0,0,0,0.5)', animation: 'fadeUp 0.4s ease', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--k-border)', margin: '0 auto 26px' }} />

        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--k-text)', marginBottom: 4 }}>Masuk ke akun</h2>
        <p style={{ color: 'var(--k-muted)', fontSize: 14, marginBottom: 22 }}>Pilih metode masuk Anda</p>

        {/* Method toggle */}
        <div style={{ display: 'flex', background: 'var(--k-card)', borderRadius: 16, padding: 4, border: '1px solid var(--k-border)', marginBottom: 22 }}>
          {[
            { id: 'email', label: '✉️  Email' },
            { id: 'phone', label: '📱  Nomor HP' },
          ].map(m => (
            <button key={m.id}
              onClick={() => { setMethod(m.id); setStep(1); setError('') }}
              style={{ flex: 1, padding: '12px 0', fontSize: 14, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'all .25s',
                background: method === m.id ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : 'transparent',
                color: method === m.id ? '#fff' : 'var(--k-muted)',
                boxShadow: method === m.id ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
              }}>
              {m.label}
            </button>
          ))}
        </div>

        {error && <div className="error-box fade-in" style={{ marginBottom: 18 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {method === 'email' ? (
            <>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, opacity: 0.55 }}>✉️</span>
                <input className="input-field" type="email" name="email"
                  value={form.email} onChange={handleChange} required
                  placeholder="Alamat email" style={{ paddingLeft: 44 }} />
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, opacity: 0.55 }}>🔒</span>
                <input className="input-field" type={showPassword ? 'text' : 'password'} name="password"
                  value={form.password} onChange={handleChange} required
                  placeholder="Password" style={{ paddingLeft: 44, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--k-muted)', fontSize: 18, lineHeight: 1, padding: 0 }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <div style={{ textAlign: 'right', marginTop: -4 }}>
                <Link to="/forgot-password" style={{ color: 'var(--k-accent)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  Lupa password?
                </Link>
              </div>
            </>
          ) : (
            <>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, opacity: 0.55 }}>📱</span>
                <input className="input-field" type="tel" name="phone"
                  value={form.phone} onChange={handleChange} required
                  placeholder="08xxxxxxxxxx" style={{ paddingLeft: 44 }} />
              </div>
              {step === 2 && (
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {demoOtp && (
                    <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(246,173,85,0.1)', border: '1px solid rgba(246,173,85,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-warn)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>🧪 Mode Demo — Kode OTP</p>
                        <p style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, color: 'var(--k-warn)', letterSpacing: '0.3em' }}>{demoOtp}</p>
                      </div>
                      <button type="button" onClick={() => setForm(f => ({ ...f, otp: demoOtp }))}
                        style={{ padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'rgba(246,173,85,0.2)', color: 'var(--k-warn)', border: 'none', cursor: 'pointer' }}>
                        Isi Otomatis
                      </button>
                    </div>
                  )}
                  <input className="input-field" type="text" name="otp"
                    value={form.otp} onChange={handleChange} maxLength={6} required
                    placeholder="Kode OTP 6 digit"
                    style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: 22, fontFamily: 'monospace' }}
                  />
                  <button type="button" onClick={handleSendOtp}
                    style={{ color: 'var(--k-accent)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                    Kirim ulang OTP
                  </button>
                </div>
              )}
            </>
          )}

          {method === 'phone' && step === 1 ? (
            <button type="button" onClick={handleSendOtp}
              disabled={loading || !form.phone}
              style={{ padding: '16px', borderRadius: 16, fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer', marginTop: 6,
                background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff',
                boxShadow: '0 8px 24px rgba(99,102,241,0.4)', opacity: (loading || !form.phone) ? 0.55 : 1 }}>
              {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
            </button>
          ) : (
            <button type="submit" disabled={loading}
              style={{ padding: '16px', borderRadius: 16, fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer', marginTop: 6,
                background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff',
                boxShadow: '0 8px 24px rgba(99,102,241,0.4)', opacity: loading ? 0.65 : 1 }}>
              {loading ? 'Memproses...' : 'Masuk Sekarang →'}
            </button>
          )}
        </form>

        {/* Register CTA */}
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--k-border)' }} />
            <span style={{ fontSize: 12, color: 'var(--k-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Belum punya akun?</span>
            <div style={{ flex: 1, height: 1, background: 'var(--k-border)' }} />
          </div>
          <Link to="/register" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ padding: '18px 20px', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 16, background: 'var(--k-card)', border: '1.5px solid var(--k-border)' }}>
              <div style={{ fontSize: 28 }}>🛍️</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)', marginBottom: 2 }}>Daftar sebagai Pelanggan</p>
                <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>Pesan layanan ZasaQu sekarang</p>
              </div>
              <span style={{ color: 'var(--k-muted)', fontSize: 18 }}>›</span>
            </div>
          </Link>
          <p style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--k-muted)' }}>
            Ingin membuka usaha?{' '}
            <Link to="/register?type=mitra" style={{ color: '#8B5CF6', fontWeight: 700, textDecoration: 'none' }}>
              Daftar sebagai Mitra →
            </Link>
          </p>
        </div>

        {/* Footer links */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--k-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px 16px', marginBottom: 10 }}>
            {[
              { label: 'Tentang Kami', to: '/about' },
              { label: 'Layanan', to: '/layanan' },
              { label: 'Cara Kerja', to: '/cara-kerja' },
              { label: 'Jadi Mitra', to: '/daftar-mitra' },
            ].map(l => (
              <Link key={l.to} to={l.to} style={{ fontSize: 12, color: 'var(--k-muted)', textDecoration: 'none', fontWeight: 600 }}>
                {l.label}
              </Link>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px 16px', marginBottom: 14 }}>
            {[
              { label: 'Syarat & Ketentuan', to: '/tos' },
              { label: 'Kebijakan Privasi', to: '/privacy' },
              { label: 'Refund & Sengketa', to: '/refund' },
              { label: 'Kontak', to: '/contact' },
            ].map(l => (
              <Link key={l.to} to={l.to} style={{ fontSize: 12, color: 'var(--k-muted)', textDecoration: 'none', fontWeight: 600 }}>
                {l.label}
              </Link>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--k-muted)', opacity: 0.6, margin: 0 }}>
            © 2026 ZasaQu · ZashaGo Ecosystem
          </p>
        </div>
      </div>
    </div>
  )
}
