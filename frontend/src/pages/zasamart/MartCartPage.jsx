import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const fmtRp = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const STORAGE = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')

export default function MartCartPage() {
  const navigate = useNavigate()
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(new Set()) // selected cart item ids
  const [editNotes, setEditNotes] = useState({})      // { itemId: notesValue }

  const load = async () => {
    setLoading(true)
    const r = await api.get('/mart/cart').finally(() => setLoading(false))
    setItems(r.data)
    // Select all by default
    setSelected(new Set(r.data.map(i => i.id)))
  }

  useEffect(() => { load() }, [])

  const updateQty = async (item, qty) => {
    if (qty < 1) return removeItem(item.id)
    await api.post('/mart/cart', { product_id: item.product_id, quantity: qty })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: qty } : i))
    window.dispatchEvent(new CustomEvent('mart-cart-updated'))
  }

  const removeItem = async (id) => {
    await api.delete(`/mart/cart/${id}`)
    setItems(prev => prev.filter(i => i.id !== id))
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    window.dispatchEvent(new CustomEvent('mart-cart-updated'))
  }

  const toggleItem = (id) => {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const toggleSeller = (sellerItems) => {
    const ids = sellerItems.map(i => i.id)
    const allSelected = ids.every(id => selected.has(id))
    setSelected(prev => {
      const n = new Set(prev)
      ids.forEach(id => allSelected ? n.delete(id) : n.add(id))
      return n
    })
  }

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map(i => i.id)))
  }

  // Group by seller
  const bySeller = items.reduce((acc, item) => {
    const sid = item.seller_id
    if (!acc[sid]) acc[sid] = { seller: item.seller, items: [] }
    acc[sid].items.push(item)
    return acc
  }, {})
  const sellers = Object.values(bySeller)

  const selectedItems = items.filter(i => selected.has(i.id))
  const totalAll = selectedItems.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0)
  const allChecked = items.length > 0 && selected.size === items.length

  // Grouped selected by seller for per-toko checkout
  const selectedBySeller = selectedItems.reduce((acc, item) => {
    const sid = item.seller_id
    if (!acc[sid]) acc[sid] = { seller: item.seller, items: [] }
    acc[sid].items.push(item)
    return acc
  }, {})
  const selectedSellers = Object.values(selectedBySeller)

  return (
    <div style={{ background: 'var(--k-bg)', minHeight: '100dvh', paddingBottom: 120 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: 'var(--k-text)' }}>←</button>
        <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--k-text)', flex: 1 }}>Keranjang Belanja 🛒</p>
        {items.length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{items.length} produk</p>
        )}
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
        <>
          {/* Pilih semua */}
          <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={allChecked} onChange={toggleAll}
                style={{ width: 18, height: 18, accentColor: '#6366F1', cursor: 'pointer' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)' }}>Pilih Semua ({items.length})</span>
            </label>
            {selected.size > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#6366F1' }}>
                {selected.size} dipilih
              </span>
            )}
          </div>

          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sellers.map(({ seller, items: sellerItems }) => {
              const allSellerSelected = sellerItems.every(i => selected.has(i.id))
              const sub = sellerItems.filter(i => selected.has(i.id)).reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0)
              return (
                <div key={seller.id} style={{ background: 'var(--k-card)', borderRadius: 16, border: '1px solid var(--k-border)', overflow: 'hidden' }}>
                  {/* Seller header */}
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" checked={allSellerSelected} onChange={() => toggleSeller(sellerItems)}
                      style={{ width: 18, height: 18, accentColor: '#6366F1', cursor: 'pointer', flexShrink: 0 }} />
                    {seller.logo_path
                      ? <img src={`${STORAGE}/${seller.logo_path}`} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      : <span style={{ fontSize: 18, flexShrink: 0 }}>🏪</span>
                    }
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', flex: 1 }}>{seller.name}</p>
                    <button onClick={() => navigate(`/mart/sellers/${seller.id}`)}
                      style={{ background: 'none', border: 'none', color: '#6366F1', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      Kunjungi
                    </button>
                  </div>

                  {/* Items */}
                  {sellerItems.map((item, idx) => (
                    <div key={item.id} style={{ borderBottom: idx < sellerItems.length - 1 ? '1px solid var(--k-border)' : 'none' }}>
                      <div style={{ padding: '12px 14px', display: 'flex', gap: 10 }}>
                        <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleItem(item.id)}
                          style={{ width: 18, height: 18, accentColor: '#6366F1', cursor: 'pointer', marginTop: 4, flexShrink: 0 }} />
                        <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
                          {item.product?.images?.[0]
                            ? <img src={`${STORAGE}/${item.product.images[0]}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🛍️</div>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)', marginBottom: 2, lineHeight: 1.4,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.product?.name}
                          </p>
                          <p style={{ fontSize: 13, fontWeight: 800, color: '#6366F1', marginBottom: 6 }}>{fmtRp(item.product?.price)}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--k-bg)', borderRadius: 8, border: '1px solid var(--k-border)', overflow: 'hidden' }}>
                              <button onClick={() => updateQty(item, item.quantity - 1)}
                                style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--k-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                              <span style={{ fontSize: 13, fontWeight: 700, minWidth: 22, textAlign: 'center', color: 'var(--k-text)' }}>{item.quantity}</span>
                              <button onClick={() => updateQty(item, item.quantity + 1)}
                                style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--k-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-text)' }}>{fmtRp((item.product?.price || 0) * item.quantity)}</span>
                            <button onClick={() => removeItem(item.id)}
                              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 12, fontWeight: 600 }}>Hapus</button>
                          </div>
                        </div>
                      </div>

                      {/* Catatan item */}
                      <div style={{ padding: '0 14px 10px 42px' }}>
                        {editNotes[item.id] !== undefined ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input
                              value={editNotes[item.id]}
                              onChange={e => setEditNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder="Catatan untuk produk ini..."
                              style={{ flex: 1, fontSize: 11, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-bg)', color: 'var(--k-text)', outline: 'none' }}
                            />
                            <button onClick={async () => {
                              await api.post('/mart/cart', { product_id: item.product_id, quantity: item.quantity, notes: editNotes[item.id] })
                              setItems(prev => prev.map(i => i.id === item.id ? { ...i, notes: editNotes[item.id] } : i))
                              setEditNotes(prev => { const n = { ...prev }; delete n[item.id]; return n })
                            }} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#6366F1', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                              Simpan
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setEditNotes(prev => ({ ...prev, [item.id]: item.notes || '' }))}
                            style={{ background: 'none', border: 'none', color: 'var(--k-muted)', fontSize: 11, cursor: 'pointer', padding: 0 }}>
                            {item.notes ? `📝 ${item.notes}` : '+ Tambah catatan'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Per-toko checkout */}
                  {sub > 0 && (
                    <div style={{ padding: '10px 14px 14px', borderTop: '1px solid var(--k-border)', background: 'rgba(99,102,241,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>Subtotal yang dipilih</p>
                        <p style={{ fontSize: 14, fontWeight: 800, color: '#6366F1' }}>{fmtRp(sub)}</p>
                      </div>
                      <button onClick={() => navigate('/mart/checkout', {
                        state: {
                          seller_id: seller.id,
                          cart_item_ids: sellerItems.filter(i => selected.has(i.id)).map(i => i.id),
                        },
                      })}
                        style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366F1,#7C3AED)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                        Checkout dari {seller.name} · {fmtRp(sub)}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Bottom bar — checkout semua terpilih jika lintas toko */}
      {selectedSellers.length > 1 && totalAll > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--k-surface)', borderTop: '1px solid var(--k-border)', padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom,0px))' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>{selected.size} produk dari {selectedSellers.length} toko</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: '#6366F1' }}>{fmtRp(totalAll)}</p>
          </div>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 8, textAlign: 'center' }}>
            Checkout per toko menggunakan tombol di atas masing-masing toko
          </p>
        </div>
      )}
    </div>
  )
}
