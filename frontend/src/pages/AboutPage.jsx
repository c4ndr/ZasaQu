import { useNavigate } from 'react-router-dom'

const VERSION = '1.0.0'

const MODULES = [
  { emoji: '🛵', name: 'ZasaGo',    desc: 'Ojek & pengiriman ekspres', color: '#F97316', path: '/layanan' },
  { emoji: '🍔', name: 'ZasaFood',  desc: 'Pesan makanan dari merchant terdekat', color: '#EF4444', path: '/layanan' },
  { emoji: '🛒', name: 'ZasaMart',  desc: 'Belanja produk dari pedagang lokal', color: '#10B981', path: '/layanan' },
  { emoji: '🏠', name: 'ZasaHome',  desc: 'Jasa layanan rumah & kebersihan', color: '#8B5CF6', path: '/layanan' },
]

const INFO_ROWS = [
  { label: 'Versi',         value: VERSION },
  { label: 'Platform',      value: 'Android & Web' },
  { label: 'Dikembangkan',  value: 'ZashaGo Ecosystem' },
  { label: 'Email',         value: 'support@zasaqu.uk', href: 'mailto:support@zasaqu.uk' },
  { label: 'Website',       value: 'zasaqu.uk' },
]

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      {/* Hero header */}
      <div style={{ background: 'linear-gradient(135deg,#0C0C16 0%,#1a1a2e 100%)', padding: '20px 20px 50px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(0,200,150,0.06)' }} />
        <div style={{ position: 'absolute', left: -20, bottom: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(0,200,150,0.04)' }} />
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative' }}>
          {/* Logo */}
          <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg,#00C896,#00A87D)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 40px rgba(0,200,150,0.4)' }}>
            <span style={{ fontSize: 40, fontWeight: 900, color: '#0C0C16' }}>Z</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>ZasaQu</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '4px 0 0' }}>Platform Layanan Lokal Terpercaya</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: '2px 0 0' }}>Versi {VERSION}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px', marginTop: -18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Tagline card */}
        <div style={{ background: 'var(--k-card)', borderRadius: 20, padding: '20px', border: '1px solid var(--k-border)', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--k-text)', margin: '0 0 8px', lineHeight: 1.5 }}>
            Satu Aplikasi untuk Semua Kebutuhan Lokal
          </p>
          <p style={{ fontSize: 13, color: 'var(--k-muted)', margin: 0, lineHeight: 1.7 }}>
            ZasaQu menghubungkan warga dengan mitra ojek, merchant makanan, pedagang lokal, dan penyedia jasa rumah — semua dalam satu platform yang mudah digunakan.
          </p>
        </div>

        {/* Services */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Layanan Kami</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MODULES.map(m => (
              <button key={m.name} onClick={() => navigate(m.path)}
                style={{ background: 'var(--k-card)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{m.emoji}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>{m.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: '2px 0 0' }}>{m.desc}</p>
                </div>
                <span style={{ color: 'var(--k-muted)', fontSize: 14 }}>›</span>
              </button>
            ))}
          </div>
        </div>

        {/* App info */}
        <div style={{ background: 'var(--k-card)', borderRadius: 16, padding: '18px', border: '1px solid var(--k-border)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Informasi Aplikasi</p>
          {INFO_ROWS.map((r, i) => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < INFO_ROWS.length - 1 ? 10 : 0, marginBottom: i < INFO_ROWS.length - 1 ? 10 : 0, borderBottom: i < INFO_ROWS.length - 1 ? '1px solid var(--k-border)' : 'none' }}>
              <span style={{ fontSize: 13, color: 'var(--k-muted)' }}>{r.label}</span>
              {r.href
                ? <a href={r.href} style={{ fontSize: 13, fontWeight: 700, color: '#00C896', textDecoration: 'none' }}>{r.value}</a>
                : <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{r.value}</span>
              }
            </div>
          ))}
        </div>

        {/* Quick links — 2x2 grid */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Informasi Penting</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: '📋 Syarat & Ketentuan', path: '/tos' },
              { label: '🔒 Kebijakan Privasi',  path: '/privacy' },
              { label: '💸 Refund & Sengketa',  path: '/refund' },
              { label: '📞 Hubungi Kami',       path: '/contact' },
            ].map(l => (
              <button key={l.path} onClick={() => navigate(l.path)}
                style={{ padding: '14px 10px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mitra CTA */}
        <div style={{ background: 'linear-gradient(135deg,rgba(0,200,150,0.08),rgba(0,200,150,0.04))', borderRadius: 16, padding: '18px', border: '1px solid rgba(0,200,150,0.2)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 36, flexShrink: 0 }}>🛵</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)', margin: '0 0 4px' }}>Bergabung Jadi Mitra</p>
            <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>Hasilkan pendapatan fleksibel bersama ZasaQu.</p>
            <button onClick={() => navigate('/daftar-mitra')}
              style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#00C896,#00A87D)', color: '#0C0C16', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
              Pelajari Lebih →
            </button>
          </div>
        </div>

        {/* How it works link */}
        <button onClick={() => navigate('/cara-kerja')}
          style={{ width: '100%', padding: '14px', borderRadius: 14, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span>❓</span> Cara Kerja ZasaQu
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--k-muted)', margin: '4px 0' }}>
          © 2026 ZasaQu · ZashaGo Ecosystem. Seluruh hak dilindungi.
        </p>
      </div>
    </div>
  )
}
