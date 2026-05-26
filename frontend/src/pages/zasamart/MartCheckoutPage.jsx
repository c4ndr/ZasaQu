import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../../services/api'

const fmtRp = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const STORAGE = import.meta.env.VITE_STORAGE_URL

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default function MartCheckoutPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const seller_id = location.state?.seller_id

  const [items, setItems]     = useState([])
  const [seller, setSeller]   = useState(null)
  const [address, setAddress] = useState('')
  const [phone, setPhone]     = useState('')
  const [notes, setNotes]     = useState('')
  const [lat, setLat]         = useState(null)
  const [lng, setLng]         = useState(null)
  const [locating, setLocating] = useState(false)
  const [placing, setPlacing]   = useState(false)
  const [err, setErr]           = useState('')

  useEffect(() => {
    if (!seller_id) { navigate('/mart/cart'); return }
    api.get('/mart/cart').then(r => {
      const filtered = r.data.filter(i => i.seller_id === seller_id)
      setItems(filtered)
      if (filtered.length > 0) setSeller(filtered[0].seller)
    })
  }, [seller_id])

  const getLocation = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: la, longitude: lo } = pos.coords
        setLat(la); setLng(lo)
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${lo}&format=json`)
          const d = await r.json()
          setAddress(d.display_name || '')
        } catch {}
        setLocating(false)
      },
      () => setLocating(false)
    )
  }

  const subtotal = items.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0)
  const shippingFee = seller && lat && lng
    ? Math.round(haversine(lat, lng, seller.lat || 0, seller.lng || 0) * 3000 / 1000) * 1000
    : 5000

  const place = async () => {
    if (!address.trim()) { setErr('Masukkan alamat pengiriman.'); return }
    setPlacing(true); setErr('')
    try {
      const r = await api.post('/mart/checkout', {
        seller_id, delivery_address: address, delivery_lat: lat, delivery_lng: lng,
        delivery_phone: phone || undefined, notes: notes || undefined,
        shipping_fee: shippingFee,
      })
      navigate(`/mart/orders/${r.data.id}`, { replace: true })
    } catch (e) { setErr(e.response?.data?.message || 'Gagal membuat pesanan.') }
    finally { setPlacing(false) }
  }

  return (
    <div style={{ background: 'var(--k-bg)', minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: 'var(--k-text)' }}>←</button>
        <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--k-text)' }}>Checkout</p>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Seller info */}
        {seller && (
          <div style={{ background: 'var(--k-card)', borderRadius: 14, padding: '12px 14px', border: '1px solid var(--k-border)', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 24 }}>🏪</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{seller.name}</p>
              <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{seller.address}</p>
            </div>
          </div>
        )}

        {/* Items */}
        <div style={{ background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', marginBottom: 14, overflow: 'hidden' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', padding: '12px 14px 0', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Produk ({items.length})</p>
          {items.map((item, i) => (
            <div key={item.id} style={{ padding: '10px 14px', display: 'flex', gap: 10, borderTop: i === 0 ? 'none' : '1px solid var(--k-border)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
                {item.product?.images?.[0]
                  ? <img src={`${STORAGE}/${item.product.images[0]}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🛍️</div>
                }
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-text)' }}>{item.product?.name}</p>
                <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{item.quantity}x · {fmtRp(item.product?.price)}</p>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', alignSelf: 'center' }}>{fmtRp((item.product?.price || 0) * item.quantity)}</p>
            </div>
          ))}
        </div>

        {/* Delivery address */}
        <div style={{ background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', padding: '14px', marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Alamat Pengiriman</p>
          <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Masukkan alamat lengkap..."
            rows={3} style={{ width: '100%', background: 'var(--k-card2)', border: '1px solid var(--k-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--k-text)', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
          <button onClick={getLocation} disabled={locating}
            style={{ marginTop: 8, padding: '8px 14px', borderRadius: 10, border: '1px solid #6366F1', background: 'none', color: '#6366F1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {locating ? 'Mendapatkan lokasi...' : '🎯 Gunakan Lokasi Saat Ini'}
          </button>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="No. HP penerima (opsional)"
            style={{ marginTop: 8, width: '100%', background: 'var(--k-card2)', border: '1px solid var(--k-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--k-text)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Notes */}
        <div style={{ background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', padding: '14px', marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Catatan</p>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan tambahan (opsional)"
            style={{ width: '100%', background: 'var(--k-card2)', border: '1px solid var(--k-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--k-text)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Summary */}
        <div style={{ background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', padding: '14px', marginBottom: 14 }}>
          {[
            { label: 'Subtotal', value: fmtRp(subtotal) },
            { label: 'Ongkir (estimasi)', value: fmtRp(shippingFee) },
          ].map((r, i) => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 1 ? '1px solid var(--k-border)' : 'none' }}>
              <p style={{ fontSize: 13, color: 'var(--k-muted)' }}>{r.label}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)' }}>{r.value}</p>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0' }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)' }}>Total</p>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#6366F1' }}>{fmtRp(subtotal + shippingFee)}</p>
          </div>
        </div>

        {err && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{err}</p>}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--k-surface)', borderTop: '1px solid var(--k-border)', padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom,0px))' }}>
        <button onClick={place} disabled={placing || items.length === 0}
          style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#6366F1,#7C3AED)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', opacity: placing ? 0.7 : 1 }}>
          {placing ? 'Memproses...' : `Buat Pesanan · ${fmtRp(subtotal + shippingFee)}`}
        </button>
      </div>
    </div>
  )
}
