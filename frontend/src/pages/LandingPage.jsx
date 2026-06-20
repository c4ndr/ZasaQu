import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const SERVICES = [
  { emoji: '🛵', name: 'ZasaRide', tagline: 'Ojek & Antar',       desc: 'Antar jemput & perjalanan ekspres ke seluruh area layanan.',   color: '#F97316', bg: 'rgba(249,115,22,0.12)', route: '/ride' },
  { emoji: '🍔', name: 'ZasaFood', tagline: 'Pesan Makanan',      desc: 'Ratusan menu dari warung dan restoran lokal favoritmu.',        color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  route: '/food' },
  { emoji: '🛒', name: 'ZasaMart', tagline: 'Belanja Lokal',      desc: 'Produk kebutuhan dari pedagang lokal yang terpercaya.',         color: '#10B981', bg: 'rgba(16,185,129,0.12)', route: '/mart' },
  { emoji: '🏠', name: 'ZasaHome', tagline: 'Jasa Rumah',         desc: 'Cleaning, laundry, pijat, tukang — semua bisa dipesan.',        color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', route: '/home' },
]

const STEPS = [
  { num: '1', icon: '📱', title: 'Daftar Gratis',      desc: 'Buat akun dalam 1 menit dengan nomor HP atau email.' },
  { num: '2', icon: '🎯', title: 'Pilih Layanan',      desc: 'Pilih dari 4 layanan sesuai kebutuhan hari ini.' },
  { num: '3', icon: '⚡', title: 'Nikmati Hasilnya',   desc: 'Mitra terverifikasi siap melayani dalam hitungan menit.' },
]

const MITRA_BENEFITS = [
  { icon: '💵', text: 'Penghasilan fleksibel, kerja kapan saja' },
  { icon: '⚡', text: 'Pendapatan masuk tiap order selesai' },
  { icon: '🗺️', text: 'Navigasi & peta terintegrasi di aplikasi' },
  { icon: '🛡️', text: 'Dukungan penuh dari tim ZasaQu' },
]

export default function LandingPage() {
  const navigate  = useNavigate()
  const { user }  = useAuth()

  return (
    <div style={{ minHeight: '100vh', background: '#0C0C16', overflowX: 'hidden' }}>

      {/* ── NAVBAR ─────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(12,12,22,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#00C896,#00A87D)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,200,150,0.35)' }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#0C0C16' }}>Z</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px' }}>ZasaQu</span>
        </div>

        {user ? (
          <button onClick={() => navigate('/dashboard')}
            style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#00C896,#00A87D)', color: '#0C0C16', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            Buka Aplikasi →
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/login')}
              style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Masuk
            </button>
            <button onClick={() => navigate('/register')}
              style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#00C896,#00A87D)', color: '#0C0C16', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              Daftar
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ───────────────────────────────────── */}
      <section style={{ padding: '60px 24px 56px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        {/* Background blobs */}
        <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,200,150,0.12) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(249,115,22,0.07)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          {/* Logo */}
          <div style={{ width: 96, height: 96, borderRadius: 30, background: 'linear-gradient(135deg,#00C896,#00A87D)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 20px 60px rgba(0,200,150,0.4), 0 0 0 18px rgba(0,200,150,0.07)' }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: '#0C0C16' }}>Z</span>
          </div>

          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)', marginBottom: 18 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C896', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#00C896', fontWeight: 700, letterSpacing: '0.05em' }}>Platform Layanan Lokal</span>
          </div>

          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 14px', lineHeight: 1.2, letterSpacing: '-0.5px' }}>
            Semua Kebutuhan Lokal,<br />
            <span style={{ background: 'linear-gradient(135deg,#00C896,#34D399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Satu Aplikasi
            </span>
          </h1>

          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', margin: '0 0 36px', lineHeight: 1.7, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
            Ojek, makanan, belanja, jasa rumah — ZasaQu menghubungkan Anda dengan mitra lokal terpercaya di sekitar Anda.
          </p>

          {/* CTA buttons */}
          {user ? (
            <button onClick={() => navigate('/dashboard')}
              style={{ width: '100%', maxWidth: 320, padding: '17px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#00C896,#00A87D)', color: '#0C0C16', fontWeight: 900, fontSize: 16, cursor: 'pointer', boxShadow: '0 10px 32px rgba(0,200,150,0.35)', display: 'block', margin: '0 auto' }}>
              Buka Aplikasi →
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320, margin: '0 auto' }}>
              <button onClick={() => navigate('/register')}
                style={{ padding: '17px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#00C896,#00A87D)', color: '#0C0C16', fontWeight: 900, fontSize: 16, cursor: 'pointer', boxShadow: '0 10px 32px rgba(0,200,150,0.35)' }}>
                Mulai Gratis Sekarang →
              </button>
              <button onClick={() => navigate('/dashboard')}
                style={{ padding: '15px', borderRadius: 16, border: '1px solid rgba(0,200,150,0.25)', background: 'rgba(0,200,150,0.07)', color: '#00C896', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                Jelajahi Dulu Tanpa Daftar →
              </button>
              <button onClick={() => navigate('/login')}
                style={{ padding: '13px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Sudah punya akun? Masuk
              </button>
            </div>
          )}

          {/* APK link */}
          <p style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            Tersedia di{' '}
            <a href="/zasaqu.apk" download style={{ color: '#00C896', fontWeight: 700, textDecoration: 'none' }}>Android APK</a>
            {' '}& Browser
          </p>
        </div>
      </section>

      {/* ── LAYANAN ────────────────────────────────── */}
      <section style={{ padding: '0 20px 52px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#00C896', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>4 Layanan Terintegrasi</p>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>Apa yang Bisa Kami Bantu?</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {SERVICES.map(s => (
            <button key={s.name} onClick={() => navigate(s.route)}
              style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', padding: '20px 16px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 12 }}>{s.emoji}</div>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#fff', margin: '0 0 3px' }}>{s.name}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: s.color, margin: '0 0 6px', letterSpacing: '0.03em' }}>{s.tagline}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
              <p style={{ fontSize: 11, color: s.color, margin: '8px 0 0', fontWeight: 700 }}>Lihat →</p>
            </button>
          ))}
        </div>

        <button onClick={() => navigate('/layanan')}
          style={{ width: '100%', marginTop: 14, padding: '14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Lihat Detail Semua Layanan →
        </button>
      </section>

      {/* ── CARA KERJA ─────────────────────────────── */}
      <section style={{ padding: '0 20px 52px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.07)', padding: '28px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#00C896', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>Mudah & Cepat</p>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: 0 }}>Cara Menggunakan ZasaQu</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {STEPS.map((step, i) => (
              <div key={step.num} style={{ display: 'flex', gap: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 48, flexShrink: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(0,200,150,0.12)', border: '2px solid rgba(0,200,150,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 20 }}>{step.icon}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: 'rgba(0,200,150,0.15)', minHeight: 28 }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingLeft: 14, paddingBottom: i < STEPS.length - 1 ? 24 : 0, paddingTop: 6 }}>
                  <div style={{ display: 'inline-block', background: 'rgba(0,200,150,0.1)', borderRadius: 6, padding: '2px 8px', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#00C896' }}>Langkah {step.num}</span>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>{step.title}</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/cara-kerja')}
            style={{ width: '100%', marginTop: 24, padding: '13px', borderRadius: 12, border: '1px solid rgba(0,200,150,0.25)', background: 'rgba(0,200,150,0.07)', color: '#00C896', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Panduan Lengkap →
          </button>
        </div>
      </section>

      {/* ── MITRA CTA ──────────────────────────────── */}
      <section style={{ padding: '0 20px 52px' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(249,115,22,0.12),rgba(239,68,68,0.08))', borderRadius: 24, border: '1px solid rgba(249,115,22,0.2)', padding: '28px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(249,115,22,0.08)', pointerEvents: 'none' }} />
          <p style={{ fontSize: 11, fontWeight: 700, color: '#F97316', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>Program Mitra</p>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: '0 0 10px', lineHeight: 1.3 }}>
            Hasilkan Uang Bersama ZasaQu
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 20px', lineHeight: 1.7 }}>
            Bergabung sebagai mitra ojek, kurir, atau penyedia jasa dan mulai hasilkan pendapatan dengan jadwal yang bebas.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
            {MITRA_BENEFITS.map(b => (
              <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{b.icon}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{b.text}</span>
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/daftar-mitra')}
            style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#F97316,#EF4444)', color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 24px rgba(249,115,22,0.3)' }}>
            Daftar Jadi Mitra Sekarang →
          </button>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────── */}
      <section style={{ padding: '0 20px 52px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { value: '4',      unit: 'Layanan',   sub: 'terintegrasi' },
            { value: '100%',   unit: 'Lokal',     sub: 'mitra terverifikasi' },
            { value: 'Gratis', unit: 'Daftar',    sub: 'tanpa biaya awal' },
            { value: '24/7',   unit: 'Support',   sub: 'tim siap membantu' },
          ].map(s => (
            <div key={s.value} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.07)', padding: '20px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 26, fontWeight: 900, color: '#00C896', margin: '0 0 2px', letterSpacing: '-0.5px' }}>{s.value}</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: '0 0 3px' }}>{s.unit}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer style={{ padding: '32px 20px 40px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#00C896,#00A87D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#0C0C16' }}>Z</span>
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 900, color: '#fff', margin: 0 }}>ZasaQu</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Platform Layanan Lokal Terpercaya</p>
          </div>
        </div>

        {/* Links grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 0', marginBottom: 24 }}>
          {[
            { label: 'Tentang Kami',       to: '/about' },
            { label: 'Layanan',            to: '/layanan' },
            { label: 'Cara Kerja',         to: '/cara-kerja' },
            { label: 'Jadi Mitra',         to: '/daftar-mitra' },
            { label: 'Syarat & Ketentuan', to: '/tos' },
            { label: 'Kebijakan Privasi',  to: '/privacy' },
            { label: 'Refund & Sengketa',  to: '/refund' },
            { label: 'Hubungi Kami',       to: '/contact' },
          ].map(l => (
            <Link key={l.to} to={l.to} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', fontWeight: 600, padding: '5px 0' }}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Contact */}
        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 6px' }}>Kontak</p>
          <a href="mailto:support@zasaqu.uk" style={{ display: 'block', fontSize: 13, color: '#00C896', fontWeight: 700, textDecoration: 'none', marginBottom: 4 }}>✉️ support@zasaqu.uk</a>
          <a href="https://wa.me/6285280381600" target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 13, color: '#25D366', fontWeight: 700, textDecoration: 'none' }}>💬 +62 852-8038-1600</a>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0, textAlign: 'center' }}>
          © 2026 ZasaQu · ZashaGo Ecosystem. Seluruh hak dilindungi.
        </p>
      </footer>
    </div>
  )
}
