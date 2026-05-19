import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSendOtp = async () => {
    setError(''); setLoading(true)
    try {
      const res = await api.post('/auth/otp/send', { phone: form.phone, type: 'login' })
      // Mode demo: isi OTP otomatis dari response server
      if (res.data.demo_otp) {
        setDemoOtp(res.data.demo_otp)
        setForm(f => ({ ...f, otp: res.data.demo_otp }))
      }
      setStep(2)
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
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Hero atas */}
      <div style={{
        padding: '60px 28px 40px',
        background: 'linear-gradient(160deg, #0F1E25 0%, var(--k-bg) 100%)',
      }}>
        <div style={{
          width: 52, height: 52,
          background: 'var(--k-accent)',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24, boxShadow: '0 8px 24px rgba(0,200,150,0.3)',
        }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: '#0C0C16' }}>Z</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--k-text)', marginBottom: 6, lineHeight: 1.2 }}>
          Selamat datang kembali
        </h1>
        <p style={{ color: 'var(--k-muted)', fontSize: 15 }}>
          Masuk ke akun ZasaQu Anda
        </p>
      </div>

      {/* Form area */}
      <div style={{ flex: 1, padding: '8px 24px 0' }}>

        {/* Toggle metode */}
        <div style={{
          display: 'flex',
          background: 'var(--k-card)',
          borderRadius: 16,
          padding: 4,
          border: '1px solid var(--k-border)',
          marginBottom: 24,
        }}>
          {[
            { id: 'email', label: 'Email' },
            { id: 'phone', label: 'Nomor HP' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => { setMethod(m.id); setStep(1); setError('') }}
              style={{
                flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 600,
                borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: method === m.id ? 'var(--k-accent)' : 'transparent',
                color:      method === m.id ? '#0C0C16' : 'var(--k-muted)',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="error-box fade-in" style={{ marginBottom: 20 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {method === 'email' ? (
            <>
              <div>
                <label className="label">Email</label>
                <input className="input-field" type="email" name="email"
                  value={form.email} onChange={handleChange} required
                  placeholder="email@contoh.com" />
              </div>
              <div>
                <label className="label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="input-field" type={showPassword ? 'text' : 'password'} name="password"
                    value={form.password} onChange={handleChange} required
                    placeholder="••••••••" style={{ paddingRight: 44 }} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--k-muted)', fontSize: 18, lineHeight: 1, padding: 0,
                    }}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="label">Nomor HP</label>
                <input className="input-field" type="tel" name="phone"
                  value={form.phone} onChange={handleChange} required
                  placeholder="08xxxxxxxxxx" />
              </div>
              {step === 2 && (
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Banner OTP demo */}
                  {demoOtp && (
                    <div style={{
                      padding: '10px 14px', borderRadius: 12,
                      background: 'rgba(246,173,85,0.1)', border: '1px solid rgba(246,173,85,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-warn)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                          🧪 Mode Demo — Kode OTP
                        </p>
                        <p style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, color: 'var(--k-warn)', letterSpacing: '0.3em' }}>
                          {demoOtp}
                        </p>
                      </div>
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, otp: demoOtp }))}
                        style={{ padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'rgba(246,173,85,0.2)', color: 'var(--k-warn)', border: 'none', cursor: 'pointer' }}>
                        Isi Otomatis
                      </button>
                    </div>
                  )}

                  <label className="label">Kode OTP</label>
                  <input className="input-field" type="text" name="otp"
                    value={form.otp} onChange={handleChange} maxLength={6} required
                    placeholder="000000"
                    style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: 22, fontFamily: 'monospace' }}
                  />
                  <button type="button" onClick={handleSendOtp}
                    style={{ color: 'var(--k-accent)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Kirim ulang OTP
                  </button>
                </div>
              )}
            </>
          )}

          {method === 'phone' && step === 1 ? (
            <button type="button" className="btn-primary" onClick={handleSendOtp}
              disabled={loading || !form.phone} style={{ marginTop: 8 }}>
              {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
            </button>
          ) : (
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          )}
        </form>
      </div>

      {/* Footer */}
      <div style={{ padding: '28px 24px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>
          <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
            Lupa password?{' '}
            <span style={{ color: 'var(--k-accent)', fontWeight: 700 }}>Reset di sini</span>
          </Link>
        </p>
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>
          Belum punya akun?{' '}
          <Link to="/register" style={{ color: 'var(--k-accent)', fontWeight: 700, textDecoration: 'none' }}>
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  )
}
