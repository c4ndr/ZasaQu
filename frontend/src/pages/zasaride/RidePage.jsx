import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import echo from '../../services/echo'

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n)

// ── Ikon ──────────────────────────────────────────────────────────────────────
const IconMotor  = () => <span style={{ fontSize: 28 }}>🏍️</span>
const IconMobil  = () => <span style={{ fontSize: 28 }}>🚗</span>
const IconPin    = () => <span style={{ fontSize: 20 }}>📍</span>
const IconFlag   = () => <span style={{ fontSize: 20 }}>🏁</span>
const IconWallet = () => <span style={{ fontSize: 16 }}>💳</span>
const IconCod    = () => <span style={{ fontSize: 16 }}>💵</span>

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDot({ n, current }) {
  const done    = current > n
  const active  = current === n
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700,
      background: done ? 'var(--k-accent)' : active ? 'var(--k-accent)' : 'var(--k-card)',
      color: done || active ? '#0C0C16' : 'var(--k-muted)',
      border: active ? '2px solid var(--k-accent)' : '1px solid var(--k-border)',
      boxShadow: active ? '0 0 0 4px var(--k-glow)' : 'none',
      transition: 'all 0.2s',
    }}>
      {done ? '✓' : n}
    </div>
  )
}

// ── Status aktif order ────────────────────────────────────────────────────────
const STATUS_INFO = {
  pending:   { label: 'Mencari driver...',      emoji: '🔍', color: '#F59E0B' },
  accepted:  { label: 'Driver menuju kamu',      emoji: '🏍️', color: '#3B82F6' },
  on_pickup: { label: 'Driver sudah tiba!',      emoji: '📍', color: '#8B5CF6' },
  on_ride:   { label: 'Perjalanan dimulai 🚀',   emoji: '🚗', color: '#00C896' },
  completed: { label: 'Sampai tujuan!',          emoji: '🎉', color: '#00C896' },
  cancelled: { label: 'Dibatalkan',              emoji: '❌', color: '#EF4444' },
}

function ActiveRide({ order, onRefresh }) {
  const navigate = useNavigate()
  const info     = STATUS_INFO[order.status] || STATUS_INFO.pending

  return (
    <div style={{ padding: '0 16px 32px' }}>
      {/* Status card */}
      <div style={{
        background: 'var(--k-card)', border: `1px solid ${info.color}40`,
        borderRadius: 20, padding: '20px 18px', marginBottom: 16,
        boxShadow: `0 4px 20px ${info.color}15`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16, fontSize: 24,
            background: `${info.color}15`, border: `1px solid ${info.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {info.emoji}
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--k-text)' }}>{info.label}</p>
            <p style={{ fontSize: 12, color: 'var(--k-muted)', fontFamily: 'monospace' }}>#{order.order_number}</p>
          </div>
          <button onClick={onRefresh} style={{
            marginLeft: 'auto', background: 'var(--k-surface)',
            border: '1px solid var(--k-border)', borderRadius: 10,
            width: 34, height: 34, cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>↻</button>
        </div>

        {/* Rute */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ marginTop: 2 }}><IconPin /></span>
            <div>
              <p style={{ fontSize: 10, color: 'var(--k-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Jemput</p>
              <p style={{ fontSize: 13, color: 'var(--k-text)' }}>{order.pickup_address}</p>
            </div>
          </div>
          <div style={{ marginLeft: 12, width: 2, height: 16, background: 'var(--k-border)', borderRadius: 1 }} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ marginTop: 2 }}><IconFlag /></span>
            <div>
              <p style={{ fontSize: 10, color: 'var(--k-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tujuan</p>
              <p style={{ fontSize: 13, color: 'var(--k-text)' }}>{order.destination_address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Driver info */}
      {order.mitra && (
        <div style={{
          background: 'var(--k-card)', border: '1px solid var(--k-border)',
          borderRadius: 16, padding: '14px 16px', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: 'var(--k-glow)', border: '1px solid rgba(0,200,150,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: 'var(--k-accent)',
          }}>
            {order.mitra.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)' }}>{order.mitra.name}</p>
            <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{order.vehicle_type === 'mobil' ? 'Mobil' : 'Motor'}</p>
          </div>
          {/* Chat button */}
          <button
            onClick={() => navigate(`/ride/chat/${order.id}`, { state: { otherName: order.mitra?.name } })}
            style={{
              marginLeft: 'auto', background: 'var(--k-glow)',
              border: '1px solid rgba(0,200,150,0.3)', borderRadius: 12,
              padding: '8px 14px', cursor: 'pointer', fontSize: 13,
              color: 'var(--k-accent)', fontWeight: 700,
            }}
          >
            💬 Chat
          </button>
        </div>
      )}

      {/* Info */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12,
      }}>
        {[
          { label: 'Jarak', value: `${order.distance_km} km` },
          { label: 'Ongkos', value: `Rp ${fmt(order.fare)}` },
          { label: 'Bayar', value: order.payment_method === 'wallet' ? 'Wallet' : 'Tunai (COD)' },
          { label: 'Kendaraan', value: order.vehicle_type === 'mobil' ? 'Mobil' : 'Motor' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'var(--k-card)', border: '1px solid var(--k-border)',
            borderRadius: 12, padding: '10px 12px',
          }}>
            <p style={{ fontSize: 10, color: 'var(--k-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--k-text)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Selesai / cancel */}
      {order.status === 'pending' && (
        <CancelButton orderId={order.id} onCancel={onRefresh} />
      )}
    </div>
  )
}

function CancelButton({ orderId, onCancel }) {
  const [loading, setLoading] = useState(false)
  const cancel = async () => {
    if (!confirm('Batalkan perjalanan?')) return
    setLoading(true)
    try {
      await api.post(`/ride/orders/${orderId}/cancel`)
      onCancel()
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal membatalkan.')
    } finally { setLoading(false) }
  }
  return (
    <button onClick={cancel} disabled={loading} style={{
      width: '100%', padding: '14px', borderRadius: 16,
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
      color: '#EF4444', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    }}>
      {loading ? 'Membatalkan...' : 'Batalkan Perjalanan'}
    </button>
  )
}

// ── Form booking ──────────────────────────────────────────────────────────────
export default function RidePage() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [step, setStep]             = useState(1) // 1=rute, 2=estimasi, 3=selesai
  const [vehicleType, setVehicle]   = useState('motor')
  const [pickup, setPickup]         = useState('')
  const [dest, setDest]             = useState('')
  const [pickupCoord, setPickupC]   = useState(null)
  const [destCoord, setDestC]       = useState(null)
  const [estimate, setEstimate]     = useState(null)
  const [payMethod, setPayMethod]   = useState('cod')
  const [notes, setNotes]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [activeOrder, setActiveOrder] = useState(null)
  const [checking, setChecking]     = useState(true)

  // Cek order aktif saat mount
  const checkActive = useCallback(async () => {
    try {
      const res = await api.get('/ride/orders', { params: { status: 'active' } })
      const active = res.data.data?.find(o =>
        ['pending','accepted','on_pickup','on_ride'].includes(o.status)
      )
      setActiveOrder(active || null)
    } catch {}
    setChecking(false)
  }, [])

  useEffect(() => { checkActive() }, [checkActive])

  // Subscribe WebSocket untuk update status
  useEffect(() => {
    if (!activeOrder) return
    const ch = echo.channel(`ride.orders.${activeOrder.id}`)
    ch.listen('.ride.status.updated', (data) => {
      setActiveOrder(prev => prev ? { ...prev, status: data.status } : prev)
      if (data.status === 'completed' || data.status === 'cancelled') {
        setTimeout(() => checkActive(), 1500)
      }
    })
    return () => echo.leave(`ride.orders.${activeOrder.id}`)
  }, [activeOrder?.id, checkActive])

  // Dapatkan koordinat dari browser geolocation untuk pickup
  const getMyLocation = () => {
    if (!navigator.geolocation) return alert('Browser tidak support GPS.')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPickupC({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setPickup('Lokasi saya saat ini')
      },
      () => alert('Gagal mendapatkan lokasi.')
    )
  }

  const handleEstimate = async () => {
    if (!pickupCoord || !destCoord) return setError('Koordinat pickup/tujuan diperlukan.')
    setLoading(true); setError(null)
    try {
      const res = await api.get('/ride/estimate', {
        params: {
          vehicle_type: vehicleType,
          pickup_lat: pickupCoord.lat, pickup_lng: pickupCoord.lng,
          destination_lat: destCoord.lat, destination_lng: destCoord.lng,
        }
      })
      setEstimate(res.data)
      setStep(2)
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal menghitung estimasi.')
    } finally { setLoading(false) }
  }

  const handleBook = async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.post('/ride/orders', {
        vehicle_type: vehicleType,
        pickup_address: pickup, pickup_lat: pickupCoord.lat, pickup_lng: pickupCoord.lng,
        destination_address: dest, destination_lat: destCoord.lat, destination_lng: destCoord.lng,
        payment_method: payMethod,
        notes: notes || undefined,
      })
      setActiveOrder(res.data)
      setStep(1)
      setPickup(''); setDest(''); setPickupC(null); setDestC(null)
      setEstimate(null); setNotes('')
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal memesan.')
    } finally { setLoading(false) }
  }

  if (checking) return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '2.5px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', color: 'var(--k-text)', fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <nav style={{
        background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <Link to="/" style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--k-card)', border: '1px solid var(--k-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--k-muted)', textDecoration: 'none', fontSize: 18,
        }}>←</Link>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 800, fontSize: 16 }}>ZasaRide</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>Perjalanan cepat & terpercaya</p>
        </div>
        <Link to="/ride/orders" style={{
          fontSize: 12, color: 'var(--k-accent)', textDecoration: 'none', fontWeight: 700,
          background: 'var(--k-glow)', padding: '6px 12px', borderRadius: 10,
          border: '1px solid rgba(0,200,150,0.25)',
        }}>Riwayat</Link>
      </nav>

      {/* Order aktif */}
      {activeOrder && (
        <div style={{ padding: '16px 16px 0' }}>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Perjalanan Aktif</p>
          <ActiveRide order={activeOrder} onRefresh={checkActive} />
        </div>
      )}

      {/* Form booking (hanya kalau tidak ada order aktif) */}
      {!activeOrder && (
        <div style={{ padding: '20px 16px 32px' }}>
          {/* Steps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            {[1, 2].map(n => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StepDot n={n} current={step} />
                {n < 2 && <div style={{ flex: 1, height: 2, width: 32, background: step > n ? 'var(--k-accent)' : 'var(--k-border)', borderRadius: 1 }} />}
              </div>
            ))}
            <p style={{ fontSize: 12, color: 'var(--k-muted)', marginLeft: 8 }}>
              {step === 1 ? 'Isi rute & kendaraan' : 'Konfirmasi & pesan'}
            </p>
          </div>

          {step === 1 && (
            <>
              {/* Pilih kendaraan */}
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Kendaraan</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { type: 'motor', icon: <IconMotor />, label: 'Motor', sub: 'Lebih cepat & hemat' },
                  { type: 'mobil', icon: <IconMobil />, label: 'Mobil', sub: 'Lebih nyaman' },
                ].map(v => (
                  <button key={v.type} onClick={() => setVehicle(v.type)} style={{
                    background: vehicleType === v.type ? 'var(--k-glow)' : 'var(--k-card)',
                    border: `1.5px solid ${vehicleType === v.type ? 'var(--k-accent)' : 'var(--k-border)'}`,
                    borderRadius: 16, padding: '14px 12px', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.2s',
                    boxShadow: vehicleType === v.type ? '0 0 0 3px var(--k-glow)' : 'none',
                  }}>
                    <div style={{ marginBottom: 6 }}>{v.icon}</div>
                    <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--k-text)' }}>{v.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{v.sub}</p>
                  </button>
                ))}
              </div>

              {/* Lokasi */}
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Rute</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                {/* Pickup */}
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}><IconPin /></div>
                  <input
                    value={pickup}
                    onChange={e => { setPickup(e.target.value); setPickupC(null) }}
                    placeholder="Alamat penjemputan"
                    style={{
                      width: '100%', background: 'var(--k-card)', color: 'var(--k-text)',
                      border: '1.5px solid var(--k-border)', borderRadius: 14,
                      padding: '13px 14px 13px 44px', fontSize: 14, outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <button onClick={getMyLocation} style={{
                  background: 'var(--k-glow)', border: '1px solid rgba(0,200,150,0.3)',
                  borderRadius: 12, padding: '9px 14px', cursor: 'pointer',
                  fontSize: 12, color: 'var(--k-accent)', fontWeight: 700, textAlign: 'left',
                }}>
                  📍 Gunakan lokasi saya sekarang
                </button>
                {pickupCoord && (
                  <p style={{ fontSize: 11, color: 'var(--k-accent)', marginTop: -4 }}>
                    ✓ Koordinat pickup tersimpan ({pickupCoord.lat.toFixed(5)}, {pickupCoord.lng.toFixed(5)})
                  </p>
                )}

                {/* Tujuan */}
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}><IconFlag /></div>
                  <input
                    value={dest}
                    onChange={e => { setDest(e.target.value); setDestC(null) }}
                    placeholder="Alamat tujuan"
                    style={{
                      width: '100%', background: 'var(--k-card)', color: 'var(--k-text)',
                      border: '1.5px solid var(--k-border)', borderRadius: 14,
                      padding: '13px 14px 13px 44px', fontSize: 14, outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                {/* Simulasi: pakai koordinat manual untuk demo (akan diganti dengan map picker) */}
                <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>
                  💡 Masukkan alamat lalu ketuk "Gunakan koordinat contoh" untuk demo
                </p>
                <button onClick={() => {
                  if (!dest) return alert('Isi alamat tujuan dulu.')
                  // Koordinat contoh: 2km dari pickup (untuk demo)
                  const base = pickupCoord || { lat: -6.2, lng: 106.8 }
                  setDestC({ lat: base.lat + 0.018, lng: base.lng + 0.018 })
                  if (!pickupCoord) setPickupC(base)
                }} style={{
                  background: 'var(--k-glow)', border: '1px solid rgba(0,200,150,0.3)',
                  borderRadius: 12, padding: '9px 14px', cursor: 'pointer',
                  fontSize: 12, color: 'var(--k-accent)', fontWeight: 700, textAlign: 'left',
                }}>
                  🗺️ Gunakan koordinat contoh (demo)
                </button>
                {destCoord && (
                  <p style={{ fontSize: 11, color: 'var(--k-accent)', marginTop: -4 }}>
                    ✓ Koordinat tujuan tersimpan ({destCoord.lat.toFixed(5)}, {destCoord.lng.toFixed(5)})
                  </p>
                )}
              </div>

              {error && <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 12 }}>{error}</p>}

              <button
                onClick={handleEstimate}
                disabled={loading || !pickup || !dest || !pickupCoord || !destCoord}
                style={{
                  width: '100%', padding: '15px', borderRadius: 16, marginTop: 12,
                  background: 'var(--k-accent)', color: '#0C0C16', fontSize: 15, fontWeight: 800,
                  border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1,
                  boxShadow: '0 4px 16px rgba(0,200,150,0.35)',
                }}
              >
                {loading ? 'Menghitung...' : 'Lihat Estimasi Harga →'}
              </button>
            </>
          )}

          {step === 2 && estimate && (
            <>
              {/* Kartu estimasi */}
              <div style={{
                background: 'var(--k-card)', border: '1px solid var(--k-border)',
                borderRadius: 20, padding: '20px 18px', marginBottom: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--k-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Estimasi Ongkos</p>
                    <p style={{ fontSize: 32, fontWeight: 900, color: 'var(--k-accent)' }}>Rp {fmt(estimate.fare)}</p>
                  </div>
                  <div style={{
                    background: vehicleType === 'mobil' ? 'rgba(59,130,246,0.1)' : 'rgba(0,200,150,0.1)',
                    border: `1px solid ${vehicleType === 'mobil' ? 'rgba(59,130,246,0.3)' : 'rgba(0,200,150,0.3)'}`,
                    borderRadius: 14, padding: '8px 14px', fontSize: 13, fontWeight: 700,
                    color: vehicleType === 'mobil' ? '#3B82F6' : 'var(--k-accent)',
                  }}>
                    {vehicleType === 'mobil' ? '🚗 Mobil' : '🏍️ Motor'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Jarak estimasi', value: `${estimate.distance_km} km` },
                    { label: 'Tarif dasar', value: `Rp ${fmt(estimate.base_fare)}` },
                    { label: 'Per km', value: `Rp ${fmt(estimate.per_km_fare)}` },
                    { label: 'Minimum', value: `Rp ${fmt(estimate.minimum_fare)}` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: 10, color: 'var(--k-muted)', fontWeight: 700 }}>{label}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Rute ringkas */}
                <div style={{ borderTop: '1px solid var(--k-border)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <IconPin /><p style={{ fontSize: 13, color: 'var(--k-text)' }}>{pickup}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <IconFlag /><p style={{ fontSize: 13, color: 'var(--k-text)' }}>{dest}</p>
                  </div>
                </div>
              </div>

              {/* Metode bayar */}
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Metode Bayar</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { method: 'cod',    icon: <IconCod />,    label: 'Tunai (COD)', sub: 'Bayar langsung ke driver' },
                  { method: 'wallet', icon: <IconWallet />, label: 'Wallet',       sub: 'Bayar otomatis saat selesai' },
                ].map(v => (
                  <button key={v.method} onClick={() => setPayMethod(v.method)} style={{
                    background: payMethod === v.method ? 'var(--k-glow)' : 'var(--k-card)',
                    border: `1.5px solid ${payMethod === v.method ? 'var(--k-accent)' : 'var(--k-border)'}`,
                    borderRadius: 14, padding: '12px', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.2s',
                  }}>
                    <div style={{ marginBottom: 4 }}>{v.icon}</div>
                    <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--k-text)' }}>{v.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{v.sub}</p>
                  </button>
                ))}
              </div>

              {/* Catatan */}
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Catatan untuk driver (opsional)"
                rows={2}
                style={{
                  width: '100%', background: 'var(--k-card)', color: 'var(--k-text)',
                  border: '1.5px solid var(--k-border)', borderRadius: 14,
                  padding: '12px 14px', fontSize: 13, outline: 'none',
                  resize: 'none', fontFamily: 'inherit', marginBottom: 16,
                  boxSizing: 'border-box',
                }}
              />

              {error && <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 12 }}>{error}</p>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(1)} style={{
                  flex: 1, padding: '14px', borderRadius: 16,
                  background: 'var(--k-card)', border: '1px solid var(--k-border)',
                  color: 'var(--k-text)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>← Kembali</button>
                <button onClick={handleBook} disabled={loading} style={{
                  flex: 2, padding: '14px', borderRadius: 16,
                  background: 'var(--k-accent)', color: '#0C0C16',
                  fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0,200,150,0.35)',
                  opacity: loading ? 0.7 : 1,
                }}>
                  {loading ? 'Memesan...' : '🚀 Pesan Sekarang'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
