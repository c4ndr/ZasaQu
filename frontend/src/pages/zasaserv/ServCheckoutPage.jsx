import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../services/api'
import LocationSearch from '../../components/LocationSearch'

export default function ServCheckoutPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { provider, items, totalPrice } = location.state ?? {}

  const [address,     setAddress]     = useState('')
  const [lat,         setLat]         = useState(null)
  const [lng,         setLng]         = useState(null)
  const [locationQuery, setLocationQuery] = useState('')
  const [notes,       setNotes]       = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  if (!provider || !items) {
    navigate('/serv', { replace: true })
    return null
  }

  async function submit() {
    if (!address.trim()) { setError('Alamat harus diisi.'); return }
    setError('')
    setLoading(true)
    try {
      const payload = {
        provider_id:  provider.id,
        address:      address.trim(),
        lat:          lat ? parseFloat(lat) : undefined,
        lng:          lng ? parseFloat(lng) : undefined,
        notes:        notes || undefined,
        scheduled_at: scheduledAt || undefined,
        items,
      }
      const res = await api.post('/serv/orders', payload)
      navigate(`/serv/orders/${res.data.data.id}`, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message ?? 'Gagal membuat pesanan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#064e3b,#059669)', padding: '52px 16px 20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
          ← Kembali
        </button>
        <div style={{ fontWeight: 800, fontSize: 20, color: '#fff' }}>Konfirmasi Pesanan</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>{provider.name}</div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Order summary */}
        <div style={{ background: 'var(--k-card)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Ringkasan Layanan</div>
          {items.map(item => {
            const svc = provider.services?.find(s => s.id === item.service_id)
            return (
              <div key={item.service_id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>{svc?.name ?? 'Layanan'} ×{item.quantity}</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Rp {((svc?.price ?? 0) * item.quantity).toLocaleString('id')}</span>
              </div>
            )
          })}
          <div style={{ borderTop: '1px solid var(--k-border)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span style={{ fontWeight: 800, color: '#059669', fontSize: 16 }}>Rp {totalPrice.toLocaleString('id')}</span>
          </div>
        </div>

        {/* Address form */}
        <div style={{ background: 'var(--k-card)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Alamat Lokasi</div>

          <LocationSearch
            value={locationQuery}
            onChange={val => { setLocationQuery(val); if (!val) { setAddress(''); setLat(null); setLng(null) } }}
            onSelect={({ lat: selLat, lng: selLng, display }) => {
              setLat(selLat); setLng(selLng); setAddress(display); setLocationQuery(display)
            }}
            placeholder="Cari alamat lokasi servis..."
            confirmed={!!lat && !!lng}
          />

          <button
            type="button"
            onClick={() => {
              if (!navigator.geolocation) return alert('Browser tidak mendukung GPS.')
              navigator.geolocation.getCurrentPosition(
                pos => {
                  const { latitude, longitude } = pos.coords
                  setLat(latitude); setLng(longitude)
                  setAddress(`Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
                  setLocationQuery('Lokasi saya saat ini')
                  if (window.google?.maps) {
                    const geocoder = new window.google.maps.Geocoder()
                    geocoder.geocode({ location: { lat: latitude, lng: longitude }, language: 'id' }, (results, status) => {
                      if (status === 'OK' && results?.[0]) {
                        const addr = results[0].formatted_address
                        setAddress(addr); setLocationQuery(addr)
                      }
                    })
                  }
                },
                () => alert('Gagal mendapatkan lokasi. Pastikan GPS aktif.'),
                { enableHighAccuracy: true, timeout: 10000 }
              )
            }}
            style={{ marginTop: 10, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.3)', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 12, color: '#059669', fontWeight: 700 }}
          >
            📍 Gunakan lokasi saya sekarang
          </button>

          {lat && lng && (
            <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 8 }}>
              ✓ Koordinat: {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
            </p>
          )}
        </div>

        {/* Schedule & notes */}
        <div style={{ background: 'var(--k-card)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Detail Tambahan</div>

          <label style={{ fontSize: 12, color: 'var(--k-muted)', fontWeight: 600 }}>Jadwal (opsional)</label>
          <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
            min={new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16)}
            style={{ width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, boxSizing: 'border-box' }} />

          <label style={{ fontSize: 12, color: 'var(--k-muted)', fontWeight: 600, marginTop: 12, display: 'block' }}>Catatan untuk teknisi</label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Tambahkan catatan jika perlu..."
            style={{ width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, boxSizing: 'border-box', resize: 'none' }}
          />
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '10px 14px', color: '#EF4444', fontSize: 13, marginBottom: 14 }}>{error}</div>}
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'var(--k-card)', borderTop: '1px solid var(--k-border)' }}>
        <button onClick={submit} disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? 'var(--k-muted)' : '#059669', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Memproses...' : `Pesan — Rp ${totalPrice.toLocaleString('id')}`}
        </button>
      </div>
    </div>
  )
}
