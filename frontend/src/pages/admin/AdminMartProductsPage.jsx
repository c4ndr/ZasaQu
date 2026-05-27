import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const STORAGE = import.meta.env.VITE_STORAGE_URL

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
      <div style={{ padding: '0 0 80px' }}>
        {/* Filter bar */}
        <div style={{ display: 'flex', overflowX: 'auto', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', scrollbarWidth: 'none' }}>
          {[{ v: '', l: 'Semua' }, { v: 'active', l: 'Aktif' }, { v: 'inactive', l: 'Nonaktif' }].map(t => (
            <button key={t.v} onClick={() => setActiveFilter(t.v)}
              style={{ padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeFilter === t.v ? 700 : 500, color: activeFilter === t.v ? 'var(--k-accent)' : 'var(--k-muted)', borderBottom: activeFilter === t.v ? '2px solid var(--k-accent)' : '2px solid transparent', whiteSpace: 'nowrap' }}>
              {t.l}
            </button>
          ))}
        </div>

        <div style={{ padding: '14px 16px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama produk..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 13, outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />

          {loading
            ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div style={{ width: 24, height: 24, border: '3px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-muted)' }}>
                <p style={{ fontSize: 36, marginBottom: 10 }}>🛍️</p>
                <p style={{ fontSize: 14, fontWeight: 600 }}>Tidak ada produk ditemukan</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {products.map(p => (
                  <div key={p.id} style={{ background: 'var(--k-card)', borderRadius: 12, border: '1px solid var(--k-border)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Foto */}
                    <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
                      {p.images?.[0]
                        ? <img src={`${STORAGE}/${p.images[0]}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🛍️</div>
                      }
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 2 }}>🏪 {p.seller?.name} · {p.category?.icon} {p.category?.name ?? '—'}</p>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--k-accent)' }}>{fmtRp(p.price)}</span>
                        <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>Stok: {p.stock} · Terjual: {p.total_sold}</span>
                      </div>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => toggle(p.id)}
                      disabled={toggling === p.id}
                      style={{
                        flexShrink: 0, padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        fontWeight: 700, fontSize: 12,
                        background: p.is_active ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.10)',
                        color:      p.is_active ? '#EF4444'              : '#22C55E',
                        opacity: toggling === p.id ? 0.6 : 1,
                      }}
                    >
                      {toggling === p.id ? '...' : p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>
    </AdminLayout>
  )
}
