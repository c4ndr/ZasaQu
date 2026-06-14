import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import echo from '../../services/echo'
import LocationSearch from '../../components/LocationSearch'

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n)

// ── Status aktif ──────────────────────────────────────────────────────────────
const STATUS_INFO = {
  pending:   { label: 'Mencari driver...',       emoji: '🔍', color: '#F59E0B' },
  accepted:  { label: 'Driver menuju kamu',       emoji: '🏍️', color: '#3B82F6' },
  on_pickup: { label: 'Driver sudah tiba!',       emoji: '📍', color: '#8B5CF6' },
  on_ride:   { label: 'Perjalanan dimulai 🚀',    emoji: '🚗', color: '#00C896' },
  completed: { label: 'Sampai tujuan!',           emoji: '🎉', color: '#00C896' },
  cancelled: { label: 'Dibatalkan',               emoji: '❌', color: '#EF4444' },
}

// ── Saved Places chip ─────────────────────────────────────────────────────────
function SavedPlaces({ onSelect, onSave, currentDest }) {
  const [places,  setPlaces]  = useState([])
  const [adding,  setAdding]  = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('📍')
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(() => {
    api.get('/ride/saved-places').then(r => setPlaces(r.data)).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!currentDest?.lat || !newName.trim()) return
    setSaving(true)
    try {
      await api.post('/ride/saved-places', {
        name: newName.trim(),
        emoji: newEmoji,
        address: currentDest.address,
        lat: currentDest.lat,
        lng: currentDest.lng,
      })
      setAdding(false); setNewName(''); load()
      onSave?.()
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menyimpan.')
    } finally { setSaving(false) }
  }

  const remove = async (id) => {
    try { await api.delete(`/ride/saved-places/${id}`); load() } catch {}
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Lokasi Tersimpan
        </p>
        {currentDest?.lat && !adding && (
          <button onClick={() => setAdding(true)} style={{
            fontSize: 11, color: 'var(--k-accent)', background: 'none',
            border: 'none', cursor: 'pointer', fontWeight: 700,
          }}>+ Simpan tujuan ini</button>
        )}
      </div>

      {places.length === 0 && !adding ? (
        <p style={{ fontSize: 12, color: 'var(--k-muted)', fontStyle: 'italic' }}>
          Belum ada lokasi tersimpan. Pilih tujuan lalu tap "+ Simpan".
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {places.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <button onClick={() => onSelect(p)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--k-card)', border: '1px solid var(--k-border)',
                borderRadius: '12px 0 0 12px', padding: '7px 10px',
                cursor: 'pointer', fontSize: 13, color: 'var(--k-text)', fontWeight: 600,
              }}>
                <span>{p.emoji}</span> {p.name}
              </button>
              <button onClick={() => remove(p.id)} style={{
                background: 'var(--k-card)', border: '1px solid var(--k-border)',
                borderLeft: 'none', borderRadius: '0 12px 12px 0',
                padding: '7px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--k-muted)',
              }}>×</button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div style={{ marginTop: 10, background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14, padding: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 8 }}>
            Simpan: <strong style={{ color: 'var(--k-text)' }}>{currentDest?.address}</strong>
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={newEmoji} onChange={e => setNewEmoji(e.target.value)} style={{
              background: 'var(--k-input)', color: 'var(--k-text)', border: '1px solid var(--k-border)',
              borderRadius: 10, padding: '8px', fontSize: 18, cursor: 'pointer',
            }}>
              {['📍','🏠','🏫','🏥','🕌','🏪','🏋️','🏢','⛽'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder='Nama (mis. "Sekolah Anak")'
              style={{
                flex: 1, background: 'var(--k-input)', color: 'var(--k-text)',
                border: '1px solid var(--k-border)', borderRadius: 10,
                padding: '8px 12px', fontSize: 13, outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setAdding(false)} style={{
              flex: 1, padding: '9px', borderRadius: 10,
              background: 'none', border: '1px solid var(--k-border)',
              color: 'var(--k-muted)', cursor: 'pointer', fontSize: 13,
            }}>Batal</button>
            <button onClick={save} disabled={saving || !newName.trim()} style={{
              flex: 2, padding: '9px', borderRadius: 10,
              background: 'var(--k-accent)', color: '#0C0C16',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Menyimpan...' : 'Simpan Lokasi'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tampilan order aktif ──────────────────────────────────────────────────────
function ActiveRide({ order, onRefresh }) {
  const navigate = useNavigate()
  const info     = STATUS_INFO[order.status] || STATUS_INFO.pending

  return (
    <div style={{ padding: '0 16px 32px' }}>
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
          }}>{info.emoji}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--k-text)' }}>{info.label}</p>
            <p style={{ fontSize: 11, color: 'var(--k-muted)', fontFamily: 'monospace' }}>#{order.order_number}</p>
          </div>
          <button onClick={onRefresh} style={{
            background: 'var(--k-surface)', border: '1px solid var(--k-border)',
            borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>↻</button>
        </div>

        {/* Badge sekolah */}
        {order.ride_type === 'school' && (
          <div style={{
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: 12, padding: '8px 12px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>🎒</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6' }}>Antar Sekolah</p>
              <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>
                {order.passenger_name} → {order.school_name}
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {[
            { icon: '📍', label: 'Jemput', addr: order.pickup_address },
            { icon: '🏁', label: 'Tujuan', addr: order.destination_address },
          ].map(({ icon, label, addr }) => (
            <div key={label} style={{ display: 'flex', gap: 10 }}>
              <span>{icon}</span>
              <div>
                <p style={{ fontSize: 10, color: 'var(--k-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</p>
                <p style={{ fontSize: 13 }}>{addr}</p>
              </div>
            </div>
          ))}
        </div>

        {order.mitra && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            borderTop: '1px solid var(--k-border)', paddingTop: 12, marginBottom: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, background: 'var(--k-glow)',
              border: '1px solid rgba(0,200,150,0.25)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: 'var(--k-accent)',
            }}>{order.mitra.name?.[0]?.toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 14 }}>{order.mitra.name}</p>
              <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{order.vehicle_type === 'mobil' ? 'Mobil' : 'Motor'}</p>
            </div>
            <button onClick={() => navigate(`/ride/chat/${order.id}`, { state: { otherName: order.mitra?.name } })} style={{
              background: 'var(--k-glow)', border: '1px solid rgba(0,200,150,0.3)',
              borderRadius: 12, padding: '8px 14px', cursor: 'pointer',
              fontSize: 13, color: 'var(--k-accent)', fontWeight: 700,
            }}>💬 Chat</button>
          </div>
        )}

        {/* Foto bukti (sekolah, setelah selesai) */}
        {order.ride_type === 'school' && order.proof_photo_path && (
          <div style={{ borderTop: '1px solid var(--k-border)', paddingTop: 12, marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-accent)', marginBottom: 8 }}>
              ✅ Foto Bukti Tiba di Sekolah
            </p>
            <img
              src={`/storage/${order.proof_photo_path}`}
              alt="Bukti tiba"
              style={{ width: '100%', borderRadius: 12, maxHeight: 200, objectFit: 'cover' }}
            />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Jarak', value: `${order.distance_km} km` },
            { label: 'Ongkos', value: `Rp ${fmt(order.fare)}` },
            { label: 'Bayar', value: order.payment_method === 'wallet' ? 'Wallet' : 'Tunai' },
            { label: 'Kendaraan', value: order.vehicle_type === 'mobil' ? 'Mobil' : 'Motor' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--k-surface)', borderRadius: 10, padding: '8px 10px' }}>
              <p style={{ fontSize: 10, color: 'var(--k-muted)', fontWeight: 700 }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 700 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {order.status === 'pending' && (
        <button onClick={async () => {
          if (!confirm('Batalkan perjalanan?')) return
          try { await api.post(`/ride/orders/${order.id}/cancel`); onRefresh() } catch {}
        }} style={{
          width: '100%', padding: '14px', borderRadius: 16,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#EF4444', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>Batalkan Perjalanan</button>
      )}
    </div>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function RidePage() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [step, setStep]           = useState(1)
  const [vehicleType, setVehicle] = useState('motor')
  const [rideType, setRideType]   = useState('regular')
  const [passengerName, setPassenger] = useState('')
  const [schoolName, setSchool]   = useState('')

  const [pickup, setPickup]       = useState('')
  const [pickupCoord, setPickupC] = useState(null)
  const [dest, setDest]           = useState('')
  const [destCoord, setDestC]     = useState(null)

  const [estimate, setEstimate]   = useState(null)
  const [payMethod, setPayMethod] = useState('cod')
  const [notes, setNotes]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [activeOrder, setActiveOrder] = useState(null)
  const [checking, setChecking]   = useState(true)

  const myLat = pickupCoord?.lat ?? null
  const myLng = pickupCoord?.lng ?? null

  const checkActive = useCallback(async () => {
    try {
      const res = await api.get('/ride/orders')
      const active = res.data.data?.find(o =>
        ['pending','accepted','on_pickup','on_ride'].includes(o.status)
      )
      setActiveOrder(active || null)
    } catch {}
    setChecking(false)
  }, [])

  useEffect(() => { checkActive() }, [checkActive])

  useEffect(() => {
    if (!activeOrder) return
    const ch = echo.channel(`ride.orders.${activeOrder.id}`)
    ch.listen('.ride.status.updated', (data) => {
      setActiveOrder(prev => prev ? { ...prev, ...data } : prev)
      if (data.status === 'completed' || data.status === 'cancelled') {
        setTimeout(checkActive, 2000)
      }
    })
    return () => echo.leave(`ride.orders.${activeOrder.id}`)
  }, [activeOrder?.id, checkActive])

  const getMyLocation = () => {
    if (!navigator.geolocation) return alert('Browser tidak mendukung GPS.')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPickupC({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setPickup('Lokasi saya saat ini')
      },
      () => alert('Gagal mendapatkan lokasi. Coba ketik alamat manual.')
    )
  }

  const handleEstimate = async () => {
    if (!pickupCoord || !destCoord) return setError('Pilih lokasi pickup dan tujuan terlebih dahulu.')
    if (rideType === 'school' && !passengerName.trim()) return setError('Isi nama anak.')
    if (rideType === 'school' && !schoolName.trim()) return setError('Isi nama sekolah.')
    setLoading(true); setError(null)
    try {
      const res = await api.get('/ride/estimate', {
        params: {
          vehicle_type: vehicleType,
          pickup_lat: pickupCoord.lat, pickup_lng: pickupCoord.lng,
          destination_lat: destCoord.lat, destination_lng: destCoord.lng,
        }
      })
      setEstimate(res.data); setStep(2)
    } catch (e) { setError(e.response?.data?.message || 'Gagal menghitung estimasi.') }
    finally { setLoading(false) }
  }

  const handleBook = async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.post('/ride/orders', {
        vehicle_type: vehicleType,
        ride_type: rideType,
        passenger_name: rideType === 'school' ? passengerName : undefined,
        school_name: rideType === 'school' ? schoolName : undefined,
        pickup_address: pickup, pickup_lat: pickupCoord.lat, pickup_lng: pickupCoord.lng,
        destination_address: dest, destination_lat: destCoord.lat, destination_lng: destCoord.lng,
        payment_method: payMethod,
        notes: notes || undefined,
      })
      setActiveOrder(res.data)
      setStep(1); setPickup(''); setDest(''); setPickupC(null); setDestC(null)
      setEstimate(null); setNotes(''); setPassenger(''); setSchool('')
      setRideType('regular')
    } catch (e) { setError(e.response?.data?.message || 'Gagal memesan.') }
    finally { setLoading(false) }
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
          width: 36, height: 36, borderRadius: 10, background: 'var(--k-card)',
          border: '1px solid var(--k-border)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'var(--k-muted)', textDecoration: 'none', fontSize: 18,
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

      {!activeOrder && (
        <div style={{ padding: '20px 16px 40px' }}>
          {/* Step 1 — Form Rute */}
          {step === 1 && (
            <>
              {/* Pilih kendaraan */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Kendaraan</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                {[
                  { type: 'motor', emoji: '🏍️', label: 'Motor', sub: 'Lebih cepat & hemat' },
                  { type: 'mobil', emoji: '🚗', label: 'Mobil', sub: 'Lebih nyaman' },
                ].map(v => (
                  <button key={v.type} onClick={() => setVehicle(v.type)} style={{
                    background: vehicleType === v.type ? 'var(--k-glow)' : 'var(--k-card)',
                    border: `1.5px solid ${vehicleType === v.type ? 'var(--k-accent)' : 'var(--k-border)'}`,
                    borderRadius: 14, padding: '12px', cursor: 'pointer', textAlign: 'left',
                    boxShadow: vehicleType === v.type ? '0 0 0 3px var(--k-glow)' : 'none',
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{v.emoji}</div>
                    <p style={{ fontWeight: 800, fontSize: 14 }}>{v.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{v.sub}</p>
                  </button>
                ))}
              </div>

              {/* Jenis perjalanan */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Jenis Perjalanan</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                {[
                  { type: 'regular', emoji: '🚗', label: 'Reguler', sub: 'Perjalanan biasa' },
                  { type: 'school',  emoji: '🎒', label: 'Antar Sekolah', sub: 'Foto bukti tiba wajib' },
                ].map(v => (
                  <button key={v.type} onClick={() => setRideType(v.type)} style={{
                    background: rideType === v.type ? 'rgba(59,130,246,0.08)' : 'var(--k-card)',
                    border: `1.5px solid ${rideType === v.type ? '#3B82F6' : 'var(--k-border)'}`,
                    borderRadius: 14, padding: '12px', cursor: 'pointer', textAlign: 'left',
                    boxShadow: rideType === v.type ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{v.emoji}</div>
                    <p style={{ fontWeight: 800, fontSize: 13 }}>{v.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{v.sub}</p>
                  </button>
                ))}
              </div>

              {/* Field sekolah */}
              {rideType === 'school' && (
                <div style={{
                  background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 14, padding: '14px', marginBottom: 18,
                }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6', marginBottom: 10 }}>🎒 Detail Antar Sekolah</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input
                      value={passengerName}
                      onChange={e => setPassenger(e.target.value)}
                      placeholder="Nama anak *"
                      style={{
                        background: 'var(--k-card)', color: 'var(--k-text)',
                        border: '1px solid var(--k-border)', borderRadius: 10,
                        padding: '10px 12px', fontSize: 14, outline: 'none',
                      }}
                    />
                    <input
                      value={schoolName}
                      onChange={e => setSchool(e.target.value)}
                      placeholder="Nama sekolah *"
                      style={{
                        background: 'var(--k-card)', color: 'var(--k-text)',
                        border: '1px solid var(--k-border)', borderRadius: 10,
                        padding: '10px 12px', fontSize: 14, outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Pickup */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Lokasi Jemput</p>
              <div style={{ marginBottom: 8 }}>
                <LocationSearch
                  value={pickup}
                  onChange={val => { setPickup(val); if (!val) setPickupC(null) }}
                  onSelect={({ lat, lng, display }) => { setPickupC({ lat, lng }); setPickup(display) }}
                  placeholder="Ketik alamat penjemputan..."
                  confirmed={!!pickupCoord}
                  nearLat={myLat}
                  nearLng={myLng}
                />
              </div>
              <button onClick={getMyLocation} style={{
                background: 'var(--k-glow)', border: '1px solid rgba(0,200,150,0.3)',
                borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                fontSize: 12, color: 'var(--k-accent)', fontWeight: 700, marginBottom: 18,
              }}>📍 Gunakan lokasi saya sekarang</button>

              {/* Tujuan */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Tujuan</p>

              {/* Saved places */}
              <SavedPlaces
                onSelect={p => { setDest(p.address); setDestC({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) }) }}
                onSave={() => {}}
                currentDest={destCoord ? { lat: destCoord.lat, lng: destCoord.lng, address: dest } : null}
              />

              <div style={{ marginBottom: 18 }}>
                <LocationSearch
                  value={dest}
                  onChange={val => { setDest(val); if (!val) setDestC(null) }}
                  onSelect={({ lat, lng, display }) => { setDestC({ lat, lng }); setDest(display) }}
                  placeholder={rideType === 'school' ? 'Ketik nama sekolah...' : 'Ketik alamat tujuan...'}
                  confirmed={!!destCoord}
                  nearLat={myLat}
                  nearLng={myLng}
                />
              </div>

              {error && <p style={{ fontSize: 13, color: '#EF4444', marginBottom: 12 }}>{error}</p>}

              <button
                onClick={handleEstimate}
                disabled={loading || !pickupCoord || !destCoord}
                style={{
                  width: '100%', padding: '15px', borderRadius: 16,
                  background: 'var(--k-accent)', color: '#0C0C16',
                  fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0,200,150,0.35)',
                  opacity: loading || !pickupCoord || !destCoord ? 0.6 : 1,
                }}
              >{loading ? 'Menghitung...' : 'Lihat Estimasi Harga →'}</button>
            </>
          )}

          {/* Step 2 — Konfirmasi */}
          {step === 2 && estimate && (
            <>
              {/* Badge sekolah */}
              {rideType === 'school' && (
                <div style={{
                  background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)',
                  borderRadius: 14, padding: '12px 14px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 22 }}>🎒</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#3B82F6' }}>Antar Sekolah</p>
                    <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{passengerName} → {schoolName}</p>
                    <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 2 }}>📸 Driver wajib kirim foto saat tiba di sekolah</p>
                  </div>
                </div>
              )}

              {/* Kartu estimasi */}
              <div style={{
                background: 'var(--k-card)', border: '1px solid var(--k-border)',
                borderRadius: 20, padding: '20px 18px', marginBottom: 18,
              }}>
                <p style={{ fontSize: 12, color: 'var(--k-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Estimasi Ongkos</p>
                <p style={{ fontSize: 34, fontWeight: 900, color: 'var(--k-accent)', marginBottom: 16 }}>Rp {fmt(estimate.fare)}</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'Jarak estimasi', value: `${estimate.distance_km} km` },
                    { label: 'Tarif dasar', value: `Rp ${fmt(estimate.base_fare)}` },
                    { label: 'Per km', value: `Rp ${fmt(estimate.per_km_fare)}` },
                    { label: 'Minimum', value: `Rp ${fmt(estimate.minimum_fare)}` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ fontSize: 10, color: 'var(--k-muted)', fontWeight: 700 }}>{label}</p>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{value}</p>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--k-border)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span>📍</span><p style={{ fontSize: 13 }}>{pickup}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span>🏁</span><p style={{ fontSize: 13 }}>{dest}</p>
                  </div>
                </div>
              </div>

              {/* Metode bayar */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Metode Bayar</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { method: 'cod',    emoji: '💵', label: 'Tunai (COD)', sub: 'Bayar langsung ke driver' },
                  { method: 'wallet', emoji: '💳', label: 'Wallet',       sub: 'Bayar otomatis saat selesai' },
                ].map(v => (
                  <button key={v.method} onClick={() => setPayMethod(v.method)} style={{
                    background: payMethod === v.method ? 'var(--k-glow)' : 'var(--k-card)',
                    border: `1.5px solid ${payMethod === v.method ? 'var(--k-accent)' : 'var(--k-border)'}`,
                    borderRadius: 14, padding: '12px', cursor: 'pointer', textAlign: 'left',
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{v.emoji}</div>
                    <p style={{ fontWeight: 700, fontSize: 13 }}>{v.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{v.sub}</p>
                  </button>
                ))}
              </div>

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
                }}>{loading ? 'Memesan...' : '🚀 Pesan Sekarang'}</button>
              </div>
            </>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
