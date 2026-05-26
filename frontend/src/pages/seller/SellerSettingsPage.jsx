import { useState, useEffect, useRef } from 'react'
import MartSellerLayout from '../../components/MartSellerLayout'
import MerchantLocationPicker from '../../components/MerchantLocationPicker'
import api from '../../services/api'

const STORAGE = import.meta.env.VITE_STORAGE_URL

export default function SellerSettingsPage() {
  const [profile, setProfile] = useState(null)
  const [form, setForm]       = useState({})
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [uploadingLogo, setUploadingLogo]     = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [logoPreview, setLogoPreview]         = useState(null)
  const [bannerPreview, setBannerPreview]     = useState(null)
  const logoRef   = useRef()
  const bannerRef = useRef()

  const load = () => api.get('/mart/seller/profile').then(r => { setProfile(r.data); setForm({ name: r.data.name, description: r.data.description || '', address: r.data.address, lat: r.data.lat, lng: r.data.lng, phone: r.data.phone || '' }) })
  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true); setMsg('')
    try { await api.patch('/mart/seller/profile', form); setMsg('✓ Profil berhasil disimpan') } catch { setMsg('⚠ Gagal menyimpan') } finally { setSaving(false) }
  }

  const uploadImg = async (file, type, setUploading, setPreview) => {
    setUploading(true)
    const fd = new FormData(); fd.append('image', file)
    try {
      await api.post(`/mart/seller/upload-${type}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setPreview(URL.createObjectURL(file))
    } finally { setUploading(false) }
  }

  if (!profile) return <MartSellerLayout title="Pengaturan Toko"><div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div style={{ width: 24, height: 24, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></MartSellerLayout>

  const logoSrc   = logoPreview || (profile.logo_path ? `${STORAGE}/${profile.logo_path}?t=${Date.now()}` : null)
  const bannerSrc = bannerPreview || (profile.banner_path ? `${STORAGE}/${profile.banner_path}?t=${Date.now()}` : null)

  return (
    <MartSellerLayout title="Pengaturan Toko">
      <div style={{ padding: '16px' }}>
        {/* Banner */}
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', height: 120, background: '#f3f4f6', marginBottom: 16, cursor: 'pointer' }} onClick={() => bannerRef.current?.click()}>
          {bannerSrc
            ? <img src={bannerSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--k-muted)' }}>
                <span style={{ fontSize: 28 }}>🖼️</span>
                <p style={{ fontSize: 12, marginTop: 4 }}>Upload Banner</p>
              </div>
          }
          <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '4px 8px', color: '#fff', fontSize: 11, fontWeight: 700 }}>
            {uploadingBanner ? 'Uploading...' : '📷 Ubah Banner'}
          </div>
          <input ref={bannerRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => e.target.files[0] && uploadImg(e.target.files[0], 'banner', setUploadingBanner, setBannerPreview)} />
        </div>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 16, marginTop: -44 }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', border: '3px solid var(--k-surface)', background: '#f3f4f6', cursor: 'pointer', flexShrink: 0 }} onClick={() => logoRef.current?.click()}>
            {logoSrc
              ? <img src={logoSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 28 }}>🏪</div>
            }
          </div>
          <p style={{ fontSize: 12, color: 'var(--k-muted)', paddingBottom: 4 }}>{uploadingLogo ? 'Uploading...' : 'Tap untuk ubah logo'}</p>
          <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => e.target.files[0] && uploadImg(e.target.files[0], 'logo', setUploadingLogo, setLogoPreview)} />
        </div>

        {/* Form */}
        {[
          { key: 'name', label: 'Nama Toko' },
          { key: 'phone', label: 'No. HP Toko' },
          { key: 'address', label: 'Alamat Toko' },
        ].map(field => (
          <div key={field.key} style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-muted)', marginBottom: 4 }}>{field.label}</p>
            <input value={form[field.key] || ''} onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        ))}

        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-muted)', marginBottom: 4 }}>Deskripsi Toko</p>
          <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Location picker */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-muted)', marginBottom: 8 }}>Lokasi Toko (untuk penghitungan ongkir)</p>
          <MerchantLocationPicker
            lat={form.lat} lng={form.lng}
            onPick={({ lat, lng, address }) => setForm(f => ({ ...f, lat, lng, address: address || f.address }))}
          />
        </div>

        {msg && <p style={{ fontSize: 13, color: msg.startsWith('✓') ? '#22C55E' : '#EF4444', marginBottom: 10 }}>{msg}</p>}

        <button onClick={save} disabled={saving}
          style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#6366F1,#7C3AED)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>
    </MartSellerLayout>
  )
}
