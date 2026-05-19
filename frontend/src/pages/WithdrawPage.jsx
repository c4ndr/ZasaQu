import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

function formatRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000]

const DESTINATIONS = [
  { value: 'dana', label: 'DANA',  icon: '💙', grad: 'linear-gradient(135deg, #0091EA, #00B0FF)', color: '#00B0FF' },
  { value: 'ovo',  label: 'OVO',   icon: '💜', grad: 'linear-gradient(135deg, #4527A0, #7E57C2)', color: '#9575CD' },
  { value: 'gopay',label: 'GoPay', icon: '💚', grad: 'linear-gradient(135deg, #00695C, #00897B)', color: '#26A69A' },
  { value: 'bank', label: 'Bank',  icon: '🏦', grad: 'linear-gradient(135deg, #37474F, #546E7A)', color: '#78909C' },
]

export default function WithdrawPage() {
  const { user }   = useAuth()
  const navigate   = useNavigate()

  const [form, setForm] = useState({
    amount: '', destination_type: 'dana',
    destination_number: '', destination_name: '', bank_name: '',
  })
  const [tab,        setTab]        = useState('form')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState(false)
  const [history,     setHistory]     = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [wallet,     setWallet]     = useState(null)

  useEffect(() => {
    if (!user?.role?.startsWith('mitra')) return
    api.get('/wallet/summary').then(r => setWallet(r.data))
  }, [user])

  useEffect(() => {
    if (tab !== 'history') return
    setHistLoading(true)
    api.get('/withdraw/history').then(r => setHistory(r.data.data ?? [])).finally(() => setHistLoading(false))
  }, [tab])

  if (!user?.role?.startsWith('mitra')) return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 40 }}>🚫</p>
      <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Hanya mitra yang bisa melakukan withdraw.</p>
      <Link to="/wallet" style={{ color: 'var(--k-accent)', fontSize: 14, textDecoration: 'none', fontWeight: 700 }}>Kembali ke Wallet</Link>
    </div>
  )

  // Gunakan available (saldo - locked) dari API, bukan balance dari localStorage
  const available = wallet ? wallet.available : Number(user?.wallet?.available ?? user?.wallet?.balance ?? 0)
  const locked    = wallet ? wallet.locked_balance : Number(user?.wallet?.locked_balance ?? 0)
  const minLeft   = 10000
  const maxAmount = Math.max(0, available - minLeft)
  const dest      = DESTINATIONS.find(d => d.value === form.destination_type)

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await api.post('/withdraw/', { ...form, amount: Number(form.amount) })
      setSuccess(true)
    } catch (err) {
      const errs = err.response?.data?.errors
      setError(errs ? Object.values(errs).flat().join(' ') : (err.response?.data?.message || 'Gagal mengajukan withdraw.'))
    } finally { setLoading(false) }
  }

  // ── Layar sukses ────────────────────────────────────────────────────────────
  if (success) return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center' }}>
      <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(0,200,150,0.1)', border: '2px solid rgba(0,200,150,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, marginBottom: 20 }}>✅</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--k-text)', marginBottom: 8 }}>Withdraw Diajukan</h2>
      <p style={{ color: 'var(--k-muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 28, maxWidth: 300 }}>
        Permintaan <strong style={{ color: 'var(--k-text)' }}>{formatRp(form.amount)}</strong> ke {dest?.label} sedang diproses.<br/>
        Dana cair dalam 1×24 jam kerja.
      </p>
      <Link to="/wallet" style={{ padding: '14px 32px', borderRadius: 16, background: 'var(--k-accent)', color: '#0C0C16', fontWeight: 800, fontSize: 15, textDecoration: 'none', boxShadow: '0 6px 20px rgba(0,200,150,0.35)' }}>
        Lihat Wallet
      </Link>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ padding: '52px 20px 28px', background: 'linear-gradient(160deg, #151015 0%, var(--k-bg) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Link to="/wallet" style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--k-card)', border: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--k-muted)', textDecoration: 'none', fontSize: 18 }}>←</Link>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text)', flex: 1 }}>Withdraw</h1>
          <div style={{ display: 'flex', background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 12, padding: 3, gap: 3 }}>
            {[['form', 'Tarik'], ['history', 'Riwayat']].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                padding: '6px 12px', borderRadius: 9, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: tab === k ? '#9575CD' : 'transparent',
                color: tab === k ? '#fff' : 'var(--k-muted)',
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Kartu saldo */}
        <div style={{ borderRadius: 20, background: 'linear-gradient(135deg, #1A0A2E, #0D1F2A)', border: '1px solid rgba(150,120,220,0.2)', padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(150,120,220,0.06)', pointerEvents: 'none' }} />
          <p style={{ color: 'var(--k-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Saldo Tersedia</p>
          <p style={{ fontSize: 30, fontWeight: 900, color: 'var(--k-text)', letterSpacing: '-0.02em', marginBottom: 4 }}>{formatRp(available)}</p>
          {locked > 0 && (
            <p style={{ color: 'rgba(246,173,85,0.8)', fontSize: 12, marginBottom: 12 }}>🔒 Terkunci: {formatRp(locked)}</p>
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: locked > 0 ? 0 : 12 }}>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '8px 12px' }}>
              <p style={{ color: 'var(--k-muted)', fontSize: 10, fontWeight: 700, marginBottom: 2 }}>MIN. SISA</p>
              <p style={{ color: 'var(--k-sub)', fontSize: 13, fontWeight: 700 }}>{formatRp(minLeft)}</p>
            </div>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '8px 12px' }}>
              <p style={{ color: 'var(--k-muted)', fontSize: 10, fontWeight: 700, marginBottom: 2 }}>MAKS. TARIK</p>
              <p style={{ color: 'var(--k-accent)', fontSize: 13, fontWeight: 700 }}>{formatRp(maxAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px', maxWidth: 480, margin: '0 auto' }}>

        {/* Tab Riwayat */}
        {tab === 'history' && (
          <div style={{ paddingBottom: 32 }}>
            {histLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <div style={{ width: 24, height: 24, border: '2.5px solid #9575CD', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <p style={{ fontSize: 36, marginBottom: 10 }}>📭</p>
                <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Belum ada riwayat withdraw</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map(r => {
                  const DEST = DESTINATIONS.find(d => d.value === r.destination_type)
                  const S = {
                    pending:    { label: 'Menunggu', color: '#F6AD55' },
                    processing: { label: 'Diproses', color: '#63B3ED' },
                    completed:  { label: 'Selesai',  color: '#00C896' },
                    rejected:   { label: 'Ditolak',  color: '#F56565' },
                  }[r.status] ?? { label: r.status, color: '#A0A0BC' }
                  return (
                    <div key={r.id} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: r.notes ? 8 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 22 }}>{DEST?.icon ?? '💳'}</span>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>
                              {DEST?.label ?? r.destination_type} — {r.destination_name}
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--k-muted)', fontFamily: 'monospace' }}>{r.destination_number}</p>
                            <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{new Date(r.created_at).toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 15, fontWeight: 800, color: '#F56565', marginBottom: 4 }}>−{formatRp(r.amount)}</p>
                          <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: `${S.color}18`, color: S.color }}>{S.label}</span>
                        </div>
                      </div>
                      {r.notes && <p style={{ fontSize: 12, color: 'var(--k-danger)', marginTop: 6 }}>⚠ {r.notes}</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Form */}
        {tab === 'form' && <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Nominal */}
          <div>
            <p style={{ color: 'var(--k-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Jumlah Withdraw</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {QUICK_AMOUNTS.filter(a => a <= maxAmount).map(a => (
                <button key={a} type="button" onClick={() => setForm(f => ({ ...f, amount: String(a) }))} style={{
                  padding: '10px 4px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${form.amount === String(a) ? '#9575CD' : 'var(--k-border)'}`,
                  background: form.amount === String(a) ? 'rgba(149,117,205,0.1)' : 'var(--k-card)',
                  color: form.amount === String(a) ? '#9575CD' : 'var(--k-sub)',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  {formatRp(a)}
                </button>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--k-muted)', fontSize: 14, fontWeight: 600, pointerEvents: 'none' }}>Rp</span>
              <input type="number" name="amount" value={form.amount} min="10000" max={maxAmount}
                onChange={handleChange} className="input-field" style={{ paddingLeft: 40 }}
                placeholder={`Nominal (maks. ${formatRp(maxAmount)})`} required />
            </div>
            {form.amount && Number(form.amount) > maxAmount && (
              <p style={{ color: 'var(--k-danger)', fontSize: 12, marginTop: 6 }}>Melebihi saldo yang bisa ditarik ({formatRp(maxAmount)})</p>
            )}
          </div>

          {/* Tujuan */}
          <div>
            <p style={{ color: 'var(--k-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Tujuan Penarikan</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {DESTINATIONS.map(d => (
                <button key={d.value} type="button"
                  onClick={() => setForm(f => ({ ...f, destination_type: d.value }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
                    border: `1.5px solid ${form.destination_type === d.value ? d.color : 'var(--k-border)'}`,
                    background: form.destination_type === d.value ? `${d.color}12` : 'var(--k-card)',
                    transition: 'all 0.2s',
                  }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                    background: form.destination_type === d.value ? d.grad : 'var(--k-card2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    transition: 'all 0.2s',
                    boxShadow: form.destination_type === d.value ? `0 3px 10px ${d.color}40` : 'none',
                  }}>
                    {d.icon}
                  </div>
                  <p style={{ color: 'var(--k-text)', fontWeight: 700, fontSize: 14 }}>{d.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Field bank (jika bank) */}
          {form.destination_type === 'bank' && (
            <div className="fade-in">
              <label className="label">Nama Bank</label>
              <input type="text" name="bank_name" value={form.bank_name} onChange={handleChange}
                className="input-field" placeholder="BCA / BRI / Mandiri / dll" required />
            </div>
          )}

          {/* Nomor & nama */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">{form.destination_type === 'bank' ? 'Nomor Rekening' : 'Nomor HP Terdaftar'}</label>
              <input type="text" name="destination_number" value={form.destination_number}
                onChange={handleChange} className="input-field"
                placeholder={form.destination_type === 'bank' ? '1234567890' : '08xxxxxxxxxx'} required />
            </div>
            <div>
              <label className="label">Nama Pemilik Akun</label>
              <input type="text" name="destination_name" value={form.destination_name}
                onChange={handleChange} className="input-field"
                placeholder="Nama sesuai akun / rekening" required />
            </div>
          </div>

          {/* Info proses */}
          <div style={{ background: 'rgba(99,179,237,0.06)', border: '1px solid rgba(99,179,237,0.15)', borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
            <p style={{ color: 'var(--k-info)', fontSize: 12, lineHeight: 1.7 }}>
              Withdraw diproses dalam <strong>1×24 jam kerja</strong>. Saldo minimum {formatRp(minLeft)} harus tersisa di wallet Anda.
            </p>
          </div>

          {error && <div className="error-box fade-in">{error}</div>}

          {/* Preview */}
          {form.amount && Number(form.amount) >= 10000 && Number(form.amount) <= maxAmount && (
            <div className="fade-in" style={{ background: 'var(--k-card)', border: `1px solid ${dest.color}33`, borderRadius: 16, padding: '14px 18px' }}>
              <p style={{ color: 'var(--k-muted)', fontSize: 12, marginBottom: 8 }}>Ringkasan Withdrawal</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{dest.icon}</span>
                  <span style={{ color: 'var(--k-sub)', fontSize: 13 }}>{dest.label}</span>
                </div>
                <p style={{ color: dest.color, fontWeight: 900, fontSize: 20 }}>{formatRp(form.amount)}</p>
              </div>
              <p style={{ color: 'var(--k-muted)', fontSize: 12, marginTop: 8 }}>
                Sisa saldo: <strong style={{ color: 'var(--k-sub)' }}>{formatRp(available - Number(form.amount))}</strong>
              </p>
            </div>
          )}

          <button type="submit"
            disabled={loading || !form.amount || Number(form.amount) < 10000 || Number(form.amount) > maxAmount || !form.destination_number || !form.destination_name}
            style={{
              width: '100%', padding: '15px', borderRadius: 16, border: 'none',
              background: dest.grad, color: '#fff', fontWeight: 800, fontSize: 15,
              cursor: 'pointer', transition: 'opacity 0.2s',
              opacity: loading || !form.amount || Number(form.amount) < 10000 || Number(form.amount) > maxAmount || !form.destination_number || !form.destination_name ? 0.45 : 1,
              boxShadow: `0 6px 20px ${dest.color}40`,
            }}>
            {loading ? 'Memproses...' : `Ajukan Withdraw ${dest.icon}`}
          </button>
        </form>}
      </div>
    </div>
  )
}
