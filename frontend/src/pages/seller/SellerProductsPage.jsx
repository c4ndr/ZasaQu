import { useState, useEffect, useRef } from 'react'
import MartSellerLayout from '../../components/MartSellerLayout'
import api from '../../services/api'

const fmtRp = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const STORAGE = import.meta.env.VITE_STORAGE_URL

const EMPTY = { name: '', category_id: '', description: '', price: '', compare_price: '', stock: '', weight: '', is_active: true }

export default function SellerProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const imgRef = useRef()

  const load = () => {
    setLoading(true)
    api.get('/mart/seller/products', { params: { search: search || undefined } })
      .then(r => setProducts(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    api.get('/mart/categories').then(r => setCategories(r.data))
  }, [])

  useEffect(() => { load() }, [search])

  const openAdd = () => { setForm(EMPTY); setModal('add') }
  const openEdit = (p) => { setForm({ ...p, category_id: p.category_id || '', compare_price: p.compare_price || '', price: p.price || '', stock: p.stock || '', weight: p.weight || '' }); setModal(p.id) }

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock), weight: Number(form.weight), compare_price: form.compare_price ? Number(form.compare_price) : null, category_id: form.category_id || null }
      if (modal === 'add') {
        await api.post('/mart/seller/products', payload)
      } else {
        await api.patch(`/mart/seller/products/${modal}`, payload)
      }
      setModal(null); load()
    } finally { setSaving(false) }
  }

  const toggleActive = async (id, is_active) => {
    await api.patch(`/mart/seller/products/${id}`, { is_active: !is_active })
    load()
  }

  const uploadImage = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploadingImg(true)
    const fd = new FormData(); fd.append('image', file)
    try {
      await api.post(`/mart/seller/products/${modal}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const r = await api.get('/mart/seller/products')
      const updated = r.data.data?.find(p => p.id === modal)
      if (updated) setForm(f => ({ ...f, images: updated.images }))
      load()
    } finally { setUploadingImg(false) }
  }

  const deleteImage = async (path) => {
    await api.delete(`/mart/seller/products/${modal}/images`, { data: { path } })
    const r = await api.get('/mart/seller/products')
    const updated = r.data.data?.find(p => p.id === modal)
    if (updated) setForm(f => ({ ...f, images: updated.images }))
    load()
  }

  return (
    <MartSellerLayout title="Produk Saya">
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari produk..."
            style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 13, outline: 'none' }} />
          <button onClick={openAdd}
            style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: '#6366F1', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Tambah
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 24, height: 24, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {products.map(p => (
              <div key={p.id} style={{ background: 'var(--k-card)', borderRadius: 12, border: '1px solid var(--k-border)', padding: '12px', display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 54, height: 54, borderRadius: 10, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
                  {p.images?.[0]
                    ? <img src={`${STORAGE}/${p.images[0]}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🛍️</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#6366F1', marginBottom: 2 }}>{fmtRp(p.price)}</p>
                  <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>Stok: {p.stock} · Terjual: {p.total_sold}</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggleActive(p.id, p.is_active)}
                    style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: p.is_active ? '#22C55E20' : '#EF444420', color: p.is_active ? '#22C55E' : '#EF4444', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                    {p.is_active ? 'Aktif' : 'Nonaktif'}
                  </button>
                  <button onClick={() => openEdit(p)}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'none', color: 'var(--k-text)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product modal */}
      {modal !== null && (
        <>
          <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--k-surface)', borderRadius: '20px 20px 0 0', maxHeight: '90vh', overflowY: 'auto', zIndex: 901, paddingBottom: 'calc(24px + env(safe-area-inset-bottom,0px))' }}>
            <div style={{ padding: '20px 18px' }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--k-text)', marginBottom: 16 }}>
                {modal === 'add' ? '➕ Tambah Produk' : '✏️ Edit Produk'}
              </p>

              {modal !== 'add' && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 8 }}>Foto Produk (maks. 5)</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(form.images || []).map((img, i) => (
                      <div key={i} style={{ position: 'relative', width: 60, height: 60 }}>
                        <img src={`${STORAGE}/${img}`} style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />
                        <button onClick={() => deleteImage(img)} style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#EF4444', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    ))}
                    {(form.images?.length ?? 0) < 5 && (
                      <button onClick={() => imgRef.current?.click()} disabled={uploadingImg}
                        style={{ width: 60, height: 60, borderRadius: 8, border: '2px dashed var(--k-border)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--k-muted)' }}>
                        {uploadingImg ? '⏳' : '+'}
                      </button>
                    )}
                    <input ref={imgRef} type="file" accept="image/*" onChange={uploadImage} style={{ display: 'none' }} />
                  </div>
                </div>
              )}

              {[
                { key: 'name', label: 'Nama Produk', required: true },
                { key: 'price', label: 'Harga (Rp)', type: 'number', required: true },
                { key: 'compare_price', label: 'Harga Coret (opsional)', type: 'number' },
                { key: 'stock', label: 'Stok', type: 'number', required: true },
                { key: 'weight', label: 'Berat (gram)', type: 'number', required: true },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-muted)', marginBottom: 4 }}>{field.label}{field.required ? ' *' : ''}</p>
                  <input type={field.type || 'text'} value={form[field.key] || ''} onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}

              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-muted)', marginBottom: 4 }}>Kategori</p>
                <select value={form.category_id || ''} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 13, outline: 'none' }}>
                  <option value="">— Pilih Kategori —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-muted)', marginBottom: 4 }}>Deskripsi</p>
                <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </div>

              {modal !== 'add' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} id="is_active" />
                  <label htmlFor="is_active" style={{ fontSize: 13, color: 'var(--k-text)', cursor: 'pointer' }}>Produk aktif (tampil di toko)</label>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>Batal</button>
                <button onClick={save} disabled={saving || !form.name || !form.price}
                  style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#6366F1', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </MartSellerLayout>
  )
}
