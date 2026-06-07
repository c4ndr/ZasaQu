import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import MerchantLayout from '../../components/MerchantLayout'
import api, { storageUrl } from '../../services/api'
import echo from '../../services/echo'
import { useAuth } from '../../context/AuthContext'
import { playNewOrderChime, setupChimeUnlock } from '../../utils/systemNotif'

function fmtRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

export default function MerchantDashboardPage() {
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const [merchant, setMerchant] = useState(null)
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [toggling, setToggling] = useState(false)
  const [toast,    setToast]    = useState(null)
  const [pending,  setPending]  = useState(0)

  const load = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        api.get('/food/merchant/profile'),
        api.get('/food/merchant/statistics'),
      ])
      setMerchant(pRes.data.data)
      setStats(sRes.data.data)
      setPending(sRes.data.data?.pending_orders ?? 0)
    } catch { showToast('error', 'Gagal memuat data toko.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    setupChimeUnlock()
    load()
    // Real-time update pending count
    const ch = echo.channel(`App.Models.User.${user?.id}`)
    ch.listen('.food.order.created', () => { playNewOrderChime(); load() })
    ch.listen('.food.order.status',  () => load())
    return () => echo.leave(`App.Models.User.${user?.id}`)
  }, [load, user?.id])

  async function handleToggle() {
    if (toggling) return
    setToggling(true)
    try {
      const res = await api.post('/food/merchant/toggle-open')
      setMerchant(m => ({ ...m, is_open: res.data.is_open }))
      showToast('success', res.data.message)
    } catch (e) { showToast('error', e.response?.data?.message || 'Gagal.') }
    finally { setToggling(false) }
  }

  function showToast(type, msg) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  const statusColor = { pending: '#F6AD55', active: '#00C896', suspended: '#F56565' }[merchant?.status] ?? '#9CA3AF'
  const statusLabel = { pending: 'Menunggu Persetujuan Admin', active: 'Toko Aktif', suspended: 'Toko Disuspend' }[merchant?.status] ?? merchant?.status

  if (loading) return <MerchantLayout title="Dashboard"><div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--k-sub)' }}><div style={{ fontSize: 32, marginBottom: 10 }}>🍜</div>Memuat...</div></MerchantLayout>

  return (
    <MerchantLayout title="Dashboard" pendingCount={pending}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '11px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13,
          background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', whiteSpace: 'nowrap',
        }}>{toast.msg}</div>
      )}

      <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Kartu toko + toggle buka/tutup ── */}
        <div style={{
          borderRadius: 18, background: 'var(--k-card)', border: '1.5px solid var(--k-border)',
          overflow: 'hidden',
        }}>
          {/* Banner / header */}
          <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))', padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16, flexShrink: 0, overflow: 'hidden',
              background: 'var(--k-input)', border: '2.5px solid rgba(249,115,22,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
            }}>
              {merchant?.logo_path
                ? <img src={storageUrl(merchant.logo_path)} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '🏪'
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{merchant?.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  color: statusColor, background: `${statusColor}22`,
                }}>{statusLabel}</span>
              </div>
            </div>
          </div>

          {/* Toggle buka/tutup */}
          {merchant?.status === 'active' && (
            <button onClick={handleToggle} disabled={toggling} style={{
              width: '100%', padding: '16px 20px', border: 'none', cursor: toggling ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: merchant?.is_open ? 'rgba(0,200,150,0.08)' : 'rgba(245,101,101,0.08)',
              borderTop: '1px solid var(--k-border)',
              transition: 'background 0.3s',
            }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: merchant?.is_open ? '#027A48' : '#DC2626' }}>
                  {merchant?.is_open ? '🟢 Toko Sedang Buka' : '🔴 Toko Sedang Tutup'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--k-sub)', marginTop: 2 }}>
                  {merchant?.is_open ? 'Pelanggan dapat memesan sekarang' : 'Tap untuk buka toko'}
                </div>
              </div>
              {/* Toggle switch visual */}
              <div style={{
                width: 52, height: 28, borderRadius: 14, padding: 3, transition: 'background 0.3s',
                background: merchant?.is_open ? '#00C896' : '#D1D5DB',
                display: 'flex', alignItems: 'center',
                justifyContent: merchant?.is_open ? 'flex-end' : 'flex-start',
                flexShrink: 0,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                }}>
                  {toggling ? <div style={{ width: 10, height: 10, border: '2px solid #9CA3AF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : null}
                </div>
              </div>
            </button>
          )}
        </div>

        {/* ── Alert order pending ── */}
        {pending > 0 && (
          <button onClick={() => navigate('/merchant/orders')} style={{
            padding: '14px 18px', borderRadius: 14, border: '2px solid #F56565',
            background: 'rgba(220,38,38,0.08)', cursor: 'pointer', width: '100%', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 12,
            animation: 'ringAlert 2s infinite',
          }}>
            <style>{`@keyframes ringAlert{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.3)}50%{box-shadow:0 0 0 8px rgba(220,38,38,0)}}`}</style>
            <span style={{ fontSize: 28 }}>🔔</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#DC2626' }}>{pending} Pesanan Menunggu Konfirmasi!</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Tap untuk lihat dan terima order →</div>
            </div>
          </button>
        )}

        {/* ── Statistik hari ini ── */}
        {stats && (
          <>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--k-sub)', marginBottom: -8 }}>Hari Ini</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { emoji: '📦', label: 'Order', value: stats.orders_today, color: '#3B82F6' },
                { emoji: '💰', label: 'Omzet', value: fmtRp(stats.revenue_today), color: '#00C896' },
                { emoji: '⏳', label: 'Menunggu', value: stats.pending_orders, color: '#F59E0B', warn: stats.pending_orders > 0 },
                { emoji: '⭐', label: 'Rating', value: stats.average_rating > 0 ? `${stats.average_rating}/5` : '—', color: '#F59E0B' },
              ].map(({ emoji, label, value, color, warn }) => (
                <div key={label} style={{
                  padding: '16px', borderRadius: 14, background: 'var(--k-card)',
                  border: `1.5px solid ${warn ? '#F59E0B55' : 'var(--k-border)'}`,
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</div>
                  <div style={{ fontSize: 11, color: 'var(--k-sub)', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--k-sub)', marginBottom: -8 }}>Total Keseluruhan</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { emoji: '🛎️', label: 'Total Order', value: stats.total_orders },
                { emoji: '💵', label: 'Total Omzet', value: fmtRp(stats.total_revenue), color: '#00C896' },
              ].map(({ emoji, label, value, color }) => (
                <div key={label} style={{ padding: '16px', borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</div>
                  <div style={{ fontSize: 11, color: 'var(--k-sub)', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: color || 'var(--k-text)' }}>{value}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Jam operasional ── */}
        {(merchant?.open_time || merchant?.close_time) && (
          <div style={{ padding: '16px 18px', borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)', display: 'flex', gap: 0 }}>
            {[
              { label: 'Jam Buka', value: merchant?.open_time?.slice(0,5) || '—' },
              { label: 'Jam Tutup', value: merchant?.close_time?.slice(0,5) || '—' },
              { label: 'Est. Masak', value: `${merchant?.avg_prep_time_minutes || '?'} mnt` },
            ].map((item, i, arr) => (
              <div key={item.label} style={{
                flex: 1, textAlign: 'center',
                paddingRight: i < arr.length - 1 ? 0 : 0,
                borderRight: i < arr.length - 1 ? '1px solid var(--k-border)' : 'none',
              }}>
                <div style={{ fontSize: 11, color: 'var(--k-sub)', marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{item.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pesan belum aktif ── */}
        {merchant?.status === 'pending' && (
          <div style={{ padding: '18px', borderRadius: 14, background: 'rgba(246,173,85,0.1)', border: '1.5px solid rgba(246,173,85,0.3)' }}>
            <div style={{ fontWeight: 700, color: '#F6AD55', marginBottom: 4 }}>Menunggu Persetujuan Admin</div>
            <div style={{ color: 'var(--k-sub)', fontSize: 13 }}>Toko Anda sedang dalam review. Sambil menunggu, Anda bisa mengisi menu terlebih dahulu.</div>
          </div>
        )}

        {/* ── Quick actions ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { emoji: '🍽️', label: 'Kelola Menu', to: '/merchant/menu' },
            { emoji: '🛎️', label: 'Order Masuk', to: '/merchant/orders', badge: pending },
            { emoji: '⚙️', label: 'Pengaturan', to: '/merchant/settings' },
          ].map(({ emoji, label, to, badge }) => (
            <button key={to} onClick={() => navigate(to)} style={{
              padding: '16px 10px', borderRadius: 14, border: '1.5px solid var(--k-border)',
              background: 'var(--k-card)', cursor: 'pointer', textAlign: 'center', color: 'var(--k-text)',
              position: 'relative',
            }}>
              {badge > 0 && (
                <span style={{
                  position: 'absolute', top: 8, right: 8,
                  background: '#DC2626', color: '#fff', fontSize: 10, fontWeight: 800,
                  padding: '1px 5px', borderRadius: 20,
                }}>{badge}</span>
              )}
              <div style={{ fontSize: 26, marginBottom: 6 }}>{emoji}</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{label}</div>
            </button>
          ))}
        </div>
      </div>
    </MerchantLayout>
  )
}
