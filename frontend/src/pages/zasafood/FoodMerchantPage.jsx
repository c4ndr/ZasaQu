import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api, { storageUrl } from '../../services/api'

function fmtRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

// ── Kontrol kuantitas ──────────────────────────────────────────────────────────
function QtyControl({ qty, onDec, onInc, small = false }) {
  const sz = small ? 26 : 32
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: small ? 6 : 8 }}>
      <button onClick={e => { e.stopPropagation(); onDec() }} style={{
        width: sz, height: sz, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: qty > 0 ? 'rgba(249,115,22,0.15)' : 'var(--k-input)',
        color: '#F97316', fontWeight: 800, fontSize: small ? 16 : 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>−</button>
      <span style={{ fontWeight: 700, minWidth: small ? 14 : 18, textAlign: 'center', fontSize: small ? 13 : 15 }}>{qty}</span>
      <button onClick={e => { e.stopPropagation(); onInc() }} style={{
        width: sz, height: sz, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: '#F97316', color: '#fff', fontWeight: 800, fontSize: small ? 16 : 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>+</button>
    </div>
  )
}

// ── Modal detail item + notes ─────────────────────────────────────────────────
function ItemDetailModal({ item, qty, notes, onClose, onChange }) {
  const [localNotes, setLocalNotes] = useState(notes || '')
  const [localQty,   setLocalQty]   = useState(qty || 0)

  function confirm() {
    onChange(localQty, localNotes)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--k-card)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto' }}>
        {/* Foto item */}
        <div style={{ height: 200, background: 'var(--k-input)', overflow: 'hidden', borderRadius: '20px 20px 0 0', position: 'relative' }}>
          {item.photo_path
            ? <img src={storageUrl(item.photo_path)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>🍽️</div>
          }
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12,
            width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>{item.name}</div>
          {item.description && <div style={{ fontSize: 13, color: 'var(--k-sub)', marginBottom: 10, lineHeight: 1.5 }}>{item.description}</div>}
          <div style={{ fontWeight: 800, fontSize: 18, color: '#F97316', marginBottom: 16 }}>{fmtRp(item.price)}</div>

          {/* Catatan per item */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-sub)', marginBottom: 6 }}>Catatan untuk item ini <span style={{ fontWeight: 400 }}>(opsional)</span></div>
            <textarea rows={2} value={localNotes} onChange={e => setLocalNotes(e.target.value)}
              placeholder="cth: tidak pedas, tanpa bawang..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, resize: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Kuantitas + tombol tambah */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <QtyControl qty={localQty} onDec={() => setLocalQty(q => Math.max(0, q - 1))} onInc={() => setLocalQty(q => q + 1)} />
            <button onClick={confirm} disabled={localQty === 0} style={{
              flex: 1, padding: '13px', borderRadius: 12, border: 'none',
              background: localQty > 0 ? '#F97316' : 'var(--k-border)',
              color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: localQty > 0 ? 'pointer' : 'default',
            }}>
              {localQty === 0 ? 'Pilih jumlah' : `Tambah ke Keranjang · ${fmtRp(item.price * localQty)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Halaman merchant ──────────────────────────────────────────────────────────
export default function FoodMerchantPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const location   = useLocation()
  const { user }   = useAuth()
  const autoJoinSession = location.state?.autoJoinSession ?? null
  const [merchant, setMerchant]   = useState(null)
  const [loading,  setLoading]    = useState(true)
  const [cart,     setCart]       = useState({})   // { item_id: { item, qty, notes } }
  const [itemModal,setItemModal]  = useState(null) // item object
  const [activeTab,setActiveTab]  = useState(null) // category id
  const catRefs  = useRef({})
  const headerRef = useRef(null)

  useEffect(() => {
    api.get(`/food/merchants/${id}`)
      .then(r => {
        const m = r.data.data
        setMerchant(m)
        setActiveTab(m?.categories?.[0]?.id ?? null)

        const reorderItems = location.state?.reorderItems
        if (reorderItems?.length) {
          const allItems = m?.categories?.flatMap(c => c.items) ?? []
          const newCart = {}
          reorderItems.forEach(ri => {
            const item = allItems.find(i => i.id === ri.menu_item_id)
            if (item && item.is_available) {
              newCart[item.id] = { item, qty: ri.quantity, notes: ri.notes ?? '' }
            }
          })
          if (Object.keys(newCart).length > 0) setCart(newCart)
        }
      })
      .catch(() => navigate('/food'))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line

  // Scroll ke kategori
  function scrollToCategory(catId) {
    setActiveTab(catId)
    const el = catRefs.current[catId]
    if (el) {
      const headerH = headerRef.current?.offsetHeight ?? 0
      const top = el.getBoundingClientRect().top + window.scrollY - headerH - 8
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  // Observer untuk update tab aktif saat scroll
  useEffect(() => {
    if (!merchant) return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveTab(Number(entry.target.dataset.catid))
      })
    }, { rootMargin: '-40% 0px -55% 0px' })
    Object.entries(catRefs.current).forEach(([, el]) => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [merchant])

  function openItem(item) {
    if (!merchant?.is_open || !item.is_available) return
    setItemModal(item)
  }

  function onItemChange(item, qty, notes) {
    if (qty === 0) {
      setCart(c => { const n = { ...c }; delete n[item.id]; return n })
    } else {
      setCart(c => ({ ...c, [item.id]: { item, qty, notes } }))
    }
  }

  const cartItems = Object.values(cart)
  const cartTotal = cartItems.reduce((s, l) => s + l.item.price * l.qty, 0)
  const cartCount = cartItems.reduce((s, l) => s + l.qty, 0)

  function goToCart() {
    if (!user) { navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`); return }
    navigate('/food/cart', { state: {
      merchant,
      cart: cartItems.map(l => ({
        menu_item_id: l.item.id,
        quantity:     l.qty,
        notes:        l.notes,
        item:         l.item,
      })),
      preSelectedSession: autoJoinSession ?? undefined,
    } })
  }

  // Flatten semua kategori untuk navigasi
  const allCats = merchant?.categories?.filter(c => c.items?.length > 0) ?? []

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--k-bg)' }}>
      <div style={{ textAlign: 'center', color: 'var(--k-sub)' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🍜</div>
        <p style={{ fontSize: 14 }}>Memuat menu...</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: cartCount > 0 ? 96 : 24 }}>

      {itemModal && (
        <ItemDetailModal
          item={itemModal}
          qty={cart[itemModal.id]?.qty ?? 0}
          notes={cart[itemModal.id]?.notes ?? ''}
          onClose={() => setItemModal(null)}
          onChange={(qty, notes) => onItemChange(itemModal, qty, notes)}
        />
      )}

      {/* ── Sticky header (banner + info + tabs) ── */}
      <div ref={headerRef} style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--k-card)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        {/* Banner */}
        <div style={{ height: 140, background: 'var(--k-input)', overflow: 'hidden', position: 'relative' }}>
          {merchant?.banner_path
            ? <img src={storageUrl(merchant.banner_path, merchant.updated_at)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>🍜</div>
          }
          {/* Overlay gradient bottom */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(transparent, rgba(0,0,0,0.3))' }} />
          {/* Tombol kembali */}
          <button onClick={() => navigate(-1)} style={{
            position: 'absolute', top: 12, left: 14, width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'pointer',
            color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>‹</button>
          {/* Badge buka/tutup */}
          <span style={{
            position: 'absolute', bottom: 10, right: 12,
            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: merchant?.is_open ? 'rgba(0,200,150,0.9)' : 'rgba(0,0,0,0.6)', color: '#fff',
          }}>{merchant?.is_open ? '● Buka' : '● Tutup'}</span>
        </div>

        {/* Info toko mini */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px 8px' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
            background: 'var(--k-input)', fontSize: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: -24, border: '2.5px solid var(--k-card)',
            position: 'relative', zIndex: 1,
          }}>
            {merchant?.logo_path ? <img src={storageUrl(merchant.logo_path, merchant.updated_at)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏪'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{merchant?.name}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--k-sub)' }}>⭐ {merchant?.average_rating > 0 ? merchant.average_rating.toFixed(1) : '—'}</span>
              {merchant?.avg_prep_time_minutes && <span style={{ fontSize: 11, color: 'var(--k-sub)' }}>⏱ ~{merchant.avg_prep_time_minutes} mnt</span>}
              {merchant?.description && <span style={{ fontSize: 11, color: 'var(--k-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{merchant.description}</span>}
            </div>
          </div>
        </div>

        {/* Category tabs */}
        {allCats.length > 1 && (
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', borderTop: '1px solid var(--k-border)', paddingBottom: 0 }}>
            {allCats.map(cat => (
              <button key={cat.id} onClick={() => scrollToCategory(cat.id)} style={{
                padding: '10px 16px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: 'transparent', fontSize: 13, fontWeight: activeTab === cat.id ? 700 : 500,
                color: activeTab === cat.id ? '#F97316' : 'var(--k-sub)',
                borderBottom: activeTab === cat.id ? '2.5px solid #F97316' : '2.5px solid transparent',
                transition: 'all 0.15s',
              }}>{cat.name}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── Konten menu ── */}
      <div style={{ padding: '12px 14px' }}>
        {!merchant?.is_open && (
          <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 14, background: 'rgba(245,101,101,0.09)', border: '1px solid rgba(245,101,101,0.2)', fontSize: 13, color: '#DC2626', fontWeight: 600 }}>
            Toko sedang tutup. Tidak bisa memesan saat ini.
          </div>
        )}

        {allCats.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
            <p>Menu belum tersedia.</p>
          </div>
        )}

        {allCats.map(cat => (
          <div key={cat.id} ref={el => catRefs.current[cat.id] = el} data-catid={cat.id} style={{ marginBottom: 28 }}>
            {/* Label kategori */}
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-sub)', marginBottom: 10, padding: '4px 0', borderBottom: '1px solid var(--k-border)' }}>
              {cat.name} <span style={{ fontWeight: 400, fontSize: 12 }}>({cat.items.length})</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cat.items.map(item => {
                const qty       = cart[item.id]?.qty ?? 0
                const available = item.is_available && merchant?.is_open

                return (
                  <div key={item.id} onClick={() => openItem(item)} style={{
                    display: 'flex', gap: 12, padding: '12px', borderRadius: 14,
                    background: 'var(--k-card)', border: qty > 0 ? '1.5px solid #F97316' : '1.5px solid var(--k-border)',
                    cursor: available ? 'pointer' : 'default',
                    opacity: available ? 1 : 0.5,
                    transition: 'border-color 0.2s',
                  }}>
                    {/* Foto */}
                    <div style={{
                      width: 80, height: 80, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
                      background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
                      position: 'relative',
                    }}>
                      {item.photo_path
                        ? <img src={storageUrl(item.photo_path)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : '🍽️'
                      }
                      {/* Badge qty */}
                      {qty > 0 && (
                        <div style={{
                          position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                          background: '#F97316', color: '#fff', fontSize: 11, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{qty}</div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{item.name}</div>
                      {item.description && (
                        <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.description}</div>
                      )}
                      <div style={{ fontWeight: 800, color: '#F97316', fontSize: 14 }}>{fmtRp(item.price)}</div>
                      {item.stock !== null && item.stock <= 5 && item.stock > 0 && (
                        <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, marginTop: 2 }}>Sisa {item.stock}</div>
                      )}
                      {cart[item.id]?.notes && (
                        <div style={{ fontSize: 11, color: 'var(--k-sub)', marginTop: 3, fontStyle: 'italic' }}>📝 {cart[item.id].notes}</div>
                      )}
                    </div>

                    {/* Kontrol qty */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', flexShrink: 0 }}>
                      {!available ? (
                        <span style={{ fontSize: 11, color: '#F56565', fontWeight: 700 }}>Habis</span>
                      ) : qty === 0 ? (
                        <button onClick={e => { e.stopPropagation(); openItem(item) }} style={{
                          width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                          background: '#F97316', color: '#fff', fontWeight: 800, fontSize: 20,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>+</button>
                      ) : (
                        <QtyControl small
                          qty={qty}
                          onDec={() => onItemChange(item, Math.max(0, qty - 1), cart[item.id]?.notes ?? '')}
                          onInc={() => openItem(item)}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Cart CTA sticky ── */}
      {cartCount > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 520, padding: '10px 14px 12px', boxSizing: 'border-box',
          background: 'var(--k-card)', borderTop: '1px solid var(--k-border)',
        }}>
          <button onClick={goToCart} style={{
            width: '100%', padding: '14px 16px', borderRadius: 14, border: 'none',
            background: '#F97316', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 20, padding: '3px 12px', fontSize: 13, fontWeight: 800 }}>{cartCount}</span>
            <span>Lihat Keranjang</span>
            <span style={{ fontWeight: 800 }}>{fmtRp(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
