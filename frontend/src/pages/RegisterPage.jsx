import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import MerchantLocationPicker from '../components/MerchantLocationPicker'

const ROLES = [
  { value: 'pelanggan',   emoji: '🛍️', label: 'Pelanggan',   desc: 'Pesan layanan pengiriman & makanan' },
  { value: 'mitra_motor', emoji: '🏍️', label: 'Mitra Motor', desc: 'Antar barang dengan motor' },
  { value: 'mitra_mobil', emoji: '🚗', label: 'Mitra Mobil', desc: 'Antar barang dengan mobil' },
  { value: 'merchant',    emoji: '🏪', label: 'Merchant',    desc: 'Buka toko makanan & minuman' },
]

const SHOP_CATEGORIES = [
  { value: 'makanan_berat', label: 'Makanan Berat' },
  { value: 'minuman',       label: 'Minuman' },
  { value: 'snack',         label: 'Snack' },
  { value: 'lainnya',       label: 'Lainnya' },
]

export default function RegisterPage() {
  const [method, setMethod]   = useState('email')
  const [step, setStep]       = useState(1)
  const [form, setForm]       = useState({
    name: '', email: '', phone: '', password: '', password_confirmation: '',
    otp: '', role: 'pelanggan', vehicle_plate: '', vehicle_brand: '', vehicle_year: '',
    shop_name: '', shop_category: '', shop_address: '', shop_phone: '',
  })
  const [error,           setError]           = useState('')
  const [loading,         setLoading]         = useState(false)
  const [demoOtp,         setDemoOtp]         = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [showPassConfirm, setShowPassConfirm] = useState(false)

  const { login } = useAuth()
  const navigate   = useNavigate()
  const isMitra    = form.role === 'mitra_motor' || form.role === 'mitra_mobil'
  const isMerchant = form.role === 'merchant'

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSendOtp = async () => {
    setError(''); setLoading(true)
    try {
      const res = await api.post('/auth/otp/send', { phone: form.phone, type: 'register' })
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
        ? await api.post('/auth/register', form)
        : await api.post('/auth/otp/register', form)
      login(res.data.user, res.data.token)
      navigate('/dashboard')
    } catch (err) {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors).flat().join(' ') : (err.response?.data?.message || 'Registrasi gagal.'))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{
        padding: '52px 28px 28px',
        background: 'linear-gradient(160deg, #0F1E25 0%, var(--k-bg) 100%)',
      }}>
        <Link to="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--k-muted)', fontSize: 14, textDecoration: 'none', marginBottom: 20,
        }}>
          ← Kembali
        </Link>
        <div style={{
          width: 48, height: 48, background: 'var(--k-accent)', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20, boxShadow: '0 6px 20px rgba(0,200,150,0.3)',
        }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#0C0C16' }}>Z</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--k-text)', marginBottom: 4, lineHeight: 1.2 }}>
          Buat akun baru
        </h1>
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Bergabung dengan ZasaQu</p>
      </div>

      <div style={{ padding: '20px 24px 0' }}>

        {/* Toggle metode */}
        <div style={{
          display: 'flex', background: 'var(--k-card)', borderRadius: 16,
          padding: 4, border: '1px solid var(--k-border)', marginBottom: 24,
        }}>
          {[{ id: 'email', label: 'Email' }, { id: 'phone', label: 'Nomor HP' }].map(m => (
            <button key={m.id}
              onClick={() => { setMethod(m.id); setStep(1); setError('') }}
              style={{
                flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 600,
                borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: method === m.id ? 'var(--k-accent)' : 'transparent',
                color:      method === m.id ? '#0C0C16' : 'var(--k-muted)',
              }}>
              {m.label}
            </button>
          ))}
        </div>

        {error && <div className="error-box fade-in" style={{ marginBottom: 20 }}>{error}</div>}

        {/* Step 2: OTP */}
        {step === 2 && method === 'phone' ? (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'var(--k-card)', border: '1px solid var(--k-border)',
              borderRadius: 16, padding: '16px 20px', textAlign: 'center',
            }}>
              <p style={{ color: 'var(--k-sub)', fontSize: 14 }}>
                Kode OTP dikirim ke <strong style={{ color: 'var(--k-text)' }}>{form.phone}</strong>
              </p>
            </div>

            {/* Banner OTP demo */}
            {demoOtp && (
              <div style={{
                padding: '12px 16px', borderRadius: 14,
                background: 'rgba(246,173,85,0.1)', border: '1px solid rgba(246,173,85,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-warn)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    🧪 Mode Demo — Kode OTP
                  </p>
                  <p style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 900, color: 'var(--k-warn)', letterSpacing: '0.3em' }}>
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

            <div>
              <label className="label">Kode OTP</label>
              <input className="input-field" type="text" name="otp"
                value={form.otp} onChange={handleChange} maxLength={6} required
                placeholder="000000"
                style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: 24, fontFamily: 'monospace' }}
              />
            </div>
            <button className="btn-primary" onClick={handleSubmit}
              disabled={loading || form.otp.length !== 6}>
              {loading ? 'Mendaftar...' : 'Verifikasi & Daftar'}
            </button>
            <button type="button" onClick={handleSendOtp}
              style={{ background: 'none', border: 'none', color: 'var(--k-muted)',
                fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>
              Kirim ulang OTP
            </button>
          </div>
        ) : (
          /* Step 1: Form */
          <form onSubmit={method === 'email' ? handleSubmit : (e) => { e.preventDefault(); handleSendOtp() }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Pilih role */}
            <div>
              <label className="label">Daftar sebagai</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ROLES.map(r => (
                  <label key={r.value} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
                    border: `1.5px solid ${form.role === r.value ? 'var(--k-accent)' : 'var(--k-border)'}`,
                    background: form.role === r.value ? 'var(--k-glow)' : 'var(--k-card)',
                    transition: 'all 0.2s',
                  }}>
                    <input type="radio" name="role" value={r.value}
                      checked={form.role === r.value} onChange={handleChange}
                      style={{ display: 'none' }} />
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{r.emoji}</span>
                    <div>
                      <p style={{ color: 'var(--k-text)', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{r.label}</p>
                      <p style={{ color: 'var(--k-muted)', fontSize: 12 }}>{r.desc}</p>
                    </div>
                    {form.role === r.value && (
                      <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%',
                        background: 'var(--k-accent)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#0C0C16', fontSize: 12 }}>✓</span>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Nama */}
            <div>
              <label className="label">Nama Lengkap</label>
              <input className="input-field" type="text" name="name"
                value={form.name} onChange={handleChange} required placeholder="Nama lengkap" />
            </div>

            {/* Email atau HP */}
            {method === 'email' ? (
              <div>
                <label className="label">Email</label>
                <input className="input-field" type="email" name="email"
                  value={form.email} onChange={handleChange} required placeholder="email@contoh.com" />
              </div>
            ) : (
              <div>
                <label className="label">Nomor HP</label>
                <input className="input-field" type="tel" name="phone"
                  value={form.phone} onChange={handleChange} required placeholder="08xxxxxxxxxx" />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="input-field" type={showPassword ? 'text' : 'password'} name="password"
                  value={form.password} onChange={handleChange} required
                  placeholder="Minimal 8 karakter" style={{ paddingRight: 44 }} />
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
            <div>
              <label className="label">Konfirmasi Password</label>
              <div style={{ position: 'relative' }}>
                <input className="input-field" type={showPassConfirm ? 'text' : 'password'} name="password_confirmation"
                  value={form.password_confirmation} onChange={handleChange} required
                  placeholder="Ulangi password" style={{ paddingRight: 44 }} />
                <button
                  type="button"
                  onClick={() => setShowPassConfirm(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--k-muted)', fontSize: 18, lineHeight: 1, padding: 0,
                  }}
                  aria-label={showPassConfirm ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassConfirm ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Data kendaraan mitra */}
            {isMitra && (
              <div className="fade-in" style={{
                display: 'flex', flexDirection: 'column', gap: 14,
                padding: '16px 18px', borderRadius: 16,
                background: 'var(--k-card)', border: '1px solid var(--k-border)',
              }}>
                <p style={{ color: 'var(--k-sub)', fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Data Kendaraan
                </p>
                <div>
                  <label className="label">Plat Nomor</label>
                  <input className="input-field" type="text" name="vehicle_plate"
                    value={form.vehicle_plate} onChange={handleChange} required={isMitra}
                    placeholder="B 1234 ABC" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Merek</label>
                    <input className="input-field" type="text" name="vehicle_brand"
                      value={form.vehicle_brand} onChange={handleChange} placeholder="Honda" />
                  </div>
                  <div>
                    <label className="label">Tahun</label>
                    <input className="input-field" type="number" name="vehicle_year"
                      value={form.vehicle_year} onChange={handleChange}
                      placeholder="2022" min="2000" max={new Date().getFullYear()} />
                  </div>
                </div>
              </div>
            )}

            {/* Data toko merchant */}
            {isMerchant && (
              <div className="fade-in" style={{
                display: 'flex', flexDirection: 'column', gap: 14,
                padding: '16px 18px', borderRadius: 16,
                background: 'var(--k-card)', border: '1px solid var(--k-border)',
              }}>
                <p style={{ color: 'var(--k-sub)', fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Informasi Toko
                </p>
                <div>
                  <label className="label">Nama Toko *</label>
                  <input className="input-field" type="text" name="shop_name"
                    value={form.shop_name || ''} onChange={handleChange} required={isMerchant}
                    placeholder="Contoh: Warung Bu Sari" />
                </div>
                <div>
                  <label className="label">Kategori *</label>
                  <select className="input-field" name="shop_category"
                    value={form.shop_category || ''} onChange={handleChange} required={isMerchant}
                    style={{ background: 'var(--k-input)', color: 'var(--k-text)' }}>
                    <option value="">-- Pilih kategori --</option>
                    {SHOP_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Alamat Toko *</label>
                  <input className="input-field" type="text" name="shop_address"
                    value={form.shop_address || ''} onChange={handleChange} required={isMerchant}
                    placeholder="Jl. Contoh No. 1, Kota" />
                </div>
                <div>
                  <label className="label">Nomor HP Toko</label>
                  <input className="input-field" type="tel" name="shop_phone"
                    value={form.shop_phone || ''} onChange={handleChange}
                    placeholder="08xxxxxxxxxx (opsional)" />
                </div>
                <div>
                  <label className="label">Pin Lokasi Toko</label>
                  <MerchantLocationPicker
                    lat={form.shop_lat} lng={form.shop_lng}
                    onPick={({ lat, lng, address }) => setForm(f => ({
                      ...f, shop_lat: lat, shop_lng: lng,
                      shop_address: f.shop_address || address,
                    }))}
                  />
                </div>
                <div style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(246,173,85,0.1)', border: '1px solid rgba(246,173,85,0.25)',
                  fontSize: 12, color: 'var(--k-warn)', lineHeight: 1.5,
                }}>
                  ⚠️ Toko Anda akan aktif setelah disetujui oleh admin. Sambil menunggu, Anda sudah bisa mengisi menu.
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Memproses...' : method === 'email' ? 'Daftar' : 'Kirim Kode OTP'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', color: 'var(--k-muted)', fontSize: 14, marginTop: 28 }}>
          Sudah punya akun?{' '}
          <Link to="/login" style={{ color: 'var(--k-accent)', fontWeight: 700, textDecoration: 'none' }}>
            Masuk
          </Link>
        </p>
      </div>
    </div>
  )
}
