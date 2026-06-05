import { useNavigate } from 'react-router-dom'

const LAST_UPDATED = '1 Juni 2025'

const SECTIONS = [
  {
    title: '1. Data yang Kami Kumpulkan',
    body: `ZasaQu mengumpulkan data berikut saat Anda menggunakan layanan kami:\n• Data Identitas: nama lengkap, nomor telepon, alamat email\n• Data Lokasi: koordinat GPS real-time (hanya saat menggunakan layanan aktif)\n• Data Transaksi: riwayat pesanan, top up, penarikan saldo\n• Data Perangkat: model HP, sistem operasi, token FCM untuk notifikasi\n• Foto & Dokumen: foto profil, foto bukti pengiriman, dokumen verifikasi mitra`,
  },
  {
    title: '2. Bagaimana Kami Menggunakan Data',
    body: `Data yang dikumpulkan digunakan untuk:\n• Memproses dan memantau pesanan Anda\n• Menghubungkan Anda dengan mitra, merchant, dan penyedia jasa terdekat\n• Mengirimkan notifikasi terkait pesanan dan promo\n• Meningkatkan keamanan akun dan mencegah penipuan\n• Menyusun laporan statistik platform (dalam bentuk agregat, tidak personal)\n• Memenuhi kewajiban hukum yang berlaku`,
  },
  {
    title: '3. Berbagi Data dengan Pihak Ketiga',
    body: `ZasaQu TIDAK menjual data pribadi Anda kepada pihak ketiga. Data dibagikan hanya kepada:\n• Mitra ojek/kurir: nama dan nomor telepon customer untuk keperluan pengantaran\n• Merchant/pedagang: nama dan alamat pengiriman untuk pemenuhan pesanan\n• Penyedia pembayaran (Midtrans, iPaymu): data transaksi untuk pemrosesan\n• Pihak berwenang: jika diwajibkan oleh hukum atau putusan pengadilan`,
  },
  {
    title: '4. Data Lokasi (GPS)',
    body: `Kami mengakses lokasi GPS Anda hanya saat layanan aktif digunakan:\n• Customer: saat membuat pesanan untuk menentukan titik jemput/antar\n• Mitra: real-time saat menerima dan menjalankan pesanan\nData GPS tidak disimpan secara permanen setelah pesanan selesai. Anda dapat menonaktifkan akses lokasi melalui pengaturan perangkat, namun ini akan membatasi fungsi layanan.`,
  },
  {
    title: '5. Keamanan Data',
    body: `ZasaQu menerapkan langkah-langkah keamanan teknis dan organisasi untuk melindungi data Anda:\n• Enkripsi data transmisi menggunakan HTTPS/TLS\n• Token autentikasi aman (Laravel Sanctum)\n• Akses data dibatasi hanya untuk personel yang berwenang\n• Audit log untuk setiap tindakan administratif\nMeski kami berupaya maksimal, tidak ada sistem yang 100% aman. Harap jaga kerahasiaan kata sandi akun Anda.`,
  },
  {
    title: '6. Penyimpanan & Retensi Data',
    body: `Data akun aktif disimpan selama akun masih aktif digunakan. Setelah akun dihapus atau ditutup, data akan dihapus dalam waktu 90 hari, kecuali data yang wajib disimpan berdasarkan peraturan perpajakan atau hukum lainnya (max 5 tahun untuk data transaksi keuangan).`,
  },
  {
    title: '7. Hak Anda atas Data',
    body: `Sebagai pengguna, Anda berhak untuk:\n• Mengakses data pribadi yang kami miliki tentang Anda\n• Meminta koreksi data yang tidak akurat\n• Meminta penghapusan data (right to be forgotten)\n• Menolak pemrosesan data untuk tujuan pemasaran\n• Mengajukan keluhan kepada otoritas perlindungan data\nUntuk menggunakan hak-hak ini, hubungi kami di support@zasaqu.uk`,
  },
  {
    title: '8. Cookie & Teknologi Pelacak',
    body: `Aplikasi mobile ZasaQu tidak menggunakan cookie. Versi web menggunakan cookie sesi untuk autentikasi yang bersifat esensial. Kami tidak menggunakan cookie iklan atau pelacak pihak ketiga untuk profiling.`,
  },
  {
    title: '9. Perubahan Kebijakan',
    body: `Kami dapat memperbarui Kebijakan Privasi ini sesuai perkembangan layanan atau peraturan. Perubahan material akan diberitahukan melalui notifikasi in-app minimal 7 hari sebelum berlaku. Penggunaan layanan setelah tanggal berlaku berarti Anda menerima perubahan tersebut.`,
  },
  {
    title: '10. Kontak & Pertanyaan',
    body: `Jika Anda memiliki pertanyaan, kekhawatiran, atau permintaan terkait data pribadi Anda, hubungi tim ZasaQu:\n• Email: support@zasaqu.uk\n• Website: zasaqu.uk\nKami akan merespons dalam waktu 3 hari kerja.`,
  },
]

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--k-input)', border: '1px solid var(--k-border)', color: 'var(--k-text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>Kebijakan Privasi</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', margin: 0 }}>Terakhir diperbarui: {LAST_UPDATED}</p>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Intro */}
        <div style={{ background: 'rgba(99,102,241,0.06)', borderRadius: 14, padding: '16px', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--k-text)', margin: 0, lineHeight: 1.7 }}>
            <strong>ZasaQu</strong> berkomitmen melindungi privasi Anda. Dokumen ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Anda.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SECTIONS.map(s => (
            <div key={s.title} style={{ background: 'var(--k-card)', borderRadius: 14, padding: '16px', border: '1px solid var(--k-border)' }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)', margin: '0 0 8px' }}>{s.title}</p>
              <p style={{ fontSize: 13, color: 'var(--k-sub, var(--k-muted))', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{s.body}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, padding: '16px', background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: 0 }}>Pertanyaan privasi? Hubungi <strong style={{ color: '#6366F1' }}>support@zasaqu.uk</strong></p>
        </div>
      </div>
    </div>
  )
}
