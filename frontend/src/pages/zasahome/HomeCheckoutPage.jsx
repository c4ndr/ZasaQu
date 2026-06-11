import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import LocationSearch from '../../components/LocationSearch'
import { getCategoryConfig } from '../../utils/homeServiceConfig'
import { isNative, requestGeolocationPermission } from '../../utils/nativePlatform'

const UNIT_LABEL      = { kg: 'kg', item: 'item', jam: 'jam', sesi: 'sesi' }
const ADDR_STORAGE_KEY = 'zasahome_last_address'

function estimatedDate(estimatedHours) {
  if (!estimatedHours) return null
  const d = new Date(Date.now() + estimatedHours * 3600000)
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function loadSavedAddress() {
  try { return JSON.parse(localStorage.getItem(ADDR_STORAGE_KEY)) } catch { return null }
}

function saveAddress(address, lat, lng) {
  try { localStorage.setItem(ADDR_STORAGE_KEY, JSON.stringify({ address, lat, lng })) } catch {}
}

export default function HomeCheckoutPage() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const { provider, items } = state ?? {}

  const cfg = getCategoryConfig(provider?.category)

  const [pickupAddr,    setPickupAddr]    = useState('')
  const [pickupLat,     setPickupLat]     = useState('')
  const [pickupLng,     setPickupLng]     = useState('')
  const [pickupType,    setPickupType]    = useState('mandiri')
  const [scheduledAt,   setScheduledAt]   = useState('')
  const [notes,         setNotes]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [savedAddr,     setSavedAddr]     = useState(null)
  const [addrDismissed, setAddrDismissed] = useState(false)
  const [gpsLoading,    setGpsLoading]    = useState(false)

  useEffect(() => {
    const saved = loadSavedAddress()
    if (saved?.address) setSavedAddr(saved)
  }, [])

  if (!provider || !items) {
    navigate('/home')
    return null
  }

  const isOnSite      = cfg.flow === 'on_site'
  const servicesTotal = items.reduce((s, i) => s + i.service.price * i.quantity, 0)
  const pickupFee     = !isOnSite && pickupType === 'antar_jemput' ? (provider.pickup_fee ?? 0) : 0
  const totalPrice    = servicesTotal + pickupFee

  const maxHours = items.reduce((m, i) => Math.max(m, i.service.estimated_hours ?? 0), 0)
  const estDone  = estimatedDate(maxHours)

  function applysavedAddress() {
    setPickupAddr(savedAddr.address)
    setPickupLat(savedAddr.lat ?? '')
    setPickupLng(savedAddr.lng ?? '')
    setAddrDismissed(true)
  }

  async function useCurrentLocation() {
    setGpsLoading(true)
    setError('')
    try {
      if (isNative) {
        const granted = await requestGeolocationPermission()
        if (!granted) { setError('Izin GPS ditolak.'); return }
        const { Geolocation } = await import('@capacitor/geolocation')
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
        const { latitude: lat, longitude: lng } = pos.coords
        await reverseGeocode(lat, lng)
      } else {
        if (!navigator.geolocation) { setError('GPS tidak didukung browser ini.'); return }
        navigator.geolocation.getCurrentPosition(
          async pos => { await reverseGeocode(pos.coords.latitude, pos.coords.longitude) },
          () => setError('Gagal mendapatkan lokasi. Pastikan GPS aktif.'),
          { enableHighAccuracy: true, timeout: 10000 }
        )
      }
    } catch { setError('Gagal mendapatkan lokasi GPS.') }
    finally { setGpsLoading(false) }
  }

  async function reverseGeocode(lat, lng) {
    setPickupLat(String(lat))
    setPickupLng(String(lng))
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`)
      const data = await res.json()
      const addr = data.display_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      setPickupAddr(addr)
      setAddrDismissed(true)
    } catch {
      setPickupAddr(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
    }
    setGpsLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!pickupAddr) { setError('Alamat pickup wajib diisi.'); return }
    setError(''); setLoading(true)
    try {
      const res = await api.post('/home/orders', {
        provider_id:    provider.id,
        pickup_address: pickupAddr,
        pickup_lat:     pickupLat || undefined,
        pickup_lng:     pickupLng || undefined,
        pickup_type:    isOnSite ? undefined : pickupType,
        scheduled_at:   scheduledAt || undefined,
        notes:          notes || undefined,
        items: items.map(i => ({ service_id: i.service_id, quantity: i.quantity })),
      })
      saveAddress(pickupAddr, pickupLat, pickupLng)
      navigate(`/home/orders/${res.data.data.id}`, { replace: true })
    } catch (err) {
      const errs = err.response?.data?.errors
      setError(errs ? Object.values(errs).flat().join(' ') : (err.response?.data?.message || 'Gagal membuat pesanan.'))
    } finally { setLoading(false) }
  }

  const showAddrSuggestion = savedAddr && !addrDismissed && !pickupAddr

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      <div style={{ padding: '52px 20px 20px', background: 'linear-gradient(160deg,#0F1E25 0%,var(--k-bg) 100%)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--k-muted)', fontSize: 14, cursor: 'pointer', marginBottom: 12, padding: 0 }}>
          ← Kembali
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--k-text)' }}>Konfirmasi Pesanan</h1>
        <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>{provider.name}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(245,101,101,0.1)', border: '1px solid rgba(245,101,101,0.3)', color: '#F56565', fontSize: 13 }}>{error}</div>
        )}

        {/* Pilihan antar jemput — hanya untuk item_based yang offers_pickup */}
        {!isOnSite && provider.offers_pickup && (
          <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: 16 }}>
            <p style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Metode Pengambilan</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <PickupOption
                active={pickupType === 'mandiri'}
                onClick={() => setPickupType('mandiri')}
                icon="🏃"
                title="Antar Sendiri"
                desc="Anda antar & ambil ke toko"
                badge={null}
              />
              <PickupOption
                active={pickupType === 'antar_jemput'}
                onClick={() => setPickupType('antar_jemput')}
                icon="🚚"
                title="Antar Jemput"
                desc="Provider jemput & antar ke Anda"
                badge={provider.pickup_fee > 0 ? `+Rp ${provider.pickup_fee.toLocaleString('id')}` : 'Gratis'}
              />
            </div>
          </div>
        )}

        {/* Waktu kunjungan — hanya untuk on_site */}
        {isOnSite && (
          <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: 16 }}>
            <p style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>{cfg.scheduleLabel ?? 'Waktu Kunjungan'}</p>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              min={new Date(Date.now() + 3600000).toISOString().slice(0,16)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14, boxSizing: 'border-box',
                background: 'var(--k-input)', border: `1.5px solid ${scheduledAt ? '#6366F1' : 'var(--k-border)'}`,
                color: 'var(--k-text)', outline: 'none' }}
            />
            {!scheduledAt && (
              <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 6 }}>Opsional — kosongkan jika mau diskusi via chat</p>
            )}
          </div>
        )}

        {/* Alamat — label dari category config */}
        <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: 16 }}>
          <p style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>
            {isOnSite ? cfg.addressLabel : (pickupType === 'antar_jemput' ? 'Alamat Penjemputan' : 'Alamat Anda (untuk catatan)')}
          </p>

          {/* Saran alamat sebelumnya */}
          {showAddrSuggestion && (
            <div style={{
              marginBottom: 12, padding: '10px 12px', borderRadius: 12,
              background: 'rgba(99,102,241,0.07)', border: '1.5px solid rgba(99,102,241,0.25)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>📍</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, color: '#6366F1', fontWeight: 700, marginBottom: 2 }}>Gunakan alamat sebelumnya?</p>
                <p style={{ fontSize: 12, color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {savedAddr.address}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button type="button" onClick={applysavedAddress} style={{
                  padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: '#6366F1', color: '#fff', fontSize: 12, fontWeight: 700,
                }}>Pakai</button>
                <button type="button" onClick={() => setAddrDismissed(true)} style={{
                  padding: '5px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'var(--k-input)', color: 'var(--k-muted)', fontSize: 12,
                }}>✕</button>
              </div>
            </div>
          )}

          {/* Tombol GPS */}
          <button type="button" onClick={useCurrentLocation} disabled={gpsLoading}
            style={{
              width: '100%', marginBottom: 10, padding: '10px', borderRadius: 10,
              border: '1.5px dashed rgba(99,102,241,0.4)',
              background: gpsLoading ? 'var(--k-input)' : 'rgba(99,102,241,0.06)',
              color: gpsLoading ? 'var(--k-muted)' : '#6366F1',
              fontWeight: 700, fontSize: 13, cursor: gpsLoading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {gpsLoading ? (
              <><span style={{ width: 14, height: 14, border: '2px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Mendeteksi lokasi...</>
            ) : (
              <><span style={{ fontSize: 16 }}>📍</span> Gunakan Lokasi Saya Sekarang</>
            )}
          </button>

          <LocationSearch
            value={pickupAddr}
            onChange={v => { setPickupAddr(v); setPickupLat(''); setPickupLng('') }}
            onSelect={({ lat, lng, display }) => { setPickupAddr(display); setPickupLat(lat); setPickupLng(lng) }}
            placeholder="Atau ketik alamat..."
            confirmed={!!pickupLat}
          />
          {pickupLat && (
            <p style={{ fontSize: 11, color: 'var(--k-accent)', marginTop: 6 }}>📍 Lokasi dikonfirmasi ({parseFloat(pickupLat).toFixed(5)}, {parseFloat(pickupLng).toFixed(5)})</p>
          )}
        </div>

        {/* Ringkasan */}
        <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: 16 }}>
          <p style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Ringkasan Pesanan</p>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 13, color: 'var(--k-text)', fontWeight: 600 }}>{item.service.name}</p>
                <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>
                  {item.quantity} {UNIT_LABEL[item.service.unit]} × Rp {item.service.price.toLocaleString('id')}
                </p>
                {item.service.estimated_hours && (
                  <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>⏱ ~{item.service.estimated_hours} jam</p>
                )}
              </div>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)' }}>Rp {(item.service.price * item.quantity).toLocaleString('id')}</p>
            </div>
          ))}

          {pickupFee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, paddingTop: 4 }}>
              <p style={{ fontSize: 13, color: 'var(--k-muted)' }}>🚚 Biaya antar jemput</p>
              <p style={{ fontSize: 13, color: 'var(--k-text)' }}>Rp {pickupFee.toLocaleString('id')}</p>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--k-border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontWeight: 700, fontSize: 15 }}>Total</p>
            <p style={{ fontWeight: 800, fontSize: 16, color: '#6366F1' }}>Rp {totalPrice.toLocaleString('id')}</p>
          </div>

          {estDone && (
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <p style={{ fontSize: 12, color: '#6366F1', fontWeight: 600 }}>📅 Estimasi selesai: {estDone}</p>
            </div>
          )}
        </div>

        {/* Catatan */}
        <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: 16 }}>
          <p style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Catatan (opsional)</p>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Contoh: pakaian warna, instruksi khusus..."
            rows={3}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, boxSizing: 'border-box',
              background: 'var(--k-input)', border: '1px solid var(--k-border)', color: 'var(--k-text)', resize: 'none', outline: 'none' }}
          />
        </div>

        <button type="submit" disabled={loading} style={{
          padding: '14px', borderRadius: 14, border: 'none', cursor: loading ? 'default' : 'pointer',
          background: loading ? 'var(--k-border)' : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
          color: '#fff', fontWeight: 700, fontSize: 15,
        }}>
          {loading ? 'Memproses...' : `Pesan • Rp ${totalPrice.toLocaleString('id')}`}
        </button>
      </form>
    </div>
  )
}

function PickupOption({ active, onClick, icon, title, desc, badge }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: '12px 10px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
      border: active ? '2px solid #6366F1' : '1.5px solid var(--k-border)',
      background: active ? 'rgba(99,102,241,0.08)' : 'var(--k-input)',
    }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <p style={{ fontWeight: 700, fontSize: 13, color: active ? '#6366F1' : 'var(--k-text)', marginBottom: 2 }}>{title}</p>
      <p style={{ fontSize: 11, color: 'var(--k-muted)', lineHeight: 1.4 }}>{desc}</p>
      {badge && (
        <span style={{ display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 700,
          padding: '2px 8px', borderRadius: 20,
          background: active ? 'rgba(99,102,241,0.15)' : 'rgba(160,160,188,0.12)',
          color: active ? '#6366F1' : 'var(--k-muted)',
        }}>{badge}</span>
      )}
    </button>
  )
}
