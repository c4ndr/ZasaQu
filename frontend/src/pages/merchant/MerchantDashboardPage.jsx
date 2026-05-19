import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MerchantLayout from '../../components/MerchantLayout'
import api from '../../services/api'

function fmtRp(v)   { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
function fmtTime(d) { return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }

const STATUS_META = {
  pending:          { label: 'Menunggu',       color: '#F6AD55', bg: 'rgba(246,173,85,0.12)'  },
  merchant_accepted:{ label: 'Diterima',       color: '#63B3ED', bg: 'rgba(99,179,237,0.12)'  },
  preparing:        { label: 'Dimasak',        color: '#9F7AEA', bg: 'rgba(159,122,234,0.12)' },
  ready_for_pickup: { label: 'Siap Diambil',   color: '#00C896', bg: 'rgba(0,200,150,0.12)'   },
  mitra_on_pickup:  { label: 'Mitra Menuju',   color: '#63B3ED', bg: 'rgba(99,179,237,0.12)'  },
  completed:        { label: 'Selesai',        color: '#00C896', bg: 'rgba(0,200,150,0.12)'   },
  cancelled:        { label: 'Dibatalkan',     color: '#A0A0BC', bg: 'rgba(160,160,188,0.12)' },
  rejected:         { label: 'Ditolak',        color: '#F56565', bg: 'rgba(245,101,101,0.12)' },
}

export default function MerchantDashboardPage() {
  const navigate = useNavigate()
  const [merchant, setMerchant] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [toast,    setToast]    = useState(null)

  useEffect(() => {
    api.get('/food/merchant/profile')
      .then(r => setMerchant(r.data.data))
      .catch(() => setToast({ type: 'error', msg: 'Gagal memuat data toko.' }))
      .finally(() => setLoading(false))
  }, [])

  async function handleToggleOpen() {
    try {
      const res = await api.post('/food/merchant/toggle-open')
      setMerchant(m => ({ ...m, is_open: res.data.is_open }))
      showToast('success', res.data.message)
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal.')
    }
  }

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const statCard = (emoji, label, value, color = 'var(--k-text)') => (
    <div style={{
      padding: '20px', borderRadius: 14, background: 'var(--k-card)',
      border: '1.5px solid var(--k-border)', flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{emoji}</div>
      <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 20, color }}>{value}</div>
    </div>
  )

  if (loading) return <MerchantLayout title="Dashboard"><p style={{ color: 'var(--k-sub)' }}>Memuat...</p></MerchantLayout>

  const statusColor = { pending: '#F6AD55', active: '#00C896', suspended: '#F56565' }[merchant?.status] ?? '#A0A0BC'
  const statusLabel = { pending: 'Menunggu Persetujuan Admin', active: 'Toko Aktif', suspended: 'Toko Disuspend' }[merchant?.status] ?? merchant?.status

  return (
    <MerchantLayout title="Dashboard">
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600,
          background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff',
        }}>{toast.msg}</div>
      )}

      <div style={{ maxWidth: 780, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header toko */}
        <div style={{
          padding: '24px', borderRadius: 16, background: 'var(--k-card)',
          border: '1.5px solid var(--k-border)', display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
            background: 'var(--k-input)', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
          }}>
            {merchant?.logo_path
              ? <img src={`/storage/${merchant.logo_path}`} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '🏪'
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{merchant?.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                color: statusColor, background: `${statusColor}22`,
              }}>{statusLabel}</span>
              {merchant?.status === 'active' && (
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  color: merchant?.is_open ? '#00C896' : '#F56565',
                  background: merchant?.is_open ? 'rgba(0,200,150,0.12)' : 'rgba(245,101,101,0.12)',
                }}>
                  {merchant?.is_open ? 'Buka' : 'Tutup'}
                </span>
              )}
            </div>
          </div>
          {merchant?.status === 'active' && (
            <button onClick={handleToggleOpen} style={{
              padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13, flexShrink: 0,
              background: merchant?.is_open ? 'rgba(245,101,101,0.12)' : '#00C896',
              color: merchant?.is_open ? '#F56565' : '#fff',
            }}>
              {merchant?.is_open ? 'Tutup Sekarang' : 'Buka Sekarang'}
            </button>
          )}
        </div>

        {/* Pesan belum aktif */}
        {merchant?.status === 'pending' && (
          <div style={{
            padding: '20px', borderRadius: 14, background: 'rgba(246,173,85,0.1)',
            border: '1.5px solid rgba(246,173,85,0.3)', fontSize: 14,
          }}>
            <div style={{ fontWeight: 700, color: '#F6AD55', marginBottom: 4 }}>Menunggu Persetujuan Admin</div>
            <div style={{ color: 'var(--k-sub)' }}>
              Toko Anda sedang dalam review. Sambil menunggu, Anda bisa mengisi menu terlebih dahulu.
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { emoji: '🍽️', label: 'Kelola Menu', to: '/merchant/menu' },
            { emoji: '🛎️', label: 'Order Masuk', to: '/merchant/orders' },
            { emoji: '⚙️', label: 'Pengaturan', to: '/merchant/settings' },
          ].map(({ emoji, label, to }) => (
            <button key={to} onClick={() => navigate(to)} style={{
              flex: 1, minWidth: 120, padding: '16px', borderRadius: 14,
              border: '1.5px solid var(--k-border)', background: 'var(--k-card)',
              cursor: 'pointer', textAlign: 'center', color: 'var(--k-text)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{emoji}</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
            </button>
          ))}
        </div>

        {/* Info jam */}
        {(merchant?.open_time || merchant?.close_time) && (
          <div style={{
            padding: '16px 20px', borderRadius: 14, background: 'var(--k-card)',
            border: '1.5px solid var(--k-border)', display: 'flex', gap: 24,
          }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 2 }}>Jam Buka</div>
              <div style={{ fontWeight: 700 }}>{merchant?.open_time?.slice(0,5) || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 2 }}>Jam Tutup</div>
              <div style={{ fontWeight: 700 }}>{merchant?.close_time?.slice(0,5) || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 2 }}>Est. Waktu Masak</div>
              <div style={{ fontWeight: 700 }}>{merchant?.avg_prep_time_minutes} menit</div>
            </div>
          </div>
        )}
      </div>
    </MerchantLayout>
  )
}
