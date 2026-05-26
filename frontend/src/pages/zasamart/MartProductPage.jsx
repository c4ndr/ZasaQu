import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export default function MartProductPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const [product, setProduct] = useState(null)
  const [imgIdx, setImgIdx]   = useState(0)
  const [qty, setQty]         = useState(1)
  const [adding, setAdding]   = useState(false)
  const [msg, setMsg]         = useState('')

  useEffect(() => {
    api.get(`/mart/products/${id}`).then(r => setProduct(r.data))
  }, [id])

  const addToCart = async () => {
    setAdding(true); setMsg('')
    try {
      await api.post('/mart/cart', { product_id: product.id, quantity: qty })
      setMsg('✓ Ditambahkan ke keranjang')
    } catch (e) { setMsg('⚠ ' + (e.response?.data?.message || 'Gagal')) }
    finally { setAdding(false) }
  }

  if (!product) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const images = product.images || []
  const disc   = product.compare_price > product.price
    ? Math.round((1 - product.price / product.compare_price) * 100) : 0

  return (
    <div style={{ background: 'var(--k-bg)', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Back */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--k-surface)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: 'var(--k-text)' }}>←</button>
        <p style={{ fontWeight: 800, color: 'var(--k-text)', fontSize: 15, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Detail Produk</p>
        <button onClick={() => navigate('/mart/cart')} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#6366F1' }}>🛒 Keranjang</button>
      </div>

      {/* Images */}
      <div style={{ position: 'relative', background: '#f3f4f6' }}>
        <div style={{ paddingBottom: '80%', position: 'relative' }}>
          {images.length > 0
            ? <img src={`${import.meta.env.VITE_STORAGE_URL}/${images[imgIdx]}`} alt={product.name}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>🛍️</div>
          }
          {disc > 0 && (
            <span style={{ position: 'absolute', top: 12, left: 12, background: '#EF4444', color: '#fff', fontSize: 13, fontWeight: 800, padding: '4px 10px', borderRadius: 8 }}>
              -{disc}%
            </span>
          )}
        </div>
        {images.length > 1 && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 16px', overflowX: 'auto' }}>
            {images.map((img, i) => (
              <img key={i} src={`${import.meta.env.VITE_STORAGE_URL}/${img}`} alt="" onClick={() => setImgIdx(i)}
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
          <span style={{ fontSize: 12, color: 'var(--k-sub)' }}>📦 Stok: {product.stock}</span>
          {product.weight > 0 && <span style={{ fontSize: 12, color: 'var(--k-sub)' }}>⚖️ {product.weight}g</span>}
        </div>

        {/* Seller */}
        <div onClick={() => navigate(`/mart/sellers/${product.seller?.id}`)}
          style={{ background: 'var(--k-card)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--k-border)', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          {product.seller?.logo_path
            ? <img src={`${import.meta.env.VITE_STORAGE_URL}/${product.seller.logo_path}`} alt=""
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
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--k-card)', borderRadius: 10, padding: '6px 12px', border: '1px solid var(--k-border)' }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--k-text)', cursor: 'pointer', padding: '0 4px' }}>−</button>
              <span style={{ fontSize: 15, fontWeight: 800, minWidth: 24, textAlign: 'center', color: 'var(--k-text)' }}>{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--k-text)', cursor: 'pointer', padding: '0 4px' }}>+</button>
            </div>
            <button onClick={addToCart} disabled={adding}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366F1,#7C3AED)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: adding ? 0.7 : 1 }}>
              {adding ? 'Menambahkan...' : `🛒 Tambah ke Keranjang · ${fmtRp(product.price * qty)}`}
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
