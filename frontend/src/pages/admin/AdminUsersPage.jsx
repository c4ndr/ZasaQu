import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtFull = (d) => new Date(d).toLocaleString('id-ID')
const initial = (n) => (n || '?')[0].toUpperCase()
const hue     = (n) => [...(n || 'U')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360

const ROLE_META = {
  pelanggan:     { label: 'Pelanggan',      color: '#63B3ED', bg: 'rgba(99,179,237,0.12)'   },
  mitra_motor:   { label: 'Mitra Motor',    color: '#00C896', bg: 'rgba(0,200,150,0.12)'    },
  mitra_mobil:   { label: 'Mitra Mobil',    color: '#F6AD55', bg: 'rgba(246,173,85,0.12)'   },
  merchant:      { label: 'Merchant',       color: '#F97316', bg: 'rgba(249,115,22,0.12)'   },
  home_provider: { label: 'Home Provider',  color: '#6366F1', bg: 'rgba(99,102,241,0.12)'   },
  admin:         { label: 'Admin',          color: '#F56565', bg: 'rgba(245,101,101,0.12)'  },
}
const STATUS_META = {
  active:    { label: 'Aktif',      color: '#00C896', bg: 'rgba(0,200,150,0.12)'   },
  suspended: { label: 'Suspended',  color: '#F6AD55', bg: 'rgba(246,173,85,0.12)'  },
  banned:    { label: 'Banned',     color: '#F56565', bg: 'rgba(245,101,101,0.12)' },
}
const ORDER_STATUS = {
  pending:'#F6AD55', accepted:'#63B3ED', on_pickup:'#F6AD55', picked_up:'#F6AD55',
  on_delivery:'#B794F4', delivered:'#00C896', completed:'#00C896', cancelled:'#F56565',
}
const TX_EMOJI = { topup:'⬇️', withdraw:'⬆️', order_payment:'💳', order_income:'💰', commission:'🏷️', refund:'↩️', jastip_discount:'⚡' }
const TX_CREDIT = ['topup','order_income','refund','jastip_discount']

function Badge({ label, color, bg }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
      background: bg, color, border: `1px solid ${color}33`, display: 'inline-block' }}>
      {label}
    </span>
  )
}

function Avatar({ name, size = 40 }) {
  const h = hue(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${h},50%,32%)`, border: `1.5px solid hsl(${h},50%,45%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 800, color: '#fff',
    }}>{initial(name)}</div>
  )
}

// ── Drawer Detail Pengguna ────────────────────────────────────────────────────
function UserDetailDrawer({ userId, onClose, onStatusChange }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting,  setActing]  = useState(false)
  const [addBal,  setAddBal]  = useState('')
  const [addNote, setAddNote] = useState('')
  const [addMsg,  setAddMsg]  = useState('')

  useEffect(() => {
    setLoading(true)
    api.get(`/admin/users/${userId}`).then(r => setUser(r.data)).finally(() => setLoading(false))
  }, [userId])

  const changeStatus = async (status) => {
    setActing(true)
    try {
      await api.patch(`/admin/users/${userId}/status`, { status })
      const updated = await api.get(`/admin/users/${userId}`)
      setUser(updated.data)
      onStatusChange()
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status akun.')
    } finally {
      setActing(false)
    }
  }

  const handleAddBalance = async () => {
    if (!addBal || Number(addBal) < 1000) return
    setActing(true); setAddMsg('')
    try {
      await api.post(`/admin/users/${userId}/add-balance`, { amount: Number(addBal), note: addNote || 'Penambahan saldo admin' })
      setAddMsg('✓ Saldo berhasil ditambahkan')
      setAddBal(''); setAddNote('')
      const updated = await api.get(`/admin/users/${userId}`)
      setUser(updated.data)
      onStatusChange()
    } catch (e) { setAddMsg('⚠ ' + (e.response?.data?.message ?? 'Gagal')) }
    finally { setActing(false) }
  }

  const roleMeta   = user ? (ROLE_META[user.role]   ?? { label: user.role,   color: '#A0A0BC', bg: 'rgba(160,160,188,0.1)' }) : null
  const statusMeta = user ? (STATUS_META[user.status] ?? { label: user.status, color: '#A0A0BC', bg: 'rgba(160,160,188,0.1)' }) : null

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 9001,
        width: '100%', maxWidth: 480, background: 'var(--k-surface)',
        borderLeft: '1px solid var(--k-border)',
        overflowY: 'auto', display: 'flex', flexDirection: 'column',
        animation: 'drawerIn 0.28s cubic-bezier(0.34,1.2,0.64,1)',
      }}>
        <style>{`@keyframes drawerIn { from { transform: translateX(100%); opacity:0 } to { transform: translateX(0); opacity:1 } }`}</style>

        {/* Header drawer */}
        <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--k-card)', position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--k-card2)', border: '1px solid var(--k-border)', cursor: 'pointer', fontSize: 18, color: 'var(--k-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--k-text)' }}>Detail Pengguna</p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <div style={{ width: 28, height: 28, border: '3px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : user && (
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Profil */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Avatar name={user.name} size={60} />
              <div>
                <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--k-text)', marginBottom: 6 }}>{user.name}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Badge label={roleMeta.label} color={roleMeta.color} bg={roleMeta.bg} />
                  <Badge label={statusMeta.label} color={statusMeta.color} bg={statusMeta.bg} />
                </div>
              </div>
            </div>

            {/* Info kontak */}
            <div style={{ background: 'var(--k-card)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--k-border)' }}>
              {[
                { label: 'Email',     value: user.email || '—' },
                { label: 'Telepon',   value: user.phone || '—' },
                { label: 'ID Akun',   value: `#${user.id}`, mono: true },
                { label: 'Bergabung', value: fmtDate(user.created_at) },
                { label: 'Pelanggaran', value: user.violation_count > 0 ? `${user.violation_count}×` : '—', danger: user.violation_count > 0 },
                ...(user.mitra_detail?.vehicle_plate ? [{ label: 'Plat', value: user.mitra_detail.vehicle_plate, mono: true }] : []),
                ...(user.role === 'merchant'      ? [{ label: 'Toko',     value: user.food_merchant?.name || '—' }] : []),
                ...(user.role === 'home_provider' ? [{ label: 'Usaha',    value: user.home_provider?.name || '—' }] : []),
              ].map((row, i) => (
                <div key={row.label} style={{ padding: '11px 16px', display: 'flex', justifyContent: 'space-between', gap: 10, borderTop: i === 0 ? 'none' : '1px solid var(--k-border)' }}>
                  <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{row.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: row.danger ? 'var(--k-danger)' : 'var(--k-text)', fontFamily: row.mono ? 'monospace' : 'inherit', textAlign: 'right', maxWidth: '65%', wordBreak: 'break-all' }}>
                    {row.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Stats */}
            {user.stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                {[
                  { label: 'Total Order',   value: user.stats.total_orders,   fmt: false, color: '#63B3ED' },
                  { label: 'Total Pengeluaran', value: user.stats.total_spend, fmt: true,  color: '#F56565' },
                  { label: 'Total Pendapatan',  value: user.stats.total_income, fmt: true, color: '#00C896' },
                  { label: 'Total Top Up',  value: user.stats.total_topup,    fmt: true,  color: '#B794F4' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14, padding: '12px 14px' }}>
                    <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 6 }}>{s.label}</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: s.color }}>
                      {s.fmt ? fmtRp(s.value) : s.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Saldo & Tambah Saldo */}
            <div style={{ background: 'linear-gradient(135deg,#005C44,#00A87D)', borderRadius: 16, padding: '18px 20px' }}>
              <p style={{ color: 'rgba(12,12,22,0.6)', fontSize: 11, fontWeight: 700, marginBottom: 4, letterSpacing: '0.08em' }}>SALDO WALLET</p>
              <p style={{ color: '#0C0C16', fontSize: 26, fontWeight: 900, marginBottom: 12 }}>{fmtRp(user.wallet?.balance)}</p>

              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" value={addBal} onChange={e => setAddBal(e.target.value)} placeholder="Nominal (min. 1.000)"
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'rgba(12,12,22,0.15)', color: '#0C0C16', fontSize: 13, outline: 'none' }} />
                <button onClick={handleAddBalance} disabled={acting || !addBal || Number(addBal) < 1000}
                  style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#0C0C16', color: '#00C896', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: acting ? 0.6 : 1 }}>
                  + Tambah
                </button>
              </div>
              {addMsg && <p style={{ fontSize: 12, color: '#0C0C16', marginTop: 8, fontWeight: 600 }}>{addMsg}</p>}
            </div>

            {/* Kelola Status */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Kelola Status Akun</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {user.status !== 'active' && (
                  <button onClick={() => changeStatus('active')} disabled={acting} style={{ padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid #00C896', background: 'rgba(0,200,150,0.1)', color: '#00C896', opacity: acting ? 0.5 : 1 }}>
                    ✓ Aktifkan
                  </button>
                )}
                {user.status !== 'suspended' && (
                  <button onClick={() => changeStatus('suspended')} disabled={acting} style={{ padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid #F6AD55', background: 'rgba(246,173,85,0.1)', color: '#F6AD55', opacity: acting ? 0.5 : 1 }}>
                    ⏸ Suspend
                  </button>
                )}
                {user.status !== 'banned' && (
                  <button onClick={() => changeStatus('banned')} disabled={acting} style={{ padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid #F56565', background: 'rgba(245,101,101,0.08)', color: '#F56565', opacity: acting ? 0.5 : 1 }}>
                    ⛔ Ban
                  </button>
                )}
              </div>
            </div>

            {/* Riwayat Order */}
            {user.recent_orders?.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Order Terakhir</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {user.recent_orders.map(o => (
                    <div key={o.id} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-text)', fontFamily: 'monospace', marginBottom: 2 }}>{o.order_number}</p>
                        <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{fmtDate(o.created_at)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)', marginBottom: 4 }}>{fmtRp(o.shipping_fee)}</p>
                        <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: `${ORDER_STATUS[o.status] ?? '#A0A0BC'}18`, color: ORDER_STATUS[o.status] ?? '#A0A0BC' }}>
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Riwayat Transaksi */}
            {user.recent_transactions?.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Transaksi Terakhir</p>
                <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14, overflow: 'hidden' }}>
                  {user.recent_transactions.map((tx, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--k-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16 }}>{TX_EMOJI[tx.type] ?? '💫'}</span>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-text)' }}>{tx.type}</p>
                          <p style={{ fontSize: 10, color: 'var(--k-muted)' }}>{fmtDate(tx.created_at)}</p>
                        </div>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: TX_CREDIT.includes(tx.type) ? '#00C896' : '#F56565' }}>
                        {TX_CREDIT.includes(tx.type) ? '+' : '−'}{fmtRp(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [roleFilter,   setRoleFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page,         setPage]         = useState(1)
  const [selectedId,   setSelectedId]   = useState(null)
  const [acting,       setActing]       = useState(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page })
    if (search)       params.set('search', search)
    if (roleFilter)   params.set('role', roleFilter)
    if (statusFilter) params.set('status', statusFilter)
    api.get(`/admin/users?${params}`).then(r => setData(r.data)).finally(() => setLoading(false))
  }, [search, roleFilter, statusFilter, page])

  useEffect(() => { setPage(1) }, [search, roleFilter, statusFilter])
  useEffect(() => { fetchData() }, [fetchData])

  const quickStatus = async (userId, status) => {
    setActing(userId)
    try {
      await api.patch(`/admin/users/${userId}/status`, { status })
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status akun.')
    } finally {
      setActing(null)
    }
  }

  const users    = data?.data ?? []
  const meta     = data?.meta ?? data
  const lastPage = meta?.last_page ?? 1

  // Stats dari data halaman ini
  const activeCount    = users.filter(u => u.status === 'active').length
  const suspendedCount = users.filter(u => u.status === 'suspended').length
  const bannedCount    = users.filter(u => u.status === 'banned').length

  return (
    <AdminLayout>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {selectedId && (
        <UserDetailDrawer
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusChange={fetchData}
        />
      )}

      {/* Stats row */}
      {!loading && data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total', value: meta?.total ?? users.length, color: '#63B3ED' },
            { label: 'Aktif',     value: activeCount,    color: '#00C896' },
            { label: 'Suspended', value: suspendedCount, color: '#F6AD55' },
            { label: 'Banned',    value: bannedCount,    color: '#F56565' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--k-card)', border: `1px solid ${s.color}33`, borderRadius: 14, padding: '12px 16px' }}>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
        <input className="input-field" style={{ padding: '10px 14px', fontSize: 13 }}
          value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Cari nama / email..." />
        <select className="input-field" style={{ padding: '10px 14px', fontSize: 13 }}
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">Semua Role</option>
          <option value="pelanggan">Pelanggan</option>
          <option value="mitra_motor">Mitra Motor</option>
          <option value="mitra_mobil">Mitra Mobil</option>
          <option value="merchant">Merchant</option>
          <option value="home_provider">Home Provider</option>
        </select>
        <select className="input-field" style={{ padding: '10px 14px', fontSize: 13 }}
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {/* Tabel */}
      <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: 16 }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--k-border)', borderTop: '3px solid var(--k-accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ color: 'var(--k-muted)', fontSize: 14 }}>Memuat pengguna...</span>
          </div>
        ) : users.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: 12 }}>
            <span style={{ fontSize: 40 }}>👤</span>
            <span style={{ color: 'var(--k-muted)', fontSize: 14 }}>Tidak ada pengguna ditemukan</span>
          </div>
        ) : users.map((user, i) => {
          const rm = ROLE_META[user.role]   ?? { label: user.role,   color: '#A0A0BC', bg: 'rgba(160,160,188,0.1)' }
          const sm = STATUS_META[user.status] ?? { label: user.status, color: '#A0A0BC', bg: 'rgba(160,160,188,0.1)' }
          return (
            <div key={user.id} style={{ padding: '14px 18px', borderTop: i === 0 ? 'none' : '1px solid var(--k-border)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={user.name} size={42} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)' }}>{user.name}</span>
                  <Badge label={rm.label} color={rm.color} bg={rm.bg} />
                  <Badge label={sm.label} color={sm.color} bg={sm.bg} />
                  {user.violation_count > 0 && <Badge label={`${user.violation_count}× langgar`} color="#F56565" bg="rgba(245,101,101,0.1)" />}
                </div>
                <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 3 }}>{user.email}</p>
                <p style={{ fontSize: 12, color: 'var(--k-sub)' }}>
                  Saldo: <strong style={{ color: 'var(--k-text)' }}>{fmtRp(user.wallet?.balance)}</strong>
                  <span style={{ color: 'var(--k-muted)', marginLeft: 10 }}>· {fmtDate(user.created_at)}</span>
                </p>
              </div>

              {/* Aksi */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                <button onClick={() => setSelectedId(user.id)} style={{
                  padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: '1px solid var(--k-border)', background: 'var(--k-card2)', color: 'var(--k-sub)',
                }}>Detail</button>

                {user.status === 'active' ? (
                  <button onClick={() => quickStatus(user.id, 'suspended')} disabled={acting === user.id} style={{
                    padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: '1px solid #F6AD55', background: 'rgba(246,173,85,0.1)', color: '#F6AD55',
                    opacity: acting === user.id ? 0.5 : 1,
                  }}>Suspend</button>
                ) : (
                  <button onClick={() => quickStatus(user.id, 'active')} disabled={acting === user.id} style={{
                    padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: '1px solid #00C896', background: 'rgba(0,200,150,0.1)', color: '#00C896',
                    opacity: acting === user.id ? 0.5 : 1,
                  }}>Aktifkan</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Paginasi */}
      {lastPage > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
            padding: '8px 16px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)',
            color: 'var(--k-sub)', fontSize: 13, fontWeight: 700, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1,
          }}>← Prev</button>

          {Array.from({ length: Math.min(lastPage, 7) }, (_, i) => {
            const p = lastPage <= 7 ? i + 1 : Math.max(1, Math.min(page - 3, lastPage - 6)) + i
            return (
              <button key={p} onClick={() => setPage(p)} style={{
                width: 36, height: 36, borderRadius: 10, border: '1px solid var(--k-border)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                background: p === page ? 'var(--k-accent)' : 'var(--k-card)',
                color: p === page ? '#0C0C16' : 'var(--k-sub)',
              }}>{p}</button>
            )
          })}

          <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage} style={{
            padding: '8px 16px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)',
            color: 'var(--k-sub)', fontSize: 13, fontWeight: 700, cursor: page === lastPage ? 'not-allowed' : 'pointer', opacity: page === lastPage ? 0.4 : 1,
          }}>Next →</button>
        </div>
      )}
    </AdminLayout>
  )
}
