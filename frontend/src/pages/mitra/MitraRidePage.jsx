import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { useAuth } from '../../context/AuthContext'
import useGps from '../../hooks/useGps'
import api from '../../services/api'
import echo from '../../services/echo'

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n)

const STATUS_LABEL = {
  accepted:  { label: 'Menuju Pickup',     next: 'on_pickup',  nextLabel: 'Saya Sudah Tiba di Pickup',   emoji: '📍' },
  on_pickup: { label: 'Menunggu Customer', next: 'on_ride',    nextLabel: 'Mulai Perjalanan',             emoji: '🚗' },
  on_ride:   { label: 'Dalam Perjalanan',  next: 'completed',  nextLabel: 'Selesai - Sudah Sampai Tujuan', emoji: '🎉' },
}

function ActiveRideCard({ order, onUpdate }) {
  const navigate    = useNavigate()
  const [loading,   setLoading]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoURL,  setPhotoURL]  = useState(order.proof_photo_path ? `/storage/${order.proof_photo_path}` : null)
  const info        = STATUS_LABEL[order.status]
  const needPhoto   = order.ride_type === 'school' && info?.next === 'completed' && !photoURL

  const uploadPhoto = async (file) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('photo', file)
      const res = await api.post(`/ride/mitra/orders/${order.id}/proof-photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setPhotoURL(res.data.url)
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal upload foto.')
    } finally { setUploading(false) }
  }

  const takePhoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 80,
        allowEditing: false,
      })
      const res  = await fetch(photo.dataUrl)
      const blob = await res.blob()
      await uploadPhoto(new File([blob], 'bukti.jpg', { type: 'image/jpeg' }))
    } catch (e) {
      if (e?.message !== 'User cancelled photos app') {
        alert('Gagal buka kamera: ' + (e?.message || e))
      }
    }
  }

  const updateStatus = async () => {
    if (!info?.next) return
    if (needPhoto) { alert('Upload foto bukti tiba di sekolah dulu.'); return }
    setLoading(true)
    try {
      await api.patch(`/ride/mitra/orders/${order.id}/status`, { status: info.next })
      onUpdate()
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal update status.')
    } finally { setLoading(false) }
  }

  const canCancel = ['accepted', 'on_pickup'].includes(order.status)
  const cancelOrder = async () => {
    if (!window.confirm('Batalkan perjalanan ini? Tindakan ini tidak bisa dibatalkan.')) return
    setLoading(true)
    try {
      await api.patch(`/ride/mitra/orders/${order.id}/status`, { status: 'cancelled', reason: 'Dibatalkan oleh mitra' })
      onUpdate()
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal membatalkan perjalanan.')
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
          background: 'var(--k-glow)', border: '1px solid rgba(0,200,150,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{info?.emoji || '🚗'}</div>
        <div>
          <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--k-text)' }}>{info?.label || order.status}</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', fontFamily: 'monospace' }}>#{order.order_number}</p>
        </div>
        <p style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 900, color: 'var(--k-accent)' }}>
          Rp {fmt(order.fare)}
        </p>
      </div>

      {/* Rute */}
      <div style={{ marginBottom: 14 }}>
        {[
          { icon: '📍', label: 'Jemput', addr: order.pickup_address,      lat: order.pickup_lat,      lng: order.pickup_lng,      active: order.status === 'accepted' },
          { icon: '🏁', label: 'Tujuan', addr: order.destination_address, lat: order.destination_lat, lng: order.destination_lng, active: order.status === 'on_ride'   },
        ].map(({ icon, label, addr, lat, lng, active: isActive }) => {
          const mapsUrl = (lat && lng)
            ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`
          return (
            <div key={label} style={{
              display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start',
              background: isActive ? 'rgba(0,200,150,0.07)' : 'transparent',
              borderRadius: 10, padding: isActive ? '8px 10px' : '4px 0',
              border: isActive ? '1px solid rgba(0,200,150,0.2)' : 'none',
            }}>
              <span style={{ fontSize: 16, marginTop: 1 }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 10, color: isActive ? 'var(--k-accent)' : 'var(--k-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</p>
                <p style={{ fontSize: 13, color: 'var(--k-text)', wordBreak: 'break-word' }}>{addr}</p>
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flexShrink: 0,
                  background: isActive ? 'var(--k-accent)' : 'var(--k-surface)',
                  color: isActive ? '#0C0C16' : 'var(--k-muted)',
                  border: isActive ? 'none' : '1px solid var(--k-border)',
                  borderRadius: 9, padding: '6px 10px',
                  fontSize: 11, fontWeight: 700, textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 4,
                  boxShadow: isActive ? '0 2px 8px rgba(0,200,150,0.3)' : 'none',
                }}
              >
                🗺️ {isActive ? 'Buka Maps' : 'Maps'}
              </a>
            </div>
          )
        })}
      </div>

      {/* Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Jarak', value: `${order.distance_km} km` },
          { label: 'Bayar', value: order.payment_method === 'wallet' ? 'Wallet' : 'Tunai' },
          { label: 'Pendapatan', value: `Rp ${fmt(order.mitra_income)}` },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--k-surface)', borderRadius: 10, padding: '8px 10px' }}>
            <p style={{ fontSize: 10, color: 'var(--k-muted)', fontWeight: 700 }}>{label}</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-text)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Customer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, fontSize: 16, fontWeight: 700,
          background: 'var(--k-surface)', border: '1px solid var(--k-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--k-accent)',
        }}>{order.customer?.name?.[0]?.toUpperCase()}</div>
        <p style={{ fontSize: 13, fontWeight: 700 }}>{order.customer?.name}</p>
        <button
          onClick={() => navigate(`/ride/mitra/chat/${order.id}`, { state: { otherName: order.customer?.name } })}
          style={{
            marginLeft: 'auto', background: 'var(--k-glow)',
            border: '1px solid rgba(0,200,150,0.3)', borderRadius: 10,
            padding: '7px 12px', cursor: 'pointer', fontSize: 12,
            color: 'var(--k-accent)', fontWeight: 700,
          }}
        >💬 Chat</button>
      </div>

      {/* Foto wajib antar sekolah */}
      {order.ride_type === 'school' && info?.next === 'completed' && (
        <div style={{
          background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 14, padding: '12px', marginBottom: 12,
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6', marginBottom: 4 }}>
            🎒 Antar Sekolah: {order.passenger_name} → {order.school_name}
          </p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 10 }}>
            📸 Foto bukti tiba di sekolah wajib sebelum selesai
          </p>
          {photoURL ? (
            <div>
              <img src={photoURL} alt="Bukti" style={{ width: '100%', borderRadius: 10, maxHeight: 160, objectFit: 'cover', marginBottom: 8 }} />
              <p style={{ fontSize: 11, color: 'var(--k-accent)', fontWeight: 700 }}>✅ Foto terkirim ke orang tua</p>
            </div>
          ) : (
            <>
              <button onClick={takePhoto} disabled={uploading} style={{
                width: '100%', padding: '11px', borderRadius: 12,
                background: '#3B82F6', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                opacity: uploading ? 0.7 : 1,
              }}>
                {uploading ? '⏳ Mengupload...' : '📷 Ambil Foto Bukti Tiba'}
              </button>
            </>
          )}
        </div>
      )}

      {info?.next && (
        <button onClick={updateStatus} disabled={loading || needPhoto} style={{
          width: '100%', padding: '14px', borderRadius: 16,
          background: needPhoto ? 'var(--k-card)' : 'var(--k-accent)',
          color: needPhoto ? 'var(--k-muted)' : '#0C0C16',
          fontSize: 14, fontWeight: 800,
          border: needPhoto ? '1px solid var(--k-border)' : 'none',
          cursor: needPhoto ? 'not-allowed' : 'pointer',
          boxShadow: needPhoto ? 'none' : '0 4px 16px rgba(0,200,150,0.35)',
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Memproses...' : needPhoto ? '📸 Upload foto dulu' : info.nextLabel}
        </button>
      )}
      {canCancel && (
        <button onClick={cancelOrder} disabled={loading} style={{
          width: '100%', marginTop: 10, padding: '12px', borderRadius: 14,
          background: 'transparent', border: '1px solid rgba(239,68,68,0.4)',
          color: 'var(--k-danger, #EF4444)', fontSize: 13, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
        }}>
          Batalkan Perjalanan
        </button>
      )}
    </div>
  )
}

function AvailableCard({ order, onAccept }) {
  const [loading, setLoading] = useState(false)
  const accept = async () => {
    setLoading(true)
    try {
      await api.post(`/ride/mitra/orders/${order.id}/accept`)
      onAccept()
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menerima order.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      background: 'var(--k-card)', border: '1px solid var(--k-border)',
      borderRadius: 16, padding: '14px 16px', marginBottom: 10,
      animation: 'slideIn 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <p style={{ fontSize: 12, color: 'var(--k-muted)', fontFamily: 'monospace' }}>#{order.order_number}</p>
        <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--k-accent)' }}>Rp {fmt(order.fare)}</p>
      </div>
      <div style={{ marginBottom: 12 }}>
        {[
          { icon: '📍', addr: order.pickup_address,      lat: order.pickup_lat,      lng: order.pickup_lng      },
          { icon: '🏁', addr: order.destination_address, lat: order.destination_lat, lng: order.destination_lng },
        ].map(({ icon, addr, lat, lng }) => {
          const mapsUrl = (lat && lng)
            ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`
          return (
            <div key={icon} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
              <span>{icon}</span>
              <p style={{ fontSize: 13, flex: 1, minWidth: 0 }}>{addr}</p>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  flexShrink: 0, fontSize: 11, color: 'var(--k-accent)',
                  textDecoration: 'none', padding: '3px 7px',
                  background: 'var(--k-glow)', borderRadius: 7,
                  border: '1px solid rgba(0,200,150,0.2)',
                }}>
                🗺️
              </a>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--k-muted)' }}>{order.distance_km} km</span>
          <span style={{ fontSize: 12, color: 'var(--k-muted)' }}>{order.payment_method === 'wallet' ? '💳 Wallet' : '💵 Tunai'}</span>
        </div>
        <button onClick={accept} disabled={loading} style={{
          background: 'var(--k-accent)', color: '#0C0C16',
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

export default function MitraRidePage() {
  const { user }       = useAuth()
  const [active,    setActive]    = useState(null)
  const [available, setAvailable] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('active')
  const [history,   setHistory]   = useState([])

  const vehicleType  = user?.role?.includes('mobil') ? 'mobil' : 'motor'
  const gpsEnabled   = !!active && ['accepted', 'on_pickup', 'on_ride'].includes(active?.status)
  const { active: gpsActive } = useGps({ enabled: gpsEnabled })

  const silentRefresh = useCallback(async () => {
    try {
      const [actRes, avRes] = await Promise.all([
        api.get('/ride/mitra/active'),
        api.get('/ride/mitra/available'),
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
      const res = await api.get('/ride/mitra/history')
      setHistory(res.data.data || [])
    } catch {}
  }, [])

  const handleAccept = useCallback(async () => {
    await silentRefresh()
    setTab('active')
  }, [silentRefresh])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { if (tab === 'history') fetchHistory() }, [tab, fetchHistory])

  useEffect(() => {
    const ch = echo.channel('ride.available')
    ch.listen('.ride.placed', (data) => {
      if (data.vehicle_type === vehicleType) {
        setAvailable(prev => [data, ...prev.filter(o => o.id !== data.id)])
      }
    })
    return () => echo.leave('ride.available')
  }, [vehicleType])

  useEffect(() => {
    if (!active) return
    const ch = echo.channel(`ride.orders.${active.id}`)
    ch.listen('.ride.status.updated', () => silentRefresh())
    return () => echo.leave(`ride.orders.${active.id}`)
  }, [active?.id, silentRefresh])

  const tabs = [
    { key: 'active',    label: 'Aktif',    badge: active ? 1 : 0,    badgeColor: null },
    { key: 'available', label: 'Tersedia', badge: available.length,   badgeColor: '#EF4444' },
    { key: 'history',   label: 'Riwayat',  badge: 0,                  badgeColor: null },
  ]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', color: 'var(--k-text)', fontFamily: 'system-ui,sans-serif', paddingBottom: 32 }}>
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
          <p style={{ fontWeight: 800, fontSize: 16 }}>ZasaRide</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{vehicleType === 'mobil' ? '🚗 Mobil' : '🏍️ Motor'}</p>
        </div>
        {gpsEnabled && (
          <span style={{
            marginLeft: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px',
            borderRadius: 20, background: gpsActive ? 'rgba(0,200,150,0.15)' : 'rgba(255,180,0,0.15)',
            color: gpsActive ? 'var(--k-accent)' : 'var(--k-warn)',
          }}>
            {gpsActive ? '📡 GPS Aktif' : '⏳ GPS...'}
          </span>
        )}
        <button onClick={fetchData} style={{
          marginLeft: 'auto', background: 'var(--k-card)', border: '1px solid var(--k-border)',
          borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--k-muted)',
        }}>↻</button>
      </nav>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--k-card)', borderRadius: 14, padding: 4 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: tab === t.key ? 'var(--k-accent)' : 'transparent',
              color: tab === t.key ? '#0C0C16' : 'var(--k-muted)',
              fontWeight: 700, fontSize: 13, position: 'relative', transition: 'all 0.2s',
            }}>
              {t.label}
              {t.badge > 0 && (
                <span style={{
                  position: 'absolute', top: 5, right: 8,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: t.badgeColor ?? 'var(--k-accent)',
                  color: t.badgeColor ? '#fff' : '#0C0C16',
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
            <div style={{ width: 28, height: 28, border: '2.5px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : tab === 'active' ? (
          active ? (
            <ActiveRideCard order={active} onUpdate={silentRefresh} />
          ) : (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <p style={{ fontSize: 40, marginBottom: 10 }}>🏍️</p>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Belum ada order aktif</p>
              <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 20 }}>Terima order dari tab Tersedia</p>
              {available.length > 0 && (
                <button onClick={() => setTab('available')} style={{
                  background: 'var(--k-accent)', color: '#0C0C16',
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
              <p style={{ fontSize: 40, marginBottom: 10 }}>🔍</p>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Tidak ada order saat ini</p>
              <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>Order baru akan muncul otomatis</p>
            </div>
          ) : (
            available.map(o => <AvailableCard key={o.id} order={o} onAccept={handleAccept} />)
          )
        ) : (
          history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <p style={{ fontSize: 40, marginBottom: 10 }}>📋</p>
              <p style={{ fontSize: 15, fontWeight: 700 }}>Belum ada riwayat perjalanan</p>
            </div>
          ) : (
            history.map(o => (
              <div key={o.id} style={{
                background: 'var(--k-card)', border: '1px solid var(--k-border)',
                borderRadius: 14, padding: '12px 14px', marginBottom: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--k-muted)', fontFamily: 'monospace' }}>#{o.order_number}</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-accent)' }}>+Rp {fmt(o.mitra_income)}</p>
                </div>
                <p style={{ fontSize: 12, color: 'var(--k-text)', marginBottom: 3 }}>→ {o.destination_address}</p>
                <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{o.distance_km} km · {new Date(o.created_at).toLocaleDateString('id-ID')}</p>
              </div>
            ))
          )
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }
      `}</style>
    </div>
  )
}
