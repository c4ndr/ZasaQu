import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import useMartCartCount from '../../hooks/useMartCartCount'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const STORAGE  = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')

export default function MartSellerPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { count: cartCount } = useMartCartCount()
  const [seller,   setSeller]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    setLoading(true)
    api.get(`/mart/sellers/${id}`)
      .then(r => setSeller(r.data))
      .catch(e => setError(e.response?.data?.message || 'Toko tidak ditemukan.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--k-bg)' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error || !seller) return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <p style={{ fontSize: 48, marginBottom: 12 }}>🏪</p>
      <p style={{ fontWeight: 700, color: 'var(--k-text)', marginBottom: 6 }}>Toko Tidak Ditemukan</p>
      <p style={{ fontSize: 13, color: 'var(--k-muted)', marginBottom: 20 }}>{error || 'Toko tidak tersedia.'}</p>
      <button onClick={() => navigate('/mart')} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366F1,#7C3AED)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
        Kembali ke ZasaShop
      </button>
    </div>
  )

  const products = (seller.products || []).filter(p => p.is_active)
  const filtered = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products

  return (
    <div style={{ background: 'var(--k-bg)', minHeight: '100dvh', paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: 'var(--k-text)', flexShrink: 0 }}>←</button>
        <p style={{ fontWeight: 800, color: 'var(--k-text)', fontSize: 15, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seller.name}</p>
        <button onClick={() => navigate('/mart/cart')} style={{ position: 'relative', background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 10, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#6366F1', flexShrink: 0 }}>
          🛒
          {cartCount > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 900, minWidth: 17, height: 17, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--k-surface)', padding: '0 3px' }}>
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Banner + Logo */}
      <div style={{ position: 'relative', background: '#1a1a2e', height: 130 }}>
        {seller.banner_path
          ? <img src={`${STORAGE}/${seller.banner_path}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a1a2e,#312e81)' }} />
        }
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55))' }} />
      </div>

      {/* Seller info card */}
      <div style={{ background: 'var(--k-surface)', padding: '0 16px 16px', borderBottom: '1px solid var(--k-border)', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: -28, marginBottom: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, overflow: 'hidden', border: '3px solid var(--k-surface)', background: '#6366F1', flexShrink: 0 }}>
            {seller.logo_path
              ? <img src={`${STORAGE}/${seller.logo_path}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🏪</div>
            }
          </div>
          <div style={{ paddingBottom: 4 }}>
            <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--k-text)', lineHeight: 1.2 }}>{seller.name}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: seller.is_open ? '#00C896' : '#EF4444' }}>
                {seller.is_open ? '🟢 Buka' : '🔴 Tutup'}
              </span>
              {seller.average_rating > 0 && (
                <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>⭐ {Number(seller.average_rating).toFixed(1)}</span>
              )}
              <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>📦 {products.length} produk</span>
            </div>
          </div>
        </div>

        {seller.description && (
          <p style={{ fontSize: 12, color: 'var(--k-sub)', lineHeight: 1.5, marginBottom: 8 }}>{seller.description}</p>
        )}

        {seller.address && (
          <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 10 }}>📍 {seller.address}</p>
        )}

        {/* Tombol Chat Penjual */}
        <button
          onClick={() => navigate(`/mart/sellers/${id}/consult`)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 12, border: '1px solid #6366F1', background: 'rgba(99,102,241,0.08)', color: '#6366F1', fontWeight: 700, fontSize: 13, cursor: 'pointer', width: '100%' }}
        >
          <span style={{ fontSize: 16 }}>💬</span>
          Chat Penjual
        </button>
      </div>

      {/* Search bar */}
      <div style={{ padding: '12px 16px', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', position: 'sticky', top: 64, zIndex: 9 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari produk di toko ini..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Products */}
      <div style={{ padding: '12px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--k-muted)' }}>
            <p style={{ fontSize: 36, marginBottom: 8 }}>📭</p>
            <p style={{ fontWeight: 600 }}>
              {search ? 'Produk tidak ditemukan' : 'Toko ini belum punya produk'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {filtered.map(product => {
              const img  = product.images?.[0]
              const disc = product.compare_price > product.price
                ? Math.round((1 - product.price / product.compare_price) * 100) : 0
              return (
                <div key={product.id} onClick={() => navigate(`/mart/products/${product.id}`)}
                  style={{ background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.1s', active: { transform: 'scale(0.97)' } }}>
                  {/* Image */}
                  <div style={{ position: 'relative', paddingBottom: '80%', background: '#f3f4f6' }}>
                    {img
                      ? <img src={`${STORAGE}/${img}`} alt={product.name}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🛍️</div>
                    }
                    {disc > 0 && (
                      <span style={{ position: 'absolute', top: 6, left: 6, background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 6 }}>-{disc}%</span>
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ padding: '10px 10px 12px' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-text)', lineHeight: 1.3, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {product.name}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#6366F1', marginBottom: 2 }}>{fmtRp(product.price)}</p>
                    {product.compare_price > product.price && (
                      <p style={{ fontSize: 11, color: 'var(--k-muted)', textDecoration: 'line-through' }}>{fmtRp(product.compare_price)}</p>
                    )}
                    {product.average_rating > 0 && (
                      <p style={{ fontSize: 10, color: 'var(--k-muted)', marginTop: 4 }}>⭐ {Number(product.average_rating).toFixed(1)}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
