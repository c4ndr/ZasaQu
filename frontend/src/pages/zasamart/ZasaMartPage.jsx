import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const fmtRp = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')

function StarRow({ rating, small }) {
  const sz = small ? 11 : 12
  return (
    <span style={{ color: '#F59E0B', fontSize: sz }}>
      {'★'.repeat(Math.round(rating || 0))}{'☆'.repeat(5 - Math.round(rating || 0))}
      {' '}
    </span>
  )
}

function CategoryChip({ cat, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 100, border: 'none', cursor: 'pointer',
      background: active ? '#6366F1' : 'var(--k-card)',
      color: active ? '#fff' : 'var(--k-muted)',
      fontSize: 12, fontWeight: active ? 700 : 500,
      boxShadow: active ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
      transition: 'all 0.18s', whiteSpace: 'nowrap',
      border: active ? 'none' : '1px solid var(--k-border)',
    }}>
      {cat.icon} {cat.name}
    </button>
  )
}

function ProductCard({ product, onClick }) {
  const img = product.images?.[0]
  const disc = product.compare_price > product.price
    ? Math.round((1 - product.price / product.compare_price) * 100) : 0

  return (
    <div onClick={onClick} style={{
      background: 'var(--k-card)', borderRadius: 14,
      border: '1px solid var(--k-border)', overflow: 'hidden',
      cursor: 'pointer', transition: 'transform 0.15s',
    }}>
      <div style={{ position: 'relative', paddingBottom: '100%', background: '#f3f4f6' }}>
        {img
          ? <img src={`${import.meta.env.VITE_STORAGE_URL}/${img}`} alt={product.name}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🛍️</div>
        }
        {disc > 0 && (
          <span style={{ position: 'absolute', top: 8, left: 8, background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 6 }}>
            -{disc}%
          </span>
        )}
        {product.stock === 0 && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>Habis</span>
          </div>
        )}
      </div>
      <div style={{ padding: '10px 12px' }}>
        <p style={{ fontSize: 12, color: 'var(--k-text)', fontWeight: 600, marginBottom: 2, lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.name}
        </p>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#6366F1', marginBottom: 2 }}>{fmtRp(product.price)}</p>
        {product.compare_price > product.price && (
          <p style={{ fontSize: 10, color: 'var(--k-muted)', textDecoration: 'line-through' }}>{fmtRp(product.compare_price)}</p>
        )}
        {product.average_rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 4 }}>
            <StarRow rating={product.average_rating} small />
            <span style={{ fontSize: 10, color: 'var(--k-muted)' }}>{product.average_rating.toFixed(1)}</span>
          </div>
        )}
        <p style={{ fontSize: 10, color: 'var(--k-muted)', marginTop: 2 }}>{product.seller?.name}</p>
      </div>
    </div>
  )
}

export default function ZasaMartPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [products, setProducts]     = useState([])
  const [activecat, setActiveCat]   = useState('')
  const [search, setSearch]         = useState('')
  const [sort, setSort]             = useState('')
  const [page, setPage]             = useState(1)
  const [meta, setMeta]             = useState(null)
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    api.get('/mart/categories').then(r => setCategories(r.data))
  }, [])

  const loadProducts = useCallback(async (reset = false) => {
    setLoading(true)
    const p = reset ? 1 : page
    try {
      const r = await api.get('/mart/products', { params: { category: activecat || undefined, search: search || undefined, sort: sort || undefined, page: p } })
      setProducts(prev => reset ? r.data.data : [...prev, ...r.data.data])
      setMeta(r.data)
      if (!reset) setPage(p + 1)
    } finally { setLoading(false) }
  }, [activecat, search, sort, page])

  useEffect(() => {
    setPage(1)
    setProducts([])
    loadProducts(true)
  }, [activecat, search, sort])

  return (
    <div style={{ background: 'var(--k-bg)', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)', padding: '20px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, width: 36, height: 36, color: '#fff', cursor: 'pointer', fontSize: 18 }}>←</button>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 600 }}>Belanja produk lokal</p>
            <p style={{ color: '#fff', fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px' }}>ZasaMart 🛒</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari produk UMKM..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, padding: '10px 0' }} />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ padding: '0 12px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
            <option value="">Terlaris</option>
            <option value="price_asc">Harga ↑</option>
            <option value="price_desc">Harga ↓</option>
            <option value="rating">Rating</option>
          </select>
        </div>
      </div>

      {/* Category chips */}
      <div style={{ padding: '14px 16px 0', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
        <CategoryChip cat={{ icon: '🛍️', name: 'Semua' }} active={!activecat} onClick={() => setActiveCat('')} />
        {categories.map(c => (
          <CategoryChip key={c.id} cat={c} active={activecat === c.slug} onClick={() => setActiveCat(c.slug)} />
        ))}
      </div>

      {/* Product grid */}
      <div style={{ padding: '14px 16px' }}>
        {products.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--k-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛍️</div>
            <p style={{ fontSize: 14, fontWeight: 600 }}>Belum ada produk</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Coba ubah filter atau kata kunci pencarian</p>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          {products.map(p => (
            <ProductCard key={p.id} product={p} onClick={() => navigate(`/mart/products/${p.id}`)} />
          ))}
        </div>
        {meta && page <= meta.last_page && (
          <button onClick={() => loadProducts(false)} disabled={loading}
            style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 12, border: '1px dashed var(--k-border)', background: 'none', color: 'var(--k-muted)', cursor: 'pointer', fontSize: 13 }}>
            {loading ? 'Memuat...' : 'Muat lebih banyak'}
          </button>
        )}
      </div>
    </div>
  )
}
