import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import LocationSearch from '../../components/LocationSearch'

const UNIT_LABEL = { kg: 'kg', item: 'item', jam: 'jam', sesi: 'sesi' }

export default function HomeCheckoutPage() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const { provider, items } = state ?? {}

  const [pickupAddr, setPickupAddr] = useState('')
  const [pickupLat,  setPickupLat]  = useState('')
  const [pickupLng,  setPickupLng]  = useState('')
  const [notes,      setNotes]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  if (!provider || !items) {
    navigate('/home')
    return null
  }

  const totalPrice = items.reduce((s, i) => s + i.service.price * i.quantity, 0)

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
        notes:          notes || undefined,
        items: items.map(i => ({ service_id: i.service_id, quantity: i.quantity })),
      })
      navigate(`/home/orders/${res.data.data.id}`, { replace: true })
    } catch (err) {
      const errs = err.response?.data?.errors
      setError(errs ? Object.values(errs).flat().join(' ') : (err.response?.data?.message || 'Gagal membuat pesanan.'))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      <div style={{ padding: '52px 20px 20px', background: 'linear-gradient(160deg,#0F1E25 0%,var(--k-bg) 100%)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--k-muted)', fontSize: 14, cursor: 'pointer', marginBottom: 12, padding: 0 }}>
          ← Kembali
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--k-text)' }}>Konfirmasi Pesanan</h1>
        <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>{provider.name}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(245,101,101,0.1)', border: '1px solid rgba(245,101,101,0.3)', color: '#F56565', fontSize: 13 }}>{error}</div>}

        {/* Order summary */}
        <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: 16 }}>
          <p style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Ringkasan Pesanan</p>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 13, color: 'var(--k-text)', fontWeight: 600 }}>{item.service.name}</p>
                <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{item.quantity} {UNIT_LABEL[item.service.unit]} × Rp {item.service.price.toLocaleString('id')}</p>
              </div>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)' }}>Rp {(item.service.price * item.quantity).toLocaleString('id')}</p>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--k-border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontWeight: 700, fontSize: 15 }}>Total</p>
            <p style={{ fontWeight: 800, fontSize: 16, color: '#6366F1' }}>Rp {totalPrice.toLocaleString('id')}</p>
          </div>
        </div>

        {/* Pickup address */}
        <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, padding: 16 }}>
          <p style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Alamat Pickup</p>
          <LocationSearch
            value={pickupAddr}
            onChange={setPickupAddr}
            onSelect={({ lat, lng, display }) => { setPickupAddr(display); setPickupLat(lat); setPickupLng(lng) }}
            placeholder="Ketik alamat penjemputan..."
            confirmed={!!pickupLat}
          />
          {pickupLat && (
            <p style={{ fontSize: 11, color: 'var(--k-accent)', marginTop: 6 }}>📍 Lokasi dikonfirmasi</p>
          )}
        </div>

        {/* Notes */}
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
