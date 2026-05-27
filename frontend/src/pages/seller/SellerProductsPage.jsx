import { useState, useEffect, useRef } from 'react'
import MartSellerLayout from '../../components/MartSellerLayout'
import api from '../../services/api'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { isNative } from '../../utils/nativePlatform'

// ── Native photo picker ───────────────────────────────────────────────────────
// Catatan: TIDAK pakai Camera.requestPermissions() karena di beberapa Android
// ia memblok / hang sebelum galeri terbuka. Camera.getPhoto sudah minta izin sendiri.
async function pickImageNative() {
  const photo = await Camera.getPhoto({
    allowEditing: false,
    resultType: CameraResultType.DataUrl,   // DataUrl lebih reliable — tidak perlu fetch
    source: CameraSource.Photos,
    quality: 75,
    width: 800,
    height: 800,
  })

  if (!photo.dataUrl) throw new Error('Tidak ada data foto dari galeri')

  // Resize via canvas → jamin output kecil sebelum upload
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const max = 800
      const r   = Math.min(max / img.width, max / img.height, 1)
      const cv  = document.createElement('canvas')
      cv.width  = Math.round(img.width  * r)
      cv.height = Math.round(img.height * r)
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
      resolve({ dataUrl: cv.toDataURL('image/jpeg', 0.75), mime: 'image/jpeg' })
    }
    img.onerror = () => reject(new Error('Gagal memproses foto'))
    img.src = photo.dataUrl
  })
}

const fmtRp   = v => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const STORAGE = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')
const EMPTY   = { name: '', category_id: '', description: '', price: '', compare_price: '', stock: '', weight: '', is_active: true }

export default function SellerProductsPage() {
  const [products,     setProducts]     = useState([])
  const [categories,   setCategories]   = useState([])
  const [catError,     setCatError]     = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [modal,        setModal]        = useState(null)
  const [form,         setForm]         = useState(EMPTY)
  const [saving,       setSaving]       = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [toast,        setToast]        = useState(null)
  const [confirmDel,   setConfirmDel]   = useState(null) // { id, name }
  const imgRef = useRef()

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const load = () => {
    setLoading(true)
    api.get('/mart/seller/products', { params: { search: search || undefined } })
      .then(r => setProducts(r.data.data ?? []))
      .catch(() => showToast('error', 'Gagal memuat produk.'))
      .finally(() => setLoading(false))
  }

  const loadCats = () => {
    setCatError(false)
    api.get('/mart/categories')
      .then(r => setCategories(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCatError(true))
  }

  useEffect(() => { loadCats() }, [])
  useEffect(() => { load() }, [search])

  const openAdd  = () => { setForm(EMPTY); setModal('add') }
  const openEdit = p  => {
    setForm({ ...p, category_id: p.category_id || '', compare_price: p.compare_price || '',
              price: p.price || '', stock: p.stock || '', weight: p.weight || '', images: p.images ?? [] })
    setModal(p.id)
  }
  const closeModal = () => setModal(null)

  // ── Simpan ────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!form.name?.trim()) return showToast('error', 'Nama produk wajib diisi.')
    if (!form.price)        return showToast('error', 'Harga wajib diisi.')
    if (form.stock === '')  return showToast('error', 'Stok wajib diisi.')
    if (!form.weight)       return showToast('error', 'Berat wajib diisi.')
    setSaving(true)
    try {
      const payload = {
        ...form,
        price:         Number(form.price),
        stock:         Number(form.stock),
        weight:        Number(form.weight),
        compare_price: form.compare_price ? Number(form.compare_price) : null,
        category_id:   form.category_id || null,
      }
      if (modal === 'add') {
        const res = await api.post('/mart/seller/products', payload)
        setForm({ ...res.data, images: res.data.images ?? [] })
        setModal(res.data.id)
        showToast('success', 'Produk ditambahkan! Tambahkan foto sekarang.')
      } else {
        await api.patch(`/mart/seller/products/${modal}`, payload)
        showToast('success', 'Produk berhasil disimpan.')
        closeModal()
      }
      load()
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal menyimpan.')
    } finally { setSaving(false) }
  }

  // ── Hapus produk ──────────────────────────────────────────────────────────
  const deleteProduct = async () => {
    if (!confirmDel) return
    const { id, name } = confirmDel
    setConfirmDel(null)
    try {
      await api.delete(`/mart/seller/products/${id}`)
      // Hapus dari state lokal langsung — tidak menunggu reload
      setProducts(prev => prev.filter(p => p.id !== id))
      if (modal === id) closeModal()
      showToast('success', `"${name}" berhasil dihapus.`)
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal menghapus produk.')
      load() // reload kalau gagal supaya state sync
    }
  }

  // ── Toggle aktif ──────────────────────────────────────────────────────────
  const toggleActive = async (id, is_active) => {
    try {
      await api.patch(`/mart/seller/products/${id}`, { is_active: !is_active })
      load()
    } catch { showToast('error', 'Gagal mengubah status.') }
  }

  // ── Upload foto native ────────────────────────────────────────────────────
  const pickAndUploadNative = async () => {
    if (uploadingImg) return
    setUploadingImg(true)
    try {
      const { dataUrl, mime } = await pickImageNative()
      const r = await api.post(`/mart/seller/products/${modal}/images-base64`, { data: dataUrl, mime })
      setForm(f => ({ ...f, images: r.data.images ?? [] }))
      load()
      showToast('success', 'Foto berhasil ditambahkan.')
    } catch (e) {
      const msg = String(e?.message || e || 'unknown')
      // Hanya skip error jika user memang sengaja cancel/tutup galeri
      const isCanceled = /cancel(l?ed)?|no image picked|user denied/i.test(msg)
      if (!isCanceled) showToast('error', 'Gagal upload foto:\n' + msg)
    } finally { setUploadingImg(false) }
  }

  // ── Upload foto web ───────────────────────────────────────────────────────
  const uploadImageWeb = async e => {
    const file = e.target.files[0]; if (!file) return
    e.target.value = ''
    if (!file.type.startsWith('image/')) { showToast('error', 'File harus berupa gambar.'); return }
    if (file.size > 5 * 1024 * 1024)    { showToast('error', 'Foto maks. 5MB.'); return }
    setUploadingImg(true)
    try {
      const fd = new FormData(); fd.append('image', file)
      const r = await api.post(`/mart/seller/products/${modal}/images`, fd)
      setForm(f => ({ ...f, images: r.data.images ?? [] }))
      load()
      showToast('success', 'Foto berhasil ditambahkan.')
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal upload foto.')
    } finally { setUploadingImg(false) }
  }

  // ── Hapus foto ────────────────────────────────────────────────────────────
  const deleteImage = async path => {
    try {
      const r = await api.delete(`/mart/seller/products/${modal}/images`, { data: { path } })
      setForm(f => ({ ...f, images: r.data.images ?? [] }))
      showToast('success', 'Foto dihapus.')
    } catch { showToast('error', 'Gagal menghapus foto.') }
  }

  const inp = {
    width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14,
    border: '1.5px solid var(--k-border)', background: 'var(--k-card)',
    color: 'var(--k-text)', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }

  return (
    <MartSellerLayout title="Produk Saya">

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '11px 20px', borderRadius: 100, fontSize: 13,
          fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
          background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff',
          animation: 'slideDown 0.25s ease',
        }}>
          <style>{`@keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
          {toast.type === 'success' ? '✅ ' : '❌ '}{toast.msg}
        </div>
      )}

      {/* ── Konfirmasi hapus produk ───────────────────────────────────────── */}
      {confirmDel && (
        <>
          <div onClick={() => setConfirmDel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 'calc(100% - 48px)', maxWidth: 360, background: 'var(--k-surface)',
            borderRadius: 20, padding: 24, zIndex: 1001, boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>
            <p style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>🗑️</p>
            <p style={{ fontWeight: 800, fontSize: 15, textAlign: 'center', color: 'var(--k-text)', marginBottom: 6 }}>Hapus Produk?</p>
            <p style={{ fontSize: 13, color: 'var(--k-muted)', textAlign: 'center', marginBottom: 20 }}>
              "<b>{confirmDel.name}</b>" akan dinonaktifkan dan tidak tampil di toko.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDel(null)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid var(--k-border)', background: 'none', color: 'var(--k-text)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Batal</button>
              <button onClick={deleteProduct} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>Hapus</button>
            </div>
          </div>
        </>
      )}

      <div style={{ padding: '14px 16px' }}>

        {/* ── Search + Tambah ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Cari produk..."
            style={{ ...inp, flex: 1, borderRadius: 12 }}
          />
          <button onClick={openAdd} style={{
            padding: '11px 18px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg,#6366F1,#7C3AED)',
            color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
          }}>+ Tambah</button>
        </div>

        {/* ── Daftar produk ───────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
            <div style={{ width: 28, height: 28, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--k-muted)' }}>
            <p style={{ fontSize: 48, marginBottom: 10 }}>🛍️</p>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: 'var(--k-text)' }}>Belum ada produk</p>
            <p style={{ fontSize: 13, marginBottom: 20 }}>Tambahkan produk pertamamu untuk mulai berjualan</p>
            <button onClick={openAdd} style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366F1,#7C3AED)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14, boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
              + Tambah Produk
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {products.map(p => (
              <div key={p.id} style={{
                background: 'var(--k-card)', borderRadius: 14,
                border: `1px solid ${p.is_active ? 'var(--k-border)' : 'rgba(239,68,68,0.2)'}`,
                padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center',
                opacity: p.is_active ? 1 : 0.65,
              }}>
                {/* Thumbnail */}
                <div style={{ width: 58, height: 58, borderRadius: 10, overflow: 'hidden', background: 'var(--k-input)', flexShrink: 0, border: '1px solid var(--k-border)' }}>
                  {p.images?.[0]
                    ? <img src={`${STORAGE}/${p.images[0]}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🛍️</div>
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.name}</p>
                    {!p.is_active && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontWeight: 700, whiteSpace: 'nowrap' }}>Nonaktif</span>}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#6366F1', marginBottom: 2 }}>{fmtRp(p.price)}</p>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--k-muted)' }}>
                    <span>📦 Stok: {p.stock ?? 0}</span>
                    <span>✅ Terjual: {p.total_sold ?? 0}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                  <button onClick={() => openEdit(p)} style={{
                    padding: '6px 14px', borderRadius: 8, border: 'none',
                    background: 'rgba(99,102,241,0.12)', color: '#6366F1',
                    fontSize: 12, cursor: 'pointer', fontWeight: 700,
                  }}>✏️ Edit</button>
                  <button onClick={() => setConfirmDel({ id: p.id, name: p.name })} style={{
                    padding: '6px 14px', borderRadius: 8, border: 'none',
                    background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                    fontSize: 12, cursor: 'pointer', fontWeight: 700,
                  }}>🗑️ Hapus</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal tambah/edit produk ─────────────────────────────────────── */}
      {modal !== null && (
        <>
          <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 900 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 480, background: 'var(--k-surface)',
            borderRadius: '22px 22px 0 0', maxHeight: '93vh', overflowY: 'auto',
            zIndex: 901, paddingBottom: 'calc(24px + env(safe-area-inset-bottom,0px))',
          }}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--k-border)' }} />
            </div>

            <div style={{ padding: '16px 18px' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--k-text)' }}>
                  {modal === 'add' ? '➕ Tambah Produk' : '✏️ Edit Produk'}
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {modal !== 'add' && (
                    <button onClick={() => setConfirmDel(products.find(p => p.id === modal) || { id: modal, name: form.name })} style={{
                      padding: '6px 12px', borderRadius: 8, border: 'none',
                      background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                      fontSize: 12, cursor: 'pointer', fontWeight: 700,
                    }}>🗑️ Hapus</button>
                  )}
                  <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 24, color: 'var(--k-muted)', cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>
              </div>

              {/* ── Foto produk ─── */}
              {modal !== 'add' ? (
                <div style={{ marginBottom: 18, padding: '14px', borderRadius: 14, background: 'var(--k-card)', border: '1px solid var(--k-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>📸 Foto Produk</p>
                    <span style={{ fontSize: 11, color: 'var(--k-muted)', background: 'var(--k-input)', padding: '3px 8px', borderRadius: 8, fontWeight: 600 }}>
                      {form.images?.length ?? 0}/5
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(form.images || []).map((img, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img
                          src={`${STORAGE}/${img}`}
                          style={{ width: 70, height: 70, borderRadius: 10, objectFit: 'cover', border: '1.5px solid var(--k-border)', display: 'block' }}
                          onError={e => { e.target.style.opacity = '0.3' }}
                        />
                        {i === 0 && (
                          <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', fontSize: 9, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '0 0 8px 8px', padding: '2px 0', fontWeight: 700 }}>UTAMA</span>
                        )}
                        <button onClick={() => deleteImage(img)} style={{
                          position: 'absolute', top: -6, right: -6, width: 22, height: 22,
                          borderRadius: '50%', background: '#EF4444', border: '2px solid var(--k-surface)',
                          color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 900,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                        }}>×</button>
                      </div>
                    ))}

                    {(form.images?.length ?? 0) < 5 && (
                      isNative ? (
                        <button onClick={pickAndUploadNative} disabled={uploadingImg} style={{
                          width: 70, height: 70, borderRadius: 10,
                          border: `2px dashed ${uploadingImg ? '#6366F1' : 'var(--k-border)'}`,
                          background: uploadingImg ? 'rgba(99,102,241,0.06)' : 'var(--k-input)',
                          cursor: uploadingImg ? 'not-allowed' : 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: 4, color: uploadingImg ? '#6366F1' : 'var(--k-muted)',
                        }}>
                          <span style={{ fontSize: uploadingImg ? 18 : 24 }}>{uploadingImg ? '⏳' : '+'}</span>
                          <span style={{ fontSize: 10, fontWeight: 600 }}>{uploadingImg ? 'Upload...' : 'Foto'}</span>
                        </button>
                      ) : (
                        <>
                          <label htmlFor="prod-img-input" style={{
                            width: 70, height: 70, borderRadius: 10,
                            border: `2px dashed ${uploadingImg ? '#6366F1' : 'var(--k-border)'}`,
                            background: uploadingImg ? 'rgba(99,102,241,0.06)' : 'var(--k-input)',
                            cursor: uploadingImg ? 'not-allowed' : 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: 4, color: uploadingImg ? '#6366F1' : 'var(--k-muted)',
                          }}>
                            <span style={{ fontSize: uploadingImg ? 18 : 24 }}>{uploadingImg ? '⏳' : '+'}</span>
                            <span style={{ fontSize: 10, fontWeight: 600 }}>{uploadingImg ? 'Upload...' : 'Foto'}</span>
                          </label>
                          <input id="prod-img-input" ref={imgRef} type="file" accept="image/*"
                            onChange={uploadImageWeb} disabled={uploadingImg} style={{ display: 'none' }} />
                        </>
                      )
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 10 }}>
                    Foto pertama jadi foto utama · Maks. 5 foto · 5MB/foto
                  </p>
                </div>
              ) : (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px dashed rgba(99,102,241,0.3)', marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: '#6366F1', fontWeight: 600 }}>📸 Foto bisa ditambahkan setelah produk disimpan</p>
                </div>
              )}

              {/* ── Fields ─── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', display: 'block', marginBottom: 5 }}>Nama Produk *</label>
                  <input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Masukkan nama produk" style={inp} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', display: 'block', marginBottom: 5 }}>Harga (Rp) *</label>
                    <input type="number" inputMode="numeric" min="0" value={form.price || ''} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                      placeholder="0" style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', display: 'block', marginBottom: 5 }}>Harga Coret</label>
                    <input type="number" inputMode="numeric" min="0" value={form.compare_price || ''} onChange={e => setForm(p => ({ ...p, compare_price: e.target.value }))}
                      placeholder="(opsional)" style={inp} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', display: 'block', marginBottom: 5 }}>Stok *</label>
                    <input type="number" inputMode="numeric" min="0" value={form.stock || ''} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
                      placeholder="0" style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', display: 'block', marginBottom: 5 }}>Berat (gram) *</label>
                    <input type="number" inputMode="numeric" min="0" value={form.weight || ''} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                      placeholder="200" style={inp} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)' }}>Kategori</label>
                    {catError && (
                      <button onClick={loadCats} style={{ fontSize: 11, color: '#F59E0B', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>⚠️ Retry</button>
                    )}
                  </div>
                  <select value={form.category_id || ''} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))} style={inp}>
                    <option value="">{catError ? '— Gagal memuat —' : categories.length === 0 ? '⏳ Memuat...' : '— Pilih Kategori —'}</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', display: 'block', marginBottom: 5 }}>Deskripsi</label>
                  <textarea value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    rows={3} placeholder="Ceritakan detail produkmu..." style={{ ...inp, resize: 'none' }} />
                </div>

                {modal !== 'add' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--k-card)', border: '1px solid var(--k-border)' }}>
                    <input type="checkbox" id="is_active" checked={!!form.is_active}
                      onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#6366F1' }} />
                    <label htmlFor="is_active" style={{ fontSize: 13, color: 'var(--k-text)', cursor: 'pointer', flex: 1, userSelect: 'none' }}>
                      Produk aktif (tampil di halaman toko)
                    </label>
                  </div>
                )}
              </div>

              {/* ── Tombol simpan ─── */}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={closeModal} style={{
                  flex: 1, padding: '14px', borderRadius: 12, border: '1.5px solid var(--k-border)',
                  background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--k-text)',
                }}>Batal</button>
                <button onClick={save} disabled={saving} style={{
                  flex: 2, padding: '14px', borderRadius: 12, border: 'none',
                  background: saving ? 'var(--k-border)' : 'linear-gradient(135deg,#6366F1,#7C3AED)',
                  color: '#fff', fontWeight: 800, fontSize: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: saving ? 'none' : '0 4px 14px rgba(99,102,241,0.4)',
                }}>
                  {saving ? '⏳ Menyimpan...' : '💾 Simpan Produk'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </MartSellerLayout>
  )
}
