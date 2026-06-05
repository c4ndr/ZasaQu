import { useState, useEffect } from 'react'
import MerchantLayout from '../../components/MerchantLayout'
import api, { storageUrl } from '../../services/api'

function fmtRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

// ── Modal tambah/edit item ────────────────────────────────────────────────────
function ItemModal({ item, categories, onClose, onSaved }) {
  const [form,    setForm]    = useState({
    name: item?.name || '', description: item?.description || '',
    price: item?.price || '', category_id: item?.category_id || '',
    stock: item?.stock ?? '', sort_order: item?.sort_order || 0,
  })
  const [photo,   setPhoto]   = useState(null)
  const [preview, setPreview] = useState(item?.photo_path ? storageUrl(item.photo_path) : null)
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  function field(k) { return { value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) } }

  function handlePhoto(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setPhoto(f); setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e) {
    e.preventDefault(); setErr(''); setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null) fd.append(k, v) })
      if (photo) fd.append('photo', photo)
      const url = item ? `/food/merchant/menu/items/${item.id}` : '/food/merchant/menu/items'
      if (item) fd.append('_method', 'PATCH')
      const res = await api.post(url, fd)
      onSaved(res.data.data)
    } catch (e) {
      const errs = e.response?.data?.errors
      setErr(errs ? Object.values(errs).flat().join(' ') : (e.response?.data?.message || 'Gagal menyimpan.'))
    } finally { setSaving(false) }
  }

  const inp = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    border: '1.5px solid var(--k-border)', background: 'var(--k-input)',
    color: 'var(--k-text)', boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--k-card)', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 20 }}>{item ? 'Edit Item' : 'Tambah Item Baru'}</div>
        {err && <div style={{ color: '#F56565', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(245,101,101,0.08)', borderRadius: 8 }}>{err}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Foto */}
          <label style={{ cursor: 'pointer' }}>
            <div style={{
              width: '100%', height: 150, borderRadius: 14, overflow: 'hidden',
              background: 'var(--k-input)', border: '2px dashed var(--k-border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {preview
                ? <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <><span style={{ fontSize: 40 }}>📷</span><span style={{ fontSize: 12, color: 'var(--k-sub)' }}>Klik untuk pilih foto</span></>
              }
            </div>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          </label>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-sub)', marginBottom: 6 }}>Nama Item *</div>
            <input type="text" style={inp} required {...field('name')} placeholder="cth: Nasi Goreng Spesial" />
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
            <input type="number" min={500} style={inp} required {...field('price')} placeholder="0" />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-sub)', marginBottom: 6 }}>Deskripsi</div>
            <textarea rows={2} style={{ ...inp, resize: 'vertical' }} {...field('description')} placeholder="Opsional..." />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-sub)', marginBottom: 6 }}>Stok <span style={{ fontWeight: 400 }}>(kosongkan = tidak terbatas)</span></div>
            <input type="number" min={0} style={inp} {...field('stock')} placeholder="Tidak terbatas" />
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid var(--k-border)',
              background: 'transparent', color: 'var(--k-sub)', fontWeight: 600, cursor: 'pointer', fontSize: 14,
            }}>Batal</button>
            <button type="submit" disabled={saving} style={{
              flex: 2, padding: '13px', borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer',
              background: '#F97316', color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              {saving ? 'Menyimpan...' : 'Simpan Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal konfirmasi hapus (gantikan confirm()) ───────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--k-card)', borderRadius: 16, padding: '24px 20px', width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Konfirmasi Hapus</div>
        <div style={{ fontSize: 13, color: 'var(--k-sub)', marginBottom: 20 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid var(--k-border)', background: 'transparent', color: 'var(--k-sub)', cursor: 'pointer', fontWeight: 600 }}>Batal</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', fontWeight: 700 }}>Hapus</button>
        </div>
      </div>
    </div>
  )
}

// ── Halaman Utama ─────────────────────────────────────────────────────────────
export default function MerchantMenuPage() {
  const [categories, setCategories] = useState([])
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)  // null | 'add' | item object
  const [confirm,    setConfirm]    = useState(null)  // { message, onConfirm }
  const [toast,      setToast]      = useState(null)
  const [newCatName, setNewCatName] = useState('')
  const [addingCat,  setAddingCat]  = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [activeCat,  setActiveCat]  = useState('all') // filter kategori

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
    } catch { showToast('error', 'Gagal memuat menu.') }
    finally { setLoading(false) }
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

  function askDeleteItem(item) {
    setConfirm({ message: `Hapus "${item.name}"?`, onConfirm: async () => {
      setConfirm(null)
      try {
        await api.delete(`/food/merchant/menu/items/${item.id}`)
        setItems(prev => prev.filter(i => i.id !== item.id))
        showToast('success', 'Item dihapus.')
      } catch { showToast('error', 'Gagal menghapus.') }
    }})
  }

  function askDeleteCategory(cat) {
    setConfirm({ message: `Hapus kategori "${cat.name}"? Item di dalamnya tidak akan terhapus.`, onConfirm: async () => {
      setConfirm(null)
      try {
        await api.delete(`/food/merchant/menu/categories/${cat.id}`)
        setCategories(prev => prev.filter(c => c.id !== cat.id))
        setItems(prev => prev.map(i => i.category_id === cat.id ? { ...i, category_id: null } : i))
        showToast('success', 'Kategori dihapus.')
      } catch { showToast('error', 'Gagal.') }
    }})
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
    } catch { showToast('error', 'Gagal.') }
    finally { setAddingCat(false) }
  }

  function onItemSaved(saved) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === saved.id)
      return idx >= 0 ? prev.map(i => i.id === saved.id ? saved : i) : [...prev, saved]
    })
    setModal(null)
    showToast('success', 'Item disimpan.')
  }

  function showToast(type, msg) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  // Filter berdasarkan tab kategori
  const displayItems = activeCat === 'all'
    ? items
    : activeCat === 'uncategorized'
    ? items.filter(i => !i.category_id)
    : items.filter(i => String(i.category_id) === String(activeCat))

  return (
    <MerchantLayout title="Kelola Menu">
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '11px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13,
          background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', whiteSpace: 'nowrap',
        }}>{toast.msg}</div>
      )}

      {modal !== null && (
        <ItemModal
          item={modal === 'add' ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={onItemSaved}
        />
      )}

      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Tombol tambah item (paling atas, besar) ── */}
        <button onClick={() => setModal('add')} style={{
          width: '100%', padding: '14px', borderRadius: 14,
          border: '2px dashed rgba(249,115,22,0.5)', background: 'rgba(249,115,22,0.05)',
          color: '#F97316', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 20 }}>+</span> Tambah Item Menu
        </button>

        {/* ── Kelola kategori ── */}
        <div style={{ padding: '16px', borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)' }}>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>Kategori</div>
          <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 8, marginBottom: categories.length > 0 ? 12 : 0 }}>
            <input
              type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
              placeholder="Nama kategori baru..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 13,
                border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)',
              }}
            />
            <button type="submit" disabled={addingCat || !newCatName.trim()} style={{
              padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: '#F97316', color: '#fff', fontWeight: 700, fontSize: 13,
              opacity: (!newCatName.trim() || addingCat) ? 0.5 : 1,
            }}>Tambah</button>
          </form>
          {categories.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {categories.map(c => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 10px 6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: 'rgba(249,115,22,0.1)', color: '#F97316',
                }}>
                  {c.name}
                  <button onClick={() => askDeleteCategory(c)} style={{
                    background: 'rgba(249,115,22,0.2)', border: 'none', cursor: 'pointer',
                    color: '#C2410C', fontSize: 14, lineHeight: 1, padding: '0 3px', borderRadius: '50%',
                  }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Filter tab kategori ── */}
        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {[
              { id: 'all', label: `Semua (${items.length})` },
              ...categories.map(c => ({ id: c.id, label: `${c.name} (${items.filter(i => String(i.category_id) === String(c.id)).length})` })),
              { id: 'uncategorized', label: `Tanpa Kat. (${items.filter(i => !i.category_id).length})` },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveCat(tab.id)} style={{
                padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: activeCat === tab.id ? '#F97316' : 'var(--k-input)',
                color: activeCat === tab.id ? '#fff' : 'var(--k-sub)',
                fontWeight: activeCat === tab.id ? 700 : 500, fontSize: 12,
              }}>{tab.label}</button>
            ))}
          </div>
        )}

        {/* ── Daftar item ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--k-sub)', fontSize: 13 }}>Memuat menu...</div>
        ) : displayItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--k-sub)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🍽️</div>
            <p>Belum ada item di kategori ini.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayItems.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px', borderRadius: 14, background: 'var(--k-card)',
                border: '1.5px solid var(--k-border)',
                opacity: item.is_available ? 1 : 0.55,
              }}>
                {/* Foto */}
                <div style={{
                  width: 64, height: 64, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
                  background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.photo_path
                    ? <img src={storageUrl(item.photo_path)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 28 }}>🍽️</span>
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <div style={{ color: '#F97316', fontWeight: 700, fontSize: 13, marginTop: 2 }}>{fmtRp(item.price)}</div>
                  {item.stock !== null && (
                    <div style={{ fontSize: 11, color: 'var(--k-sub)', marginTop: 1 }}>
                      Stok: <span style={{ fontWeight: 700, color: item.stock === 0 ? '#F56565' : 'var(--k-text)' }}>{item.stock}</span>
                    </div>
                  )}
                </div>

                {/* Aksi — vertikal stack di mobile ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  {/* Toggle tersedia/habis */}
                  <button onClick={() => handleToggle(item)} disabled={togglingId === item.id} style={{
                    padding: '7px 14px', borderRadius: 8, border: 'none',
                    cursor: togglingId === item.id ? 'default' : 'pointer', fontSize: 12, fontWeight: 700,
                    opacity: togglingId === item.id ? 0.6 : 1,
                    background: item.is_available ? 'rgba(245,101,101,0.12)' : 'rgba(0,200,150,0.12)',
                    color: item.is_available ? '#DC2626' : '#027A48',
                  }}>
                    {togglingId === item.id ? '...' : item.is_available ? 'Habis' : 'Tersedia'}
                  </button>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setModal(item)} style={{
                      flex: 1, padding: '7px', borderRadius: 8, border: '1.5px solid var(--k-border)',
                      background: 'transparent', color: 'var(--k-sub)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    }}>Edit</button>
                    <button onClick={() => askDeleteItem(item)} style={{
                      padding: '7px 9px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'rgba(245,101,101,0.1)', color: '#DC2626', fontSize: 14,
                    }}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MerchantLayout>
  )
}
