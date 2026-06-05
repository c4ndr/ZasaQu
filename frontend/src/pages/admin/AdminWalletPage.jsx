import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

const fmtRp  = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtDt  = (s) => s ? new Date(s).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '-'

const TYPE_LABEL = {
  topup:              { label: 'Top Up',          color: '#10B981', sign: '+' },
  withdraw:           { label: 'Withdraw',         color: '#EF4444', sign: '-' },
  order_payment:      { label: 'Bayar Order',      color: '#EF4444', sign: '-' },
  order_income:       { label: 'Pendapatan',       color: '#10B981', sign: '+' },
  commission:         { label: 'Komisi',           color: '#EF4444', sign: '-' },
  platform_commission:{ label: 'Komisi Platform',  color: '#EF4444', sign: '-' },
  refund:             { label: 'Refund',           color: '#10B981', sign: '+' },
  mart_payment:       { label: 'Bayar Mart',       color: '#EF4444', sign: '-' },
  mart_refund:        { label: 'Refund Mart',      color: '#10B981', sign: '+' },
  admin_credit:       { label: 'Kredit Admin',     color: '#6366F1', sign: '+' },
  admin_debit:        { label: 'Debit Admin',      color: '#F59E0B', sign: '-' },
  jastip_discount:    { label: 'Diskon Jastip',    color: '#10B981', sign: '+' },
}

const ROLE_LABEL = {
  customer:   'Customer',
  mitra_motor:'Mitra Motor',
  mitra_mobil:'Mitra Mobil',
  seller:     'Pedagang',
  merchant:   'Merchant',
}

// ── Chip warna role ──────────────────────────────────────────────────────────
function RoleChip({ role }) {
  const colors = {
    customer:    '#3B82F6',
    mitra_motor: '#10B981',
    mitra_mobil: '#059669',
    seller:      '#8B5CF6',
    merchant:    '#F97316',
  }
  const c = colors[role] || '#6B7280'
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: c + '22', color: c }}>
      {ROLE_LABEL[role] || role}
    </span>
  )
}

// ── Modal detail user + adjust ───────────────────────────────────────────────
function UserWalletModal({ user, onClose, onRefresh }) {
  const [tab,      setTab]      = useState('adjust') // 'adjust' | 'history'
  const [mode,     setMode]     = useState('credit')  // 'credit' | 'debit'
  const [amount,   setAmount]   = useState('')
  const [reason,   setReason]   = useState('')
  const [msg,      setMsg]      = useState('')
  const [loading,  setLoading]  = useState(false)
  const [txs,      setTxs]      = useState(null)
  const [txPage,   setTxPage]   = useState(1)

  const balance = user.wallet?.balance ?? 0
  const locked  = user.wallet?.locked_balance ?? 0
  const avail   = balance - locked

  const submit = async () => {
    if (!amount || Number(amount) < 100) { setMsg('Minimal Rp 100'); return }
    if (mode === 'debit' && !reason.trim()) { setMsg('Alasan wajib diisi untuk pengurangan'); return }
    setLoading(true); setMsg('')
    try {
      if (mode === 'credit') {
        await api.post(`/admin/users/${user.id}/add-balance`, { amount: Number(amount), note: reason || 'Penambahan saldo admin' })
      } else {
        await api.post(`/admin/users/${user.id}/deduct-balance`, { amount: Number(amount), reason })
      }
      setMsg(mode === 'credit' ? '✓ Saldo berhasil ditambahkan' : '✓ Saldo berhasil dikurangi')
      setAmount(''); setReason('')
      onRefresh()
    } catch (e) {
      setMsg('⚠ ' + (e.response?.data?.message ?? 'Gagal'))
    } finally { setLoading(false) }
  }

  const loadTxs = useCallback(async (page = 1) => {
    try {
      const r = await api.get(`/admin/users/${user.id}/wallet-transactions`, { params: { page } })
      setTxs(r.data); setTxPage(page)
    } catch {}
  }, [user.id])

  useEffect(() => { if (tab === 'history') loadTxs(1) }, [tab, loadTxs])

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 9001,
        width: '100%', maxWidth: 440, background: 'var(--k-surface)',
        borderLeft: '1px solid var(--k-border)', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        animation: 'drawerIn 0.28s cubic-bezier(0.34,1.2,0.64,1)',
      }}>
        <style>{`@keyframes drawerIn { from { transform: translateX(100%); opacity:0 } to { transform: translateX(0); opacity:1 } }`}</style>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--k-border)', background: 'var(--k-card)', position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--k-input)', border: '1px solid var(--k-border)', cursor: 'pointer', fontSize: 16, color: 'var(--k-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>{user.name}</p>
            <p style={{ fontSize: 11, color: 'var(--k-muted)', margin: 0 }}>{user.email ?? user.phone}</p>
          </div>
          <RoleChip role={user.role} />
        </div>

        {/* Saldo card */}
        <div style={{ margin: '16px 16px 0', borderRadius: 16, padding: '16px', background: 'linear-gradient(135deg,#1E1B4B,#312E81)' }}>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>💰 Total Saldo</p>
          <p style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: 0 }}>{fmtRp(balance)}</p>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <div><p style={{ color: '#86EFAC', fontSize: 12, fontWeight: 700 }}>{fmtRp(avail)}</p><p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Tersedia</p></div>
            {locked > 0 && <div><p style={{ color: '#FCD34D', fontSize: 12, fontWeight: 700 }}>{fmtRp(locked)}</p><p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Dikunci</p></div>}
          </div>
        </div>

        {/* Tab */}
        <div style={{ display: 'flex', gap: 0, margin: '16px 16px 0', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--k-border)' }}>
          {[['adjust','⚙️ Adjust'], ['history','📋 Riwayat']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                background: tab === k ? 'var(--k-accent)' : 'var(--k-card)',
                color: tab === k ? '#0C0C16' : 'var(--k-muted)' }}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'adjust' && (
          <div style={{ padding: '16px' }}>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[['credit','➕ Tambah Saldo','#10B981'],['debit','➖ Kurangi Saldo','#EF4444']].map(([m,l,c]) => (
                <button key={m} onClick={() => { setMode(m); setMsg('') }}
                  style={{ flex: 1, padding: '12px 8px', borderRadius: 12, border: `2px solid ${mode===m ? c : 'var(--k-border)'}`,
                    background: mode===m ? c+'18' : 'var(--k-card)', color: mode===m ? c : 'var(--k-muted)',
                    fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                  {l}
                </button>
              ))}
            </div>

            {mode === 'debit' && (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 12 }}>
                <p style={{ color: '#EF4444', fontSize: 12, fontWeight: 600 }}>⚠️ Pengurangan saldo akan dicatat di audit log dan riwayat transaksi user.</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 6 }}>Jumlah (Rp)</p>
                <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="Contoh: 50000"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 15, fontWeight: 700, boxSizing: 'border-box' }} />
                {/* Quick amounts */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {[5000,10000,25000,50000,100000].map(n => (
                    <button key={n} onClick={() => setAmount(String(n))}
                      style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      {fmtRp(n)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 6 }}>
                  {mode === 'credit' ? 'Catatan (opsional)' : 'Alasan * (wajib)'}
                </p>
                <textarea value={reason} onChange={e => setReason(e.target.value)}
                  placeholder={mode === 'credit' ? 'Contoh: Kompensasi, Bonus, dll' : 'Contoh: Pelanggaran SOP, Denda pembatalan, dll'}
                  rows={3}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              {msg && (
                <div style={{ padding: '10px 12px', borderRadius: 10, background: msg.startsWith('✓') ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${msg.startsWith('✓') ? '#10B981' : '#EF4444'}44` }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith('✓') ? '#10B981' : '#EF4444', margin: 0 }}>{msg}</p>
                </div>
              )}

              <button onClick={submit} disabled={loading}
                style={{ padding: '14px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 14,
                  background: mode === 'credit' ? '#10B981' : '#EF4444', color: '#fff', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Memproses...' : mode === 'credit' ? '➕ Tambah Saldo' : '➖ Kurangi Saldo'}
              </button>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div style={{ padding: '16px' }}>
            {txs === null ? (
              <p style={{ textAlign: 'center', color: 'var(--k-muted)', padding: 32 }}>Memuat...</p>
            ) : txs.data?.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--k-muted)', padding: 32 }}>Belum ada transaksi</p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {txs.data.map(tx => {
                    const meta = TYPE_LABEL[tx.type] ?? { label: tx.type, color: '#6B7280', sign: '?' }
                    return (
                      <div key={tx.id} style={{ background: 'var(--k-card)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 14 }}>{meta.sign === '+' ? '↑' : '↓'}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-text)', margin: 0 }}>{meta.label}</p>
                          <p style={{ fontSize: 11, color: 'var(--k-muted)', margin: '2px 0 0' }}>{tx.description || '-'}</p>
                          <p style={{ fontSize: 10, color: 'var(--k-muted)', margin: '1px 0 0' }}>{fmtDt(tx.created_at)}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 13, fontWeight: 800, color: meta.color, margin: 0 }}>{meta.sign}{fmtRp(tx.amount)}</p>
                          <p style={{ fontSize: 10, color: 'var(--k-muted)', margin: '2px 0 0' }}>→ {fmtRp(tx.balance_after)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Pagination */}
                {txs.last_page > 1 && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                    <button disabled={txPage <= 1} onClick={() => loadTxs(txPage - 1)}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', cursor: 'pointer', fontSize: 13 }}>← Prev</button>
                    <span style={{ padding: '8px 12px', color: 'var(--k-muted)', fontSize: 12 }}>{txPage}/{txs.last_page}</span>
                    <button disabled={txPage >= txs.last_page} onClick={() => loadTxs(txPage + 1)}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', cursor: 'pointer', fontSize: 13 }}>Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminWalletPage() {
  const [search,   setSearch]   = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [users,    setUsers]    = useState(null)
  const [page,     setPage]     = useState(1)
  const [selected, setSelected] = useState(null)
  const [tab,      setTab]      = useState('users') // 'users' | 'log'
  const [log,      setLog]      = useState(null)
  const [logPage,  setLogPage]  = useState(1)

  const loadUsers = useCallback(async (p = 1) => {
    setUsers(null)
    try {
      const r = await api.get('/admin/wallet/search', { params: { search, role: roleFilter, page: p } })
      setUsers(r.data); setPage(p)
    } catch { setUsers({ data: [] }) }
  }, [search, roleFilter])

  const loadLog = useCallback(async (p = 1) => {
    setLog(null)
    try {
      const r = await api.get('/admin/wallet/adjustments', { params: { page: p } })
      setLog(r.data); setLogPage(p)
    } catch { setLog({ data: [] }) }
  }, [])

  useEffect(() => {
    if (tab === 'users') loadUsers(1)
    else loadLog(1)
  }, [tab, loadUsers, loadLog])

  useEffect(() => {
    const t = setTimeout(() => { if (tab === 'users') loadUsers(1) }, 400)
    return () => clearTimeout(t)
  }, [search, roleFilter, loadUsers, tab])

  const refreshSelected = async () => {
    if (!selected) return
    try {
      const r = await api.get(`/admin/users/${selected.id}`)
      setSelected(r.data)
    } catch {}
    loadUsers(page)
    if (tab === 'log') loadLog(logPage)
  }

  return (
    <AdminLayout title="Manajemen Saldo">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Hero */}
        <div style={{ borderRadius: 16, padding: '18px', background: 'linear-gradient(135deg,#1E1B4B,#312E81)' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>🏦 Manajemen Saldo</p>
          <p style={{ color: '#fff', fontSize: 16, fontWeight: 900, margin: 0 }}>Tambah & Kurangi Saldo User</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>Setiap perubahan dicatat di audit log & riwayat transaksi user</p>
        </div>

        {/* Tab */}
        <div style={{ display: 'flex', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--k-border)' }}>
          {[['users','👤 Cari User'],['log','📋 Log Penyesuaian']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ flex: 1, padding: '11px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                background: tab === k ? 'var(--k-accent)' : 'var(--k-card)',
                color: tab === k ? '#0C0C16' : 'var(--k-muted)' }}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <>
            {/* Search + filter */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama / email / telp..."
                style={{ flex: 1, padding: '11px 14px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13 }} />
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                style={{ padding: '11px 10px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 12, fontWeight: 700 }}>
                <option value="">Semua Role</option>
                <option value="customer">Customer</option>
                <option value="mitra_motor">Mitra Motor</option>
                <option value="mitra_mobil">Mitra Mobil</option>
                <option value="seller">Pedagang</option>
                <option value="merchant">Merchant</option>
              </select>
            </div>

            {/* User list */}
            {users === null ? (
              <p style={{ textAlign: 'center', color: 'var(--k-muted)', padding: 32 }}>Memuat...</p>
            ) : users.data?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)' }}>
                <p style={{ fontSize: 28 }}>🔍</p>
                <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Tidak ada user ditemukan</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {users.data.map(u => {
                    const bal = u.wallet?.balance ?? 0
                    const lck = u.wallet?.locked_balance ?? 0
                    return (
                      <div key={u.id} onClick={() => setSelected(u)}
                        style={{ background: 'var(--k-card)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--k-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                            <RoleChip role={u.role} />
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--k-muted)', margin: 0 }}>{u.email ?? u.phone}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 900, color: bal < 0 ? '#EF4444' : '#10B981', margin: 0 }}>{fmtRp(bal)}</p>
                          {lck > 0 && <p style={{ fontSize: 10, color: '#F59E0B', margin: '2px 0 0' }}>🔒 {fmtRp(lck)}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Pagination */}
                {users.last_page > 1 && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button disabled={page <= 1} onClick={() => loadUsers(page - 1)}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', cursor: 'pointer' }}>← Prev</button>
                    <span style={{ padding: '8px 12px', color: 'var(--k-muted)', fontSize: 12 }}>{page}/{users.last_page}</span>
                    <button disabled={page >= users.last_page} onClick={() => loadUsers(page + 1)}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', cursor: 'pointer' }}>Next →</button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === 'log' && (
          <>
            {log === null ? (
              <p style={{ textAlign: 'center', color: 'var(--k-muted)', padding: 32 }}>Memuat...</p>
            ) : log.data?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)' }}>
                <p style={{ fontSize: 28 }}>📋</p>
                <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Belum ada penyesuaian saldo oleh admin</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {log.data.map(tx => {
                    const isCredit = tx.type === 'admin_credit'
                    const user     = tx.wallet?.user
                    return (
                      <div key={tx.id} style={{ background: 'var(--k-card)', borderRadius: 14, padding: '14px 16px', border: `1px solid ${isCredit ? '#10B981' : '#EF4444'}33`, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: isCredit ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {isCredit ? '⬆️' : '⬇️'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', margin: 0 }}>{user?.name ?? 'User'}</p>
                            {user && <RoleChip role={user.role} />}
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--k-muted)', margin: '3px 0 0' }}>{tx.description || '-'}</p>
                          <p style={{ fontSize: 10, color: 'var(--k-muted)', margin: '2px 0 0' }}>{fmtDt(tx.created_at)}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 900, color: isCredit ? '#10B981' : '#EF4444', margin: 0 }}>
                            {isCredit ? '+' : '-'}{fmtRp(tx.amount)}
                          </p>
                          <p style={{ fontSize: 10, color: 'var(--k-muted)', margin: '2px 0 0' }}>→ {fmtRp(tx.balance_after)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {log.last_page > 1 && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button disabled={logPage <= 1} onClick={() => loadLog(logPage - 1)}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', cursor: 'pointer' }}>← Prev</button>
                    <span style={{ padding: '8px 12px', color: 'var(--k-muted)', fontSize: 12 }}>{logPage}/{log.last_page}</span>
                    <button disabled={logPage >= log.last_page} onClick={() => loadLog(logPage + 1)}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', cursor: 'pointer' }}>Next →</button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {selected && (
        <UserWalletModal
          user={selected}
          onClose={() => setSelected(null)}
          onRefresh={refreshSelected}
        />
      )}
    </AdminLayout>
  )
}
