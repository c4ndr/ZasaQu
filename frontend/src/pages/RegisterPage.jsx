import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import MerchantLocationPicker from '../components/MerchantLocationPicker'

const SERV_CATEGORIES = [
  { value: 'ac',         label: 'AC & Pendingin' },
  { value: 'elektronik', label: 'Elektronik' },
  { value: 'listrik',    label: 'Instalasi Listrik' },
  { value: 'air',        label: 'Saluran Air & Pipa' },
  { value: 'bangunan',   label: 'Bangunan & Renovasi' },
  { value: 'jahit',      label: 'Jahit & Konveksi' },
  { value: 'lainnya',    label: 'Lainnya' },
]

const HOME_CATEGORIES = [
  { value: 'laundry',  label: 'Laundry' },
  { value: 'pijat',    label: 'Pijat & Relaksasi' },
  { value: 'cleaning', label: 'Cleaning Service' },
  { value: 'tukang',   label: 'Tukang & Perbaikan' },
  { value: 'cukur',    label: 'Cukur Panggilan' },
  { value: 'lainnya',  label: 'Lainnya' },
]

const SHOP_CATEGORIES = [
  { value: 'makanan_berat', label: 'Makanan Berat' },
  { value: 'minuman',       label: 'Minuman' },
  { value: 'snack',         label: 'Snack' },
  { value: 'lainnya',       label: 'Lainnya' },
]

const MITRA_TYPES = [
  { value: 'mitra_motor',   emoji: '🏍️', label: 'Mitra Motor',        desc: 'ZasaGo, ZasaRide & pengiriman dengan motor',   grad: 'linear-gradient(135deg,#F59E0B,#EF4444)' },
  { value: 'mitra_mobil',   emoji: '🚗', label: 'Mitra Mobil',        desc: 'ZasaGo, ZasaRide & pengiriman kapasitas besar', grad: 'linear-gradient(135deg,#3B82F6,#06B6D4)' },
  { value: 'merchant',      emoji: '🏪', label: 'Merchant Makanan',   desc: 'Buka warung / restoran online',        grad: 'linear-gradient(135deg,#EF4444,#F97316)' },
  { value: 'home_provider', emoji: '🏠', label: 'Provider Rumahan',   desc: 'Laundry, pijat, cleaning, tukang',     grad: 'linear-gradient(135deg,#8B5CF6,#6366F1)' },
  { value: 'seller',        emoji: '🛒', label: 'Seller ZasaShop',    desc: 'Jual produk lokal di ZasaShop',        grad: 'linear-gradient(135deg,#10B981,#3B82F6)' },
  { value: 'serv_provider', emoji: '🔧', label: 'Teknisi ZasaServis', desc: 'Tawarkan jasa servis & perbaikan',     grad: 'linear-gradient(135deg,#0EA5E9,#0284C7)' },
]

const EMPTY_FORM = {
  name: '', email: '', phone: '', password: '', password_confirmation: '',
  address: '',
  otp: '', role: 'pelanggan', vehicle_plate: '', vehicle_brand: '', vehicle_year: '',
  shop_name: '', shop_category: '', shop_address: '', shop_phone: '',
  shop_lat: '', shop_lng: '',
  provider_name: '', provider_category: '', provider_address: '', provider_phone: '',
  provider_lat: '', provider_lng: '',
  seller_name: '', seller_address: '', seller_phone: '',
  seller_lat: '', seller_lng: '',
  serv_name: '', serv_category: '', serv_address: '', serv_phone: '',
  serv_lat: '', serv_lng: '',
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const initType = searchParams.get('type') === 'mitra' ? 'mitra' : null

  const [accountType, setAccountType] = useState(initType)
  const [mitraRole,   setMitraRole]   = useState(null)
  const [method,      setMethod]      = useState('email')
  const [step,        setStep]        = useState(1)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [demoOtp,     setDemoOtp]     = useState('')
  const [showPwd,     setShowPwd]     = useState(false)
  const [showPwdC,    setShowPwdC]    = useState(false)

  const { login } = useAuth()
  const navigate  = useNavigate()

  const effectiveRole = accountType === 'pelanggan' ? 'pelanggan' : (mitraRole ?? 'pelanggan')
  const isMitra        = effectiveRole === 'mitra_motor' || effectiveRole === 'mitra_mobil'
  const isMerchant     = effectiveRole === 'merchant'
  const isHomeProvider = effectiveRole === 'home_provider'
  const isSeller       = effectiveRole === 'seller'
  const isServProvider = effectiveRole === 'serv_provider'

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSendOtp = async () => {
    setError(''); setLoading(true)
    try {
      const res = await api.post('/auth/otp/send', { phone: form.phone, email: form.email || undefined, type: 'register' })
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
      const payload = { ...form, role: effectiveRole }
      const res = method === 'email'
        ? await api.post('/auth/register', payload)
        : await api.post('/auth/otp/register', payload)
      login(res.data.user, res.data.token)
      navigate('/dashboard')
    } catch (err) {
      const errors = err.response?.data?.errors
      setError(errors ? Object.values(errors).flat().join(' ') : (err.response?.data?.message || 'Registrasi gagal.'))
    } finally { setLoading(false) }
  }

  // ── Step 0: choose account type ──────────────────────────────────────────
  if (!accountType) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 45%, #24243e 100%)' }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}`}</style>
        <div style={{ position: 'fixed', top: -80, right: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(99,102,241,0.13)', pointerEvents: 'none' }} />
        <div style={{ position: 'fixed', bottom: '40%', left: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(139,92,246,0.1)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px 32px', minHeight: '28vh' }}>
          <div style={{ width: 76, height: 76, background: 'linear-gradient(135deg,#6366F1,#8B5CF6,#EC4899)', borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, boxShadow: '0 14px 44px rgba(99,102,241,0.5), 0 0 0 12px rgba(99,102,241,0.1)' }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: '#fff' }}>Z</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: -0.5, marginBottom: 6 }}>Buat Akun ZasaQu</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Saya bergabung sebagai...</p>
        </div>

        {/* Choice cards */}
        <div style={{ background: 'var(--k-bg)', borderRadius: '32px 32px 0 0', padding: '12px 24px 44px', boxShadow: '0 -20px 60px rgba(0,0,0,0.5)', animation: 'fadeUp 0.4s ease' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--k-border)', margin: '0 auto 28px' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <button onClick={() => setAccountType('pelanggan')} style={{ width: '100%', border: 'none', padding: 0, cursor: 'pointer', borderRadius: 22, overflow: 'hidden', background: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 22px', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: 22, border: '1.5px solid rgba(99,102,241,0.3)', boxShadow: '0 8px 28px rgba(99,102,241,0.2)' }}>
                <div style={{ width: 60, height: 60, background: 'rgba(255,255,255,0.12)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>🛍️</div>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Pelanggan</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>Pesan laundry, pijat, kurir, makanan, dan layanan lainnya</p>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }}>›</span>
              </div>
            </button>

            <button onClick={() => setAccountType('mitra')} style={{ width: '100%', border: 'none', padding: 0, cursor: 'pointer', borderRadius: 22, overflow: 'hidden', background: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 22px', background: 'linear-gradient(135deg, #1c1917, #292524)', borderRadius: 22, border: '1.5px solid rgba(139,92,246,0.3)', boxShadow: '0 8px 28px rgba(139,92,246,0.2)' }}>
                <div style={{ width: 60, height: 60, background: 'rgba(255,255,255,0.1)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>🤝</div>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Mitra / Usaha</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>Kurir, merchant makanan, provider layanan, atau seller produk</p>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }}>›</span>
              </div>
            </button>
          </div>

          <p style={{ textAlign: 'center', color: 'var(--k-muted)', fontSize: 14, marginTop: 28 }}>
            Sudah punya akun?{' '}
            <Link to="/login" style={{ color: '#8B5CF6', fontWeight: 700, textDecoration: 'none' }}>Masuk</Link>
          </p>
        </div>
      </div>
    )
  }

  // ── Step 0b: choose mitra type ────────────────────────────────────────────
  if (accountType === 'mitra' && !mitraRole) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 40 }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>

        <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81, #4c1d95)', padding: '52px 24px 28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <button onClick={() => setAccountType(null)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', marginBottom: 18, padding: '7px 16px', borderRadius: 20 }}>
            ← Kembali
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 6 }}>Pilih Jenis Mitra</h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>Anda akan bergabung sebagai...</p>
        </div>

        <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeUp 0.35s ease' }}>
          {MITRA_TYPES.map(t => (
            <button key={t.value} onClick={() => setMitraRole(t.value)} style={{ width: '100%', border: 'none', padding: 0, cursor: 'pointer', background: 'none', borderRadius: 20, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 18px', background: 'var(--k-card)', borderRadius: 20, border: '1.5px solid var(--k-border)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', transition: 'all .2s' }}>
                <div style={{ width: 52, height: 52, background: t.grad, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
                  {t.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--k-text)', marginBottom: 3 }}>{t.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{t.desc}</p>
                </div>
                <span style={{ color: 'var(--k-muted)', fontSize: 18 }}>›</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Registration form ─────────────────────────────────────────────────────
  const mitraInfo = MITRA_TYPES.find(t => t.value === mitraRole)
  const headerTitle = accountType === 'pelanggan' ? 'Daftar sebagai Pelanggan' : `Daftar sebagai ${mitraInfo?.label ?? 'Mitra'}`
  const headerSub   = accountType === 'pelanggan' ? 'Lengkapi data diri Anda' : 'Lengkapi informasi usaha Anda'

  const handleBack = () => {
    if (accountType === 'mitra' && mitraRole) { setMitraRole(null); setError('') }
    else { setAccountType(null); setError('') }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 48 }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>

      {/* Header */}
      <div style={{ background: accountType === 'pelanggan' ? 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)' : (mitraInfo?.grad ? mitraInfo.grad.replace('135deg', '160deg') : 'linear-gradient(135deg,#1c1917,#292524,#4c1d95)'), padding: '52px 24px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <button onClick={handleBack} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', marginBottom: 18, padding: '7px 16px', borderRadius: 20 }}>
          ← Kembali
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {mitraInfo && (
            <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.15)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, backdropFilter: 'blur(4px)' }}>
              {mitraInfo.emoji}
            </div>
          )}
          {accountType === 'pelanggan' && (
            <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.15)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, backdropFilter: 'blur(4px)' }}>
              🛍️
            </div>
          )}
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 4 }}>{headerTitle}</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{headerSub}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '22px 24px 0', animation: 'fadeUp 0.35s ease' }}>

        {/* Method toggle */}
        <div style={{ display: 'flex', background: 'var(--k-card)', borderRadius: 14, padding: 4, border: '1px solid var(--k-border)', marginBottom: 22 }}>
          {[{ id: 'email', label: '✉️  Email' }, { id: 'phone', label: '📱  Nomor HP' }].map(m => (
            <button key={m.id}
              onClick={() => { setMethod(m.id); setStep(1); setError('') }}
              style={{ flex: 1, padding: '12px 0', fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'all .25s',
                background: method === m.id ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : 'transparent',
                color: method === m.id ? '#fff' : 'var(--k-muted)',
                boxShadow: method === m.id ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
              }}>
              {m.label}
            </button>
          ))}
        </div>

        {error && <div className="error-box fade-in" style={{ marginBottom: 20 }}>{error}</div>}

        {/* OTP step */}
        {step === 2 && method === 'phone' ? (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '16px 20px', textAlign: 'center' }}>
              <p style={{ color: 'var(--k-sub)', fontSize: 14 }}>
                Kode OTP dikirim ke <strong style={{ color: 'var(--k-text)' }}>{form.phone}</strong>
              </p>
            </div>
            {demoOtp && (
              <div style={{ padding: '12px 16px', borderRadius: 14, background: 'rgba(246,173,85,0.1)', border: '1px solid rgba(246,173,85,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-warn)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>🧪 Mode Demo — Kode OTP</p>
                  <p style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 900, color: 'var(--k-warn)', letterSpacing: '0.3em' }}>{demoOtp}</p>
                </div>
                <button type="button" onClick={() => setForm(f => ({ ...f, otp: demoOtp }))}
                  style={{ padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'rgba(246,173,85,0.2)', color: 'var(--k-warn)', border: 'none', cursor: 'pointer' }}>
                  Isi Otomatis
                </button>
              </div>
            )}
            <div>
              <label className="label">Kode OTP</label>
              <input className="input-field" type="text" name="otp"
                value={form.otp} onChange={handleChange} maxLength={6} required
                placeholder="000000" style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: 24, fontFamily: 'monospace' }} />
            </div>
            <button className="btn-primary" onClick={handleSubmit} disabled={loading || form.otp.length !== 6}
              style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', border: 'none', borderRadius: 16, padding: '16px', fontSize: 15, fontWeight: 800, boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
              {loading ? 'Mendaftar...' : 'Verifikasi & Daftar'}
            </button>
            <button type="button" onClick={handleSendOtp}
              style={{ background: 'none', border: 'none', color: 'var(--k-muted)', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>
              Kirim ulang OTP
            </button>
          </div>
        ) : (
          <form onSubmit={method === 'email' ? handleSubmit : (e) => { e.preventDefault(); handleSendOtp() }}
            style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Data pribadi */}
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, padding: '18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Data Diri</p>
              <div>
                <label className="label">Nama Lengkap</label>
                <input className="input-field" type="text" name="name"
                  value={form.name} onChange={handleChange} required placeholder="Nama lengkap" />
              </div>
              {method === 'email' ? (
                <div>
                  <label className="label">Email</label>
                  <input className="input-field" type="email" name="email"
                    value={form.email} onChange={handleChange} required placeholder="email@contoh.com" />
                </div>
              ) : (
                <>
                  <div>
                    <label className="label">Nomor HP</label>
                    <input className="input-field" type="tel" name="phone"
                      value={form.phone} onChange={handleChange} required placeholder="08xxxxxxxxxx" />
                  </div>
                  <div>
                    <label className="label">Email <span style={{ fontWeight: 400, color: 'var(--k-muted)', fontSize: 12 }}>(opsional — untuk backup OTP)</span></label>
                    <input className="input-field" type="email" name="email"
                      value={form.email} onChange={handleChange} placeholder="email@contoh.com" />
                  </div>
                </>
              )}
              <div>
                <label className="label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="input-field" type={showPwd ? 'text' : 'password'} name="password"
                    value={form.password} onChange={handleChange} required
                    placeholder="Minimal 8 karakter" style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--k-muted)', fontSize: 18, lineHeight: 1, padding: 0 }}>
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Konfirmasi Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="input-field" type={showPwdC ? 'text' : 'password'} name="password_confirmation"
                    value={form.password_confirmation} onChange={handleChange} required
                    placeholder="Ulangi password" style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPwdC(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--k-muted)', fontSize: 18, lineHeight: 1, padding: 0 }}>
                    {showPwdC ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              {accountType === 'pelanggan' && (
                <div>
                  <label className="label">Alamat Rumah *</label>
                  <input className="input-field" type="text" name="address"
                    value={form.address} onChange={handleChange} required
                    placeholder="Jl. Nama Jalan No. XX, Kelurahan, Kota" />
                  <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 5, lineHeight: 1.4 }}>
                    Digunakan sebagai alamat pengiriman default
                  </p>
                </div>
              )}
            </div>

            {/* Kendaraan mitra */}
            {isMitra && (
              <div className="fade-in" style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Data Kendaraan</p>
                <div>
                  <label className="label">Plat Nomor *</label>
                  <input className="input-field" type="text" name="vehicle_plate"
                    value={form.vehicle_plate} onChange={handleChange} required={isMitra} placeholder="B 1234 ABC" />
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

            {/* Merchant */}
            {isMerchant && (
              <div className="fade-in" style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Informasi Toko</p>
                <div>
                  <label className="label">Nama Toko *</label>
                  <input className="input-field" type="text" name="shop_name"
                    value={form.shop_name} onChange={handleChange} required={isMerchant} placeholder="Contoh: Warung Bu Sari" />
                </div>
                <div>
                  <label className="label">Kategori *</label>
                  <select className="input-field" name="shop_category"
                    value={form.shop_category} onChange={handleChange} required={isMerchant}
                    style={{ background: 'var(--k-input)', color: 'var(--k-text)' }}>
                    <option value="">-- Pilih kategori --</option>
                    {SHOP_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Alamat Toko *</label>
                  <input className="input-field" type="text" name="shop_address"
                    value={form.shop_address} onChange={handleChange} required={isMerchant} placeholder="Jl. Contoh No. 1" />
                </div>
                <div>
                  <label className="label">Nomor HP Toko</label>
                  <input className="input-field" type="tel" name="shop_phone"
                    value={form.shop_phone} onChange={handleChange} placeholder="08xxxxxxxxxx (opsional)" />
                </div>
                <div>
                  <label className="label">Pin Lokasi Toko</label>
                  <MerchantLocationPicker lat={form.shop_lat} lng={form.shop_lng}
                    onPick={({ lat, lng, address }) => setForm(f => ({ ...f, shop_lat: lat, shop_lng: lng, shop_address: f.shop_address || address }))} />
                </div>
                <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(246,173,85,0.08)', border: '1px solid rgba(246,173,85,0.2)', fontSize: 12, color: 'var(--k-warn)', lineHeight: 1.5 }}>
                  ⚠️ Toko akan aktif setelah disetujui admin. Sambil menunggu, Anda sudah bisa mengisi menu.
                </div>
              </div>
            )}

            {/* Home Provider */}
            {isHomeProvider && (
              <div className="fade-in" style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Informasi Layanan</p>
                <div>
                  <label className="label">Nama Usaha *</label>
                  <input className="input-field" type="text" name="provider_name"
                    value={form.provider_name} onChange={handleChange} required={isHomeProvider} placeholder="Contoh: Laundry Bersih Jaya" />
                </div>
                <div>
                  <label className="label">Kategori *</label>
                  <select className="input-field" name="provider_category"
                    value={form.provider_category} onChange={handleChange} required={isHomeProvider}
                    style={{ background: 'var(--k-input)', color: 'var(--k-text)' }}>
                    <option value="">-- Pilih kategori --</option>
                    {HOME_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Alamat *</label>
                  <input className="input-field" type="text" name="provider_address"
                    value={form.provider_address} onChange={handleChange} required={isHomeProvider} placeholder="Jl. Contoh No. 1" />
                </div>
                <div>
                  <label className="label">Nomor HP Usaha</label>
                  <input className="input-field" type="tel" name="provider_phone"
                    value={form.provider_phone} onChange={handleChange} placeholder="08xxxxxxxxxx (opsional)" />
                </div>
                <div>
                  <label className="label">Pin Lokasi di Map</label>
                  <MerchantLocationPicker lat={form.provider_lat} lng={form.provider_lng}
                    onPick={({ lat, lng, address }) => setForm(f => ({ ...f, provider_lat: lat, provider_lng: lng, provider_address: f.provider_address || address }))} />
                </div>
                <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', fontSize: 12, color: '#818CF8', lineHeight: 1.5 }}>
                  🏠 Usaha akan aktif setelah diverifikasi admin. Sambil menunggu, Anda sudah bisa mengatur layanan dan harga.
                </div>
              </div>
            )}

            {/* Seller */}
            {isSeller && (
              <div className="fade-in" style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Info Toko ZasaShop</p>
                <div>
                  <label className="label">Nama Toko *</label>
                  <input className="input-field" type="text" name="seller_name"
                    value={form.seller_name} onChange={handleChange} required={isSeller} placeholder="Nama toko Anda di ZasaShop" />
                </div>
                <div>
                  <label className="label">Alamat Toko *</label>
                  <input className="input-field" type="text" name="seller_address"
                    value={form.seller_address} onChange={handleChange} required={isSeller} placeholder="Alamat lengkap toko" />
                </div>
                <div>
                  <label className="label">No. HP Toko</label>
                  <input className="input-field" type="tel" name="seller_phone"
                    value={form.seller_phone} onChange={handleChange} placeholder="Nomor HP yang bisa dihubungi" />
                </div>
                <div>
                  <label className="label">Lokasi Toko (untuk ongkir)</label>
                  <MerchantLocationPicker lat={form.seller_lat} lng={form.seller_lng}
                    onPick={({ lat, lng, address }) => setForm(f => ({ ...f, seller_lat: lat, seller_lng: lng, seller_address: address || f.seller_address }))} />
                </div>
                <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)', fontSize: 12, color: '#A78BFA', lineHeight: 1.5 }}>
                  🛒 Toko akan aktif setelah diverifikasi admin. Anda sudah bisa menambahkan produk sejak awal.
                </div>
              </div>
            )}

            {/* Serv Provider */}
            {isServProvider && (
              <div className="fade-in" style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Informasi Usaha Servis</p>
                <div>
                  <label className="label">Nama Usaha *</label>
                  <input className="input-field" type="text" name="serv_name"
                    value={form.serv_name} onChange={handleChange} required={isServProvider} placeholder="Contoh: Bengkel Listrik Maju Jaya" />
                </div>
                <div>
                  <label className="label">Kategori Keahlian *</label>
                  <select className="input-field" name="serv_category"
                    value={form.serv_category} onChange={handleChange} required={isServProvider}
                    style={{ background: 'var(--k-input)', color: 'var(--k-text)' }}>
                    <option value="">-- Pilih kategori --</option>
                    {SERV_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Alamat *</label>
                  <input className="input-field" type="text" name="serv_address"
                    value={form.serv_address} onChange={handleChange} required={isServProvider} placeholder="Jl. Contoh No. 1" />
                </div>
                <div>
                  <label className="label">Nomor HP Usaha</label>
                  <input className="input-field" type="tel" name="serv_phone"
                    value={form.serv_phone} onChange={handleChange} placeholder="08xxxxxxxxxx (opsional)" />
                </div>
                <div>
                  <label className="label">Pin Lokasi di Map</label>
                  <MerchantLocationPicker lat={form.serv_lat} lng={form.serv_lng}
                    onPick={({ lat, lng, address }) => setForm(f => ({ ...f, serv_lat: lat, serv_lng: lng, serv_address: f.serv_address || address }))} />
                </div>
                <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.2)', fontSize: 12, color: '#38BDF8', lineHeight: 1.5 }}>
                  🔧 Akun teknisi akan aktif setelah diverifikasi admin. Anda sudah bisa menambahkan layanan servis sejak awal.
                </div>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ padding: '16px', borderRadius: 16, fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff',
                boxShadow: '0 8px 24px rgba(99,102,241,0.35)', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Memproses...' : method === 'email' ? 'Daftar Sekarang →' : 'Kirim Kode OTP →'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', color: 'var(--k-muted)', fontSize: 14, marginTop: 28 }}>
          Sudah punya akun?{' '}
          <Link to="/login" style={{ color: '#8B5CF6', fontWeight: 700, textDecoration: 'none' }}>Masuk</Link>
        </p>

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
