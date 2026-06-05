import { useState, useEffect } from 'react'
import MartSellerLayout from '../../components/MartSellerLayout'
import api from '../../services/api'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const TYPE_META = {
  order_income:  { label: 'Pendapatan Order', icon: '💰', color: '#22C55E' },
  mart_payment:  { label: 'Pembayaran',        icon: '🛒', color: '#6366F1' },
  mart_refund:   { label: 'Refund',            icon: '↩️', color: '#F59E0B' },
  topup_manual:  { label: 'Top Up Manual',     icon: '🏦', color: '#3B82F6' },
  topup_va:      { label: 'Top Up VA',         icon: '🏦', color: '#3B82F6' },
  topup_qris:    { label: 'Top Up QRIS',       icon: '📲', color: '#3B82F6' },
  withdraw:      { label: 'Penarikan',         icon: '💸', color: '#EF4444' },
}

function TxRow({ tx }) {
  const meta    = TYPE_META[tx.type] ?? { label: tx.type, icon: '💼', color: '#6366F1' }
  const isCredit = Number(tx.balance_after) >= Number(tx.balance_before)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--k-border)' }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
        {meta.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 2 }}>{meta.label}</p>
        <p style={{ fontSize: 11, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</p>
        <p style={{ fontSize: 10, color: 'var(--k-muted)', marginTop: 2 }}>{fmtDate(tx.created_at)}</p>
      </div>
      <p style={{ fontSize: 14, fontWeight: 800, color: isCredit ? '#22C55E' : '#EF4444', flexShrink: 0 }}>
        {isCredit ? '+' : '-'}{fmtRp(tx.amount)}
      </p>
    </div>
  )
}

export default function SellerWalletPage() {
  const [summary, setSummary] = useState(null)
  const [txs,     setTxs]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/wallet/summary'),
      api.get('/wallet/transactions'),
    ]).then(([s, t]) => {
      setSummary(s.data)
      setTxs(Array.isArray(t.data) ? t.data : (t.data?.data ?? []))
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Pisahkan transaksi ZasaShop dari lainnya
  const martTxs  = txs.filter(t => t.service_module === 'zasamart')
  const totalIncome = martTxs
    .filter(t => t.type === 'order_income')
    .reduce((s, t) => s + Number(t.amount), 0)

  if (loading) return (
    <MartSellerLayout title="Dompet Saya">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 24, height: 24, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </MartSellerLayout>
  )

  return (
    <MartSellerLayout title="Dompet Saya">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Saldo card */}
        <div style={{ background: 'linear-gradient(135deg,#1E1B4B,#312E81)', borderRadius: 20, padding: '24px 22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, top: -20, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 40, bottom: -30, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Saldo Tersedia</p>
          <p style={{ color: '#fff', fontSize: 34, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 4 }}>
            {fmtRp(summary?.available ?? summary?.balance ?? 0)}
          </p>
          {(summary?.locked_balance > 0) && (
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>🔒 Terkunci: {fmtRp(summary.locked_balance)}</p>
          )}
        </div>

        {/* Ringkasan pendapatan ZasaShop */}
        <div style={{ background: 'var(--k-card)', borderRadius: 16, border: '1px solid var(--k-border)', padding: '16px' }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', marginBottom: 12 }}>Ringkasan ZasaShop</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Total Pendapatan', value: fmtRp(totalIncome), icon: '💰', color: '#22C55E' },
              { label: 'Transaksi Mart',   value: martTxs.length,     icon: '📊', color: '#6366F1' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--k-bg)', borderRadius: 12, padding: '12px', border: '1px solid var(--k-border)' }}>
                <p style={{ fontSize: 10, color: 'var(--k-muted)', marginBottom: 4 }}>{s.icon} {s.label}</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Riwayat transaksi */}
        <div style={{ background: 'var(--k-card)', borderRadius: 16, border: '1px solid var(--k-border)', padding: '16px' }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', marginBottom: 4 }}>Riwayat Transaksi</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 12 }}>Semua aktivitas dompet Anda</p>
          {txs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--k-muted)' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>💳</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>Belum ada transaksi</p>
            </div>
          ) : (
            txs.map(tx => <TxRow key={tx.id} tx={tx} />)
          )}
        </div>

      </div>
    </MartSellerLayout>
  )
}
