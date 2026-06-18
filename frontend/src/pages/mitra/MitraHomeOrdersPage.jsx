import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import api from '../../services/api'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtTime = (d) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const STATUS_LABEL = {
  confirmed:   { label: 'Dikonfirmasi',    next: 'traveling',   nextLabel: 'Saya Berangkat ke Lokasi' },
  traveling:   { label: 'Menuju Lokasi',   next: 'in_progress', nextLabel: 'Mulai Pengerjaan' },
  in_progress: { label: 'Sedang Dikerjakan', next: 'completed', nextLabel: 'Selesai' },
  picked_up:   { label: 'Diambil',         next: 'processing',  nextLabel: 'Mulai Proses' },
  processing:  { label: 'Sedang Diproses', next: 'ready',       nextLabel: 'Tandai Siap' },
  ready:       { label: 'Siap Diantar',    next: 'delivering',  nextLabel: 'Mulai Antar' },
  delivering:  { label: 'Dalam Pengiriman',next: 'completed',   nextLabel: 'Selesai Diantar' },
}

function CategoryIcon({ category }) {
  const icons = { laundry: '👕', pijat: '💆', cleaning: '🧹', tukang: '🔧', lainnya: '🏠' }
  return <span>{icons[category] ?? '🏠'}</span>
}

function ActiveCard({ order, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const navigate  = useNavigate()
  const info     = STATUS_LABEL[order.status]
  const category = order.provider?.category ?? 'lainnya'
  const isOnSite = category !== 'laundry'

  const updateStatus = async () => {
    if (!info?.next) return
    setLoading(true)
    try {
      await api.patch(`/home/mitra/orders/${order.id}/status`, { status: info.next })
      onUpdate()
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal update status.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      background: 'var(--k-card)', border: '1px solid var(--k-border)',
      borderRadius: 20, padding: '18px 16px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14, fontSize: 22,
          background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><CategoryIcon category={category} /></div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--k-text)' }}>{info?.label ?? order.status}</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', fontFamily: 'monospace' }}>#{order.order_number}</p>
        </div>
        <p style={{ fontSize: 16, fontWeight: 900, color: '#EAB308' }}>{fmtRp(order.provider_income)}</p>
      </div>

      {/* Provider */}
      {order.provider && (
        <div style={{ background: 'var(--k-surface)', borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', fontWeight: 700, marginBottom: 2 }}>LAYANAN</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{order.provider.name}</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{order.provider.category}</p>
        </div>
      )}

      {/* Lokasi */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 14, marginTop: 1 }}>📍</span>
          <div>
            <p style={{ fontSize: 10, color: 'var(--k-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              {isOnSite ? 'Lokasi Layanan' : 'Ambil'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--k-text)' }}>{order.pickup_address}</p>
          </div>
        </div>
        {!isOnSite && order.delivery_address && (
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 14, marginTop: 1 }}>🏁</span>
            <div>
              <p style={{ fontSize: 10, color: 'var(--k-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Antar</p>
              <p style={{ fontSize: 13, color: 'var(--k-text)' }}>{order.delivery_address}</p>
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      {order.items?.length > 0 && (
        <div style={{ background: 'var(--k-surface)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
          {order.items.map((item, i) => (
            <p key={i} style={{ fontSize: 12, color: 'var(--k-text)', marginBottom: i < order.items.length - 1 ? 4 : 0 }}>
              {item.quantity}× {item.service_name} — {fmtRp(item.subtotal)}
            </p>
          ))}
        </div>
      )}

      {/* Customer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, fontSize: 14, fontWeight: 700,
          background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EAB308',
        }}>{order.customer?.name?.[0]?.toUpperCase()}</div>
        <p style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{order.customer?.name}</p>
        <Link
          to={`/mitra/home/orders/${order.id}/chat`}
          state={{ otherName: order.customer?.name }}
          style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none', flexShrink: 0 }}
        >💬</Link>
      </div>

      {info?.next && (
        <button onClick={updateStatus} disabled={loading} style={{
          width: '100%', padding: '14px', borderRadius: 16,
          background: '#EAB308', color: '#1C1917',
          fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(234,179,8,0.35)',
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Memproses...' : info.nextLabel}
        </button>
      )}
    </div>
  )
}

function AvailableCard({ order, onAccept }) {
  const [loading, setLoading] = useState(false)
  const category = order.provider?.category ?? 'lainnya'

  const accept = async () => {
    setLoading(true)
    try {
      await api.post(`/home/mitra/orders/${order.id}/accept`)
      onAccept()
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menerima order.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      background: 'var(--k-card)', border: '1px solid var(--k-border)',
      borderRadius: 16, padding: '14px 16px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CategoryIcon category={category} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>
              {order.provider?.name ?? 'ZasaHome'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--k-muted)', fontFamily: 'monospace' }}>#{order.order_number}</p>
          </div>
        </div>
        <p style={{ fontSize: 16, fontWeight: 900, color: '#EAB308' }}>{fmtRp(order.provider_income)}</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <span>📍</span>
        <p style={{ fontSize: 13, color: 'var(--k-text)' }}>{order.pickup_address}</p>
      </div>

      {order.items?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {order.items.slice(0, 2).map((item, i) => (
            <p key={i} style={{ fontSize: 12, color: 'var(--k-muted)' }}>
              {item.quantity}× {item.service_name}
            </p>
          ))}
          {order.items.length > 2 && (
            <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>+{order.items.length - 2} lainnya</p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{fmtTime(order.created_at)}</p>
        <button onClick={accept} disabled={loading} style={{
          background: '#EAB308', color: '#1C1917',
          border: 'none', borderRadius: 12, padding: '9px 18px',
          fontSize: 13, fontWeight: 800, cursor: 'pointer',
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? '...' : 'Terima'}
        </button>
      </div>
    </div>
  )
}

export default function MitraHomeOrdersPage() {
  const [active,    setActive]    = useState(null)
  const [available, setAvailable] = useState([])
  const [history,   setHistory]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('active')

  const silentRefresh = useCallback(async () => {
    try {
      const [actRes, avRes] = await Promise.all([
        api.get('/home/mitra/active'),
        api.get('/home/mitra/available'),
      ])
      const act = actRes.data
      setActive((act?.id && act?.order_number && act?.status) ? act : null)
      setAvailable(Array.isArray(avRes.data) ? avRes.data : [])
    } catch {}
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    await silentRefresh()
    setLoading(false)
  }, [silentRefresh])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/home/mitra/history')
      setHistory(res.data.data || [])
    } catch {}
  }, [])

  const handleAccept = useCallback(async () => {
    await silentRefresh()
    setTab('active')
  }, [silentRefresh])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { if (tab === 'history') fetchHistory() }, [tab, fetchHistory])

  const tabs = [
    { key: 'active',    label: 'Aktif',    badge: active ? 1 : 0,  badgeColor: null },
    { key: 'available', label: 'Tersedia', badge: available.length, badgeColor: '#EF4444' },
    { key: 'history',   label: 'Riwayat',  badge: 0,               badgeColor: null },
  ]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', color: 'var(--k-text)', fontFamily: 'system-ui,sans-serif', paddingBottom: 80 }}>
      <nav style={{
        background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <Link to="/mitra/orders" style={{
          width: 36, height: 36, borderRadius: 10, background: 'var(--k-card)',
          border: '1px solid var(--k-border)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'var(--k-muted)', textDecoration: 'none', fontSize: 18,
        }}>←</Link>
        <div>
          <p style={{ fontWeight: 800, fontSize: 16 }}>ZasaHome</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>🏠 Layanan Rumah</p>
        </div>
        <button onClick={fetchData} style={{
          marginLeft: 'auto', background: 'var(--k-card)', border: '1px solid var(--k-border)',
          borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--k-muted)',
        }}>↻</button>
      </nav>

      <div style={{ padding: '16px 16px 32px' }}>
        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--k-card)', borderRadius: 14, padding: 4 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: tab === t.key ? '#EAB308' : 'transparent',
              color: tab === t.key ? '#1C1917' : 'var(--k-muted)',
              fontWeight: 700, fontSize: 13, position: 'relative', transition: 'all 0.2s',
            }}>
              {t.label}
              {t.badge > 0 && (
                <span style={{
                  position: 'absolute', top: 5, right: 8,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: t.badgeColor ?? '#EAB308',
                  color: t.badgeColor ? '#fff' : '#1C1917',
                  fontSize: 10, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                  animation: t.badgeColor ? 'pulse 1.5s infinite' : 'none',
                }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 28, height: 28, border: '2.5px solid #EAB308', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : tab === 'active' ? (
          active ? (
            <ActiveCard order={active} onUpdate={silentRefresh} />
          ) : (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <p style={{ fontSize: 40, marginBottom: 10 }}>🏠</p>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Belum ada order aktif</p>
              <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 20 }}>Terima order dari tab Tersedia</p>
              {available.length > 0 && (
                <button onClick={() => setTab('available')} style={{
                  background: '#EAB308', color: '#1C1917',
                  border: 'none', borderRadius: 14, padding: '12px 24px',
                  fontSize: 13, fontWeight: 800, cursor: 'pointer',
                }}>
                  Lihat {available.length} Order Tersedia →
                </button>
              )}
            </div>
          )
        ) : tab === 'available' ? (
          available.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <p style={{ fontSize: 40, marginBottom: 10 }}>🏠</p>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Tidak ada order saat ini</p>
              <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>Order baru akan muncul di sini</p>
            </div>
          ) : (
            available.map(o => <AvailableCard key={o.id} order={o} onAccept={handleAccept} />)
          )
        ) : (
          history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <p style={{ fontSize: 40, marginBottom: 10 }}>📋</p>
              <p style={{ fontSize: 15, fontWeight: 700 }}>Belum ada riwayat</p>
            </div>
          ) : (
            history.map(o => (
              <div key={o.id} style={{
                background: 'var(--k-card)', border: '1px solid var(--k-border)',
                borderRadius: 14, padding: '12px 14px', marginBottom: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <p style={{ fontSize: 11, color: 'var(--k-muted)', fontFamily: 'monospace' }}>#{o.order_number}</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#EAB308' }}>+{fmtRp(o.provider_income)}</p>
                </div>
                <p style={{ fontSize: 12, color: 'var(--k-text)', marginBottom: 3 }}>{o.provider?.name}</p>
                <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{fmtTime(o.created_at)}</p>
              </div>
            ))
          )
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }
      `}</style>
      <BottomNav />
    </div>
  )
}
