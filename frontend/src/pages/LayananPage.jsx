import { useNavigate } from 'react-router-dom'

const LOGO = () => (
  <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg,#00C896,#00A87D)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(0,200,150,0.3)', flexShrink: 0 }}>
    <span style={{ fontSize: 24, fontWeight: 900, color: '#0C0C16' }}>Z</span>
  </div>
)

const SERVICES = [
  {
    key: 'zasago',
    emoji: '🛵',
    name: 'ZasaGo',
    tagline: 'Ojek & Pengiriman Ekspres',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.08)',
    description: 'Layanan ojek dan kurir cepat untuk kebutuhan sehari-hari. Pesan kapan saja, mitra terdekat siap melayani dalam hitungan menit.',
    features: [
      'Antar jemput penumpang',
      'Pengiriman dokumen & paket',
      'Jastip (jasa titip) belanja',
      'Pembayaran COD atau ZasaWallet',
      'Tracking real-time di peta',
    ],
    howto: [
      'Masukkan titik jemput & tujuan',
      'Konfirmasi order & tunggu mitra',
      'Lacak posisi mitra di peta',
      'Terima pesanan & beri rating',
    ],
  },
  {
    key: 'zasafood',
    emoji: '🍔',
    name: 'ZasaFood',
    tagline: 'Pesan Makanan dari Merchant Lokal',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.08)',
    description: 'Temukan berbagai pilihan makanan dari warung dan restoran lokal di sekitar Anda. Pesan dan nikmati tanpa perlu keluar rumah.',
    features: [
      'Ratusan menu dari merchant lokal',
      'Pengiriman oleh mitra terverifikasi',
      'Estimasi waktu & tracking pengiriman',
      'Pembayaran COD & ZasaWallet',
      'Fitur Jastip untuk belanja titip',
    ],
    howto: [
      'Pilih merchant & tambah ke keranjang',
      'Masukkan alamat pengiriman',
      'Pilih metode pembayaran',
      'Lacak pengiriman secara real-time',
    ],
  },
  {
    key: 'zasamart',
    emoji: '🛒',
    name: 'ZasaMart',
    tagline: 'Belanja Produk Lokal',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.08)',
    description: 'Belanja produk kebutuhan dari pedagang lokal di sekitar Anda. Dukung UMKM lokal sambil mendapat produk segar dan terpercaya.',
    features: [
      'Produk dari pedagang lokal terverifikasi',
      'Kategori lengkap: makanan, sembako, dll',
      'Pengiriman cepat ke alamat Anda',
      'Harga transparan tanpa biaya tersembunyi',
      'Chat langsung dengan penjual',
    ],
    howto: [
      'Browse produk atau cari berdasarkan kategori',
      'Tambah produk ke keranjang',
      'Tentukan alamat & checkout',
      'Mitra antar pesanan ke lokasi Anda',
    ],
  },
  {
    key: 'zasahome',
    emoji: '🏠',
    name: 'ZasaHome',
    tagline: 'Jasa Layanan Rumah',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.08)',
    description: 'Dapatkan tenaga ahli untuk berbagai kebutuhan rumah Anda. Dari kebersihan hingga perbaikan, semua bisa dipesan lewat ZasaQu.',
    features: [
      'Layanan laundry kiloan & ekspres',
      'Jasa pijat & relaksasi',
      'Cleaning service rumah & kantor',
      'Tukang & reparasi peralatan rumah',
      'Layanan lainnya (on-demand)',
    ],
    howto: [
      'Pilih kategori jasa yang dibutuhkan',
      'Pilih penyedia jasa & jadwal',
      'Konfirmasi lokasi & pembayaran',
      'Penyedia jasa datang ke lokasi Anda',
    ],
  },
  {
    key: 'zasaride',
    emoji: '🚗',
    name: 'ZasaRide',
    tagline: 'Transportasi Online Terdekat',
    color: '#059669',
    bg: 'rgba(5,150,105,0.08)',
    description: 'Pesan ojek atau taksi online dengan cepat dan aman. Mitra driver terverifikasi siap mengantar Anda ke tujuan dengan nyaman.',
    features: [
      'Pesan motor atau mobil sesuai kebutuhan',
      'Tarif transparan sebelum pesan',
      'Driver terverifikasi & berpengalaman',
      'Tracking perjalanan real-time',
      'Pembayaran COD atau ZasaWallet',
    ],
    howto: [
      'Masukkan lokasi penjemputan & tujuan',
      'Pilih jenis kendaraan (motor/mobil)',
      'Konfirmasi tarif & pesan driver',
      'Driver menjemput & antar ke tujuan',
    ],
  },
  {
    key: 'zasaserv',
    emoji: '🔧',
    name: 'ZasaServis',
    tagline: 'Servis & Perbaikan Profesional',
    color: '#0EA5E9',
    bg: 'rgba(14,165,233,0.08)',
    description: 'Temukan teknisi profesional untuk kebutuhan servis dan perbaikan. Dari elektronik hingga kendaraan, semua tersedia di ZasaQu.',
    features: [
      'Teknisi berpengalaman & terverifikasi',
      'Servis elektronik & peralatan rumah',
      'Perbaikan kendaraan bermotor',
      'Estimasi biaya sebelum pengerjaan',
      'Garansi pekerjaan dari teknisi',
    ],
    howto: [
      'Pilih kategori servis yang dibutuhkan',
      'Deskripsikan masalah & unggah foto',
      'Pilih teknisi & jadwal kunjungan',
      'Teknisi datang & selesaikan pekerjaan',
    ],
  },
]

export default function LayananPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--k-input)', border: '1px solid var(--k-border)', color: 'var(--k-text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>Layanan Kami</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', margin: 0 }}>6 layanan untuk kebutuhan sehari-hari</p>
        </div>
        <LOGO />
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Intro */}
        <div style={{ background: 'linear-gradient(135deg,#0C0C16,#1a1a2e)', borderRadius: 20, padding: '22px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -30, bottom: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(0,200,150,0.06)' }} />
          <p style={{ fontSize: 11, color: 'rgba(0,200,150,0.8)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>ZasaQu Ecosystem</p>
          <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: '0 0 8px', lineHeight: 1.3 }}>Satu Aplikasi,{'\n'}Semua Kebutuhan</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>ZasaQu menghadirkan 6 layanan terintegrasi untuk memudahkan kehidupan sehari-hari Anda.</p>
        </div>

        {/* Service cards */}
        {SERVICES.map(s => (
          <div key={s.key} style={{ background: 'var(--k-card)', borderRadius: 20, border: '1px solid var(--k-border)', overflow: 'hidden' }}>
            {/* Service header */}
            <div style={{ background: s.bg, padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--k-border)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{s.emoji}</div>
              <div>
                <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--k-text)', margin: 0 }}>{s.name}</p>
                <p style={{ fontSize: 12, color: s.color, fontWeight: 700, margin: '2px 0 0' }}>{s.tagline}</p>
              </div>
            </div>

            <div style={{ padding: '18px' }}>
              {/* Description */}
              <p style={{ fontSize: 13, color: 'var(--k-muted)', margin: '0 0 16px', lineHeight: 1.7 }}>{s.description}</p>

              {/* Features */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>Fitur Unggulan</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
                {s.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ color: s.color, fontSize: 14, marginTop: 1, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 13, color: 'var(--k-text)', lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* How to */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>Cara Memesan</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {s.howto.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 8, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>{i + 1}</span>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--k-text)', lineHeight: 1.6, paddingTop: 2 }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* CTA */}
        <div style={{ background: 'var(--k-card)', borderRadius: 16, padding: '20px', border: '1px solid var(--k-border)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>Siap Mencoba?</p>
          <p style={{ fontSize: 13, color: 'var(--k-muted)', margin: 0, lineHeight: 1.6 }}>Unduh aplikasi ZasaQu atau akses melalui browser dan mulai menikmati semua layanan kami.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/register')}
              style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#00C896,#00A87D)', color: '#0C0C16', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              Daftar Sekarang
            </button>
            <button onClick={() => navigate('/cara-kerja')}
              style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Cara Kerja
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
