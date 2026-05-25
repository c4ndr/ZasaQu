import { useState, useEffect, useRef } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')

const DEFAULT_FORM = {
  title: '', subtitle: '', description: '',
  gradient: 'linear-gradient(135deg, #00C896 0%, #00A87D 100%)',
  emoji: '🎉', link_url: '', sort_order: 0, is_active: true,
}

const GRADIENT_PRESETS = [
  { label: 'Hijau',  value: 'linear-gradient(135deg, #00C896 0%, #00A87D 100%)' },
  { label: 'Biru',   value: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' },
  { label: 'Oranye', value: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' },
  { label: 'Ungu',   value: 'linear-gradient(135deg, #9F7AEA 0%, #7C3AED 100%)' },
  { label: 'Merah',  value: 'linear-gradient(135deg, #F56565 0%, #C53030 100%)' },
  { label: 'Kuning', value: 'linear-gradient(135deg, #F6AD55 0%, #D69E2E 100%)' },
  { label: 'Gelap',  value: 'linear-gradient(135deg, #2D3748 0%, #1A202C 100%)' },
]

function PromoPreview({ form, imageUrl }) {
  return (
    <div style={{
      background: form.gradient || '#1a1a2e',
      borderRadius: 16, padding: '22px 24px',
      display: 'flex', alignItems: 'center', gap: 18,
      minHeight: 110, overflow: 'hidden', position: 'relative',
    }}>
      {imageUrl ? (
        <img src={imageUrl} alt="" style={{ width: 70, height: 70, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <span style={{ fontSize: 44, flexShrink: 0 }}>{form.emoji || '🎉'}</span>
      )}
      <div>
        <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>
          {form.title || 'Judul Promo'}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
          {form.subtitle || form.description || 'Deskripsi promo...'}
        </p>
      </div>
    </div>
  )
}

export default function AdminPromosPage() {
  const [promos,  setPromos]  = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null) // promo object being edited
  const [form,    setForm]    = useState(DEFAULT_FORM)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)
  const fileRef = useRef()

  const fetchPromos = () => {
    setLoading(true)
    api.get('/admin/promos').then(r => setPromos(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { fetchPromos() }, [])

  const openNew = () => {
    setEditing(null)
    setForm(DEFAULT_FORM)
    setImageFile(null)
    setImagePreview(null)
    setShowForm(true)
  }

  const openEdit = (promo) => {
    setEditing(promo)
    setForm({
      title:       promo.title       ?? '',
      subtitle:    promo.subtitle    ?? '',
      description: promo.description ?? '',
      gradient:    promo.gradient    ?? GRADIENT_PRESETS[0].value,
      emoji:       promo.emoji       ?? '🎉',
      link_url:    promo.link_url    ?? '',
      sort_order:  promo.sort_order  ?? 0,
      is_active:   promo.is_active   ?? true,
    })
    setImageFile(null)
    setImagePreview(promo.image_path ? `${STORAGE_URL}/${promo.image_path}` : null)
    setShowForm(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!form.title.trim()) { alert('Judul wajib diisi.'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : v)
      })
      if (imageFile) fd.append('image', imageFile)

      if (editing) {
        await api.post(`/admin/promos/${editing.id}`, fd)
      } else {
        await api.post('/admin/promos', fd)
      }

      setShowForm(false)
      fetchPromos()
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menyimpan promo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus promo ini?')) return
    setDeleting(id)
    try {
      await api.delete(`/admin/promos/${id}`)
      setPromos(prev => prev.filter(p => p.id !== id))
    } catch {
      alert('Gagal menghapus promo.')
    } finally {
      setDeleting(null)
    }
  }

  const toggleActive = async (promo) => {
    try {
      const fd = new FormData()
      fd.append('is_active', promo.is_active ? '0' : '1')
      const r = await api.post(`/admin/promos/${promo.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setPromos(prev => prev.map(p => p.id === promo.id ? r.data.data : p))
    } catch {
      alert('Gagal mengubah status.')
    }
  }

  return (
    <AdminLayout>
      <style>{`
        .promo-form-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.65);
          z-index: 300; display: flex; align-items: center; justify-content: center;
          padding: 20px; backdrop-filter: blur(4px);
        }
        .promo-form-box {
          background: var(--k-surface); border: 1px solid var(--k-border);
          border-radius: 20px; width: 100%; max-width: 560px;
          max-height: 92vh; overflow-y: auto; padding: 28px;
        }
        .promo-input {
          width: 100%; padding: 10px 14px; border-radius: 12px;
          background: var(--k-card2); border: 1.5px solid var(--k-border);
          color: var(--k-text); font-size: 13px; outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .promo-input:focus { border-color: var(--k-accent); }
        .promo-label { font-size: 12px; font-weight: 700; color: var(--k-muted); margin-bottom: 6px; display: block; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Promo & Iklan</h2>
          <p style={{ fontSize: 13, color: 'var(--k-muted)', marginTop: 4 }}>Kelola slide banner di halaman utama pelanggan</p>
        </div>
        <button onClick={openNew} style={{
          padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
          background: 'var(--k-accent)', color: '#0C0C16', border: 'none', cursor: 'pointer',
        }}>
          + Tambah Promo
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-muted)' }}>Memuat...</div>
      ) : promos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>📢</p>
          <p style={{ color: 'var(--k-text)', fontWeight: 700, marginBottom: 6 }}>Belum ada promo</p>
          <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Tambahkan slide banner untuk ditampilkan ke pelanggan</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {promos.map(promo => (
            <div key={promo.id} style={{
              background: 'var(--k-card)', border: `1px solid var(--k-border)`,
              borderRadius: 16, overflow: 'hidden',
              opacity: promo.is_active ? 1 : 0.55,
              transition: 'opacity 0.2s',
            }}>
              {/* Preview strip */}
              <div style={{ background: promo.gradient || '#1a1a2e', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                {promo.image_path ? (
                  <img src={`${STORAGE_URL}/${promo.image_path}`} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <span style={{ fontSize: 36, flexShrink: 0 }}>{promo.emoji ?? '🎉'}</span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 2 }}>{promo.title}</p>
                  {promo.subtitle && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{promo.subtitle}</p>}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
                  background: promo.is_active ? 'rgba(0,200,150,0.25)' : 'rgba(160,160,188,0.2)',
                  color: promo.is_active ? '#00C896' : '#A0A0BC',
                }}>
                  {promo.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              {/* Actions bar */}
              <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--k-muted)', flex: 1 }}>
                  Urutan: #{promo.sort_order}
                  {promo.link_url && <> · <a href={promo.link_url} target="_blank" rel="noreferrer" style={{ color: 'var(--k-accent)' }}>Link</a></>}
                </span>
                <button onClick={() => toggleActive(promo)} style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: promo.is_active ? 'rgba(160,160,188,0.15)' : 'rgba(0,200,150,0.12)',
                  color: promo.is_active ? 'var(--k-muted)' : 'var(--k-accent)',
                  border: '1px solid var(--k-border)', cursor: 'pointer',
                }}>
                  {promo.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button onClick={() => openEdit(promo)} style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: 'var(--k-card2)', color: 'var(--k-sub)',
                  border: '1px solid var(--k-border)', cursor: 'pointer',
                }}>
                  Edit
                </button>
                <button onClick={() => handleDelete(promo.id)} disabled={deleting === promo.id} style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: 'rgba(245,101,101,0.08)', color: 'var(--k-danger)',
                  border: '1px solid rgba(245,101,101,0.2)', cursor: 'pointer',
                  opacity: deleting === promo.id ? 0.5 : 1,
                }}>
                  {deleting === promo.id ? '...' : 'Hapus'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="promo-form-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="promo-form-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--k-text)' }}>
                {editing ? 'Edit Promo' : 'Tambah Promo'}
              </h3>
              <button onClick={() => setShowForm(false)} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--k-card2)', border: '1px solid var(--k-border)', color: 'var(--k-muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            {/* Live Preview */}
            <div style={{ marginBottom: 20 }}>
              <label className="promo-label">Preview</label>
              <PromoPreview form={form} imageUrl={imagePreview} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Judul */}
              <div>
                <label className="promo-label">Judul *</label>
                <input className="promo-input" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Judul banner promo" />
              </div>

              {/* Subtitle */}
              <div>
                <label className="promo-label">Subjudul</label>
                <input className="promo-input" value={form.subtitle}
                  onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  placeholder="Teks singkat di bawah judul" />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="promo-label">Deskripsi</label>
                <textarea className="promo-input" value={form.description} rows={2}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Deskripsi lengkap (opsional)" style={{ resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              {/* Emoji */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: '0 0 100px' }}>
                  <label className="promo-label">Emoji</label>
                  <input className="promo-input" value={form.emoji}
                    onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                    placeholder="🎉" style={{ fontSize: 22, textAlign: 'center' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="promo-label">Urutan Tampil</label>
                  <input className="promo-input" type="number" min="0" value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
                </div>
              </div>

              {/* Gradient */}
              <div>
                <label className="promo-label">Warna Background</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  {GRADIENT_PRESETS.map(p => (
                    <button key={p.value} onClick={() => setForm(f => ({ ...f, gradient: p.value }))}
                      style={{
                        width: 32, height: 32, borderRadius: 8, border: form.gradient === p.value ? '2.5px solid var(--k-accent)' : '2px solid transparent',
                        background: p.value, cursor: 'pointer', flexShrink: 0,
                      }} title={p.label} />
                  ))}
                </div>
                <input className="promo-input" value={form.gradient}
                  onChange={e => setForm(f => ({ ...f, gradient: e.target.value }))}
                  placeholder="CSS gradient custom..." />
              </div>

              {/* Gambar */}
              <div>
                <label className="promo-label">Gambar (opsional, menggantikan emoji)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {imagePreview && (
                    <img src={imagePreview} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover' }} />
                  )}
                  <button onClick={() => fileRef.current?.click()} style={{
                    padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                    background: 'var(--k-card2)', color: 'var(--k-sub)',
                    border: '1px solid var(--k-border)', cursor: 'pointer',
                  }}>
                    {imagePreview ? 'Ganti Gambar' : 'Pilih Gambar'}
                  </button>
                  {imagePreview && (
                    <button onClick={() => { setImageFile(null); setImagePreview(null) }} style={{
                      padding: '8px 12px', borderRadius: 10, fontSize: 12,
                      background: 'none', color: 'var(--k-danger)',
                      border: '1px solid rgba(245,101,101,0.3)', cursor: 'pointer',
                    }}>
                      Hapus
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                </div>
              </div>

              {/* Link URL */}
              <div>
                <label className="promo-label">URL Tujuan (opsional)</label>
                <input className="promo-input" value={form.link_url}
                  onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                  placeholder="https://..." type="url" />
              </div>

              {/* Status aktif */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--k-card2)', borderRadius: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)' }}>Tampilkan ke pelanggan</span>
                <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} style={{
                  width: 42, height: 24, borderRadius: 100, border: 'none', cursor: 'pointer',
                  background: form.is_active ? 'var(--k-accent)' : 'var(--k-border)',
                  position: 'relative', transition: 'background 0.2s',
                }}>
                  <span style={{
                    position: 'absolute', top: 3, left: form.is_active ? 20 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', display: 'block',
                  }} />
                </button>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowForm(false)} style={{
                  flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  background: 'var(--k-card2)', color: 'var(--k-muted)',
                  border: '1px solid var(--k-border)', cursor: 'pointer',
                }}>
                  Batal
                </button>
                <button onClick={handleSave} disabled={saving} style={{
                  flex: 2, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                  background: 'var(--k-accent)', color: '#0C0C16',
                  border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1,
                }}>
                  {saving ? 'Menyimpan...' : (editing ? 'Simpan Perubahan' : 'Tambah Promo')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
