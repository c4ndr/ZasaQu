import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

function formatRp(v) {
  const n = Number(v || 0)
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + ' jt'
  if (n >= 1_000)     return 'Rp ' + (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + ' rb'
  return 'Rp ' + n.toLocaleString('id-ID')
}
function formatRpFull(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
function pct(part, total) { return total > 0 ? Math.round((part / total) * 100) : 0 }
function growthLabel(curr, prev) {
  if (!prev) return null
  const diff = curr - prev
  const p    = Math.round(Math.abs(diff / prev) * 100)
  return { up: diff >= 0, label: `${diff >= 0 ? '+' : '-'}${p}% vs periode lalu` }
}

// ── Bar chart trend komisi (stacked per modul) ───────────────────────────────
const MODULE_COLORS = { zasago: '#00C896', food: '#F97316', mart: '#3B82F6', home: '#8B5CF6' }

function CommissionTrendChart({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.total), 1)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            {d.total > 0 && (
              <span style={{ fontSize: 9, color: 'var(--k-accent)', fontWeight: 700 }}>
                {formatRp(d.total)}
              </span>
            )}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column-reverse', borderRadius: '3px 3px 0 0', overflow: 'hidden', minHeight: d.total > 0 ? 6 : 0 }}>
              {['zasago','food','mart','home'].map(k => {
                const h = (d[k] / max) * 90
                return h > 0 ? (
                  <div key={k} style={{ width: '100%', height: h, background: MODULE_COLORS[k], transition: 'height 0.4s' }}
                    title={`${k}: ${formatRpFull(d[k])}`} />
                ) : null
              })}
            </div>
            <span style={{ fontSize: 9, color: 'var(--k-muted)', whiteSpace: 'nowrap' }}>{d.label}</span>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        {[['zasago','ZasaGo'],['food','ZasaFood'],['mart','ZasaMart'],['home','ZasaHome']].map(([k,l]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: MODULE_COLORS[k] }} />
            <span style={{ fontSize: 10, color: 'var(--k-muted)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Bar chart trend order ─────────────────────────────────────────────────────
function TrendChart({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.orders), 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
      {data.map((d, i) => {
        const pct = Math.max((d.orders / max) * 80, d.orders > 0 ? 6 : 0)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--k-accent)', fontWeight: 700, opacity: d.orders > 0 ? 1 : 0 }}>
              {d.orders}
            </span>
            <div
              style={{ width: '100%', height: pct, borderRadius: '4px 4px 0 0',
                background: `linear-gradient(180deg, var(--k-accent) 0%, rgba(0,200,150,0.4) 100%)`,
                transition: 'height 0.4s ease', minHeight: d.orders > 0 ? 6 : 0,
              }}
              title={`${d.label}: ${d.orders} order`}
            />
            <span style={{ fontSize: 10, color: 'var(--k-muted)', whiteSpace: 'nowrap' }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── StatCard — gaya banking, tinggi seragam ───────────────────────────────────
const CARD_COLORS = {
  blue:   { accent: '#00C896', stripe: '#00C896' },
  green:  { accent: '#00C896', stripe: '#00C896' },
  yellow: { accent: '#F6AD55', stripe: '#F6AD55' },
  red:    { accent: '#F56565', stripe: '#F56565' },
  gray:   { accent: 'var(--k-text)', stripe: 'var(--k-border2)' },
}

function StatCard({ label, value, sub = '', color = 'gray', link, icon }) {
  const c = CARD_COLORS[color] ?? CARD_COLORS.gray

  const inner = (
    <div style={{
      background: 'var(--k-card)',
      border: '1px solid var(--k-border)',
      borderLeft: `3px solid ${c.stripe}`,
      borderRadius: 14,
      padding: '14px 16px',
      cursor: link ? 'pointer' : 'default',
      height: 90,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      transition: 'box-shadow 0.2s, border-color 0.2s',
    }}
    onMouseEnter={e => { if (link) { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)'; e.currentTarget.style.borderColor = c.stripe } }}
    onMouseLeave={e => { if (link) { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--k-border)' } }}
    >
      {/* Baris atas: label + icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: 1 }}>
          {label}
        </p>
        {icon && <span style={{ fontSize: 15, lineHeight: 1, opacity: 0.55 }}>{icon}</span>}
      </div>

      {/* Baris bawah: nilai + sub */}
      <div>
        <p style={{ fontSize: 22, fontWeight: 900, color: c.accent, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 3 }}>
          {value}
        </p>
        <p style={{ fontSize: 10, color: 'var(--k-muted)', lineHeight: 1, minHeight: 12, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {sub}
        </p>
      </div>
    </div>
  )

  return link
    ? <Link to={link} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>
    : inner
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {title}
      </p>
      {action}
    </div>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [stats,       setStats]       = useState(null)
  const [trend,       setTrend]       = useState([])
  const [topMitra,    setTopMitra]    = useState([])
  const [commData,    setCommData]    = useState(null)
  const [commPeriod,  setCommPeriod]  = useState('month')
  const [commLoading, setCommLoading] = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [error,       setError]       = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const loadCommission = useCallback(async (period) => {
    setCommLoading(true)
    try {
      const r = await api.get(`/admin/stats/commission?period=${period}`)
      setCommData(r.data)
    } catch {}
    finally { setCommLoading(false) }
  }, [])

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    setError(null)
    try {
      const [s, t, m] = await Promise.all([
        api.get('/admin/stats/overview'),
        api.get('/admin/stats/order-trend?days=7'),
        api.get('/admin/stats/top-mitra'),
      ])
      setStats(s.data)
      setTrend(t.data)
      setTopMitra(m.data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memuat data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadCommission(commPeriod) }, [commPeriod, loadCommission])

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 14 }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Memuat dashboard...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AdminLayout>
  )

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error || !stats) return (
    <AdminLayout>
      <div style={{ background: 'rgba(245,101,101,0.08)', border: '1px solid rgba(245,101,101,0.25)', borderRadius: 16, padding: 24 }}>
        <p style={{ color: 'var(--k-danger)', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Gagal memuat dashboard</p>
        <p style={{ color: 'var(--k-muted)', fontSize: 13, marginBottom: 16 }}>{error}</p>
        <button onClick={() => loadData()} style={{ padding: '10px 20px', borderRadius: 12, background: 'var(--k-danger)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
          Coba Lagi
        </button>
      </div>
    </AdminLayout>
  )

  const needsAction = (stats.topup?.pending || 0) + (stats.withdraw?.pending || 0)
  const sinceRefresh = lastRefresh
    ? `${Math.floor((Date.now() - lastRefresh) / 60000)} menit lalu`
    : '—'

  return (
    <AdminLayout>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .dash-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .dash-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .dash-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .dash-cols   { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 900px) {
          .dash-grid-4 { grid-template-columns: repeat(2, 1fr); }
          .dash-grid-3 { grid-template-columns: repeat(2, 1fr); }
          .dash-cols   { grid-template-columns: 1fr; }
        }
        @media (max-width: 500px) {
          .dash-grid-4, .dash-grid-3, .dash-grid-2 { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* ── Sub-header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: 'var(--k-muted)' }}>
          Ringkasan platform ZasaQu
          {lastRefresh && <span style={{ marginLeft: 8, opacity: 0.55 }}>· {sinceRefresh}</span>}
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {needsAction > 0 && (
            <Link to="/admin/topup" style={{
              textDecoration: 'none',
              background: 'rgba(246,173,85,0.1)', border: '1px solid rgba(246,173,85,0.3)',
              color: '#F6AD55', fontSize: 12, fontWeight: 700, padding: '7px 12px', borderRadius: 10,
            }}>
              ⚠️ {needsAction} tindakan
            </Link>
          )}
          <button onClick={() => loadData(true)} disabled={refreshing} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: 'var(--k-card)', border: '1px solid var(--k-border)',
            color: 'var(--k-sub)', cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1,
          }}>
            <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.8s linear infinite' : 'none', fontSize: 15 }}>↻</span>
            {refreshing ? 'Memuat...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Baris 1: Pengguna (4 card) ── */}
        <section>
          <SectionHeader title="👥 Pengguna" action={
            <Link to="/admin/users" style={{ fontSize: 12, color: 'var(--k-accent)', textDecoration: 'none', fontWeight: 600 }}>Kelola →</Link>
          } />
          <div className="dash-grid-4">
            <StatCard label="Total" value={stats.users?.total ?? 0} link="/admin/users" color="blue" icon="👤" />
            <StatCard label="Pelanggan" value={stats.users?.pelanggan ?? 0} sub={`+${stats.users?.new_today ?? 0} hari ini`} icon="🛍️" />
            <StatCard label="Mitra" value={stats.users?.mitra ?? 0} icon="🏍️" />
            <StatCard label="Suspend / Ban"
              value={`${stats.users?.suspended ?? 0} / ${stats.users?.banned ?? 0}`}
              color={(stats.users?.suspended ?? 0) + (stats.users?.banned ?? 0) > 0 ? 'red' : 'gray'}
              link="/admin/users" icon="🚫" />
          </div>
        </section>

        {/* ── Baris 2: Order (4 card) + Trend chart ── */}
        <section>
          <SectionHeader title="📦 Order" action={
            <Link to="/admin/orders" style={{ fontSize: 12, color: 'var(--k-accent)', textDecoration: 'none', fontWeight: 600 }}>Kelola →</Link>
          } />
          <div className="dash-grid-4" style={{ marginBottom: 14 }}>
            <StatCard label="Total" value={stats.orders?.total ?? 0} color="blue" link="/admin/orders" icon="📦" />
            <StatCard label="Hari Ini" value={stats.orders?.today ?? 0} sub={`${stats.orders?.this_month ?? 0} bln ini`} icon="📅" />
            <StatCard label="Aktif" value={stats.orders?.active ?? 0} color={(stats.orders?.active ?? 0) > 0 ? 'blue' : 'gray'} link="/admin/orders" icon="🔄" />
            <StatCard label="JastipQu" value={stats.orders?.jastip_total ?? 0} color="blue" icon="⚡" />
          </div>
          <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '18px 20px 14px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Trend 7 Hari Terakhir
            </p>
            <TrendChart data={trend} />
          </div>
        </section>

        {/* ── Baris 3: Keuangan + Perlu Tindakan (side by side) ── */}
        <div className="dash-cols">
          <section>
            <SectionHeader title="💰 Keuangan" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <StatCard label="Total Saldo Platform" value={formatRp(stats.wallet?.total_balance)} color="green" icon="🏦" />
              <StatCard label="Komisi Hari Ini" value={formatRp(stats.revenue?.commission_today)}
                sub={`Bulan ini: ${formatRp(stats.revenue?.commission_this_month)}`} color="green" icon="📈" />
              <StatCard label="Top Up Bulan Ini" value={formatRp(stats.topup?.month_amount)}
                sub={`Withdraw: ${formatRp(stats.withdraw?.month_amount)}`} icon="💳" />
            </div>
          </section>
          <section>
            <SectionHeader title="⚠️ Perlu Tindakan" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <StatCard label="Top Up Pending" value={stats.topup?.pending ?? 0}
                color={(stats.topup?.pending ?? 0) > 0 ? 'yellow' : 'gray'}
                sub={(stats.topup?.pending ?? 0) > 0 ? 'Tap untuk konfirmasi' : 'Semua beres ✓'}
                link="/admin/topup" icon="💰" />
              <StatCard label="Withdraw Pending" value={stats.withdraw?.pending ?? 0}
                color={(stats.withdraw?.pending ?? 0) > 0 ? 'yellow' : 'gray'}
                sub={(stats.withdraw?.pending ?? 0) > 0 ? 'Tap untuk proses' : 'Semua beres ✓'}
                link="/admin/withdraw" icon="💸" />
            </div>
          </section>
        </div>

        {/* ── Komisi Detail ── */}
        <section>
          <SectionHeader title="💰 Komisi Platform" action={
            <div style={{ display: 'flex', gap: 4 }}>
              {[['today','Hari ini'],['week','Minggu'],['month','Bulan'],['all','Semua']].map(([k,l]) => (
                <button key={k} onClick={() => setCommPeriod(k)} style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: commPeriod === k ? 'var(--k-accent)' : 'var(--k-card)',
                  color: commPeriod === k ? '#0C0C16' : 'var(--k-muted)',
                  border: `1px solid ${commPeriod === k ? 'transparent' : 'var(--k-border)'}`,
                }}>{l}</button>
              ))}
            </div>
          } />

          {commLoading || !commData ? (
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: 32, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 22, height: 22, border: '2.5px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (() => {
            const growth = growthLabel(commData.grand_total, commData.prev_total)
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Total + growth */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0,200,150,0.12) 0%, rgba(0,200,150,0.04) 100%)',
                  border: '1.5px solid rgba(0,200,150,0.25)', borderRadius: 18, padding: '20px 22px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                      Total Komisi {commPeriod === 'today' ? 'Hari Ini' : commPeriod === 'week' ? 'Minggu Ini' : commPeriod === 'month' ? 'Bulan Ini' : 'Semua Waktu'}
                    </p>
                    <p style={{ fontSize: 30, fontWeight: 900, color: 'var(--k-accent)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {formatRpFull(commData.grand_total)}
                    </p>
                    {growth && (
                      <p style={{ fontSize: 11, color: growth.up ? 'var(--k-accent)' : 'var(--k-danger)', fontWeight: 600, marginTop: 4 }}>
                        {growth.up ? '▲' : '▼'} {growth.label}
                      </p>
                    )}
                  </div>
                  <div style={{ fontSize: 40, opacity: 0.5 }}>💰</div>
                </div>

                {/* Breakdown per modul */}
                <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--k-border)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Breakdown per Modul</p>
                  </div>
                  {commData.modules.map((mod) => {
                    const p = pct(mod.total, commData.grand_total)
                    return (
                      <div key={mod.key} style={{ padding: '13px 16px', borderTop: '1px solid var(--k-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: 18, flexShrink: 0 }}>{mod.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{mod.label}</span>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: mod.color }}>{formatRpFull(mod.total)}</span>
                                <span style={{ fontSize: 10, color: 'var(--k-muted)', marginLeft: 6 }}>{p}%</span>
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div style={{ height: 6, background: 'var(--k-border)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${p}%`, background: mod.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 14, paddingLeft: 28 }}>
                          <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>📦 {mod.count} order</span>
                          <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>⌀ {formatRp(mod.avg)}/order</span>
                          {mod.key === 'zasago' && mod.count > 0 && (
                            <>
                              <span style={{ fontSize: 11, color: '#3B82F6' }}>💳 Wallet {formatRp(mod.wallet)}</span>
                              <span style={{ fontSize: 11, color: '#F97316' }}>💵 COD {formatRp(mod.cod)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Trend chart */}
                {commData.trend?.length > 1 && (
                  <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '16px 18px' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
                      Trend Komisi Harian
                    </p>
                    <CommissionTrendChart data={commData.trend} />
                  </div>
                )}

                {/* Top mitra by commission */}
                {commData.top_mitra?.length > 0 && (
                  <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--k-border)' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        🏆 Top Mitra — Kontribusi Komisi Terbesar
                      </p>
                    </div>
                    {commData.top_mitra.map((m, i) => {
                      const p = pct(m.comm_sum, commData.grand_total)
                      return (
                        <div key={m.id} style={{
                          padding: '11px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--k-border)',
                          display: 'flex', alignItems: 'center', gap: 12,
                        }}>
                          <span style={{ fontSize: i < 3 ? 16 : 12, width: 22, textAlign: 'center', flexShrink: 0,
                            color: i===0?'#F6AD55':i===1?'#A0A0BC':i===2?'#CD7F32':'var(--k-muted)' }}>
                            {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                          </span>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: 'rgba(0,200,150,0.12)', border: '1.5px solid rgba(0,200,150,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 800, color: 'var(--k-accent)' }}>
                            {m.name[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</p>
                            <div style={{ height: 4, background: 'var(--k-border)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${p}%`, background: 'var(--k-accent)', borderRadius: 2 }} />
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-accent)' }}>{formatRp(m.comm_sum)}</p>
                            <p style={{ fontSize: 10, color: 'var(--k-muted)' }}>{m.order_count} order · {p}%</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

              </div>
            )
          })()}
        </section>

        {/* ── Baris 4: Top Mitra (full width) ── */}
        <section>
            <SectionHeader title="🏆 Top Mitra" />
            {topMitra.length === 0 ? (
              <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '32px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 28, marginBottom: 8 }}>🏍️</p>
                <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Belum ada data mitra</p>
              </div>
            ) : (
              <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, overflow: 'hidden' }}>
                {topMitra.slice(0, 5).map((m, i) => (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--k-border)',
                  }}>
                    <span style={{ fontSize: i < 3 ? 18 : 13, fontWeight: 700, width: 24, textAlign: 'center', flexShrink: 0,
                      color: i === 0 ? '#F6AD55' : i === 1 ? '#A0A0BC' : 'var(--k-muted)' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </span>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(99,179,237,0.15)', border: '2px solid rgba(99,179,237,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 800, color: 'var(--k-info)' }}>
                      {m.name[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: 'var(--k-text)', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
                      <p style={{ color: 'var(--k-muted)', fontSize: 10, textTransform: 'capitalize' }}>{m.role.replace('_',' ')}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ color: 'var(--k-text)', fontWeight: 700, fontSize: 13 }}>{m.completed_orders} order</p>
                      {m.avg_rating > 0 && <p style={{ color: '#F6AD55', fontSize: 11 }}>★ {Number(m.avg_rating).toFixed(1)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </section>

      </div>
    </AdminLayout>
  )
}

