import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import useMartCartCount from '../../hooks/useMartCartCount'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
const STORAGE  = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')

export default function MartProductPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const location     = useLocation()
  const { user }     = useAuth()
  const { count: cartCount } = useMartCartCount()
  const [product, setProduct] = useState(null)
  const [imgIdx, setImgIdx]   = useState(0)
  const [qty, setQty]         = useState(1)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const [adding, setAdding]   = useState(false)
  const [msg, setMsg]         = useState('')

  useEffect(() => {
    api.get(`/mart/products/${id}`).then(r => setProduct(r.data))
  }, [id])

  const addToCart = async () => {
    if (!user) { navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`); return }
    setAdding(true); setMsg('')
    try {
      await api.post('/mart/cart', { product_id: product.id, quantity: qty })
      setMsg('✓ Ditambahkan ke keranjang')
      window.dispatchEvent(new CustomEvent('mart-cart-updated'))
    } catch (e) { setMsg('⚠ ' + (e.response?.data?.message || 'Gagal')) }
    finally { setAdding(false) }
  }

  if (!product) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const images = product.images || []
  const disc   = product.compare_price > product.price
    ? Math.round((1 - product.price / product.compare_price) * 100) : 0

  const prevImg = () => setImgIdx(i => (i - 1 + images.length) % images.length)
  const nextImg = () => setImgIdx(i => (i + 1) % images.length)

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e) => {
    if (touchStartX.current === null || images.length <= 1) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // Only swipe if horizontal movement > 40px and more horizontal than vertical
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) nextImg(); else prevImg()
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <div style={{ background: 'var(--k-bg)', minHeight: '100dvh', paddingBottom: 100 }}>
      {/* Back */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--k-surface)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: 'var(--k-text)' }}>←</button>
        <p style={{ fontWeight: 800, color: 'var(--k-text)', fontSize: 15, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Detail Produk</p>
        <button onClick={() => navigate('/mart/cart')} style={{ position: 'relative', background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#6366F1' }}>
          🛒 Keranjang
          {cartCount > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 900, minWidth: 17, height: 17, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--k-surface)', padding: '0 3px', lineHeight: 1 }}>
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Images — swipeable */}
      <div style={{ position: 'relative', background: '#f3f4f6', userSelect: 'none' }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div style={{ paddingBottom: '80%', position: 'relative' }}>
          {images.length > 0
            ? <img src={`${STORAGE}/${images[imgIdx]}`} alt={product.name}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>🛍️</div>
          }
          {disc > 0 && (
            <span style={{ position: 'absolute', top: 12, left: 12, background: '#EF4444', color: '#fff', fontSize: 13, fontWeight: 800, padding: '4px 10px', borderRadius: 8 }}>
              -{disc}%
            </span>
          )}
          {/* Dot indicator */}
          {images.length > 1 && (
            <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
              {images.map((_, i) => (
                <div key={i} onClick={() => setImgIdx(i)}
                  style={{ width: imgIdx === i ? 20 : 7, height: 7, borderRadius: 4, background: imgIdx === i ? '#6366F1' : 'rgba(255,255,255,0.75)', transition: 'width 0.2s, background 0.2s', cursor: 'pointer' }} />
              ))}
            </div>
          )}
          {/* Arrow buttons (shown on hover / always on desktop) */}
          {images.length > 1 && (
            <>
              <button onClick={prevImg} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: 34, height: 34, color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <button onClick={nextImg} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: 34, height: 34, color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 16px', overflowX: 'auto' }}>
            {images.map((img, i) => (
              <img key={i} src={`${STORAGE}/${img}`} alt="" onClick={() => setImgIdx(i)}
                style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', cursor: 'pointer', border: imgIdx === i ? '2px solid #6366F1' : '2px solid transparent', flexShrink: 0 }} />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '16px 18px' }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--k-text)', lineHeight: 1.3, marginBottom: 8 }}>{product.name}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#6366F1' }}>{fmtRp(product.price)}</p>
          {product.compare_price > product.price && (
            <p style={{ fontSize: 14, color: 'var(--k-muted)', textDecoration: 'line-through' }}>{fmtRp(product.compare_price)}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          {product.average_rating > 0 && (
            <span style={{ fontSize: 12, color: 'var(--k-sub)' }}>⭐ {product.average_rating.toFixed(1)} ({product.total_ratings} ulasan)</span>
          )}
          {product.total_sold > 0 && (
            <span style={{ fontSize: 12, color: 'var(--k-sub)' }}>🔥 Terjual {product.total_sold >= 1000 ? (product.total_sold / 1000).toFixed(1) + 'rb' : product.total_sold}</span>
          )}
          <span style={{ fontSize: 12, color: 'var(--k-sub)' }}>📦 Stok: {product.stock}</span>
          {product.weight > 0 && <span style={{ fontSize: 12, color: 'var(--k-sub)' }}>⚖️ {product.weight}g</span>}
        </div>

        {/* Seller */}
        <div onClick={() => navigate(`/mart/sellers/${product.seller?.id}`)}
          style={{ background: 'var(--k-card)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--k-border)', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          {product.seller?.logo_path
            ? <img src={`${STORAGE}/${product.seller.logo_path}`} alt=""
                style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{ width: 40, height: 40, borderRadius: 10, background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏪</div>
          }
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>{product.seller?.name}</p>
            <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>
              {product.seller?.is_open ? '🟢 Buka' : '🔴 Tutup'} · ⭐ {product.seller?.average_rating?.toFixed(1) ?? '—'}
            </p>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--k-muted)', fontSize: 14 }}>›</span>
        </div>

        {/* Description */}
        {product.description && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 8 }}>Deskripsi</p>
            <p style={{ fontSize: 13, color: 'var(--k-sub)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{product.description}</p>
          </div>
        )}

        {/* Reviews */}
        {product.reviews?.length > 0 && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 10 }}>Ulasan Pembeli</p>
            {product.reviews.map(r => (
              <div key={r.id} style={{ background: 'var(--k-card)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--k-border)', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-text)' }}>{r.customer?.name ?? 'Anonim'}</span>
                  <span style={{ fontSize: 11, color: '#F59E0B' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  <span style={{ fontSize: 10, color: 'var(--k-muted)', marginLeft: 'auto' }}>{fmtDate(r.created_at)}</span>
                </div>
                {r.comment && <p style={{ fontSize: 12, color: 'var(--k-sub)', lineHeight: 1.5 }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {product.stock > 0 ? (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--k-surface)', borderTop: '1px solid var(--k-border)', padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom,0px))' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--k-card)', borderRadius: 10, padding: '6px 10px', border: '1px solid var(--k-border)', flexShrink: 0 }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--k-text)', cursor: 'pointer', padding: '0 2px' }}>−</button>
              <span style={{ fontSize: 14, fontWeight: 800, minWidth: 20, textAlign: 'center', color: 'var(--k-text)' }}>{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--k-text)', cursor: 'pointer', padding: '0 2px' }}>+</button>
            </div>
            <button onClick={addToCart} disabled={adding}
              style={{ flex: 1, padding: '11px 8px', borderRadius: 12, border: '2px solid #6366F1', background: 'transparent', color: '#6366F1', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: adding ? 0.6 : 1 }}>
              🛒 Keranjang
            </button>
            <button onClick={async () => {
              if (!user) { navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`); return }
              await addToCart()
              navigate('/mart/cart')
            }} disabled={adding}
              style={{ flex: 1.3, padding: '11px 8px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366F1,#7C3AED)', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer', opacity: adding ? 0.7 : 1 }}>
              ⚡ Beli Langsung
            </button>
          </div>
          {msg && <p style={{ fontSize: 12, color: msg.startsWith('✓') ? '#22C55E' : '#EF4444', marginTop: 6, textAlign: 'center' }}>{msg}</p>}
        </div>
      ) : (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--k-surface)', borderTop: '1px solid var(--k-border)', padding: '16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom,0px))', textAlign: 'center' }}>
          <p style={{ color: '#EF4444', fontWeight: 700, fontSize: 14 }}>Stok Habis</p>
        </div>
      )}
    </div>
  )
}
