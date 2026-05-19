import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import QRCode from 'qrcode'

// ── Render QR code dari string QRIS ──────────────────────────────────────────
function QrImage({ code, amount }) {
  const canvasRef = useRef(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!code || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, code, {
      width:           240,
      margin:          2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0C0C16', light: '#FFFFFF' },
    }).catch(() => setError(true))
  }, [code])

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--k-muted)', fontSize: 13 }}>
        <p>⚠️ Gagal render QR — salin kode di bawah</p>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {/* QR Code */}
      <div style={{ display: 'inline-block', background: '#FFFFFF', borderRadius: 16, padding: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 8 }} />
      </div>
      {/* Nominal di bawah QR */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <p style={{ fontSize: 11, color: 'var(--k-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nominal Pembayaran</p>
        <p style={{ fontSize: 24, fontWeight: 900, color: 'var(--k-accent)', letterSpacing: '-0.01em' }}>
          {Number(amount || 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
        </p>
        <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>Scan dengan GoPay, OVO, Dana, atau m-Banking</p>
      </div>
    </div>
  )
}

function formatRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
const fmtRp = formatRp
function formatDate(d) {
  return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const QUICK_AMOUNTS = [20000, 50000, 100000, 200000, 500000, 1000000]

const METHODS = [
  {
    id: 'qris', label: 'QRIS', icon: '⚡',
    desc: 'Scan & bayar otomatis',
    grad: 'linear-gradient(135deg, #00C896, #00A87D)',
    color: '#00C896',
  },
  {
    id: 'va', label: 'Virtual Account', icon: '🏦',
    desc: 'Transfer ke nomor VA unik',
    grad: 'linear-gradient(135deg, #63B3ED, #3182CE)',
    color: '#63B3ED',
  },
  {
    id: 'manual', label: 'Transfer Manual', icon: '📋',
    desc: 'Upload bukti, admin konfirmasi',
    grad: 'linear-gradient(135deg, #F6AD55, #DD6B20)',
    color: '#F6AD55',
  },
]

// ── Layar hasil pembayaran ────────────────────────────────────────────────────
function ResultScreen({ result, method, onBack, onSimulate, simLoading }) {
  const [copied, setCopied] = useState(false)
  const data = result?.data

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Navbar */}
      <nav style={{ background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--k-card)', border: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--k-muted)', cursor: 'pointer', fontSize: 18 }}>←</button>
        <h1 style={{ fontSize: 16, fontWeight: 800, color: 'var(--k-text)' }}>Instruksi Pembayaran</h1>
      </nav>

      <div style={{ flex: 1, padding: '24px 20px', maxWidth: 480, margin: '0 auto', width: '100%' }}>

        {/* Nominal */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 18, marginBottom: 14,
            background: method === 'qris' ? 'rgba(0,200,150,0.12)' : method === 'va' ? 'rgba(99,179,237,0.12)' : 'rgba(246,173,85,0.12)',
            fontSize: 28,
          }}>
            {method === 'qris' ? '⚡' : method === 'va' ? '🏦' : '📋'}
          </div>
          <p style={{ color: 'var(--k-muted)', fontSize: 13, marginBottom: 6 }}>
            {method === 'manual' ? 'Permintaan dikirim' : 'Jumlah yang dibayar'}
          </p>
          <p style={{ fontSize: 34, fontWeight: 900, color: 'var(--k-text)', letterSpacing: '-0.02em' }}>
            {formatRp(data?.amount)}
          </p>
        </div>

        {/* Manual: sukses */}
        {method === 'manual' && (
          <div style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: 18, padding: '20px', textAlign: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 32, marginBottom: 10 }}>✅</p>
            <p style={{ color: 'var(--k-accent)', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Bukti Transfer Terkirim</p>
            <p style={{ color: 'var(--k-muted)', fontSize: 13, lineHeight: 1.6 }}>
              Admin akan memverifikasi dalam 1×24 jam kerja. Saldo akan otomatis bertambah setelah dikonfirmasi.
            </p>
          </div>
        )}

        {/* VA */}
        {method === 'va' && data?.virtual_account && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 18, padding: '16px 20px' }}>
              <p style={{ color: 'var(--k-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Bank Tujuan</p>
              <p style={{ color: 'var(--k-text)', fontSize: 18, fontWeight: 700 }}>{data.virtual_account.bank_name}</p>
            </div>
            <div style={{ background: 'var(--k-card)', border: '1px solid rgba(99,179,237,0.3)', borderRadius: 18, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ color: 'var(--k-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Nomor Virtual Account</p>
                <button onClick={() => copy(data.virtual_account.va_number)} style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: copied ? 'rgba(0,200,150,0.15)' : 'var(--k-card2)',
                  color: copied ? 'var(--k-accent)' : 'var(--k-sub)',
                  border: `1px solid ${copied ? 'rgba(0,200,150,0.3)' : 'var(--k-border)'}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  {copied ? '✓ Tersalin' : 'Salin'}
                </button>
              </div>
              <p style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 900, color: '#63B3ED', letterSpacing: '0.06em' }}>
                {data.virtual_account.va_number}
              </p>
            </div>
            <div style={{ background: 'rgba(246,173,85,0.08)', border: '1px solid rgba(246,173,85,0.2)', borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>⏱️</span>
              <p style={{ color: 'var(--k-warn)', fontSize: 13, fontWeight: 600 }}>
                Berlaku hingga {formatDate(data.virtual_account.expired_at)}
              </p>
            </div>
            <button onClick={onSimulate} disabled={simLoading} style={{
              padding: '13px', borderRadius: 14, fontSize: 14, fontWeight: 700,
              background: 'rgba(99,179,237,0.1)', color: '#63B3ED',
              border: '1px solid rgba(99,179,237,0.25)', cursor: simLoading ? 'not-allowed' : 'pointer',
              opacity: simLoading ? 0.6 : 1,
            }}>
              {simLoading ? 'Memproses...' : '🧪 [DEV] Simulasi Bayar VA'}
            </button>
          </div>
        )}

        {/* QRIS */}
        {method === 'qris' && data?.qris_transaction && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'var(--k-card)', border: '1px solid rgba(0,200,150,0.3)', borderRadius: 18, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <p style={{ color: 'var(--k-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Scan QRIS</p>
                <button onClick={() => copy(data.qris_transaction.qris_code)} style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: copied ? 'rgba(0,200,150,0.15)' : 'var(--k-card2)',
                  color: copied ? 'var(--k-accent)' : 'var(--k-sub)',
                  border: `1px solid ${copied ? 'rgba(0,200,150,0.3)' : 'var(--k-border)'}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  {copied ? '✓ Tersalin' : 'Salin Kode'}
                </button>
              </div>
              {/* QR Code sungguhan */}
              <QrImage code={data.qris_transaction.qris_code} amount={data.amount} />
            </div>
            <div style={{ background: 'rgba(246,173,85,0.08)', border: '1px solid rgba(246,173,85,0.2)', borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>⏱️</span>
              <p style={{ color: 'var(--k-warn)', fontSize: 13, fontWeight: 600 }}>
                Berlaku hingga {formatDate(data.qris_transaction.expired_at)}
              </p>
            </div>
            <button onClick={onSimulate} disabled={simLoading} style={{
              padding: '13px', borderRadius: 14, fontSize: 14, fontWeight: 700,
              background: 'rgba(0,200,150,0.1)', color: 'var(--k-accent)',
              border: '1px solid rgba(0,200,150,0.25)', cursor: simLoading ? 'not-allowed' : 'pointer',
              opacity: simLoading ? 0.6 : 1,
            }}>
              {simLoading ? 'Memproses...' : '🧪 [DEV] Simulasi Bayar QRIS'}
            </button>
          </div>
        )}

        <Link to="/wallet" style={{ display: 'block', textAlign: 'center', color: 'var(--k-muted)', fontSize: 14, textDecoration: 'none', padding: '12px 0', marginTop: 4 }}>
          Kembali ke Wallet
        </Link>
      </div>
    </div>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function TopUpPage() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const fileRef    = useRef()

  const [tab,          setTab]          = useState('form')   // 'form' | 'history'
  const [method,       setMethod]       = useState('qris')
  const [amount,       setAmount]       = useState('')
  const [bankAccounts, setBankAccounts] = useState([])
  const [selectedBank, setSelectedBank] = useState('')
  const [proofFile,    setProofFile]    = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [simLoading,   setSimLoading]   = useState(false)
  const [result,       setResult]       = useState(null)
  const [error,        setError]        = useState('')
  const [history,      setHistory]      = useState([])
  const [histLoading,  setHistLoading]  = useState(false)

  useEffect(() => {
    api.get('/topup/bank-accounts').then(r => setBankAccounts(r.data))
  }, [])

  useEffect(() => {
    if (tab !== 'history') return
    setHistLoading(true)
    api.get('/topup/history').then(r => setHistory(r.data.data ?? [])).finally(() => setHistLoading(false))
  }, [tab])

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      let res
      if (method === 'manual') {
        const fd = new FormData()
        fd.append('amount', amount)
        fd.append('bank_account_id', selectedBank)
        fd.append('proof_image', proofFile)
        res = await api.post('/topup/manual', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else if (method === 'va') {
        res = await api.post('/topup/virtual-account', { amount: Number(amount) })
      } else {
        res = await api.post('/topup/qris', { amount: Number(amount) })
      }
      setResult(res.data)
    } catch (err) {
      const errs = err.response?.data?.errors
      setError(errs ? Object.values(errs).flat().join(' ') : (err.response?.data?.message || 'Gagal membuat top up.'))
    } finally { setLoading(false) }
  }

  const simulatePayment = async () => {
    setSimLoading(true)
    try {
      const id  = result.data.id
      const ep  = method === 'qris' ? `/topup/${id}/simulate-qris` : `/topup/${id}/simulate-va`
      await api.post(ep)
      navigate('/wallet')
    } catch { setError('Simulasi gagal.') }
    finally { setSimLoading(false) }
  }

  if (result) return (
    <ResultScreen result={result} method={method}
      onBack={() => setResult(null)} onSimulate={simulatePayment} simLoading={simLoading} />
  )

  const activeMethod = METHODS.find(m => m.id === method)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 32 }}>

      {/* Header */}
      <div style={{
        padding: '52px 20px 28px',
        background: 'linear-gradient(160deg, #0A1F1A 0%, var(--k-bg) 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Link to="/wallet" style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--k-card)', border: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--k-muted)', textDecoration: 'none', fontSize: 18 }}>←</Link>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text)', lineHeight: 1.2 }}>Top Up Saldo</h1>
          </div>
          {/* Tab toggle */}
          <div style={{ display: 'flex', background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 12, padding: 3, gap: 3 }}>
            {[['form', 'Isi Ulang'], ['history', 'Riwayat']].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                padding: '6px 12px', borderRadius: 9, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: tab === k ? 'var(--k-accent)' : 'transparent',
                color: tab === k ? '#0C0C16' : 'var(--k-muted)',
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Saldo */}
        <div style={{ background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)', borderRadius: 18, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'var(--k-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Saldo Saat Ini</p>
            <p style={{ color: 'var(--k-accent)', fontSize: 22, fontWeight: 900 }}>{formatRp(user?.wallet?.balance)}</p>
          </div>
          <span style={{ fontSize: 32 }}>💳</span>
        </div>
      </div>

      <div style={{ padding: '0 20px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Tab Riwayat ── */}
        {tab === 'history' && (
          <div>
            {histLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <div style={{ width: 24, height: 24, border: '2.5px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <p style={{ fontSize: 36, marginBottom: 10 }}>📭</p>
                <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Belum ada riwayat top up</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map(r => {
                  const STATUS_MAP = {
                    pending:   { label: 'Menunggu',      color: '#F6AD55' },
                    confirmed: { label: 'Dikonfirmasi',  color: '#00C896' },
                    rejected:  { label: 'Ditolak',       color: '#F56565' },
                    expired:   { label: 'Kedaluwarsa',   color: '#A0A0BC' },
                  }
                  const METHOD_MAP = { bank_manual: '📋 Manual', virtual_account: '🏦 VA', qris: '⚡ QRIS' }
                  const s = STATUS_MAP[r.status] ?? { label: r.status, color: '#A0A0BC' }
                  return (
                    <div key={r.id} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--k-text)' }}>
                            {METHOD_MAP[r.method] ?? r.method}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 2 }}>
                            {new Date(r.created_at).toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--k-accent)', marginBottom: 4 }}>
                            +{fmtRp(r.amount)}
                          </p>
                          <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: `${s.color}18`, color: s.color }}>
                            {s.label}
                          </span>
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

        {/* ── Tab Form ── */}
        {tab === 'form' && <>

        {/* Pilih metode */}
        <div>
          <p style={{ color: 'var(--k-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Metode Pembayaran</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {METHODS.map(m => (
              <button key={m.id} type="button" onClick={() => setMethod(m.id)} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 16px', borderRadius: 18, cursor: 'pointer', textAlign: 'left',
                border: `1.5px solid ${method === m.id ? m.color : 'var(--k-border)'}`,
                background: method === m.id ? `${m.color}10` : 'var(--k-card)',
                transition: 'all 0.2s',
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: method === m.id ? m.grad : 'var(--k-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, transition: 'all 0.2s', boxShadow: method === m.id ? `0 4px 14px ${m.color}40` : 'none' }}>
                  {m.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--k-text)', fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{m.label}</p>
                  <p style={{ color: 'var(--k-muted)', fontSize: 12 }}>{m.desc}</p>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: `2px solid ${method === m.id ? m.color : 'var(--k-border)'}`, background: method === m.id ? m.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  {method === m.id && <span style={{ color: '#0C0C16', fontSize: 11 }}>✓</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Nominal */}
          <div>
            <p style={{ color: 'var(--k-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Nominal Top Up</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {QUICK_AMOUNTS.map(a => (
                <button key={a} type="button" onClick={() => setAmount(String(a))} style={{
                  padding: '11px 4px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${amount === String(a) ? 'var(--k-accent)' : 'var(--k-border)'}`,
                  background: amount === String(a) ? 'var(--k-glow)' : 'var(--k-card)',
                  color: amount === String(a) ? 'var(--k-accent)' : 'var(--k-sub)',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  {formatRp(a)}
                </button>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--k-muted)', fontSize: 14, fontWeight: 600, pointerEvents: 'none' }}>Rp</span>
              <input type="number" value={amount} min="10000"
                onChange={e => setAmount(e.target.value)}
                className="input-field"
                style={{ paddingLeft: 40 }}
                placeholder="Nominal lain (min. 10.000)" />
            </div>
          </div>

          {/* Manual: pilih bank & upload */}
          {method === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ color: 'var(--k-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Rekening Tujuan</p>
                {bankAccounts.length === 0 ? (
                  <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Memuat rekening...</p>
                ) : bankAccounts.map(b => (
                  <button key={b.id} type="button" onClick={() => setSelectedBank(String(b.id))} style={{
                    display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                    padding: '14px 16px', borderRadius: 16, marginBottom: 8, textAlign: 'left',
                    border: `1.5px solid ${selectedBank === String(b.id) ? 'var(--k-accent)' : 'var(--k-border)'}`,
                    background: selectedBank === String(b.id) ? 'var(--k-glow)' : 'var(--k-card)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--k-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏦</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: 'var(--k-text)', fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{b.bank_name}</p>
                      <p style={{ color: 'var(--k-muted)', fontSize: 12, fontFamily: 'monospace' }}>{b.account_number}</p>
                      <p style={{ color: 'var(--k-sub)', fontSize: 12 }}>a.n. {b.account_name}</p>
                    </div>
                    {selectedBank === String(b.id) && (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--k-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#0C0C16', fontSize: 12 }}>✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Upload bukti */}
              <div>
                <p style={{ color: 'var(--k-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Bukti Transfer</p>
                <input type="file" accept="image/*" ref={fileRef}
                  onChange={e => setProofFile(e.target.files[0])}
                  style={{ display: 'none' }} />
                <button type="button" onClick={() => fileRef.current.click()} style={{
                  width: '100%', padding: '20px', borderRadius: 18,
                  border: `2px dashed ${proofFile ? 'var(--k-accent)' : 'var(--k-border)'}`,
                  background: proofFile ? 'var(--k-glow)' : 'var(--k-card)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: 28 }}>{proofFile ? '✅' : '📤'}</span>
                  <p style={{ color: proofFile ? 'var(--k-accent)' : 'var(--k-sub)', fontSize: 14, fontWeight: 600 }}>
                    {proofFile ? proofFile.name : 'Tap untuk upload bukti transfer'}
                  </p>
                  {!proofFile && <p style={{ color: 'var(--k-muted)', fontSize: 12 }}>JPG, PNG — maks. 5MB</p>}
                </button>
              </div>
            </div>
          )}

          {error && <div className="error-box fade-in">{error}</div>}

          {/* Preview nominal */}
          {amount && Number(amount) >= 10000 && (
            <div style={{ background: 'var(--k-card)', border: `1px solid ${activeMethod.color}33`, borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Total top up via <strong style={{ color: 'var(--k-text)' }}>{activeMethod.label}</strong></p>
              <p style={{ color: activeMethod.color, fontWeight: 900, fontSize: 18 }}>{formatRp(amount)}</p>
            </div>
          )}

          <button type="submit" disabled={loading || !amount || Number(amount) < 10000 || (method === 'manual' && (!selectedBank || !proofFile))}
            style={{
              width: '100%', padding: '15px', borderRadius: 16, border: 'none',
              background: `linear-gradient(135deg, ${activeMethod.color}, ${method === 'qris' ? '#00A87D' : method === 'va' ? '#3182CE' : '#DD6B20'})`,
              color: '#0C0C16', fontWeight: 800, fontSize: 15,
              cursor: 'pointer', transition: 'opacity 0.2s',
              opacity: (loading || !amount || Number(amount) < 10000) ? 0.45 : 1,
              boxShadow: `0 6px 20px ${activeMethod.color}40`,
            }}>
            {loading ? 'Memproses...' : `Lanjutkan ${method === 'qris' ? '⚡' : method === 'va' ? '🏦' : '📋'}`}
          </button>
        </form>
        </> }
      </div>
    </div>
  )
}
