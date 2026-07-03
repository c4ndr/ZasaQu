import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useAppInfo from '../hooks/useAppInfo'
import api from '../services/api'

function formatRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
const fmtRp = formatRp

const QUICK_AMOUNTS = [20000, 50000, 100000, 200000, 500000, 1000000]

function ResultScreen({ result, onBack }) {
  const navigate = useNavigate()
  const data     = result?.data

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--k-card)', border: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--k-muted)', cursor: 'pointer', fontSize: 18 }}>←</button>
        <h1 style={{ fontSize: 16, fontWeight: 800, color: 'var(--k-text)' }}>Permintaan Terkirim</h1>
      </nav>

      <div style={{ flex: 1, padding: '32px 20px', maxWidth: 480, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 20, marginBottom: 16, background: 'rgba(246,173,85,0.12)', fontSize: 32 }}>
            📋
          </div>
          <p style={{ color: 'var(--k-muted)', fontSize: 13, marginBottom: 6 }}>Nominal Top Up</p>
          <p style={{ fontSize: 36, fontWeight: 900, color: 'var(--k-text)', letterSpacing: '-0.02em' }}>{formatRp(data?.amount)}</p>
        </div>

        <div style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: 18, padding: '24px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>✅</p>
          <p style={{ color: 'var(--k-accent)', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Bukti Transfer Terkirim</p>
          <p style={{ color: 'var(--k-muted)', fontSize: 13, lineHeight: 1.7 }}>
            Admin akan memverifikasi bukti transfer dalam 1×24 jam kerja.<br />
            Saldo akan otomatis bertambah setelah dikonfirmasi.
          </p>
        </div>

        <button onClick={() => navigate('/wallet')} style={{
          width: '100%', padding: '15px', borderRadius: 16, border: 'none',
          background: 'var(--k-accent)', color: '#0C0C16', fontWeight: 800, fontSize: 15, cursor: 'pointer',
        }}>
          Lihat Wallet
        </button>

        <Link to="/topup" onClick={onBack} style={{ display: 'block', textAlign: 'center', color: 'var(--k-muted)', fontSize: 14, textDecoration: 'none', padding: '8px 0' }}>
          Top Up Lagi
        </Link>
      </div>
    </div>
  )
}

export default function TopUpPage() {
  const { user }   = useAuth()
  const { wallet_enabled: walletEnabled } = useAppInfo()
  const fileRef    = useRef()

  const [tab,          setTab]          = useState('form')
  const [amount,       setAmount]       = useState('')
  const [bankAccounts, setBankAccounts] = useState([])
  const [selectedBank, setSelectedBank] = useState('')
  const [proofFile,    setProofFile]    = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [result,       setResult]       = useState(null)
  const [error,        setError]        = useState('')
  const [history,      setHistory]      = useState([])
  const [histLoading,  setHistLoading]  = useState(false)
  const [freshBalance, setFreshBalance] = useState(null)

  useEffect(() => {
    api.get('/topup/bank-accounts').then(r => setBankAccounts(r.data))
    api.get('/wallet/summary').then(r => setFreshBalance(r.data.available ?? r.data.balance ?? null)).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab !== 'history') return
    setHistLoading(true)
    api.get('/topup/history').then(r => setHistory(r.data.data ?? [])).finally(() => setHistLoading(false))
  }, [tab])

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const fd = new FormData()
      fd.append('amount', amount)
      fd.append('bank_account_id', selectedBank)
      fd.append('proof_image', proofFile)
      const res = await api.post('/topup/manual', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(res.data)
    } catch (err) {
      const errs = err.response?.data?.errors
      setError(errs ? Object.values(errs).flat().join(' ') : (err.response?.data?.message || 'Gagal membuat top up.'))
    } finally { setLoading(false) }
  }

  if (!walletEnabled) return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center', gap: 16 }}>
      <div style={{ fontSize: 56 }}>🔒</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Top Up Tidak Tersedia</h2>
      <p style={{ fontSize: 14, color: 'var(--k-muted)', lineHeight: 1.6 }}>Fitur top up wallet sedang tidak aktif. Silakan coba lagi nanti.</p>
      <Link to="/wallet" style={{ marginTop: 8, padding: '12px 28px', borderRadius: 14, background: 'var(--k-accent)', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Kembali ke Wallet</Link>
    </div>
  )

  if (result) return <ResultScreen result={result} onBack={() => setResult(null)} />

  const canSubmit = !loading && amount && Number(amount) >= 10000 && selectedBank && proofFile

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ padding: '52px 20px 28px', background: 'linear-gradient(160deg, #0A1F1A 0%, var(--k-bg) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Link to="/wallet" style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--k-card)', border: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--k-muted)', textDecoration: 'none', fontSize: 18 }}>←</Link>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text)', flex: 1 }}>Top Up Saldo</h1>
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
            <p style={{ color: 'var(--k-accent)', fontSize: 22, fontWeight: 900 }}>{formatRp(freshBalance ?? user?.wallet?.balance)}</p>
          </div>
          <span style={{ fontSize: 32 }}>💳</span>
        </div>
      </div>

      <div style={{ padding: '0 20px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Tab Riwayat */}
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
                    pending:   { label: 'Menunggu Konfirmasi', color: '#F6AD55' },
                    confirmed: { label: 'Dikonfirmasi',        color: '#00C896' },
                    rejected:  { label: 'Ditolak',             color: '#F56565' },
                    expired:   { label: 'Kedaluwarsa',         color: '#A0A0BC' },
                  }
                  const s = STATUS_MAP[r.status] ?? { label: r.status, color: '#A0A0BC' }
                  return (
                    <div key={r.id} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--k-text)' }}>📋 Transfer Manual</p>
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

        {/* Tab Form */}
        {tab === 'form' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Info cara top up */}
            <div style={{ background: 'rgba(246,173,85,0.08)', border: '1px solid rgba(246,173,85,0.2)', borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>📋</span>
              <div>
                <p style={{ color: '#F6AD55', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Cara Top Up</p>
                <p style={{ color: 'var(--k-muted)', fontSize: 12, lineHeight: 1.7 }}>
                  Transfer ke salah satu rekening di bawah → upload bukti transfer → admin konfirmasi → saldo masuk otomatis.
                </p>
              </div>
            </div>

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

            {/* Pilih rekening tujuan */}
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

            {/* Upload bukti transfer */}
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

            {error && <div className="error-box fade-in">{error}</div>}

            {/* Preview */}
            {amount && Number(amount) >= 10000 && (
              <div style={{ background: 'var(--k-card)', border: '1px solid rgba(246,173,85,0.25)', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Total top up</p>
                <p style={{ color: '#F6AD55', fontWeight: 900, fontSize: 18 }}>{formatRp(amount)}</p>
              </div>
            )}

            <button type="submit" disabled={!canSubmit} style={{
              width: '100%', padding: '15px', borderRadius: 16, border: 'none',
              background: 'linear-gradient(135deg, #F6AD55, #DD6B20)',
              color: '#0C0C16', fontWeight: 800, fontSize: 15,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.45,
              boxShadow: canSubmit ? '0 6px 20px rgba(246,173,85,0.4)' : 'none',
              transition: 'all 0.2s',
            }}>
              {loading ? 'Mengirim...' : 'Kirim Bukti Transfer 📋'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
