import { useNavigate } from 'react-router-dom'

const LAST_UPDATED = '12 Juni 2026'

const SECTIONS = [
  {
    title: '1. Data yang Kami Kumpulkan',
    body: `ZasaQu mengumpulkan data berikut saat Anda menggunakan layanan kami:\n• Data Identitas: nama lengkap, nomor telepon, alamat email\n• Data Lokasi: koordinat GPS real-time (hanya saat layanan aktif digunakan)\n• Data Transaksi: riwayat pesanan, top up, penarikan saldo\n• Data Perangkat: model HP, sistem operasi, token FCM untuk notifikasi push\n• Foto & Dokumen: foto profil, foto bukti pengiriman, dokumen verifikasi mitra\n• Data Interaksi: chat antara customer dan mitra (disimpan untuk penyelesaian sengketa)`,
  },
  {
    title: '2. Bagaimana Kami Menggunakan Data',
    body: `Data yang dikumpulkan digunakan untuk:\n• Memproses, memantau, dan menyelesaikan pesanan Anda\n• Menghubungkan Anda dengan mitra, merchant, dan penyedia jasa terdekat\n• Mengirimkan notifikasi terkait pesanan, promo, dan pembaruan layanan\n• Meningkatkan keamanan akun dan mencegah penipuan\n• Menyusun laporan statistik platform (dalam bentuk agregat, tidak personal)\n• Menyelesaikan sengketa dan keluhan pengguna\n• Memenuhi kewajiban hukum yang berlaku di Indonesia`,
  },
  {
    title: '3. Berbagi Data dengan Pihak Ketiga',
    body: `ZasaQu TIDAK menjual data pribadi Anda kepada pihak ketiga manapun untuk tujuan komersial.\n\nData dibagikan hanya dalam kondisi berikut:\n• Mitra ojek/kurir: nama dan nomor telepon customer untuk keperluan pengantaran\n• Merchant/pedagang: nama dan alamat pengiriman untuk pemenuhan pesanan\n• Penyedia pembayaran (iPaymu): data transaksi untuk pemrosesan pembayaran\n• Firebase (Google): token FCM untuk pengiriman notifikasi push\n• Pihak berwenang: jika diwajibkan oleh hukum atau putusan pengadilan yang sah`,
  },
  {
    title: '4. Data Lokasi (GPS)',
    body: `Kami mengakses lokasi GPS Anda hanya saat layanan aktif digunakan:\n• Customer: saat membuat pesanan untuk menentukan titik jemput/antar\n• Mitra: real-time saat menerima dan menjalankan pesanan (dikirim setiap beberapa detik)\n\nData GPS real-time mitra tidak disimpan secara permanen setelah pesanan selesai. Riwayat rute pesanan disimpan untuk keperluan audit maksimal 90 hari.\n\nAnda dapat menonaktifkan akses lokasi melalui pengaturan perangkat, namun ini akan membatasi fungsi layanan secara signifikan.`,
  },
  {
    title: '5. Keamanan Data',
    body: `ZasaQu menerapkan langkah-langkah keamanan teknis dan organisasi:\n• Enkripsi data transmisi menggunakan HTTPS/TLS\n• Token autentikasi berbasis Laravel Sanctum (bukan cookie)\n• Akses database dibatasi dengan kredensial terpisah per lingkungan\n• Audit log untuk setiap tindakan administratif\n• Backup database harian dengan enkripsi\n\nMeskipun kami berupaya maksimal, tidak ada sistem yang 100% aman dari ancaman siber. Harap jaga kerahasiaan kata sandi dan tidak bagikan OTP kepada siapapun.`,
  },
  {
    title: '6. Penyimpanan & Retensi Data',
    body: `• Data akun aktif: disimpan selama akun masih aktif digunakan\n• Setelah akun dihapus: data personal dihapus dalam 90 hari\n• Data transaksi keuangan: disimpan 5 tahun sesuai ketentuan perpajakan Indonesia\n• Log GPS mitra: maksimal 90 hari\n• Data chat pesanan: maksimal 1 tahun atau sampai sengketa selesai\n• Foto bukti pengiriman: maksimal 6 bulan`,
  },
  {
    title: '7. Hak Anda atas Data',
    body: `Sebagai pengguna, Anda berhak untuk:\n• Mengakses data pribadi yang kami miliki tentang Anda\n• Meminta koreksi data yang tidak akurat atau tidak lengkap\n• Meminta penghapusan data (right to be forgotten) — dikecualikan data yang wajib disimpan secara hukum\n• Menolak pemrosesan data untuk tujuan pemasaran\n• Meminta portabilitas data dalam format yang dapat dibaca mesin\n• Mengajukan keluhan kepada otoritas perlindungan data\n\nUntuk menggunakan hak-hak ini, hubungi kami di support@zasaqu.uk dengan subjek "Data Privacy Request".`,
  },
  {
    title: '8. Cookie & Teknologi Pelacak',
    body: `• Aplikasi mobile ZasaQu tidak menggunakan cookie pihak ketiga\n• Versi web menggunakan cookie sesi esensial untuk autentikasi (bukan untuk iklan)\n• Kami tidak menggunakan Google Analytics, Facebook Pixel, atau alat pelacak iklan lainnya\n• Token FCM (Firebase) digunakan semata-mata untuk notifikasi push yang relevan`,
  },
  {
    title: '9. Data Anak-anak',
    body: `ZasaQu tidak ditujukan untuk pengguna di bawah usia 17 tahun. Kami tidak secara sengaja mengumpulkan data pribadi dari anak-anak. Jika Anda mengetahui bahwa anak di bawah umur telah mendaftar, hubungi kami segera untuk penghapusan akun.`,
  },
  {
    title: '10. Perubahan Kebijakan',
    body: `Kami dapat memperbarui Kebijakan Privasi ini sesuai perkembangan layanan atau peraturan. Perubahan material akan diberitahukan melalui notifikasi in-app minimal 7 hari sebelum berlaku. Penggunaan layanan setelah tanggal berlaku berarti Anda menerima perubahan tersebut.`,
  },
  {
    title: '11. Kontak & Pertanyaan Privasi',
    body: `Jika Anda memiliki pertanyaan, kekhawatiran, atau permintaan terkait data pribadi:\n• Email: support@zasaqu.uk\n• Subjek email: "Data Privacy Request"\n• Website: zasaqu.uk\n\nKami akan merespons dalam waktu 3 hari kerja.`,
  },
]

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--k-input)', border: '1px solid var(--k-border)', color: 'var(--k-text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>Kebijakan Privasi</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', margin: 0 }}>Terakhir diperbarui: {LAST_UPDATED}</p>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Intro */}
        <div style={{ background: 'rgba(99,102,241,0.06)', borderRadius: 14, padding: '16px', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--k-text)', margin: 0, lineHeight: 1.7 }}>
            <strong>ZasaQu</strong> berkomitmen melindungi privasi Anda. Dokumen ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Anda sesuai peraturan yang berlaku di Indonesia.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SECTIONS.map(s => (
            <div key={s.title} style={{ background: 'var(--k-card)', borderRadius: 14, padding: '16px', border: '1px solid var(--k-border)' }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)', margin: '0 0 8px' }}>{s.title}</p>
              <p style={{ fontSize: 13, color: 'var(--k-muted)', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{s.body}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '16px', background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: 0 }}>
              Pertanyaan privasi? Hubungi <a href="mailto:support@zasaqu.uk" style={{ color: '#6366F1', fontWeight: 700, textDecoration: 'none' }}>support@zasaqu.uk</a>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/tos')}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              📋 Syarat & Ketentuan
            </button>
            <button onClick={() => navigate('/contact')}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              📞 Hubungi Kami
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
