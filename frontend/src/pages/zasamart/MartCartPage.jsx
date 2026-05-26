import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const fmtRp = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const STORAGE = import.meta.env.VITE_STORAGE_URL

export default function MartCartPage() {
  const navigate = useNavigate()
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/mart/cart').then(r => setItems(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const updateQty = async (item, qty) => {
    if (qty < 1) return removeItem(item.id)
    await api.post('/mart/cart', { product_id: item.product_id, quantity: qty })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: qty } : i))
  }

  const removeItem = async (id) => {
    await api.delete(`/mart/cart/${id}`)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  // Group by seller
  const bySeller = items.reduce((acc, item) => {
    const sid = item.seller_id
    if (!acc[sid]) acc[sid] = { seller: item.seller, items: [] }
    acc[sid].items.push(item)
    return acc
  }, {})

  const sellers = Object.values(bySeller)
  const totalAll = items.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0)

  return (
    <div style={{ background: 'var(--k-bg)', minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: 'var(--k-text)' }}>←</button>
        <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--k-text)' }}>Keranjang Belanja 🛒</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 28, height: 28, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--k-text)', marginBottom: 8 }}>Keranjang Kosong</p>
          <p style={{ fontSize: 13, color: 'var(--k-muted)', marginBottom: 24 }}>Belum ada produk yang ditambahkan</p>
          <button onClick={() => navigate('/mart')}
            style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366F1,#7C3AED)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Belanja Sekarang
          </button>
        </div>
      ) : (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sellers.map(({ seller, items: sellerItems }) => {
            const sub = sellerItems.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0)
            return (
              <div key={seller.id} style={{ background: 'var(--k-card)', borderRadius: 16, border: '1px solid var(--k-border)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🏪</span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', flex: 1 }}>{seller.name}</p>
                </div>
                {sellerItems.map(item => (
                  <div key={item.id} style={{ padding: '12px 14px', borderBottom: '1px solid var(--k-border)', display: 'flex', gap: 12 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
                      {item.product?.images?.[0]
                        ? <img src={`${STORAGE}/${item.product.images[0]}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🛍️</div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)', marginBottom: 2, lineHeight: 1.4 }}>{item.product?.name}</p>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#6366F1', marginBottom: 8 }}>{fmtRp(item.product?.price)}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => updateQty(item, item.quantity - 1)}
                          style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-card2)', cursor: 'pointer', fontSize: 16, color: 'var(--k-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontSize: 14, fontWeight: 700, minWidth: 24, textAlign: 'center', color: 'var(--k-text)' }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item, item.quantity + 1)}
                          style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-card2)', cursor: 'pointer', fontSize: 16, color: 'var(--k-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        <button onClick={() => removeItem(item.id)}
                          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 13, fontWeight: 600 }}>Hapus</button>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>Subtotal toko</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#6366F1' }}>{fmtRp(sub)}</p>
                </div>
                <div style={{ padding: '0 14px 14px' }}>
                  <button onClick={() => navigate('/mart/checkout', { state: { seller_id: seller.id } })}
                    style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366F1,#7C3AED)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                    Pesan dari {seller.name} · {fmtRp(sub)}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
