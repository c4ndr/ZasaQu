import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

function formatRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

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
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [error,       setError]       = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

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

