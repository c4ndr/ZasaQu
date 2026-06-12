import { useNavigate } from 'react-router-dom'

const LOGO = () => (
  <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg,#00C896,#00A87D)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(0,200,150,0.3)', flexShrink: 0 }}>
    <span style={{ fontSize: 24, fontWeight: 900, color: '#0C0C16' }}>Z</span>
  </div>
)

const MITRA_TYPES = [
  {
    emoji: '🛵',
    name: 'Mitra Kurir / Ojek',
    desc: 'Antar dokumen, paket, dan penumpang menggunakan motor.',
    reqs: ['KTP & SIM C aktif', 'Motor kondisi baik', 'Smartphone Android'],
    color: '#F97316',
  },
  {
    emoji: '🍔',
    name: 'Mitra ZasaFood',
    desc: 'Antar pesanan makanan dari merchant ke pelanggan.',
    reqs: ['KTP aktif', 'Motor/sepeda', 'Tas pengiriman (disediakan)'],
    color: '#EF4444',
  },
  {
    emoji: '🛒',
    name: 'Mitra ZasaMart',
    desc: 'Belanja dan antar produk dari pedagang lokal ke pelanggan.',
    reqs: ['KTP aktif', 'Motor', 'Kapasitas angkut barang cukup'],
    color: '#10B981',
  },
  {
    emoji: '🏠',
    name: 'Penyedia Jasa ZasaHome',
    desc: 'Sediakan jasa rumah: laundry, pijat, cleaning, atau tukang.',
    reqs: ['KTP aktif', 'Sertifikat keahlian (jika ada)', 'Foto portofolio'],
    color: '#8B5CF6',
  },
]

const BENEFITS = [
  { icon: '💵', title: 'Penghasilan Fleksibel', desc: 'Kerja sesuai waktu luang Anda. Tidak ada target minimum — Anda yang atur jadwal.' },
  { icon: '⚡', title: 'Pendapatan Langsung', desc: 'Pendapatan masuk ke ZasaWallet setiap order selesai, bukan menunggu akhir bulan.' },
  { icon: '🗺️', title: 'Navigasi Terintegrasi', desc: 'Peta navigasi rute terpendek sudah tersedia di aplikasi. Tidak perlu app tambahan.' },
  { icon: '💬', title: 'Komunikasi Aman', desc: 'Chat & telepon dengan pelanggan langsung di aplikasi, tanpa perlu tukar nomor pribadi.' },
  { icon: '📊', title: 'Laporan Pendapatan', desc: 'Pantau riwayat order dan pendapatan kapan saja dari halaman wallet mitra.' },
  { icon: '🛡️', title: 'Dukungan Tim ZasaQu', desc: 'Tim support siap membantu jika ada kendala orderan atau masalah teknis.' },
]

const HOW_TO_REGISTER = [
  { step: '1', title: 'Buka Halaman Daftar', desc: 'Klik tombol "Daftar sebagai Mitra" di bawah, isi data diri lengkap.' },
  { step: '2', title: 'Pilih Jenis Mitra', desc: 'Pilih jenis mitra yang sesuai dengan kendaraan dan keahlian Anda.' },
  { step: '3', title: 'Upload Dokumen', desc: 'Foto KTP, SIM (jika kurir/ojek), dan foto kendaraan/diri untuk verifikasi.' },
  { step: '4', title: 'Tunggu Verifikasi', desc: 'Tim ZasaQu akan memverifikasi dokumen Anda dalam 1–3 hari kerja.' },
  { step: '5', title: 'Mulai Terima Order', desc: 'Setelah disetujui, aktifkan status online dan mulai terima order pertama Anda!' },
]

export default function DaftarMitraPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--k-input)', border: '1px solid var(--k-border)', color: 'var(--k-text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>Jadi Mitra ZasaQu</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', margin: 0 }}>Bergabung & mulai hasilkan pendapatan</p>
        </div>
        <LOGO />
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg,#0C0C16,#1a1a2e)', borderRadius: 20, padding: '24px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -30, bottom: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(0,200,150,0.06)' }} />
          <div style={{ position: 'absolute', left: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(249,115,22,0.05)' }} />
          <p style={{ fontSize: 11, color: 'rgba(0,200,150,0.8)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>Program Mitra ZasaQu</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 10px', lineHeight: 1.3 }}>Penghasilan Lebih,{'\n'}Waktu Bebas</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 20px', lineHeight: 1.6 }}>Bergabunglah dengan ribuan mitra ZasaQu dan mulai hasilkan pendapatan tambahan dengan cara yang fleksibel.</p>
          <button onClick={() => navigate('/register')}
            style={{ padding: '13px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#00C896,#00A87D)', color: '#0C0C16', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
            Daftar Jadi Mitra →
          </button>
        </div>

        {/* Benefits */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Keuntungan Bergabung</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {BENEFITS.map(b => (
              <div key={b.title} style={{ background: 'var(--k-card)', borderRadius: 16, padding: '16px 14px', border: '1px solid var(--k-border)' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{b.icon}</div>
                <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', margin: '0 0 4px' }}>{b.title}</p>
                <p style={{ fontSize: 11, color: 'var(--k-muted)', margin: 0, lineHeight: 1.5 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mitra types */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Jenis Mitra</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MITRA_TYPES.map(m => (
              <div key={m.name} style={{ background: 'var(--k-card)', borderRadius: 16, border: '1px solid var(--k-border)', overflow: 'hidden' }}>
                <div style={{ padding: '16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `${m.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{m.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)', margin: '0 0 4px' }}>{m.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>{m.desc}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {m.reqs.map(r => (
                        <div key={r} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ color: m.color, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
                          <span style={{ fontSize: 12, color: 'var(--k-text)' }}>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How to register */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Cara Mendaftar</p>
          <div style={{ background: 'var(--k-card)', borderRadius: 16, border: '1px solid var(--k-border)', padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {HOW_TO_REGISTER.map((item, i) => (
              <div key={item.step} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(0,200,150,0.12)', border: '2px solid rgba(0,200,150,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#00C896' }}>{item.step}</span>
                </div>
                <div style={{ flex: 1, paddingTop: 2 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', margin: '0 0 2px' }}>{item.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Syarat umum */}
        <div style={{ background: 'rgba(99,102,241,0.07)', borderRadius: 16, padding: '16px', border: '1px solid rgba(99,102,241,0.2)' }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#6366F1', margin: '0 0 10px' }}>📋 Syarat Umum Semua Mitra</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              'WNI, usia minimal 18 tahun',
              'Memiliki smartphone Android dengan GPS aktif',
              'KTP (Kartu Tanda Penduduk) yang masih berlaku',
              'Nomor HP aktif yang terdaftar di WhatsApp',
              'Bersedia mengikuti standar layanan ZasaQu',
            ].map(s => (
              <div key={s} style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: '#6366F1', fontSize: 13, flexShrink: 0 }}>›</span>
                <span style={{ fontSize: 13, color: 'var(--k-text)', lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => navigate('/register')}
            style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#00C896,#00A87D)', color: '#0C0C16', fontWeight: 900, fontSize: 16, cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,200,150,0.25)' }}>
            Daftar Jadi Mitra Sekarang
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/cara-kerja')}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              📖 Cara Kerja
            </button>
            <button onClick={() => navigate('/contact')}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              💬 Tanya CS
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--k-muted)', margin: 0 }}>
          Pertanyaan? Hubungi <a href="mailto:support@zasaqu.uk" style={{ color: '#00C896', fontWeight: 700, textDecoration: 'none' }}>support@zasaqu.uk</a>
        </p>
      </div>
    </div>
  )
}
