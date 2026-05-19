import { useState, useEffect, useRef } from 'react'
import MerchantLayout from '../../components/MerchantLayout'
import api from '../../services/api'

function fmtRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

// ── Modal tambah/edit item ──────────────────────────────────────────────────
function ItemModal({ item, categories, onClose, onSaved }) {
  const [form, setForm]     = useState({
    name: item?.name || '', description: item?.description || '',
    price: item?.price || '', category_id: item?.category_id || '',
    stock: item?.stock ?? '', sort_order: item?.sort_order || 0,
  })
  const [photo,   setPhoto]   = useState(null)
  const [preview, setPreview] = useState(item?.photo_path ? `/storage/${item.photo_path}` : null)
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  function field(k) {
    return { value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) }
  }

  function handlePhoto(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setPhoto(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr(''); setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null) fd.append(k, v) })
      if (photo) fd.append('photo', photo)

      const url   = item ? `/food/merchant/menu/items/${item.id}` : '/food/merchant/menu/items'
      const method = item ? 'patch' : 'post'
      const res   = await api[method](url, fd)
      onSaved(res.data.data)
    } catch (err) {
      const errs = err.response?.data?.errors
      setErr(errs ? Object.values(errs).flat().join(' ') : (err.response?.data?.message || 'Gagal menyimpan.'))
    } finally { setSaving(false) }
  }

  const inp = {
    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
    border: '1.5px solid var(--k-border)', background: 'var(--k-input)',
    color: 'var(--k-text)', boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--k-card)', borderRadius: '20px 20px 0 0',
        padding: '24px', width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20 }}>
          {item ? 'Edit Item' : 'Tambah Item Baru'}
        </div>
        {err && <div style={{ color: '#F56565', fontSize: 13, marginBottom: 12 }}>{err}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Foto */}
          <label style={{ cursor: 'pointer' }}>
            <div style={{
              width: '100%', height: 140, borderRadius: 12, overflow: 'hidden',
              background: 'var(--k-input)', border: '2px dashed var(--k-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {preview
                ? <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 36 }}>📷</span>
              }
            </div>
            <div style={{ fontSize: 11, color: 'var(--k-sub)', textAlign: 'center', marginTop: 4 }}>Klik untuk pilih foto</div>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          </label>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-sub)', marginBottom: 6 }}>Nama Item *</div>
            <input type="text" style={inp} required {...field('name')} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-sub)', marginBottom: 6 }}>Kategori</div>
            <select style={inp} value={form.category_id || ''} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
              <option value="">-- Tanpa Kategori --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-sub)', marginBottom: 6 }}>Harga (Rp) *</div>
            <input type="number" min={500} style={inp} required {...field('price')} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-sub)', marginBottom: 6 }}>Deskripsi</div>
            <textarea rows={2} style={{ ...inp, resize: 'vertical' }} {...field('description')} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-sub)', marginBottom: 6 }}>Stok (kosongkan = tidak terbatas)</div>
            <input type="number" min={0} style={inp} {...field('stock')} placeholder="Tidak terbatas" />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid var(--k-border)',
              background: 'transparent', color: 'var(--k-sub)', fontWeight: 600, cursor: 'pointer',
            }}>Batal</button>
            <button type="submit" disabled={saving} style={{
              flex: 2, padding: '12px', borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer',
              background: '#FF7A45', color: '#fff', fontWeight: 700,
            }}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Halaman Utama ─────────────────────────────────────────────────────────────
export default function MerchantMenuPage() {
  const [categories, setCategories] = useState([])
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)
  const [toast,      setToast]      = useState(null)
  const [newCatName, setNewCatName] = useState('')
  const [addingCat,  setAddingCat]  = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [catRes, itemRes] = await Promise.all([
        api.get('/food/merchant/menu/categories'),
        api.get('/food/merchant/menu/items'),
      ])
      setCategories(catRes.data.data)
      setItems(itemRes.data.data)
    } catch {
      showToast('error', 'Gagal memuat menu.')
    } finally { setLoading(false) }
  }

  async function handleToggle(item) {
    if (togglingId === item.id) return
    setTogglingId(item.id)
    try {
      const res = await api.post(`/food/merchant/menu/items/${item.id}/toggle`)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: res.data.is_available } : i))
    } catch { showToast('error', 'Gagal update.') }
    finally { setTogglingId(null) }
  }

  async function handleDeleteItem(item) {
    if (!confirm(`Hapus "${item.name}"?`)) return
    try {
      await api.delete(`/food/merchant/menu/items/${item.id}`)
      setItems(prev => prev.filter(i => i.id !== item.id))
      showToast('success', 'Item dihapus.')
    } catch { showToast('error', 'Gagal menghapus.') }
  }

  async function handleAddCategory(e) {
    e.preventDefault()
    if (!newCatName.trim()) return
    setAddingCat(true)
    try {
      const res = await api.post('/food/merchant/menu/categories', { name: newCatName.trim() })
      setCategories(prev => [...prev, res.data.data])
      setNewCatName('')
      showToast('success', 'Kategori ditambahkan.')
    } catch { showToast('error', 'Gagal.') } finally { setAddingCat(false) }
  }

  async function handleDeleteCategory(cat) {
    if (!confirm(`Hapus kategori "${cat.name}"? Item di dalamnya tidak akan terhapus.`)) return
    try {
      await api.delete(`/food/merchant/menu/categories/${cat.id}`)
      setCategories(prev => prev.filter(c => c.id !== cat.id))
      setItems(prev => prev.map(i => i.category_id === cat.id ? { ...i, category_id: null } : i))
      showToast('success', 'Kategori dihapus.')
    } catch { showToast('error', 'Gagal.') }
  }

  function onItemSaved(saved) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === saved.id)
      return idx >= 0 ? prev.map(i => i.id === saved.id ? saved : i) : [...prev, saved]
    })
    setModal(null)
    showToast('success', 'Item disimpan.')
  }

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  // Kelompokkan item per kategori
  const grouped = [
    { cat: null, label: 'Tanpa Kategori', items: items.filter(i => !i.category_id) },
    ...categories.map(c => ({ cat: c, label: c.name, items: items.filter(i => i.category_id === c.id) })),
  ].filter(g => g.items.length > 0 || g.cat !== null)

  return (
    <MerchantLayout title="Kelola Menu">
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600,
          background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff',
        }}>{toast.msg}</div>
      )}

      {modal && (
        <ItemModal
          item={modal === 'add' ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={onItemSaved}
        />
      )}

      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Tambah kategori */}
        <div style={{ padding: '20px', borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)' }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Kategori Menu</div>
          <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 10 }}>
            <input
              type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
              placeholder="Nama kategori baru..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 14,
                border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)',
              }}
            />
            <button type="submit" disabled={addingCat || !newCatName.trim()} style={{
              padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: '#FF7A45', color: '#fff', fontWeight: 700, fontSize: 13,
              opacity: (!newCatName.trim() || addingCat) ? 0.5 : 1,
            }}>Tambah</button>
          </form>
          {categories.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {categories.map(c => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: 'rgba(255,122,69,0.1)', color: '#FF7A45',
                }}>
                  {c.name}
                  <button onClick={() => handleDeleteCategory(c)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#F56565', fontSize: 14, lineHeight: 1, padding: 0,
                  }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tombol tambah item */}
        <button onClick={() => setModal('add')} style={{
          width: '100%', padding: '14px', borderRadius: 14,
          border: '2px dashed var(--k-border)', background: 'transparent',
          color: '#FF7A45', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>
          + Tambah Item Menu
        </button>

        {/* Daftar item per kategori */}
        {loading ? (
          <p style={{ color: 'var(--k-sub)' }}>Memuat menu...</p>
        ) : items.length === 0 ? (
          <p style={{ color: 'var(--k-sub)', textAlign: 'center', padding: '32px 0' }}>
            Belum ada item menu. Tambahkan sekarang.
          </p>
        ) : grouped.map(group => (
          group.items.length === 0 ? null : (
            <div key={group.label}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{group.label}</div>
                <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>{group.items.length} item</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.items.map(item => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px', borderRadius: 14, background: 'var(--k-card)',
                    border: '1.5px solid var(--k-border)',
                    opacity: item.is_available ? 1 : 0.55,
                  }}>
                    {/* Foto */}
                    <div style={{
                      width: 60, height: 60, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                      background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.photo_path
                        ? <img src={`/storage/${item.photo_path}`} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 28 }}>🍽️</span>
                      }
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{item.name}</div>
                      <div style={{ color: '#FF7A45', fontWeight: 700, fontSize: 13 }}>{fmtRp(item.price)}</div>
                      {item.stock !== null && (
                        <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Stok: {item.stock}</div>
                      )}
                    </div>

                    {/* Aksi */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => handleToggle(item)}
                        disabled={togglingId === item.id}
                        style={{
                          padding: '6px 12px', borderRadius: 8, border: 'none',
                          cursor: togglingId === item.id ? 'default' : 'pointer',
                          fontSize: 12, fontWeight: 700, opacity: togglingId === item.id ? 0.6 : 1,
                          background: item.is_available ? 'rgba(245,101,101,0.12)' : 'rgba(0,200,150,0.12)',
                          color: item.is_available ? '#F56565' : '#00C896',
                        }}>
                        {togglingId === item.id ? '...' : item.is_available ? 'Habis' : 'Tersedia'}
                      </button>
                      <button onClick={() => setModal(item)} style={{
                        padding: '6px 12px', borderRadius: 8, border: '1.5px solid var(--k-border)',
                        background: 'transparent', color: 'var(--k-sub)', cursor: 'pointer', fontSize: 12,
                      }}>Edit</button>
                      <button onClick={() => handleDeleteItem(item)} style={{
                        padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: 'rgba(245,101,101,0.1)', color: '#F56565', fontSize: 14,
                      }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </MerchantLayout>
  )
}
