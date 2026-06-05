import { useNavigate } from 'react-router-dom'

const LAST_UPDATED = '1 Juni 2025'

const SECTIONS = [
  {
    title: '1. Penerimaan Syarat',
    body: `Dengan menggunakan aplikasi ZasaQu, Anda menyatakan telah membaca, memahami, dan menyetujui Syarat dan Ketentuan ini. Jika Anda tidak menyetujui syarat ini, harap hentikan penggunaan aplikasi.`,
  },
  {
    title: '2. Layanan ZasaQu',
    body: `ZasaQu menyediakan platform yang menghubungkan pengguna (customer) dengan mitra ojek/kurir, merchant makanan, pedagang lokal, dan penyedia jasa rumah. ZasaQu bertindak sebagai perantara teknologi, bukan sebagai penyedia layanan langsung.`,
  },
  {
    title: '3. Akun Pengguna',
    body: `Anda wajib mendaftarkan akun dengan data yang benar dan akurat. Anda bertanggung jawab penuh atas keamanan kata sandi dan seluruh aktivitas yang terjadi di akun Anda. ZasaQu berhak menangguhkan atau menghapus akun yang melanggar ketentuan ini.`,
  },
  {
    title: '4. Dompet & Transaksi',
    body: `Saldo ZasaQu (ZasaWallet) adalah saldo virtual yang dapat digunakan untuk pembayaran dalam platform. Top up dilakukan melalui metode yang tersedia (transfer bank, virtual account, QRIS). Saldo tidak dapat ditarik tunai kecuali untuk mitra yang memenuhi syarat penarikan. Setiap transaksi yang telah selesai bersifat final.`,
  },
  {
    title: '5. Mitra Ojek & Kurir',
    body: `Mitra adalah individu independen yang bergabung sebagai pengemudi/kurir. ZasaQu tidak mempekerjakan mitra secara langsung. Mitra wajib menjaga kualitas layanan, keselamatan, dan etika dalam setiap pengantaran. Pelanggaran dapat menyebabkan penangguhan akun.`,
  },
  {
    title: '6. Merchant & Pedagang',
    body: `Merchant dan pedagang yang bergabung wajib menjamin kualitas, kehigienisan, dan kebenaran informasi produk yang dijual. ZasaQu berhak menangguhkan toko yang mendapatkan keluhan berulang atau terbukti melanggar ketentuan.`,
  },
  {
    title: '7. Pembatalan & Pengembalian Dana',
    body: `Pembatalan order dapat dilakukan sesuai dengan kebijakan masing-masing layanan. Pengembalian dana (refund) dilakukan ke ZasaWallet dalam batas waktu yang ditentukan. ZasaQu berhak menolak pengembalian dana jika terbukti adanya penyalahgunaan.`,
  },
  {
    title: '8. Larangan Penggunaan',
    body: `Pengguna dilarang: (a) menggunakan aplikasi untuk aktivitas ilegal; (b) melakukan penipuan atau pemalsuan identitas; (c) menyalahgunakan sistem promo/diskon; (d) mengganggu atau merusak sistem platform; (e) menggunakan bot atau alat otomatis tanpa izin tertulis.`,
  },
  {
    title: '9. Batasan Tanggung Jawab',
    body: `ZasaQu tidak bertanggung jawab atas kerugian yang timbul akibat: keterlambatan pengiriman karena kondisi di luar kendali mitra, kerusakan barang yang tidak dilaporkan saat pickup, gangguan layanan akibat force majeure, atau kesalahan data yang diberikan pengguna.`,
  },
  {
    title: '10. Perubahan Ketentuan',
    body: `ZasaQu berhak mengubah Syarat dan Ketentuan ini sewaktu-waktu. Perubahan akan diberitahukan melalui notifikasi aplikasi atau email. Penggunaan aplikasi yang berkelanjutan setelah perubahan berarti Anda menyetujui ketentuan yang diperbarui.`,
  },
  {
    title: '11. Hukum yang Berlaku',
    body: `Syarat dan Ketentuan ini diatur oleh hukum yang berlaku di Republik Indonesia. Setiap sengketa yang timbul akan diselesaikan melalui mediasi atau pengadilan yang berwenang di Indonesia.`,
  },
]

export default function TosPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--k-input)', border: '1px solid var(--k-border)', color: 'var(--k-text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>Syarat & Ketentuan</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', margin: 0 }}>Terakhir diperbarui: {LAST_UPDATED}</p>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Intro */}
        <div style={{ background: 'rgba(0,200,150,0.06)', borderRadius: 14, padding: '16px', border: '1px solid rgba(0,200,150,0.2)', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--k-text)', margin: 0, lineHeight: 1.7 }}>
            Dokumen ini mengatur penggunaan platform <strong>ZasaQu</strong> oleh seluruh pengguna termasuk customer, mitra, merchant, pedagang, dan penyedia jasa.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SECTIONS.map(s => (
            <div key={s.title} style={{ background: 'var(--k-card)', borderRadius: 14, padding: '16px', border: '1px solid var(--k-border)' }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)', margin: '0 0 8px' }}>{s.title}</p>
              <p style={{ fontSize: 13, color: 'var(--k-sub, var(--k-muted))', margin: 0, lineHeight: 1.7 }}>{s.body}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, padding: '16px', background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: 0 }}>Pertanyaan? Hubungi kami di <strong style={{ color: 'var(--k-accent, #00C896)' }}>support@zasaqu.uk</strong></p>
        </div>
      </div>
    </div>
  )
}
