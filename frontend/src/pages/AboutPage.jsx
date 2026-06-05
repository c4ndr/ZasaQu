import { useNavigate } from 'react-router-dom'

const VERSION = '1.0.0'

const MODULES = [
  { emoji: '🛵', name: 'ZasaGo',   desc: 'Ojek & pengiriman barang cepat' },
  { emoji: '🍔', name: 'ZasaFood', desc: 'Pesan makanan dari merchant terdekat' },
  { emoji: '🛒', name: 'ZasaMart', desc: 'Belanja produk dari pedagang lokal' },
  { emoji: '🏠', name: 'ZasaHome', desc: 'Jasa layanan rumah & kebersihan' },
]

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0C0C16 0%,#1a1a2e 100%)', padding: '20px 20px 40px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(0,200,150,0.06)' }} />
        <div style={{ position: 'absolute', left: -20, bottom: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(0,200,150,0.04)' }} />
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg,#00C896,#00A87D)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(0,200,150,0.35)' }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: '#0C0C16' }}>Z</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: 0 }}>ZasaQu</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '4px 0 0' }}>Versi {VERSION}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px', marginTop: -16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Tagline */}
        <div style={{ background: 'var(--k-card)', borderRadius: 16, padding: '18px', border: '1px solid var(--k-border)', textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--k-text)', margin: 0, lineHeight: 1.6 }}>
            Platform layanan lokal serba ada untuk kebutuhan sehari-hari.
          </p>
          <p style={{ fontSize: 13, color: 'var(--k-muted)', margin: '8px 0 0', lineHeight: 1.6 }}>
            ZasaQu menghubungkan warga dengan mitra ojek, merchant makanan, pedagang lokal, dan penyedia jasa rumah di sekitar Anda.
          </p>
        </div>

        {/* Modul */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Layanan Kami</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MODULES.map(m => (
              <div key={m.name} style={{ background: 'var(--k-card)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(0,200,150,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{m.emoji}</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>{m.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: '2px 0 0' }}>{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div style={{ background: 'var(--k-card)', borderRadius: 16, padding: '18px', border: '1px solid var(--k-border)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Informasi Aplikasi</p>
          {[
            { label: 'Versi',         value: VERSION },
            { label: 'Platform',      value: 'Android & Web' },
            { label: 'Dikembangkan',  value: 'ZashaGo Ecosystem' },
            { label: 'Kontak',        value: 'support@zasaqu.uk' },
            { label: 'Website',       value: 'zasaqu.uk' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--k-border)' }}>
              <span style={{ fontSize: 13, color: 'var(--k-muted)' }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{r.value}</span>
            </div>
          ))}
        </div>

        {/* Legal links */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/tos')}
            style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            📋 Syarat & Ketentuan
          </button>
          <button onClick={() => navigate('/privacy')}
            style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            🔒 Kebijakan Privasi
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--k-muted)', margin: '4px 0' }}>
          © 2025 ZasaQu · ZashaGo Ecosystem. Seluruh hak dilindungi.
        </p>
      </div>
    </div>
  )
}
