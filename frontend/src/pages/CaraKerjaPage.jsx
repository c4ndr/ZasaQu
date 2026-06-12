import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const LOGO = () => (
  <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg,#00C896,#00A87D)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(0,200,150,0.3)', flexShrink: 0 }}>
    <span style={{ fontSize: 24, fontWeight: 900, color: '#0C0C16' }}>Z</span>
  </div>
)

const CUSTOMER_STEPS = [
  {
    num: '1',
    icon: '📱',
    title: 'Daftar & Masuk',
    desc: 'Buat akun dengan nomor HP atau email. Verifikasi OTP, lalu login ke aplikasi.',
    color: '#00C896',
  },
  {
    num: '2',
    icon: '🎯',
    title: 'Pilih Layanan',
    desc: 'Pilih ZasaGo, ZasaFood, ZasaMart, atau ZasaHome sesuai kebutuhan Anda hari ini.',
    color: '#F97316',
  },
  {
    num: '3',
    icon: '📋',
    title: 'Buat Pesanan',
    desc: 'Masukkan detail pesanan — alamat, produk, atau jasa yang dibutuhkan. Lihat estimasi harga sebelum konfirmasi.',
    color: '#6366F1',
  },
  {
    num: '4',
    icon: '💳',
    title: 'Pilih Pembayaran',
    desc: 'Bayar dengan ZasaWallet (saldo digital) atau tunai (COD) sesuai yang Anda prefer.',
    color: '#EF4444',
  },
  {
    num: '5',
    icon: '📍',
    title: 'Lacak Real-Time',
    desc: 'Pantau posisi mitra Anda di peta secara langsung. Chat dengan mitra jika ada pertanyaan.',
    color: '#10B981',
  },
  {
    num: '6',
    icon: '⭐',
    title: 'Terima & Nilai',
    desc: 'Terima pesanan dan beri penilaian untuk mitra. Rating Anda membantu menjaga kualitas layanan.',
    color: '#F59E0B',
  },
]

const MITRA_STEPS = [
  {
    num: '1',
    icon: '📝',
    title: 'Daftar sebagai Mitra',
    desc: 'Buat akun dan pilih jenis mitra: kurir/ojek (ZasaGo), antar makanan (ZasaFood), antar belanjaan (ZasaMart), atau jasa rumah (ZasaHome).',
    color: '#00C896',
  },
  {
    num: '2',
    icon: '🪪',
    title: 'Lengkapi Verifikasi',
    desc: 'Upload foto KTP, SIM (untuk ojek/kurir), dan foto kendaraan. Tim ZasaQu akan memverifikasi dalam 1–3 hari kerja.',
    color: '#6366F1',
  },
  {
    num: '3',
    icon: '💰',
    title: 'Isi Saldo Mitra',
    desc: 'Pastikan saldo ZasaWallet Anda minimal Rp 5.000 sebagai jaminan. Saldo digunakan untuk komisi platform.',
    color: '#F97316',
  },
  {
    num: '4',
    icon: '📡',
    title: 'Aktifkan & Terima Order',
    desc: 'Aktifkan status online dari halaman GPS. Order masuk akan muncul sebagai notifikasi — terima sebelum kedaluwarsa.',
    color: '#EF4444',
  },
  {
    num: '5',
    icon: '🛵',
    title: 'Jalankan Pesanan',
    desc: 'Ikuti rute di peta navigasi bawaan ZasaQu. Foto bukti pengiriman diperlukan untuk menyelesaikan order.',
    color: '#10B981',
  },
  {
    num: '6',
    icon: '💵',
    title: 'Terima Pendapatan',
    desc: 'Pendapatan masuk ke ZasaWallet setelah order selesai. Tarik ke rekening bank kapan saja sesuai ketentuan penarikan.',
    color: '#F59E0B',
  },
]

const FAQS = [
  {
    q: 'Apakah ZasaQu tersedia 24 jam?',
    a: 'Ketersediaan layanan bergantung pada mitra yang online di area Anda. Tim support tersedia Senin–Minggu, 08.00–22.00 WIB.',
  },
  {
    q: 'Bagaimana jika pesanan tidak ada mitra?',
    a: 'Jika tidak ada mitra tersedia dalam waktu tertentu, pesanan akan otomatis dibatalkan dan saldo dikembalikan penuh ke ZasaWallet.',
  },
  {
    q: 'Apa itu ZasaWallet?',
    a: 'ZasaWallet adalah dompet digital dalam aplikasi ZasaQu. Isi saldo melalui transfer bank atau QRIS, dan gunakan untuk semua transaksi.',
  },
  {
    q: 'Berapa biaya bergabung sebagai mitra?',
    a: 'Bergabung sebagai mitra ZasaQu GRATIS. Anda hanya perlu memastikan saldo minimal Rp 5.000 di ZasaWallet sebagai jaminan operasional.',
  },
  {
    q: 'Apakah ada batas wilayah layanan?',
    a: 'ZasaQu beroperasi di area yang sudah terdaftar. Pastikan alamat Anda berada dalam jangkauan layanan yang ditampilkan di peta.',
  },
]

export default function CaraKerjaPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('customer')
  const [openFaq, setOpenFaq] = useState(null)

  const steps = tab === 'customer' ? CUSTOMER_STEPS : MITRA_STEPS

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--k-input)', border: '1px solid var(--k-border)', color: 'var(--k-text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>Cara Kerja ZasaQu</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', margin: 0 }}>Panduan lengkap untuk pelanggan & mitra</p>
        </div>
        <LOGO />
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Tab selector */}
        <div style={{ background: 'var(--k-card)', borderRadius: 14, padding: 4, border: '1px solid var(--k-border)', display: 'flex', gap: 4 }}>
          {[
            { key: 'customer', label: '👤 Saya Pelanggan' },
            { key: 'mitra',    label: '🛵 Saya Mitra' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '11px 8px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                background: tab === t.key ? 'linear-gradient(135deg,#00C896,#00A87D)' : 'transparent',
                color: tab === t.key ? '#0C0C16' : 'var(--k-muted)',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Intro banner */}
        <div style={{ background: 'linear-gradient(135deg,#0C0C16,#1a1a2e)', borderRadius: 18, padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(0,200,150,0.07)' }} />
          <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: '0 0 8px' }}>
            {tab === 'customer' ? '6 Langkah Mudah Memesan' : '6 Langkah Jadi Mitra'}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
            {tab === 'customer'
              ? 'Dari daftar hingga terima pesanan, prosesnya simpel dan cepat.'
              : 'Mulai hasilkan pendapatan bersama ZasaQu dalam beberapa langkah.'}
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {steps.map((step, i) => (
            <div key={step.num} style={{ display: 'flex', gap: 0 }}>
              {/* Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: `${step.color}18`, border: `2px solid ${step.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: step.color }}>{step.num}</span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: 'var(--k-border)', minHeight: 24 }} />
                )}
              </div>
              {/* Content */}
              <div style={{ flex: 1, paddingLeft: 12, paddingBottom: i < steps.length - 1 ? 20 : 0, paddingTop: 4 }}>
                <div style={{ background: 'var(--k-card)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--k-border)', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>{step.icon}</span>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>{step.title}</p>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--k-muted)', margin: 0, lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        {tab === 'mitra' && (
          <div style={{ background: 'rgba(249,115,22,0.07)', borderRadius: 16, padding: '16px', border: '1px solid rgba(249,115,22,0.2)' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#F97316', margin: '0 0 8px' }}>💡 Tips Mitra Sukses</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Aktif di jam sibuk (07–09 pagi, 11–13 siang, 17–20 sore)',
                'Jaga rating di atas 4.5 bintang untuk prioritas order',
                'Balas pesan customer dengan cepat dan sopan',
                'Pastikan HP terisi daya dan GPS aktif selama bertugas',
              ].map(t => (
                <div key={t} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#F97316', fontSize: 13, flexShrink: 0 }}>›</span>
                  <span style={{ fontSize: 13, color: 'var(--k-text)', lineHeight: 1.5 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'customer' && (
          <div style={{ background: 'rgba(0,200,150,0.07)', borderRadius: 16, padding: '16px', border: '1px solid rgba(0,200,150,0.2)' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#00C896', margin: '0 0 8px' }}>💡 Tips Belanja Nyaman</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Aktifkan GPS untuk akurasi lokasi yang lebih baik',
                'Isi ZasaWallet untuk transaksi lebih mudah & cepat',
                'Cek ulasan merchant/mitra sebelum memesan',
                'Simpan alamat favorit agar tidak perlu ketik ulang',
              ].map(t => (
                <div key={t} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#00C896', fontSize: 13, flexShrink: 0 }}>›</span>
                  <span style={{ fontSize: 13, color: 'var(--k-text)', lineHeight: 1.5 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Pertanyaan Umum</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', overflow: 'hidden' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', lineHeight: 1.4 }}>{faq.q}</span>
                  <span style={{ color: 'var(--k-muted)', fontSize: 16, flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--k-border)' }}>
                    <p style={{ fontSize: 13, color: 'var(--k-muted)', margin: '12px 0 0', lineHeight: 1.7 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/register')}
            style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#00C896,#00A87D)', color: '#0C0C16', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
            Mulai Sekarang
          </button>
          <button onClick={() => navigate('/contact')}
            style={{ flex: 1, padding: '14px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Butuh Bantuan?
          </button>
        </div>
      </div>
    </div>
  )
}
