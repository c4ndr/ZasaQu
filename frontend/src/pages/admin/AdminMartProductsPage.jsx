import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const STORAGE = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')

export default function AdminMartProductsPage() {
  const [products, setProducts] = useState([])
  const [search,   setSearch]   = useState('')
  const [activeFilter, setActiveFilter] = useState('')   // '' | 'active' | 'inactive'
  const [loading,  setLoading]  = useState(true)
  const [toggling, setToggling] = useState(null)         // id yang sedang di-toggle

  const load = () => {
    setLoading(true)
    const params = {
      search:    search || undefined,
      is_active: activeFilter === '' ? undefined : activeFilter === 'active',
    }
    api.get('/admin/mart/products', { params })
      .then(r => setProducts(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search, activeFilter])

  const toggle = async (id) => {
    setToggling(id)
    try {
      const r = await api.post(`/admin/mart/products/${id}/toggle`)
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: r.data.is_active } : p))
    } catch { /* noop */ }
    finally { setToggling(null) }
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Produk ZasaShop</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--k-muted)' }}>Pantau dan kelola status produk yang dijual di marketplace</p>
      </div>

      {/* Filter + Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {[{ v: '', l: 'Semua', color: 'var(--k-sub)' }, { v: 'active', l: 'Aktif', color: '#22C55E' }, { v: 'inactive', l: 'Nonaktif', color: '#EF4444' }].map(t => (
          <button key={t.v} onClick={() => setActiveFilter(t.v)}
            style={{
              padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: activeFilter === t.v ? 700 : 500,
              border: `1px solid ${activeFilter === t.v ? t.color + '40' : 'var(--k-border)'}`,
              cursor: 'pointer', background: activeFilter === t.v ? `${t.color}22` : 'var(--k-card)',
              color: activeFilter === t.v ? t.color : 'var(--k-sub)',
            }}>
            {t.l}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama produk..."
          style={{ marginLeft: 'auto', padding: '9px 14px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, outline: 'none', width: 240 }} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 24, height: 24, border: '3px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 36, marginBottom: 10 }}>🛍️</p>
          <p style={{ color: 'var(--k-text)', fontWeight: 700, marginBottom: 4 }}>Tidak ada produk ditemukan</p>
          <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Coba ubah filter atau kata kunci pencarian</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {products.map(p => (
            <div key={p.id} style={{ background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', background: 'var(--k-input)', flexShrink: 0 }}>
                {p.images?.[0]
                  ? <img src={`${STORAGE}/${p.images[0]}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🛍️</div>
                }
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 4 }}>🏪 {p.seller?.name} · {p.category?.icon} {p.category?.name ?? '—'}</p>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-accent)' }}>{fmtRp(p.price)}</span>
                  <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>Stok: {p.stock} · Terjual: {p.total_sold}</span>
                </div>
              </div>

              <button
                onClick={() => toggle(p.id)}
                disabled={toggling === p.id}
                style={{
                  flexShrink: 0, padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 12,
                  border: `1px solid ${p.is_active ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
                  background: p.is_active ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                  color: p.is_active ? '#EF4444' : '#22C55E',
                  opacity: toggling === p.id ? 0.6 : 1,
                }}
              >
                {toggling === p.id ? '...' : p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
