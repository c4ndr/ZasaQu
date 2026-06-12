import { useNavigate } from 'react-router-dom'

const LAST_UPDATED = '12 Juni 2026'

const SECTIONS = [
  {
    title: '1. Penerimaan Syarat',
    body: `Dengan menggunakan aplikasi ZasaQu, Anda menyatakan telah membaca, memahami, dan menyetujui Syarat dan Ketentuan ini. Jika Anda tidak menyetujui syarat ini, harap hentikan penggunaan aplikasi.`,
  },
  {
    title: '2. Deskripsi Layanan ZasaQu',
    body: `ZasaQu adalah platform digital yang menghubungkan pengguna (customer) dengan:\n• Mitra ojek/kurir (ZasaGo) — antar jemput dan pengiriman ekspres\n• Merchant makanan (ZasaFood) — pesan makanan dari warung/restoran lokal\n• Pedagang lokal (ZasaMart) — belanja produk kebutuhan sehari-hari\n• Penyedia jasa rumah (ZasaHome) — laundry, pijat, cleaning, tukang, dll\n\nZasaQu bertindak sebagai perantara teknologi, bukan sebagai penyedia layanan secara langsung.`,
  },
  {
    title: '3. Akun Pengguna',
    body: `Anda wajib mendaftarkan akun dengan data yang benar, lengkap, dan akurat. Anda bertanggung jawab penuh atas keamanan kata sandi dan seluruh aktivitas yang terjadi di akun Anda.\n\nZasaQu berhak menangguhkan atau menghapus akun yang:\n• Memberikan informasi palsu atau menyesatkan\n• Melanggar syarat dan ketentuan ini\n• Terbukti melakukan penipuan atau penyalahgunaan`,
  },
  {
    title: '4. ZasaWallet & Transaksi',
    body: `ZasaWallet adalah saldo virtual dalam platform ZasaQu. Ketentuan:\n• Top up dilakukan melalui transfer bank, virtual account, atau QRIS\n• Saldo tidak dapat ditarik tunai oleh customer (kecuali mitra yang memenuhi syarat)\n• Setiap transaksi yang telah selesai dan dikonfirmasi bersifat final\n• ZasaQu berhak menunda transaksi yang terindikasi penipuan\n• Saldo tidak berbunga dan tidak memiliki masa kedaluwarsa`,
  },
  {
    title: '5. Mitra Ojek & Kurir',
    body: `Mitra adalah individu independen yang bergabung secara sukarela. ZasaQu tidak mempekerjakan mitra secara langsung (bukan hubungan kerja formal).\n\nKewajiban mitra:\n• Menjaga kualitas, keramahan, dan keselamatan dalam setiap pengantaran\n• Menyelesaikan order yang sudah diterima kecuali ada kondisi darurat\n• Tidak membocorkan data pribadi customer\n• Menjaga saldo minimum ZasaWallet sesuai ketentuan\n\nMitra yang melanggar dapat dikenakan penangguhan atau pemutusan akun.`,
  },
  {
    title: '6. Merchant & Pedagang',
    body: `Merchant dan pedagang yang bergabung dengan ZasaQu wajib:\n• Menjamin kualitas, kehigienisan, dan keaslian produk/makanan\n• Memastikan kebenaran informasi harga, foto, dan deskripsi produk\n• Memproses pesanan dalam batas waktu yang wajar\n• Tidak menjual produk ilegal, berbahaya, atau melanggar hukum\n\nZasaQu berhak menangguhkan toko yang mendapatkan keluhan berulang atau terbukti melanggar ketentuan ini.`,
  },
  {
    title: '7. Pembatalan & Pengembalian Dana (Refund)',
    body: `Pembatalan dan refund berlaku sesuai kebijakan masing-masing layanan:\n\n• ZasaGo: bisa dibatalkan sebelum mitra menerima order (refund penuh). Setelah mitra accept, berlaku biaya pembatalan.\n• ZasaFood: bisa dibatalkan sebelum merchant konfirmasi. Setelah merchant mulai memproses, pesanan tidak bisa dibatalkan.\n• ZasaMart: bisa dibatalkan sebelum penjual konfirmasi. Otomatis dibatalkan jika stok habis (refund penuh).\n• ZasaHome: bisa dibatalkan gratis jika > 2 jam sebelum jadwal. Pembatalan < 2 jam dikenakan biaya 25%.\n\nRefund diproses ke ZasaWallet dalam maksimal 3 hari kerja. Detail lengkap tersedia di halaman Kebijakan Refund.`,
  },
  {
    title: '8. Penyelesaian Sengketa',
    body: `Jika terjadi perselisihan antara pengguna:\n\n1. Laporkan melalui fitur "Laporkan Masalah" di aplikasi atau email support@zasaqu.uk dalam 24 jam setelah order selesai\n2. ZasaQu akan melakukan mediasi dengan menghubungi kedua pihak dalam 2 hari kerja\n3. Keputusan ZasaQu bersifat final dan mengikat\n4. Jika tidak tercapai kesepakatan, sengketa dapat diselesaikan melalui jalur hukum di Indonesia\n\nZasaQu tidak bertanggung jawab atas sengketa yang timbul dari kesepakatan di luar platform.`,
  },
  {
    title: '9. Larangan Penggunaan',
    body: `Pengguna dilarang:\n• Menggunakan aplikasi untuk aktivitas ilegal atau melanggar hukum\n• Melakukan penipuan, pemalsuan identitas, atau manipulasi data\n• Menyalahgunakan sistem promo, diskon, atau referral\n• Mengganggu atau merusak sistem dan infrastruktur platform\n• Menggunakan bot, scraper, atau alat otomatis tanpa izin tertulis\n• Mengirimkan konten yang bersifat SARA, pornografi, atau menyinggung\n\nPelanggaran dapat mengakibatkan pemblokiran permanen tanpa pemberitahuan.`,
  },
  {
    title: '10. Batasan Tanggung Jawab',
    body: `ZasaQu tidak bertanggung jawab atas kerugian yang timbul akibat:\n• Keterlambatan karena kondisi lalu lintas, cuaca, atau force majeure\n• Kerusakan barang yang tidak dilaporkan saat pickup oleh mitra\n• Gangguan layanan akibat pemeliharaan sistem atau gangguan internet\n• Kesalahan data yang diberikan oleh pengguna\n• Keputusan mitra/merchant yang di luar kontrol ZasaQu\n\nTanggung jawab ZasaQu terbatas pada nilai transaksi yang bersangkutan.`,
  },
  {
    title: '11. Perubahan Ketentuan',
    body: `ZasaQu berhak mengubah Syarat dan Ketentuan ini sewaktu-waktu. Perubahan material akan diberitahukan melalui notifikasi aplikasi atau email minimal 7 hari sebelum berlaku. Penggunaan aplikasi yang berkelanjutan setelah perubahan berlaku berarti Anda menyetujui ketentuan yang diperbarui.`,
  },
  {
    title: '12. Hukum yang Berlaku',
    body: `Syarat dan Ketentuan ini diatur oleh hukum yang berlaku di Republik Indonesia. Setiap sengketa yang tidak dapat diselesaikan secara mediasi akan diselesaikan melalui pengadilan yang berwenang di Indonesia, dengan mempertimbangkan domisili para pihak.`,
  },
]

export default function TosPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--k-input)', border: '1px solid var(--k-border)', color: 'var(--k-text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>Syarat & Ketentuan</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', margin: 0 }}>Terakhir diperbarui: {LAST_UPDATED}</p>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Intro */}
        <div style={{ background: 'rgba(0,200,150,0.06)', borderRadius: 14, padding: '16px', border: '1px solid rgba(0,200,150,0.2)', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--k-text)', margin: 0, lineHeight: 1.7 }}>
            Dokumen ini mengatur penggunaan platform <strong>ZasaQu</strong> oleh seluruh pengguna termasuk customer, mitra, merchant, pedagang, dan penyedia jasa rumah.
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
            <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: '0 0 10px' }}>Pertanyaan? Hubungi kami di <a href="mailto:support@zasaqu.uk" style={{ color: '#00C896', fontWeight: 700, textDecoration: 'none' }}>support@zasaqu.uk</a></p>
            <button onClick={() => navigate('/refund')}
              style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              💸 Lihat Kebijakan Refund Lengkap
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/privacy')}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              🔒 Kebijakan Privasi
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
