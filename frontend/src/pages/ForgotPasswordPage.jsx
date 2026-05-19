import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  // step: 'phone' | 'otp' | 'password'
  const [step, setStep]         = useState('phone')
  const [phone, setPhone]       = useState('')
  const [otp, setOtp]           = useState('')
  const [demoOtp, setDemoOtp]   = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSendOtp(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await api.post('/auth/otp/send', { phone, type: 'reset_password' })
      if (res.data.demo_otp) {
        setDemoOtp(res.data.demo_otp)
        setOtp(res.data.demo_otp)
      }
      setStep('otp')
    } catch (err) {
      setError(err.response?.data?.message ?? 'Gagal mengirim OTP.')
    } finally { setLoading(false) }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    if (otp.length !== 6) { setError('Kode OTP harus 6 digit.'); return }
    setError('')
    setStep('password')
  }

  async function handleReset(e) {
    e.preventDefault()
    if (password !== confirm) { setError('Konfirmasi password tidak cocok.'); return }
    if (password.length < 6)  { setError('Password minimal 6 karakter.'); return }
    setError(''); setLoading(true)
    try {
      await api.post('/auth/otp/reset-password', {
        phone,
        otp,
        password,
        password_confirmation: confirm,
      })
      navigate('/login', { state: { successMsg: 'Password berhasil direset. Silakan login.' } })
    } catch (err) {
      setError(err.response?.data?.message ?? 'Gagal reset password.')
      if (err.response?.status === 422 && err.response?.data?.message?.includes('OTP')) {
        setStep('otp')
      }
    } finally { setLoading(false) }
  }

  const steps = ['phone', 'otp', 'password']
  const stepIdx = steps.indexOf(step)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Hero */}
      <div style={{
        padding: '60px 28px 36px',
        background: 'linear-gradient(160deg, #0F1E25 0%, var(--k-bg) 100%)',
      }}>
        <Link to="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 28,
          color: 'var(--k-muted)', fontSize: 14, textDecoration: 'none',
        }}>
          ← Kembali ke Login
        </Link>
        <div style={{
          width: 52, height: 52,
          background: 'rgba(0,200,150,0.15)', border: '1.5px solid var(--k-accent)',
          borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20, fontSize: 24,
        }}>
          🔑
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--k-text)', marginBottom: 6, lineHeight: 1.2 }}>
          Lupa Password
        </h1>
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>
          {step === 'phone'    && 'Masukkan nomor HP yang terdaftar.'}
          {step === 'otp'     && 'Masukkan kode OTP yang dikirim ke HP Anda.'}
          {step === 'password' && 'Buat password baru untuk akun Anda.'}
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ padding: '0 28px', marginTop: -8, marginBottom: 4, display: 'flex', gap: 8 }}>
        {steps.map((s, i) => (
          <div key={s} style={{
            flex: 1, height: 4, borderRadius: 100,
            background: i <= stepIdx ? 'var(--k-accent)' : 'var(--k-border)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Form */}
      <div style={{ flex: 1, padding: '20px 24px 0' }}>

        {/* ── Step 1: Nomor HP ── */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Nomor HP</label>
              <input
                className="input-field"
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError('') }}
                placeholder="08xxxxxxxxxx"
                inputMode="numeric"
                required
              />
              <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 6 }}>
                Kode OTP akan dikirim ke nomor ini.
              </p>
            </div>

            {error && <p style={{ color: 'var(--k-danger)', fontSize: 13 }}>⚠️ {error}</p>}

            <button type="submit" className="btn-primary" disabled={loading || !phone}>
              {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
            </button>
          </form>
        )}

        {/* ── Step 2: OTP ── */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

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
                <button type="button" onClick={() => setOtp(demoOtp)}
                  style={{ padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'rgba(246,173,85,0.2)', color: 'var(--k-warn)', border: 'none', cursor: 'pointer' }}>
                  Isi Otomatis
                </button>
              </div>
            )}

            <div>
              <label className="label">Kode OTP</label>
              <input
                className="input-field"
                type="text"
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: 22, fontFamily: 'monospace' }}
                required
              />
              <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 6 }}>
                Dikirim ke <strong style={{ color: 'var(--k-text)' }}>{phone}</strong>. Berlaku 5 menit.
              </p>
            </div>

            {error && <p style={{ color: 'var(--k-danger)', fontSize: 13 }}>⚠️ {error}</p>}

            <button type="submit" className="btn-primary" disabled={otp.length !== 6}>
              Verifikasi Kode
            </button>

            <button type="button"
              onClick={() => { setStep('phone'); setOtp(''); setDemoOtp(''); setError('') }}
              style={{ color: 'var(--k-muted)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Ganti nomor HP
            </button>
            <button type="button"
              onClick={(e) => { setOtp(''); setDemoOtp(''); handleSendOtp({ preventDefault: () => {} }) }}
              style={{ color: 'var(--k-accent)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Kirim ulang OTP
            </button>
          </form>
        )}

        {/* ── Step 3: Password Baru ── */}
        {step === 'password' && (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Password Baru</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="Minimal 6 karakter"
                  required
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--k-muted)', fontSize: 16 }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Konfirmasi Password</label>
              <input
                className="input-field"
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError('') }}
                placeholder="Ulangi password baru"
                required
              />
            </div>

            {error && <p style={{ color: 'var(--k-danger)', fontSize: 13 }}>⚠️ {error}</p>}

            <button type="submit" className="btn-primary" disabled={loading || !password || !confirm}>
              {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '28px 24px 40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>
          Ingat password?{' '}
          <Link to="/login" style={{ color: 'var(--k-accent)', fontWeight: 700, textDecoration: 'none' }}>
            Masuk sekarang
          </Link>
        </p>
      </div>
    </div>
  )
}
