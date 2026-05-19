import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'

function fmtRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

// ── Cart item counter ──────────────────────────────────────────────────────────
function QtyControl({ qty, onDec, onInc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={onDec} style={{
        width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: qty > 0 ? 'rgba(255,122,69,0.15)' : 'var(--k-input)',
        color: '#FF7A45', fontWeight: 800, fontSize: 18, lineHeight: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>−</button>
      <span style={{ fontWeight: 700, minWidth: 18, textAlign: 'center', fontSize: 14 }}>{qty}</span>
      <button onClick={onInc} style={{
        width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: '#FF7A45', color: '#fff', fontWeight: 800, fontSize: 18, lineHeight: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>+</button>
    </div>
  )
}

export default function FoodMerchantPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [merchant, setMerchant] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [cart,     setCart]     = useState({}) // { item_id: { item, qty, notes } }

  useEffect(() => {
    api.get(`/food/merchants/${id}`)
      .then(r => setMerchant(r.data.data))
      .catch(() => navigate('/food'))
      .finally(() => setLoading(false))
  }, [id])

  function addItem(item) {
    setCart(c => {
      const cur = c[item.id]?.qty ?? 0
      return { ...c, [item.id]: { item, qty: cur + 1, notes: c[item.id]?.notes ?? '' } }
    })
  }

  function removeItem(item) {
    setCart(c => {
      const cur = c[item.id]?.qty ?? 0
      if (cur <= 1) { const next = { ...c }; delete next[item.id]; return next }
      return { ...c, [item.id]: { ...c[item.id], qty: cur - 1 } }
    })
  }

  const cartItems   = Object.values(cart)
  const cartTotal   = cartItems.reduce((s, l) => s + l.item.price * l.qty, 0)
  const cartCount   = cartItems.reduce((s, l) => s + l.qty, 0)

  function goToCart() {
    navigate('/food/cart', { state: { merchant, cart: cartItems.map(l => ({
      menu_item_id: l.item.id,
      quantity:     l.qty,
      notes:        l.notes,
      item:         l.item,
    })) } })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--k-sub)' }}>Memuat...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: cartCount > 0 ? 100 : 20 }}>
      {/* Header / Banner */}
      <div style={{ position: 'relative' }}>
        <div style={{ height: 160, background: 'var(--k-input)', overflow: 'hidden' }}>
          {merchant?.banner_path
            ? <img src={`/storage/${merchant.banner_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>🍜</div>
          }
        </div>
        <button onClick={() => navigate(-1)} style={{
          position: 'absolute', top: 14, left: 14, width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer',
          color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
      </div>

      {/* Info merchant */}
      <div style={{ padding: '16px 16px 0', background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
            background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
            marginTop: -32, border: '3px solid var(--k-card)',
          }}>
            {merchant?.logo_path ? <img src={`/storage/${merchant.logo_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏪'}
          </div>
          <div style={{ flex: 1, marginTop: 4 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{merchant?.name}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--k-sub)' }}>⭐ {merchant?.average_rating > 0 ? merchant.average_rating.toFixed(1) : '—'}</span>
              <span style={{ fontSize: 12, color: merchant?.is_open ? '#00C896' : '#F56565', fontWeight: 700 }}>
                {merchant?.is_open ? '● Buka' : '● Tutup'}
              </span>
              {merchant?.avg_prep_time_minutes && (
                <span style={{ fontSize: 12, color: 'var(--k-sub)' }}>⏱ ~{merchant.avg_prep_time_minutes} menit</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Menu per kategori */}
      <div style={{ padding: '16px' }}>
        {!merchant?.is_open && (
          <div style={{
            padding: '14px 16px', borderRadius: 12, marginBottom: 16,
            background: 'rgba(245,101,101,0.1)', border: '1px solid rgba(245,101,101,0.2)',
            fontSize: 13, color: '#F56565', fontWeight: 600,
          }}>Toko sedang tutup. Tidak bisa memesan saat ini.</div>
        )}

        {merchant?.categories?.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--k-sub)', padding: '32px 0' }}>Menu belum tersedia.</p>
        )}

        {merchant?.categories?.map(cat => (
          cat.items?.length > 0 && (
            <div key={cat.id} style={{ marginBottom: 28 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--k-sub)' }}>
                {cat.name}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {cat.items.map(item => {
                  const qty = cart[item.id]?.qty ?? 0
                  return (
                    <div key={item.id} style={{
                      display: 'flex', gap: 12, padding: '14px', borderRadius: 14,
                      background: 'var(--k-card)', border: '1.5px solid var(--k-border)',
                      opacity: item.is_available ? 1 : 0.5,
                    }}>
                      <div style={{
                        width: 72, height: 72, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                        background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                      }}>
                        {item.photo_path ? <img src={`/storage/${item.photo_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🍽️'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                        {item.description && <div style={{ fontSize: 12, color: 'var(--k-sub)', marginTop: 2 }}>{item.description}</div>}
                        <div style={{ fontWeight: 800, color: '#FF7A45', fontSize: 14, marginTop: 6 }}>{fmtRp(item.price)}</div>
                        {item.stock !== null && <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Stok: {item.stock}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', flexShrink: 0 }}>
                        {item.is_available && merchant?.is_open ? (
                          <QtyControl
                            qty={qty}
                            onDec={() => removeItem(item)}
                            onInc={() => addItem(item)}
                          />
                        ) : (
                          <span style={{ fontSize: 11, color: '#F56565', fontWeight: 700 }}>Habis</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        ))}
      </div>

      {/* Cart CTA */}
      {cartCount > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480, padding: '12px 16px', boxSizing: 'border-box',
          background: 'var(--k-card)', borderTop: '1px solid var(--k-border)',
        }}>
          <button onClick={goToCart} style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: '#FF7A45', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{
              background: 'rgba(255,255,255,0.3)', borderRadius: 20,
              padding: '2px 10px', fontSize: 13,
            }}>{cartCount} item</span>
            <span>Lihat Keranjang</span>
            <span>{fmtRp(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
