import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BottomNav from '../components/BottomNav'
import api from '../services/api'

const TYPE_LABELS = {
  topup:             'Top Up',
  withdraw:          'Withdraw',
  order_payment:     'Bayar Order',
  order_income:      'Pendapatan',
  commission:        'Komisi',
  refund:            'Withdraw Dibatalkan',
  jastip_discount:   'Diskon JastipQu',
}
const TYPE_EMOJI = {
  topup:           '⬇️',
  withdraw:        '⬆️',
  order_payment:   '💳',
  order_income:    '💰',
  commission:      '🏷️',
  refund:          '↩️',
  jastip_discount: '⚡',
}
// refund di sini berarti pembatalan withdraw — balance_before == balance_after,
// ditampilkan sebagai informasi bukan kredit nyata
const isCredit = (t) => ['topup', 'order_income', 'jastip_discount'].includes(t)
const isInfo   = (t) => t === 'refund'
function fmtRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
function fmtDate(d) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const TOPUP_STATUS = {
  pending:   { label: 'Menunggu Konfirmasi', color: '#F6AD55', bg: 'rgba(246,173,85,0.1)',  icon: '⏳', steps: ['Diajukan','Menunggu Admin','Saldo Ditambahkan'], active: 1 },
  confirmed: { label: 'Dikonfirmasi',        color: '#00C896', bg: 'rgba(0,200,150,0.1)',   icon: '✅', steps: ['Diajukan','Dikonfirmasi Admin','Saldo Ditambahkan'], active: 3 },
  rejected:  { label: 'Ditolak',            color: '#F56565', bg: 'rgba(245,101,101,0.1)', icon: '❌', steps: ['Diajukan','Ditolak Admin','—'], active: -1 },
  expired:   { label: 'Kedaluwarsa',        color: '#A0A0BC', bg: 'rgba(160,160,188,0.1)', icon: '⌛', steps: ['Diajukan','Kedaluwarsa','—'], active: -1 },
}
const WD_STATUS = {
  pending:   { label: 'Menunggu Diproses', color: '#F6AD55', bg: 'rgba(246,173,85,0.1)',  icon: '⏳', steps: ['Diajukan','Menunggu Admin','Dana Dikirim'], active: 1 },
  processing: { label: 'Sedang Diproses',  color: '#63B3ED', bg: 'rgba(99,179,237,0.1)',  icon: '🔄', steps: ['Diajukan','Sedang Diproses','Dana Dikirim'], active: 2 },
  completed: { label: 'Dana Terkirim',     color: '#00C896', bg: 'rgba(0,200,150,0.1)',   icon: '✅', steps: ['Diajukan','Diproses Admin','Dana Terkirim'], active: 3 },
  rejected:  { label: 'Ditolak',           color: '#F56565', bg: 'rgba(245,101,101,0.1)', icon: '❌', steps: ['Diajukan','Ditolak Admin','Saldo Dikembalikan'], active: -1 },
}

function MiniTimeline({ steps, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 8 }}>
      {steps.map((s, i) => {
        const done   = active > i || (active === -1 && i === 1)
        const isFail = active === -1 && i === 1
        const isLast = i === steps.length - 1
        const dotColor = isFail ? '#F56565' : done ? '#00C896' : 'var(--k-border)'
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: isLast ? 0 : 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, border: `1.5px solid ${dotColor}`, flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: isFail ? '#F56565' : done ? '#00C896' : 'var(--k-muted)', whiteSpace: 'nowrap', fontWeight: done ? 700 : 400 }}>
                {s}
              </span>
            </div>
            {!isLast && <div style={{ flex: 1, height: 1.5, background: done ? '#00C896' : 'var(--k-border)', margin: '0 2px', marginBottom: 14 }} />}
          </div>
        )
      })}
    </div>
  )
}

function PendingCard({ icon, label, amount, status, note, color, type = 'topup', confirmedAt, processedAt, method }) {
  const [open, setOpen] = useState(false)
  const meta = type === 'topup' ? (TOPUP_STATUS[status] ?? TOPUP_STATUS.pending) : (WD_STATUS[status] ?? WD_STATUS.pending)

  const METHOD_LABEL = { bank_manual: 'Transfer Manual', virtual_account: 'Virtual Account', qris: 'QRIS' }

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--k-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)', marginBottom: 2 }}>{label}</p>
          {note && <p style={{ fontSize: 11, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note}</p>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color, marginBottom: 4 }}>{fmtRp(amount)}</p>
          <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: meta.bg, color: meta.color }}>
            {meta.label}
          </span>
        </div>
        <button onClick={() => setOpen(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--k-muted)', cursor: 'pointer', fontSize: 14, padding: '0 4px', flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 10, paddingLeft: 52 }}>
          <MiniTimeline steps={meta.steps} active={meta.active} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
            {method && (
              <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>
                Metode: <strong style={{ color: 'var(--k-sub)' }}>{METHOD_LABEL[method] ?? method}</strong>
              </p>
            )}
            {confirmedAt && (
              <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>
                Diproses: <strong style={{ color: 'var(--k-sub)' }}>{fmtDate(confirmedAt)}</strong>
              </p>
            )}
            {processedAt && (
              <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>
                Diproses: <strong style={{ color: 'var(--k-sub)' }}>{fmtDate(processedAt)}</strong>
              </p>
            )}
            {note && status === 'rejected' && (
              <p style={{ fontSize: 11, color: '#F56565' }}>
                Alasan: {note}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function WalletPage() {
  const { user }  = useAuth()
  const isMitra   = user?.role?.startsWith('mitra')
  const [summary,      setSummary]      = useState(null)
  const [transactions, setTransactions] = useState([])
  const [pendingTopup,   setPendingTopup]   = useState([])
  const [pendingWithdraw, setPendingWithdraw] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/wallet/summary'),
      api.get('/wallet/transactions'),
      api.get('/topup/history'),
      isMitra ? api.get('/withdraw/history') : Promise.resolve({ data: { data: [] } }),
    ]).then(([s, t, tu, wd]) => {
      setSummary(s.data)
      setTransactions(t.data.data ?? [])
      const topups = (tu.data.data ?? []).filter(r => ['pending', 'processing', 'confirmed', 'rejected'].includes(r.status)).slice(0, 5)
      setPendingTopup(topups)
      const wds = (wd.data.data ?? []).filter(r => ['pending', 'processing', 'rejected'].includes(r.status)).slice(0, 5)
      setPendingWithdraw(wds)
    }).finally(() => setLoading(false))
  }, [isMitra])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '2.5px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 100 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ padding: '52px 20px 20px', background: 'linear-gradient(180deg, #0F1C22 0%, var(--k-bg) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Link to="/dashboard" style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--k-card)', border: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--k-muted)', textDecoration: 'none', fontSize: 18 }}>←</Link>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Wallet</h1>
        </div>

        {/* Balance Card */}
        <div style={{ borderRadius: 24, background: 'linear-gradient(135deg, #005C44 0%, #00A87D 50%, #00C896 100%)', padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: -30, bottom: -30, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

          <p style={{ color: 'rgba(12,12,22,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Saldo Tersedia</p>
          <p style={{ color: '#0C0C16', fontSize: 34, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 4 }}>
            {fmtRp(summary?.available ?? 0)}
          </p>
          {(summary?.locked_balance ?? 0) > 0 && (
            <p style={{ color: 'rgba(12,12,22,0.55)', fontSize: 12 }}>🔒 Terkunci: {fmtRp(summary.locked_balance)}</p>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Link to="/topup" style={{ flex: 1, display: 'block', textDecoration: 'none', padding: '11px 8px', borderRadius: 14, textAlign: 'center', background: 'rgba(12,12,22,0.2)', color: '#0C0C16', fontSize: 13, fontWeight: 700 }}>
              ⬇ Top Up
            </Link>
            {isMitra && (
              <Link to="/withdraw" style={{ flex: 1, display: 'block', textDecoration: 'none', padding: '11px 8px', borderRadius: 14, textAlign: 'center', background: 'rgba(12,12,22,0.2)', color: '#0C0C16', fontSize: 13, fontWeight: 700 }}>
                ⬆ Withdraw
              </Link>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Pending Requests */}
        {(pendingTopup.length > 0 || pendingWithdraw.length > 0) && (
          <div style={{ background: 'var(--k-card)', border: '1px solid rgba(246,173,85,0.3)', borderRadius: 20, padding: '16px 18px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#F6AD55', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              📋 Status Transaksi
            </p>
            {pendingTopup.map(r => (
              <PendingCard key={r.id}
                icon={r.method === 'qris' ? '⚡' : r.method === 'virtual_account' ? '🏦' : '📋'}
                label={`Top Up ${r.method === 'qris' ? 'QRIS' : r.method === 'virtual_account' ? 'Virtual Account' : 'Transfer Manual'}`}
                amount={r.amount} status={r.status} color="#00C896"
                type="topup" method={r.method} confirmedAt={r.confirmed_at} />
            ))}
            {pendingWithdraw.map(r => (
              <PendingCard key={r.id} icon="⬆️"
                label={`Withdraw ke ${r.destination_type?.toUpperCase()}`}
                amount={r.amount} status={r.status}
                note={r.status === 'rejected' ? r.notes : `${r.destination_name} · ${r.destination_number}`}
                color="#F6AD55" type="withdraw" processedAt={r.processed_at} />
            ))}
          </div>
        )}

        {/* Riwayat Transaksi */}
        <div>
          <p style={{ color: 'var(--k-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Riwayat Transaksi</p>

          {transactions.length === 0 ? (
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 10 }}>📭</p>
              <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Belum ada transaksi</p>
            </div>
          ) : (
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, overflow: 'hidden' }}>
              {transactions.map((tx, i) => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderTop: i === 0 ? 'none' : '1px solid var(--k-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                      background: isInfo(tx.type) ? 'rgba(246,173,85,0.1)' : isCredit(tx.type) ? 'rgba(0,200,150,0.1)' : 'rgba(245,101,101,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {TYPE_EMOJI[tx.type] ?? '💫'}
                    </div>
                    <div>
                      <p style={{ color: 'var(--k-text)', fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{TYPE_LABELS[tx.type] ?? tx.type}</p>
                      <p style={{ color: 'var(--k-muted)', fontSize: 12 }}>{fmtDate(tx.created_at)}</p>
                      {tx.description && isInfo(tx.type) && (
                        <p style={{ color: 'var(--k-muted)', fontSize: 11, marginTop: 1, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</p>
                      )}
                    </div>
                  </div>
                  {isInfo(tx.type) ? (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#F6AD55' }}>🔓 Dikembalikan</p>
                      <p style={{ fontSize: 13, color: 'var(--k-sub)' }}>{fmtRp(tx.amount)}</p>
                    </div>
                  ) : (
                    <p style={{ fontSize: 14, fontWeight: 700, flexShrink: 0, color: isCredit(tx.type) ? 'var(--k-accent)' : '#F56565' }}>
                      {isCredit(tx.type) ? '+' : '−'}{fmtRp(tx.amount)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Link ke riwayat lengkap */}
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/topup" style={{ flex: 1, padding: '12px', borderRadius: 14, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-sub)', textDecoration: 'none', fontSize: 13, fontWeight: 700, textAlign: 'center', display: 'block' }}>
            Riwayat Top Up
          </Link>
          {isMitra && (
            <Link to="/withdraw" style={{ flex: 1, padding: '12px', borderRadius: 14, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-sub)', textDecoration: 'none', fontSize: 13, fontWeight: 700, textAlign: 'center', display: 'block' }}>
              Riwayat Withdraw
            </Link>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
