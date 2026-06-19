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
function todayStr() {
  return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KPI_COLORS = {
  green:  { bg: 'rgba(0,200,150,0.08)',   border: 'rgba(0,200,150,0.22)',   text: '#00C896',  badge: 'rgba(0,200,150,0.15)'  },
  blue:   { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.22)',  text: '#3B82F6',  badge: 'rgba(59,130,246,0.15)' },
  orange: { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.22)',  text: '#F97316',  badge: 'rgba(249,115,22,0.15)' },
  yellow: { bg: 'rgba(246,173,85,0.10)',  border: 'rgba(246,173,85,0.28)',  text: '#F6AD55',  badge: 'rgba(246,173,85,0.18)' },
  red:    { bg: 'rgba(245,101,101,0.08)', border: 'rgba(245,101,101,0.25)', text: '#F56565',  badge: 'rgba(245,101,101,0.15)'},
  purple: { bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.22)',  text: '#8B5CF6',  badge: 'rgba(139,92,246,0.15)' },
  gray:   { bg: 'var(--k-card)',          border: 'var(--k-border)',         text: 'var(--k-sub)', badge: 'var(--k-input)'   },
}

function KPICard({ label, value, sub, color = 'gray', link, icon }) {
  const c = KPI_COLORS[color] ?? KPI_COLORS.gray
  const inner = (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16,
      padding: '18px 18px', minHeight: 100, boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}
    onMouseEnter={e => { if (link) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${c.border}` } }}
    onMouseLeave={e => { if (link) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.3 }}>
          {label}
        </p>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: c.badge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
          {icon}
        </div>
      </div>
      <div>
        <p style={{ fontSize: 26, fontWeight: 900, color: c.text, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>
          {value}
        </p>
        {sub && <p style={{ fontSize: 11, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</p>}
      </div>
    </div>
  )
  return link
    ? <Link to={link} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>
    : inner
}

// ── Module Card ───────────────────────────────────────────────────────────────
function ModuleCard({ emoji, label, color, orders, commission, link }) {
  return (
    <Link to={link} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--k-card)', border: `1px solid var(--k-border)`,
        borderTop: `3px solid ${color}`, borderRadius: 14,
        padding: '14px 16px', cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px rgba(0,0,0,0.1)` }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 22 }}>{emoji}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)' }}>{label}</span>
        </div>
        <p style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1, marginBottom: 4 }}>{orders}</p>
        <p style={{ fontSize: 10, color: 'var(--k-muted)', marginBottom: 6 }}>order periode ini</p>
        <div style={{ height: 1, background: 'var(--k-border)', marginBottom: 6 }} />
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)' }}>{commission} komisi</p>
      </div>
    </Link>
  )
}

// ── Bar chart trend order ─────────────────────────────────────────────────────
const MODULE_COLORS = { zasago: '#00C896', food: '#F97316', mart: '#3B82F6', home: '#8B5CF6', serv: '#059669' }

function CommissionTrendChart({ data }) {
  if (!data?.length) return null
  const max    = Math.max(...data.map(d => d.total), 1)
  const step   = data.length > 14 ? Math.ceil(data.length / 7) : 1
  return (
    <div style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            {d.total > 0 && (
              <span style={{ fontSize: 8, color: 'var(--k-accent)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{formatRp(d.total)}</span>
            )}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column-reverse', borderRadius: '2px 2px 0 0', overflow: 'hidden', minHeight: d.total > 0 ? 4 : 0 }}>
              {['zasago','food','mart','home','serv'].map(k => {
                const h = (d[k] / max) * 88
                return h > 0 ? (
                  <div key={k} style={{ width: '100%', height: h, background: MODULE_COLORS[k] }} title={`${k}: ${formatRpFull(d[k])}`} />
                ) : null
              })}
            </div>
            <span style={{ fontSize: 8, color: i % step === 0 ? 'var(--k-muted)' : 'transparent', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100%' }}>{d.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        {[['zasago','ZasaGo'],['food','ZasaFood'],['mart','ZasaShop'],['home','ZasaHome'],['serv','ZasaServis']].map(([k,l]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: MODULE_COLORS[k] }} />
            <span style={{ fontSize: 10, color: 'var(--k-muted)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TrendChart({ data }) {
  if (!data?.length) return null
  const max  = Math.max(...data.map(d => d.orders), 1)
  const KEYS = ['zasago','food','mart','home','serv']
  return (
    <div style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
        {data.map((d, i) => {
          const totalH = Math.max((d.orders / max) * 90, d.orders > 0 ? 6 : 0)
          return (
            <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              {d.orders > 0 && (
                <span style={{ fontSize: 9, color: 'var(--k-sub)', fontWeight: 700 }}>{d.orders}</span>
              )}
              <div style={{ width: '100%', height: totalH, display: 'flex', flexDirection: 'column-reverse', borderRadius: '3px 3px 0 0', overflow: 'hidden', minHeight: d.orders > 0 ? 6 : 0 }}>
                {KEYS.map(k => {
                  const h = d.orders > 0 ? ((d[k] ?? 0) / max) * 90 : 0
                  return h > 0 ? (
                    <div key={k} style={{ width: '100%', height: h, background: MODULE_COLORS[k] }} title={`${k}: ${d[k] ?? 0} order`} />
                  ) : null
                })}
              </div>
              <span style={{ fontSize: 9, color: 'var(--k-muted)', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100%' }}>{d.label}</span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        {[['zasago','ZasaGo'],['food','ZasaFood'],['mart','ZasaShop'],['home','ZasaHome'],['serv','ZasaServis']].map(([k,l]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: MODULE_COLORS[k] }} />
            <span style={{ fontSize: 10, color: 'var(--k-muted)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Section header konsisten ──────────────────────────────────────────────────
function SectionHeader({ title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>{title}</p>
      <div style={{ flex: 1, height: 1, background: 'var(--k-border)' }} />
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
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
    } catch {} finally { setCommLoading(false) }
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
      setStats(s.data); setTrend(t.data); setTopMitra(m.data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memuat data.')
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadCommission(commPeriod) }, [commPeriod, loadCommission])

  if (loading) return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 360, gap: 14 }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Memuat dashboard...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AdminLayout>
  )

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

  const topupPending    = stats.topup?.pending    || 0
  const withdrawPending = stats.withdraw?.pending  || 0
  const needsAction     = topupPending + withdrawPending
  const sinceRefresh    = lastRefresh ? `${Math.floor((Date.now() - lastRefresh) / 60000)} mnt lalu` : '—'

  const moduleMap = {}
  if (commData?.modules) commData.modules.forEach(m => { moduleMap[m.key] = m })

  return (
    <AdminLayout>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        .dash-kpi    { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
        .dash-mod    { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
        .dash-cols   { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
        .dash-action { display: grid; grid-template-columns: 1fr 1fr;   gap: 12px; }
        @media (max-width: 900px) { .dash-cols { grid-template-columns: 1fr; } }
        @media (max-width: 500px) { .dash-action { grid-template-columns: 1fr 1fr; } }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--k-text)', letterSpacing: '-0.01em' }}>Dashboard</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--k-muted)' }}>
            {todayStr()}
            {lastRefresh && <span style={{ marginLeft: 8, opacity: 0.55 }}>· diperbarui {sinceRefresh}</span>}
          </p>
        </div>
        <button onClick={() => loadData(true)} disabled={refreshing} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700,
          background: 'var(--k-card)', border: '1px solid var(--k-border)',
          color: 'var(--k-sub)', cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1, flexShrink: 0,
        }}>
          <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.8s linear infinite' : 'none', fontSize: 15 }}>↻</span>
          {refreshing ? 'Memuat...' : 'Refresh'}
        </button>
      </div>

      {/* ── Alert: perlu tindakan ── */}
      {needsAction > 0 && (
        <div style={{
          marginBottom: 20, padding: '14px 18px', borderRadius: 14,
          background: 'rgba(246,173,85,0.1)', border: '1.5px solid rgba(246,173,85,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          animation: 'fadeUp 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(246,173,85,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>⚠️</div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 14, color: '#F6AD55', marginBottom: 2 }}>
                {needsAction} transaksi menunggu tindakan
              </p>
              <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>
                {topupPending > 0 && `${topupPending} top up`}
                {topupPending > 0 && withdrawPending > 0 && ' · '}
                {withdrawPending > 0 && `${withdrawPending} withdraw`}
                {' '}perlu diproses segera
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {topupPending > 0 && (
              <Link to="/admin/topup" style={{
                textDecoration: 'none', padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: '#F6AD55', color: '#0C0C16',
              }}>💰 Top Up ({topupPending})</Link>
            )}
            {withdrawPending > 0 && (
              <Link to="/admin/withdraw" style={{
                textDecoration: 'none', padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: 'rgba(246,173,85,0.2)', color: '#F6AD55', border: '1px solid rgba(246,173,85,0.4)',
              }}>💸 Withdraw ({withdrawPending})</Link>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── KPI Utama ── */}
        <section>
          <SectionHeader title="Ringkasan Platform" />
          <div className="dash-kpi">
            <KPICard label="Total Pengguna"  value={stats.users?.total ?? 0}
              sub={`+${stats.users?.new_today ?? 0} hari ini`}
              color="blue" icon="👥" link="/admin/users" />
            <KPICard label="Order Hari Ini"  value={stats.orders?.today ?? 0}
              sub={`${stats.orders?.active ?? 0} aktif · ${stats.orders?.this_month ?? 0} bulan ini`}
              color="green" icon="📦" link="/admin/orders" />
            <KPICard label="Komisi Hari Ini" value={formatRp(stats.revenue?.commission_today)}
              sub={`Bulan ini: ${formatRp(stats.revenue?.commission_this_month)}`}
              color="orange" icon="💰" />
            <KPICard label="Perlu Tindakan"  value={needsAction}
              sub={needsAction > 0 ? 'Tap untuk proses' : 'Semua beres ✓'}
              color={needsAction > 0 ? 'yellow' : 'gray'} icon={needsAction > 0 ? '⚠️' : '✓'} link="/admin/topup" />
          </div>
        </section>

        {/* ── Layanan breakdown ── */}
        <section>
          <SectionHeader title="Layanan" />
          <div className="dash-mod">
            {[
              { key: 'zasago', emoji: '🏍️', label: 'ZasaGo',   color: '#00C896', link: '/admin/orders'      },
              { key: 'food',   emoji: '🍜', label: 'ZasaFood', color: '#F97316', link: '/admin/food/orders' },
              { key: 'mart',   emoji: '🛒', label: 'ZasaShop', color: '#3B82F6', link: '/admin/mart/orders' },
              { key: 'home',   emoji: '🏠', label: 'ZasaHome', color: '#8B5CF6', link: '/admin/home/orders' },
              { key: 'serv',   emoji: '🔧', label: 'ZasaServis', color: '#059669', link: '/admin/serv/orders' },
            ].map(m => {
              const mod = moduleMap[m.key]
              return (
                <ModuleCard key={m.key}
                  emoji={m.emoji} label={m.label} color={m.color} link={m.link}
                  orders={mod ? mod.count : '—'}
                  commission={mod ? formatRp(mod.total) : '—'}
                />
              )
            })}
          </div>
        </section>

        {/* ── Chart trend + Keuangan ── */}
        <div className="dash-cols">
          {/* Trend 7 hari */}
          <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '20px 22px', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)' }}>Trend Order 7 Hari</p>
              <Link to="/admin/orders" style={{ fontSize: 12, color: 'var(--k-accent)', textDecoration: 'none', fontWeight: 600 }}>Lihat semua →</Link>
            </div>
            <TrendChart data={trend} />
          </div>

          {/* Keuangan sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '18px 20px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Keuangan</p>
              {[
                { label: 'Total Saldo Platform', value: formatRp(stats.wallet?.total_balance), icon: '🏦', color: '#00C896' },
                { label: 'Top Up Bulan Ini',     value: formatRp(stats.topup?.month_amount),   icon: '📥', color: '#3B82F6' },
                { label: 'Withdraw Bulan Ini',   value: formatRp(stats.withdraw?.month_amount), icon: '📤', color: '#F97316' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--k-border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--k-sub)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{r.icon}</span>{r.label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: r.color }}>{r.value}</span>
                </div>
              ))}
            </div>

            <div className="dash-action">
              <Link to="/admin/users" style={{ textDecoration: 'none' }}>
                <div style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '14px', cursor: 'pointer' }}>
                  <p style={{ fontSize: 20, marginBottom: 4 }}>👤</p>
                  <p style={{ fontSize: 20, fontWeight: 900, color: '#3B82F6', lineHeight: 1, marginBottom: 3 }}>{stats.users?.mitra ?? 0}</p>
                  <p style={{ fontSize: 10, color: 'var(--k-muted)', fontWeight: 600 }}>Mitra Aktif</p>
                </div>
              </Link>
              <Link to="/admin/orders" style={{ textDecoration: 'none' }}>
                <div style={{ background: 'rgba(0,200,150,0.07)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: 12, padding: '14px', cursor: 'pointer' }}>
                  <p style={{ fontSize: 20, marginBottom: 4 }}>⚡</p>
                  <p style={{ fontSize: 20, fontWeight: 900, color: '#00C896', lineHeight: 1, marginBottom: 3 }}>{stats.orders?.jastip_total ?? 0}</p>
                  <p style={{ fontSize: 10, color: 'var(--k-muted)', fontWeight: 600 }}>JastipQu</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Komisi Platform ── */}
        <section>
          <SectionHeader title="Komisi Platform" action={
            <div style={{ display: 'flex', gap: 4 }}>
              {[['today','Hari ini'],['week','Minggu'],['month','Bulan'],['all','Semua']].map(([k,l]) => (
                <button key={k} onClick={() => setCommPeriod(k)} style={{
                  padding: '5px 11px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
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
            const periodLabel = commPeriod === 'today' ? 'Hari Ini' : commPeriod === 'week' ? 'Minggu Ini' : commPeriod === 'month' ? 'Bulan Ini' : 'Semua Waktu'
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Total hero */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0,200,150,0.12) 0%, rgba(0,200,150,0.04) 100%)',
                  border: '1.5px solid rgba(0,200,150,0.25)', borderRadius: 18, padding: '22px 24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                      Total Komisi {periodLabel}
                    </p>
                    <p style={{ fontSize: 32, fontWeight: 900, color: 'var(--k-accent)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 6 }}>
                      {formatRpFull(commData.grand_total)}
                    </p>
                    {growth && (
                      <p style={{ fontSize: 12, color: growth.up ? 'var(--k-accent)' : 'var(--k-danger)', fontWeight: 700 }}>
                        {growth.up ? '▲' : '▼'} {growth.label}
                      </p>
                    )}
                  </div>
                  <div style={{ fontSize: 48, opacity: 0.4 }}>💰</div>
                </div>

                {/* Breakdown + Trend side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: commData.trend?.length > 1 ? '1fr 1fr' : '1fr', gap: 14, alignItems: 'start' }}>
                  {/* Breakdown per modul */}
                  <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--k-border)' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-sub)' }}>Breakdown per Modul</p>
                    </div>
                    {commData.modules.map(mod => {
                      const p = pct(mod.total, commData.grand_total)
                      return (
                        <div key={mod.key} style={{ padding: '13px 18px', borderTop: '1px solid var(--k-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{mod.emoji}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{mod.label}</span>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontSize: 13, fontWeight: 800, color: mod.color }}>{formatRpFull(mod.total)}</span>
                                  <span style={{ fontSize: 10, color: 'var(--k-muted)', marginLeft: 6 }}>{p}%</span>
                                </div>
                              </div>
                              <div style={{ height: 5, background: 'var(--k-border)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${p}%`, background: mod.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                              </div>
                            </div>
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--k-muted)', paddingLeft: 28 }}>
                            📦 {mod.count} order · ⌀ {formatRp(mod.avg)}/order
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Trend chart komisi */}
                  {commData.trend?.length > 1 && (
                    <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '16px 18px', minWidth: 0, overflow: 'hidden' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 14 }}>Trend Komisi Harian</p>
                      <CommissionTrendChart data={commData.trend} />
                    </div>
                  )}
                </div>

                {/* Top mitra komisi */}
                {commData.top_mitra?.length > 0 && (
                  <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--k-border)' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-sub)' }}>🏆 Top Mitra — Kontribusi Komisi</p>
                    </div>
                    {commData.top_mitra.map((m, i) => {
                      const p = pct(m.comm_sum, commData.grand_total)
                      return (
                        <div key={m.id} style={{ padding: '12px 18px', borderTop: i === 0 ? 'none' : '1px solid var(--k-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: i < 3 ? 16 : 12, width: 22, textAlign: 'center', flexShrink: 0 }}>
                            {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                          </span>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                            background: 'rgba(0,200,150,0.12)', border: '1.5px solid rgba(0,200,150,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--k-accent)' }}>
                            {m.name[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{m.name}</p>
                            <div style={{ height: 4, background: 'var(--k-border)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${p}%`, background: 'var(--k-accent)', borderRadius: 2 }} />
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-accent)' }}>{formatRp(m.comm_sum)}</p>
                            <p style={{ fontSize: 10, color: 'var(--k-muted)' }}>{m.order_count} order</p>
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

        {/* ── Top Mitra (by order) ── */}
        <section style={{ paddingBottom: 40 }}>
          <SectionHeader title="Top Mitra (Order Selesai)" action={
            <Link to="/admin/mitra/verify" style={{ fontSize: 12, color: 'var(--k-accent)', textDecoration: 'none', fontWeight: 600 }}>Kelola mitra →</Link>
          } />
          {topMitra.length === 0 ? (
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>🏍️</p>
              <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Belum ada data mitra</p>
            </div>
          ) : (
            <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, overflow: 'hidden' }}>
              {topMitra.slice(0, 5).map((m, i) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderTop: i === 0 ? 'none' : '1px solid var(--k-border)' }}>
                  <span style={{ fontSize: i < 3 ? 18 : 13, fontWeight: 700, width: 24, textAlign: 'center', flexShrink: 0 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </span>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(99,179,237,0.15)', border: '2px solid rgba(99,179,237,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#63B3ED' }}>
                    {m.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'var(--k-text)', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{m.name}</p>
                    <p style={{ color: 'var(--k-muted)', fontSize: 11, textTransform: 'capitalize' }}>{m.role.replace('_',' ')}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: 'var(--k-text)', fontWeight: 800, fontSize: 14 }}>{m.completed_orders}</p>
                    <p style={{ color: 'var(--k-muted)', fontSize: 10 }}>
                      {m.avg_rating > 0 ? `★ ${Number(m.avg_rating).toFixed(1)}` : 'order'}
                    </p>
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
