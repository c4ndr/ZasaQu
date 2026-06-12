import { useNavigate } from 'react-router-dom'

const LAST_UPDATED = '12 Juni 2026'

const CANCELLATION = [
  {
    service: '🛵 ZasaGo (Ojek & Kurir)',
    color: '#F97316',
    policies: [
      { status: 'Sebelum mitra accept', action: 'Bisa dibatalkan bebas, saldo dikembalikan penuh' },
      { status: 'Setelah mitra accept', action: 'Bisa dibatalkan, namun dikenakan biaya pembatalan sesuai jarak tempuh mitra' },
      { status: 'Mitra sudah tiba di pickup', action: 'Pembatalan dikenakan biaya penuh ongkos minimum' },
    ],
  },
  {
    service: '🍔 ZasaFood (Pesan Makanan)',
    color: '#EF4444',
    policies: [
      { status: 'Merchant belum konfirmasi', action: 'Bisa dibatalkan, saldo dikembalikan penuh' },
      { status: 'Merchant sudah konfirmasi & masak', action: 'Tidak bisa dibatalkan — makanan sudah disiapkan' },
      { status: 'Pesanan dalam pengiriman', action: 'Tidak bisa dibatalkan' },
    ],
  },
  {
    service: '🛒 ZasaMart (Belanja Produk)',
    color: '#10B981',
    policies: [
      { status: 'Penjual belum konfirmasi', action: 'Bisa dibatalkan, saldo dikembalikan penuh' },
      { status: 'Penjual sudah konfirmasi', action: 'Tidak bisa dibatalkan kecuali produk tidak tersedia' },
      { status: 'Produk tidak tersedia', action: 'Otomatis dibatalkan, saldo dikembalikan penuh' },
    ],
  },
  {
    service: '🏠 ZasaHome (Jasa Rumah)',
    color: '#8B5CF6',
    policies: [
      { status: '> 2 jam sebelum jadwal', action: 'Bisa dibatalkan, saldo dikembalikan penuh' },
      { status: '< 2 jam sebelum jadwal', action: 'Dibatalkan dengan potongan 25% sebagai biaya cadangan' },
      { status: 'Penyedia jasa sudah tiba', action: 'Tidak bisa dibatalkan — dikenakan biaya penuh' },
    ],
  },
]

const REFUND_STEPS = [
  { num: '1', title: 'Hubungi CS ZasaQu', desc: 'Laporkan kendala melalui email support@zasaqu.uk atau WhatsApp resmi dengan menyertakan nomor order.' },
  { num: '2', title: 'Verifikasi Klaim', desc: 'Tim ZasaQu akan memverifikasi laporan dalam 1 x 24 jam kerja. Siapkan bukti pendukung jika diperlukan.' },
  { num: '3', title: 'Keputusan Refund', desc: 'Jika klaim disetujui, refund diproses ke ZasaWallet Anda dalam waktu maksimal 3 hari kerja.' },
  { num: '4', title: 'Saldo Dikembalikan', desc: 'Saldo ZasaWallet akan bertambah sesuai nominal yang disetujui. Cek halaman Wallet untuk konfirmasi.' },
]

const DISPUTE_STEPS = [
  { num: '1', title: 'Laporan Pertama', desc: 'Gunakan fitur "Laporkan Masalah" di halaman detail order, atau hubungi CS dalam 24 jam setelah order selesai.' },
  { num: '2', title: 'Mediasi Internal', desc: 'ZasaQu akan menghubungi kedua pihak (customer & mitra/merchant) untuk klarifikasi dalam 2 hari kerja.' },
  { num: '3', title: 'Keputusan ZasaQu', desc: 'Berdasarkan bukti yang ada, ZasaQu akan memberikan keputusan final yang mengikat kedua pihak.' },
  { num: '4', title: 'Eskalasi Hukum', desc: 'Jika tidak tercapai kesepakatan, sengketa dapat diselesaikan melalui jalur hukum di wilayah Indonesia sesuai peraturan berlaku.' },
]

export default function RefundPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--k-input)', border: '1px solid var(--k-border)', color: 'var(--k-text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>Refund & Penyelesaian Sengketa</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', margin: 0 }}>Diperbarui: {LAST_UPDATED}</p>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Intro */}
        <div style={{ background: 'rgba(0,200,150,0.06)', borderRadius: 14, padding: '16px', border: '1px solid rgba(0,200,150,0.2)' }}>
          <p style={{ fontSize: 13, color: 'var(--k-text)', margin: 0, lineHeight: 1.7 }}>
            ZasaQu berkomitmen memberikan pengalaman belanja dan pengiriman yang memuaskan. Dokumen ini menjelaskan kebijakan pembatalan, refund, dan mekanisme penyelesaian sengketa secara adil dan transparan.
          </p>
        </div>

        {/* Cancellation policies */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--k-text)', margin: '0 0 12px' }}>📋 Kebijakan Pembatalan per Layanan</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {CANCELLATION.map(c => (
              <div key={c.service} style={{ background: 'var(--k-card)', borderRadius: 16, border: '1px solid var(--k-border)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>{c.service}</p>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {c.policies.map(p => (
                    <div key={p.status} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 10, borderBottom: '1px solid var(--k-border)' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-text)', margin: 0 }}>{p.status}</p>
                      <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: 0, lineHeight: 1.5 }}>→ {p.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Refund conditions */}
        <div style={{ background: 'var(--k-card)', borderRadius: 16, border: '1px solid var(--k-border)', padding: '18px' }}>
          <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--k-text)', margin: '0 0 12px' }}>💸 Kondisi Refund Otomatis</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: '✅', text: 'Tidak ada mitra tersedia dalam waktu yang ditentukan' },
              { icon: '✅', text: 'Mitra membatalkan order setelah konfirmasi' },
              { icon: '✅', text: 'Produk/layanan tidak tersedia setelah order dibuat' },
              { icon: '✅', text: 'Sistem error yang menyebabkan order gagal diproses' },
              { icon: '✅', text: 'Pembayaran ganda akibat kesalahan teknis' },
              { icon: '❌', text: 'Pembatalan setelah merchant/mitra mulai proses (kecuali kondisi darurat)' },
              { icon: '❌', text: 'Ketidakpuasan subjektif tanpa bukti masalah nyata' },
              { icon: '❌', text: 'Order yang diklaim tidak diterima tanpa bukti pendukung' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: 'var(--k-text)', lineHeight: 1.5 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Refund process */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--k-text)', margin: '0 0 12px' }}>🔄 Proses Pengajuan Refund</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {REFUND_STEPS.map(step => (
              <div key={step.num} style={{ background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(0,200,150,0.12)', border: '2px solid rgba(0,200,150,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#00C896' }}>{step.num}</span>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', margin: '0 0 3px' }}>{step.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: 0, lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ background: 'var(--k-card)', borderRadius: 16, border: '1px solid var(--k-border)', padding: '18px' }}>
          <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--k-text)', margin: '0 0 12px' }}>⏱️ Batas Waktu Penting</p>
          {[
            { label: 'Batas lapor masalah', value: 'Maks. 24 jam setelah order selesai' },
            { label: 'Verifikasi klaim CS', value: '1 x 24 jam kerja' },
            { label: 'Proses refund ke wallet', value: 'Maks. 3 hari kerja' },
            { label: 'Mediasi sengketa', value: 'Maks. 5 hari kerja' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--k-border)' }}>
              <span style={{ fontSize: 13, color: 'var(--k-muted)', flex: 1 }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', textAlign: 'right', flex: 1 }}>{r.value}</span>
            </div>
          ))}
          <p style={{ fontSize: 11, color: 'var(--k-muted)', margin: 0, lineHeight: 1.6 }}>Refund hanya diproses ke ZasaWallet, bukan ke rekening bank langsung (kecuali saldo berasal dari top up yang sama).</p>
        </div>

        {/* Dispute resolution */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--k-text)', margin: '0 0 12px' }}>⚖️ Penyelesaian Sengketa</p>
          <div style={{ background: 'rgba(99,102,241,0.07)', borderRadius: 14, padding: '14px', border: '1px solid rgba(99,102,241,0.2)', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--k-text)', margin: 0, lineHeight: 1.7 }}>
              Sengketa adalah perselisihan antara pengguna (customer, mitra, atau merchant) yang tidak dapat diselesaikan secara mandiri. ZasaQu bertindak sebagai mediator yang tidak memihak.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DISPUTE_STEPS.map(step => (
              <div key={step.num} style={{ background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '2px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#6366F1' }}>{step.num}</span>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', margin: '0 0 3px' }}>{step.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: 0, lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div style={{ background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', padding: '18px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', margin: '0 0 8px' }}>Ada Masalah?</p>
          <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: '0 0 14px', lineHeight: 1.6 }}>
            Hubungi tim ZasaQu di <a href="mailto:support@zasaqu.uk" style={{ color: '#00C896', fontWeight: 700, textDecoration: 'none' }}>support@zasaqu.uk</a> atau WhatsApp kami. Sertakan nomor order untuk penanganan yang lebih cepat.
          </p>
          <button onClick={() => navigate('/contact')}
            style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#00C896,#00A87D)', color: '#0C0C16', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
            Hubungi CS ZasaQu
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/tos')}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            📋 Syarat & Ketentuan
          </button>
          <button onClick={() => navigate('/privacy')}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            🔒 Kebijakan Privasi
          </button>
        </div>
      </div>
    </div>
  )
}
