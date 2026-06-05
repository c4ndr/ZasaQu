import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import api, { storageUrl } from '../../services/api'
import useMartCartCount from '../../hooks/useMartCartCount'

const fmtRp = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const STORAGE = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')

const BANNERS = [
  { bg: 'linear-gradient(135deg,#6366F1 0%,#8B5CF6 100%)', emoji: '🛍️', title: 'Produk UMKM Lokal', sub: 'Dukung pengusaha daerahmu', cta: 'Belanja Sekarang' },
  { bg: 'linear-gradient(135deg,#EC4899 0%,#F43F5E 100%)', emoji: '🔥', title: 'Harga Terbaik Hari Ini', sub: 'Diskon hingga 50% untuk produkmu', cta: 'Lihat Promo' },
  { bg: 'linear-gradient(135deg,#10B981 0%,#059669 100%)', emoji: '🚀', title: 'Gratis Ongkir Pertama', sub: 'Untuk anggota baru ZasaShop', cta: 'Daftar Sekarang' },
]

const SORT_OPTIONS = [
  { value: '', label: 'Terlaris' },
  { value: 'price_asc', label: 'Harga ↑' },
  { value: 'price_desc', label: 'Harga ↓' },
  { value: 'rating', label: 'Rating' },
]

function ProductCard({ product, onClick }) {
  const img = product.images?.[0]
  const disc = product.compare_price > product.price
    ? Math.round((1 - product.price / product.compare_price) * 100) : 0

  return (
    <div onClick={onClick} style={{
      background: 'var(--k-card)', borderRadius: 14,
      border: '1px solid var(--k-border)', overflow: 'hidden',
      cursor: 'pointer', transition: 'transform 0.12s, box-shadow 0.12s',
    }}>
      <div style={{ position: 'relative', paddingBottom: '100%', background: '#f3f4f6' }}>
        {img
          ? <img src={`${STORAGE}/${img}`} alt={product.name}
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
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 8 }}>Habis</span>
          </div>
        )}
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <p style={{ fontSize: 12, color: 'var(--k-text)', fontWeight: 600, marginBottom: 4, lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.name}
        </p>
        <p style={{ fontSize: 14, fontWeight: 800, color: '#6366F1', marginBottom: 2 }}>{fmtRp(product.price)}</p>
        {product.compare_price > product.price && (
          <p style={{ fontSize: 10, color: 'var(--k-muted)', textDecoration: 'line-through', marginBottom: 2 }}>{fmtRp(product.compare_price)}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, flexWrap: 'wrap', gap: 2 }}>
          {product.average_rating > 0 && (
            <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600 }}>
              ★ {product.average_rating.toFixed(1)}
            </span>
          )}
          {product.total_sold > 0 && (
            <span style={{ fontSize: 10, color: 'var(--k-muted)' }}>
              Terjual {product.total_sold >= 1000 ? (product.total_sold / 1000).toFixed(1) + 'rb' : product.total_sold}
            </span>
          )}
        </div>
        <p style={{ fontSize: 10, color: 'var(--k-muted)', marginTop: 3 }}>🏪 {product.seller?.name}</p>
      </div>
    </div>
  )
}

export default function ZasaShopPage() {
  const navigate = useNavigate()
  const { count: cartCount } = useMartCartCount()
  const [categories, setCategories] = useState([])
  const [products, setProducts]     = useState([])
  const [activecat, setActiveCat]   = useState('')
  const [search, setSearch]         = useState('')
  const [sort, setSort]             = useState('')
  const [page, setPage]             = useState(1)
  const [meta, setMeta]             = useState(null)
  const [loading, setLoading]       = useState(false)
  const [bannerIdx, setBannerIdx]   = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const searchRef = useRef(null)
  const loaderRef = useRef(null)

  useEffect(() => {
    api.get('/mart/categories').then(r => setCategories(r.data))
  }, [])

  // Auto-rotate banner
  useEffect(() => {
    const t = setInterval(() => setBannerIdx(i => (i + 1) % BANNERS.length), 4000)
    return () => clearInterval(t)
  }, [])

  const loadProducts = useCallback(async (reset = false) => {
    setLoading(true)
    const p = reset ? 1 : page
    try {
      const r = await api.get('/mart/products', {
        params: {
          category: activecat || undefined,
          search: search || undefined,
          sort: sort || undefined,
          page: p,
        },
      })
      setProducts(prev => reset ? r.data.data : [...prev, ...r.data.data])
      setMeta(r.data)
      if (!reset) setPage(p + 1)
    } finally { setLoading(false) }
  }, [activecat, search, sort, page])

  useEffect(() => {
    setPage(1)
    setProducts([])
    loadProducts(true)
  }, [activecat, search, sort]) // eslint-disable-line

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && meta && page <= meta.last_page && !loading) {
        loadProducts(false)
      }
    }, { threshold: 0.1 })
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [meta, page, loading]) // eslint-disable-line

  const banner = BANNERS[bannerIdx]

  return (
    <div style={{ background: 'var(--k-bg)', minHeight: '100dvh', paddingBottom: 80 }}>

      {/* ── Sticky header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
          {!showSearch ? (
            <>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: 'var(--k-muted)', fontWeight: 600 }}>Belanja produk lokal</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--k-text)', letterSpacing: '-0.3px' }}>ZasaShop 🛍️</p>
              </div>
              <button onClick={() => { setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 50) }}
                style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 10, width: 38, height: 38, cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                🔍
              </button>
              <button onClick={() => navigate('/mart/cart')} style={{ position: 'relative', background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 10, width: 38, height: 38, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                🛒
                {cartCount > 0 && (
                  <span style={{ position: 'absolute', top: -5, right: -5, background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 900, minWidth: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--k-surface)', padding: '0 3px' }}>
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              <div style={{ flex: 1, background: 'var(--k-card)', border: '1.5px solid #6366F1', borderRadius: 12, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
                <span style={{ color: 'var(--k-muted)', fontSize: 15 }}>🔍</span>
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Cari produk UMKM..."
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--k-text)', fontSize: 13, padding: '10px 0' }} />
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--k-muted)', cursor: 'pointer', fontSize: 16, padding: 0 }}>✕</button>}
              </div>
              <button onClick={() => { setShowSearch(false); setSearch('') }}
                style={{ background: 'none', border: 'none', color: '#6366F1', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '0 4px', whiteSpace: 'nowrap' }}>
                Batal
              </button>
            </>
          )}
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 12px', scrollbarWidth: 'none' }}>
          <button onClick={() => setActiveCat('')} style={{
            padding: '6px 14px', borderRadius: 100, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            background: !activecat ? '#6366F1' : 'var(--k-card)',
            color: !activecat ? '#fff' : 'var(--k-sub)',
            fontSize: 12, fontWeight: !activecat ? 700 : 500,
            border: !activecat ? 'none' : '1px solid var(--k-border)',
          }}>🛍️ Semua</button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setActiveCat(c.slug)} style={{
              padding: '6px 14px', borderRadius: 100, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: activecat === c.slug ? '#6366F1' : 'var(--k-card)',
              color: activecat === c.slug ? '#fff' : 'var(--k-sub)',
              fontSize: 12, fontWeight: activecat === c.slug ? 700 : 500,
              border: activecat === c.slug ? 'none' : '1px solid var(--k-border)',
            }}>{c.icon} {c.name}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 16px 0' }}>

        {/* ── Hero Banner ── */}
        {!search && !activecat && (
          <div style={{ marginBottom: 18 }}>
            <div style={{
              borderRadius: 18, overflow: 'hidden', position: 'relative', cursor: 'pointer',
              background: banner.bg, padding: '20px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              minHeight: 110,
            }}>
              <div>
                <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 4, lineHeight: 1.2 }}>{banner.title}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>{banner.sub}</p>
                <span style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.3)' }}>
                  {banner.cta} →
                </span>
              </div>
              <span style={{ fontSize: 64, opacity: 0.85, flexShrink: 0 }}>{banner.emoji}</span>

              {/* Dot indicator */}
              <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
                {BANNERS.map((_, i) => (
                  <div key={i} onClick={e => { e.stopPropagation(); setBannerIdx(i) }}
                    style={{ width: bannerIdx === i ? 20 : 6, height: 6, borderRadius: 3, background: bannerIdx === i ? '#fff' : 'rgba(255,255,255,0.45)', transition: 'width 0.25s', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Category icon grid (hanya tampil di "Semua" tanpa search) ── */}
        {!search && !activecat && categories.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)' }}>Kategori</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {categories.slice(0, 8).map(c => (
                <button key={c.id} onClick={() => setActiveCat(c.slug)} style={{
                  background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14,
                  padding: '12px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 26 }}>{c.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--k-text)', textAlign: 'center', lineHeight: 1.2 }}>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Product list header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)' }}>
            {search ? `Hasil: "${search}"` : activecat ? categories.find(c => c.slug === activecat)?.name ?? 'Produk' : 'Produk Pilihan'}
          </p>
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 12, cursor: 'pointer' }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* ── Product grid ── */}
        {products.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--k-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛍️</div>
            <p style={{ fontSize: 14, fontWeight: 600 }}>Belum ada produk</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Coba ubah filter atau kata kunci pencarian</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            {products.map(p => (
              <ProductCard key={p.id} product={p} onClick={() => navigate(`/mart/products/${p.id}`)} />
            ))}
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={loaderRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
          {loading && (
            <div style={{ width: 22, height: 22, border: '2.5px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          )}
          {!loading && meta && page > meta.last_page && products.length > 0 && (
            <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>Semua produk telah ditampilkan</p>
          )}
        </div>
      </div>

      <BottomNav />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
