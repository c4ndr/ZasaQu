import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useAppInfo from '../../hooks/useAppInfo'
import api from '../../services/api'
import AddressPicker from '../../components/AddressPicker'
import VoucherInput from '../../components/VoucherInput'

const fmtRp = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const STORAGE = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const PAYMENT_METHODS = [
  { key: 'wallet', icon: '💳', label: 'Saldo ZasaQu', desc: 'Bayar langsung dari saldo' },
  { key: 'cod',    icon: '💵', label: 'Bayar di Tempat', desc: 'Bayar saat barang tiba (COD)' },
]

export default function MartCheckoutPage() {
  const navigate     = useNavigate()
  const location     = useLocation()
  const { wallet_enabled: walletEnabled } = useAppInfo()
  const seller_id    = location.state?.seller_id
  const cartItemIds  = location.state?.cart_item_ids ?? null

  const [items,        setItems]        = useState([])
  const [seller,       setSeller]       = useState(null)
  const [deliveryInfo, setDeliveryInfo] = useState(null) // { address, lat, lng, recipient_name, recipient_phone, notes }
  const [notes,        setNotes]        = useState('')
  const [placing,      setPlacing]      = useState(false)
  const [err,          setErr]          = useState('')
  const [payMethod,    setPayMethod]    = useState('cod')
  const [balance,      setBalance]      = useState(null)
  const [promo,        setPromo]        = useState({ promoCode: null, discountAmount: 0 })

  useEffect(() => {
    if (!seller_id) { navigate('/mart/cart'); return }
    api.get('/mart/cart').then(r => {
      let filtered = r.data.filter(i => i.seller_id === seller_id)
      if (cartItemIds?.length) filtered = filtered.filter(i => cartItemIds.includes(i.id))
      setItems(filtered)
      if (filtered.length > 0) setSeller(filtered[0].seller)
    })
    api.get('/wallet/summary').then(r => setBalance(r.data.available ?? null)).catch(() => {})
  }, [seller_id]) // eslint-disable-line

  const subtotal = items.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0)
  const sellerLat = parseFloat(seller?.lat)
  const sellerLng = parseFloat(seller?.lng)
  const hasSellerCoords = seller && !isNaN(sellerLat) && !isNaN(sellerLng) && sellerLat !== 0
  const shippingFee = hasSellerCoords && deliveryInfo?.lat && deliveryInfo?.lng
    ? Math.max(3000, Math.round(haversine(deliveryInfo.lat, deliveryInfo.lng, sellerLat, sellerLng) * 3000 / 1000) * 1000)
    : 5000
  const total = Math.max(0, subtotal + shippingFee - promo.discountAmount)

  const place = async () => {
    if (!deliveryInfo?.address?.trim()) { setErr('Pilih alamat pengiriman terlebih dahulu.'); return }
    if (payMethod === 'wallet' && balance !== null && balance < total) {
      setErr(`Saldo tidak cukup. Saldo kamu ${fmtRp(balance)}, dibutuhkan ${fmtRp(total)}. Pilih Bayar di Tempat atau top up dulu.`)
      return
    }
    setPlacing(true); setErr('')
    try {
      const r = await api.post('/mart/checkout', {
        seller_id,
        delivery_address: deliveryInfo.address,
        delivery_lat: deliveryInfo.lat,
        delivery_lng: deliveryInfo.lng,
        delivery_name: deliveryInfo.recipient_name || undefined,
        delivery_phone: deliveryInfo.recipient_phone || undefined,
        notes: notes || deliveryInfo.notes || undefined,
        shipping_fee: shippingFee,
        payment_method: payMethod,
        cart_item_ids: cartItemIds ?? undefined,
        ...(promo.promoCode ? { promo_code: promo.promoCode } : {}),
      })
      window.dispatchEvent(new CustomEvent('mart-cart-updated'))
      navigate(`/mart/orders/${r.data.id}`, { replace: true })
    } catch (e) { setErr(e.response?.data?.message || 'Gagal membuat pesanan.') }
    finally { setPlacing(false) }
  }

  const card = { background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', marginBottom: 14, overflow: 'hidden' }

  return (
    <div style={{ background: 'var(--k-bg)', minHeight: '100dvh', paddingBottom: 110 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: 'var(--k-text)' }}>←</button>
        <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--k-text)' }}>Checkout</p>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Seller info */}
        {seller && (
          <div style={{ ...card, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
            {seller.logo_path
              ? <img src={`${STORAGE}/${seller.logo_path}`} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              : <span style={{ fontSize: 24, flexShrink: 0 }}>🏪</span>
            }
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{seller.name}</p>
              <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{seller.address || 'Toko lokal ZasaShop'}</p>
            </div>
          </div>
        )}

        {/* Items */}
        <div style={card}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', padding: '12px 14px 0', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Produk ({items.length})
          </p>
          {items.map((item, i) => (
            <div key={item.id} style={{ padding: '10px 14px', display: 'flex', gap: 10, borderTop: i === 0 ? 'none' : '1px solid var(--k-border)' }}>
              <div style={{ width: 50, height: 50, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
                {item.product?.images?.[0]
                  ? <img src={`${STORAGE}/${item.product.images[0]}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🛍️</div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product?.name}</p>
                <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{item.quantity}× · {fmtRp(item.product?.price)}</p>
                {item.notes && <p style={{ fontSize: 11, color: '#6366F1', fontStyle: 'italic' }}>📝 {item.notes}</p>}
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', alignSelf: 'center', flexShrink: 0 }}>{fmtRp((item.product?.price || 0) * item.quantity)}</p>
            </div>
          ))}
        </div>

        {/* Delivery address */}
        <div style={{ ...card, padding: '14px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>📍 Alamat Pengiriman</p>
          <AddressPicker value={deliveryInfo} onChange={setDeliveryInfo} />
        </div>

        {/* Payment method */}
        <div style={{ ...card, padding: '14px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>💳 Metode Pembayaran</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PAYMENT_METHODS.filter(m => m.key !== 'wallet' || walletEnabled).map(m => (
              <div key={m.key} onClick={() => setPayMethod(m.key)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                border: `2px solid ${payMethod === m.key ? '#6366F1' : 'var(--k-border)'}`,
                background: payMethod === m.key ? 'rgba(99,102,241,0.06)' : 'var(--k-bg)',
              }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{m.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{m.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>
                    {m.key === 'wallet' && balance !== null ? `${m.desc} · Saldo ${fmtRp(balance)}` : m.desc}
                  </p>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', border: `2px solid ${payMethod === m.key ? '#6366F1' : 'var(--k-border)'}`,
                  background: payMethod === m.key ? '#6366F1' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {payMethod === m.key && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                </div>
              </div>
            ))}
          </div>
          {payMethod === 'wallet' && balance !== null && balance < total && (
            <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#DC2626' }}>
              ⚠ Saldo tidak cukup (kurang {fmtRp(total - balance)}). Pilih Bayar di Tempat atau top up dulu.
            </div>
          )}
        </div>

        {/* Notes */}
        <div style={{ ...card, padding: '14px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>📝 Catatan</p>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan tambahan untuk penjual (opsional)"
            style={{ width: '100%', background: 'var(--k-bg)', border: '1.5px solid var(--k-border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--k-text)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Voucher */}
        <div style={{ ...card, padding: '14px' }}>
          <VoucherInput
            orderAmount={subtotal + shippingFee}
            module="zasamart"
            onApply={({ promoCode, discountAmount }) => setPromo({ promoCode, discountAmount })}
            onClear={() => setPromo({ promoCode: null, discountAmount: 0 })}
          />
        </div>

        {/* Summary */}
        <div style={{ ...card, padding: '14px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Ringkasan Pembayaran</p>
          {[
            { label: 'Subtotal', value: fmtRp(subtotal) },
            { label: deliveryInfo?.lat ? 'Ongkir (estimasi jarak)' : 'Ongkir (estimasi)', value: fmtRp(shippingFee) },
          ].map((row, i) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i === 0 ? '1px solid var(--k-border)' : 'none' }}>
              <p style={{ fontSize: 13, color: 'var(--k-muted)' }}>{row.label}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)' }}>{row.value}</p>
            </div>
          ))}
          {promo.discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--k-border)' }}>
              <p style={{ fontSize: 13, color: 'var(--k-accent)' }}>Diskon Promo 🎟</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-accent)' }}>-{fmtRp(promo.discountAmount)}</p>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: promo.discountAmount > 0 ? 'none' : '1px solid var(--k-border)' }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)' }}>Total</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#6366F1' }}>{fmtRp(total)}</p>
          </div>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 4 }}>
            Bayar via: {payMethod === 'wallet' ? '💳 Saldo ZasaQu' : '💵 Bayar di Tempat'}
          </p>
        </div>

        {err && (
          <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
            ⚠ {err}
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--k-surface)', borderTop: '1px solid var(--k-border)', padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom,0px))' }}>
        <button onClick={place} disabled={placing || items.length === 0}
          style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: placing ? 'var(--k-muted)' : 'linear-gradient(135deg,#6366F1,#7C3AED)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: placing ? 'default' : 'pointer' }}>
          {placing ? 'Memproses...' : `Buat Pesanan · ${fmtRp(total)}${promo.discountAmount > 0 ? ' 🎟' : ''}`}
        </button>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
