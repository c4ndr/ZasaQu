import { useNavigate } from 'react-router-dom'

const LOGO = () => (
  <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg,#00C896,#00A87D)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(0,200,150,0.3)', flexShrink: 0 }}>
    <span style={{ fontSize: 24, fontWeight: 900, color: '#0C0C16' }}>Z</span>
  </div>
)

const WA_NUMBER = '+62 852-8038-1600'
const WA_LINK   = 'https://wa.me/6285280381600'

const CONTACTS = [
  {
    icon: '✉️',
    label: 'Email Dukungan',
    value: 'support@zasaqu.uk',
    sub: 'Respon dalam 1–2 hari kerja',
    href: 'mailto:support@zasaqu.uk',
    color: '#6366F1',
  },
  {
    icon: '💬',
    label: 'WhatsApp',
    value: WA_NUMBER,
    sub: 'Chat langsung, Senin–Minggu 08.00–22.00 WIB',
    href: WA_LINK,
    color: '#25D366',
  },
  {
    icon: '🌐',
    label: 'Website',
    value: 'zasaqu.uk',
    sub: 'Informasi layanan & unduh aplikasi',
    href: 'https://zasaqu.uk',
    color: '#00C896',
  },
]

export default function ContactPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--k-input)', border: '1px solid var(--k-border)', color: 'var(--k-text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>Hubungi Kami</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', margin: 0 }}>Kami siap membantu Anda</p>
        </div>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Brand intro */}
        <div style={{ background: 'linear-gradient(135deg,#0C0C16,#1a1a2e)', borderRadius: 20, padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(0,200,150,0.07)' }} />
          <LOGO />
          <div>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: 0 }}>ZasaQu</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '3px 0 0', lineHeight: 1.5 }}>Platform layanan lokal — kami hadir untuk membantu</p>
          </div>
        </div>

        {/* Section label */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Saluran Kontak</p>

        {/* Contact cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CONTACTS.map(c => (
            <a
              key={c.label}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div style={{ background: 'var(--k-card)', borderRadius: 16, padding: '16px', border: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', gap: 14, transition: 'opacity 0.15s' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{c.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, color: 'var(--k-muted)', margin: '0 0 2px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{c.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>{c.value}</p>
                  <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: '2px 0 0' }}>{c.sub}</p>
                </div>
                <span style={{ color: c.color, fontSize: 18, flexShrink: 0 }}>↗</span>
              </div>
            </a>
          ))}
        </div>

        {/* Hours */}
        <div style={{ background: 'rgba(0,200,150,0.06)', borderRadius: 16, padding: '18px', border: '1px solid rgba(0,200,150,0.2)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Jam Operasional</p>
          {[
            { day: 'Senin – Jumat',  time: '08.00 – 22.00 WIB' },
            { day: 'Sabtu – Minggu', time: '09.00 – 21.00 WIB' },
          ].map(r => (
            <div key={r.day} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid rgba(0,200,150,0.15)' }}>
              <span style={{ fontSize: 13, color: 'var(--k-muted)' }}>{r.day}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{r.time}</span>
            </div>
          ))}
          <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: 0 }}>ZasaQu adalah layanan berbasis online, tidak tersedia kantor fisik untuk kunjungan langsung.</p>
        </div>

        {/* Quick links */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Tautan Cepat</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: '📋 Syarat & Ketentuan', path: '/tos' },
            { label: '🔒 Kebijakan Privasi', path: '/privacy' },
            { label: '💸 Kebijakan Refund', path: '/refund' },
            { label: '❓ Cara Kerja', path: '/cara-kerja' },
          ].map(l => (
            <button key={l.path} onClick={() => navigate(l.path)}
              style={{ flex: '1 1 calc(50% - 5px)', padding: '12px 8px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
              {l.label}
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--k-muted)', margin: '4px 0 0' }}>
          © 2026 ZasaQu · ZashaGo Ecosystem
        </p>
      </div>
    </div>
  )
}
