import { useState, useEffect, useRef } from 'react'
import MartSellerLayout from '../../components/MartSellerLayout'
import MerchantLocationPicker from '../../components/MerchantLocationPicker'
import api from '../../services/api'

const STORAGE = import.meta.env.VITE_STORAGE_URL

function fmtStatus(s) {
  return { pending: 'Menunggu Persetujuan', active: 'Aktif', suspended: 'Disuspend' }[s] ?? s
}
function statusColor(s) {
  return { pending: '#F6AD55', active: '#00C896', suspended: '#F56565' }[s] ?? '#A0A0BC'
}

export default function SellerSettingsPage() {
  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [form,     setForm]     = useState({})
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState(null)
  const [uplLogo,  setUplLogo]  = useState(false)
  const [uplBanner,setUplBanner]= useState(false)
  const [prevLogo, setPrevLogo] = useState(null)
  const [prevBanner,setPrevBanner]= useState(null)
  const logoRef   = useRef()
  const bannerRef = useRef()

  const load = () => {
    setLoading(true)
    api.get('/mart/seller/profile')
      .then(r => {
        setProfile(r.data)
        setForm({ name: r.data.name || '', description: r.data.description || '', address: r.data.address || '', lat: r.data.lat, lng: r.data.lng, phone: r.data.phone || '' })
      })
      .catch(() => showToast('error', 'Gagal memuat profil toko.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await api.patch('/mart/seller/profile', form)
      setProfile(p => ({ ...p, ...res.data }))
      showToast('success', 'Profil berhasil disimpan.')
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal menyimpan.')
    } finally { setSaving(false) }
  }

  const toggleOpen = async () => {
    try {
      const res = await api.post('/mart/seller/toggle-open')
      setProfile(p => ({ ...p, is_open: res.data.is_open }))
      showToast('success', res.data.message)
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal.')
    }
  }

  const uploadImg = async (file, type, setUpl, setPreview) => {
    const maxBytes = type === 'logo' ? 5 * 1024 * 1024 : 10 * 1024 * 1024
    if (!file.type.startsWith('image/')) { showToast('error', 'File harus berupa gambar.'); return }
    if (file.size > maxBytes) { showToast('error', `Maks ${type === 'logo' ? '5' : '10'}MB.`); return }
    setUpl(true)
    const fd = new FormData(); fd.append('image', file)
    try {
      const res = await api.post(`/mart/seller/upload-${type}`, fd)
      setProfile(p => ({ ...p, [`${type}_path`]: res.data[`${type}_path`] }))
      setPreview(URL.createObjectURL(file))
      showToast('success', `${type === 'logo' ? 'Logo' : 'Banner'} berhasil diupload.`)
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal upload.')
    } finally { setUpl(false) }
  }

  function showToast(type, msg) {
    setToast({ type, msg }); setTimeout(() => setToast(null), 3000)
  }

  const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const lbl = { fontSize: 12, fontWeight: 600, color: 'var(--k-muted)', marginBottom: 4, display: 'block' }

  if (loading) return (
    <MartSellerLayout title="Pengaturan Toko">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 24, height: 24, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </MartSellerLayout>
  )

  if (!profile) return (
    <MartSellerLayout title="Pengaturan Toko">
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--k-muted)' }}>
        <p style={{ fontSize: 32, marginBottom: 8 }}>⚠️</p>
        <p style={{ fontWeight: 600 }}>Profil toko tidak ditemukan.</p>
        <button onClick={load} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 10, border: 'none', background: '#6366F1', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Coba Lagi</button>
      </div>
    </MartSellerLayout>
  )

  const logoSrc   = prevLogo   || (profile.logo_path   ? `${STORAGE}/${profile.logo_path}`   : null)
  const bannerSrc = prevBanner || (profile.banner_path ? `${STORAGE}/${profile.banner_path}` : null)

  return (
    <MartSellerLayout title="Pengaturan Toko">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Status + Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 4 }}>Status Toko</div>
            <div style={{ fontWeight: 700, color: statusColor(profile.status), fontSize: 15 }}>
              {fmtStatus(profile.status)}
            </div>
          </div>
          {profile.status === 'active' && (
            <button onClick={toggleOpen} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: profile.is_open ? 'rgba(245,101,101,0.12)' : 'rgba(0,200,150,0.12)',
              color: profile.is_open ? '#F56565' : '#00C896',
            }}>
              {profile.is_open ? 'Tutup Toko' : 'Buka Toko'}
            </button>
          )}
        </div>

        {/* Banner */}
        <div style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--k-card)', border: '1px solid var(--k-border)' }}>
          <div
            style={{ position: 'relative', height: 120, background: '#1a1a2e', cursor: 'pointer' }}
            onClick={() => !uplBanner && bannerRef.current?.click()}
          >
            {bannerSrc
              ? <img src={bannerSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--k-muted)' }}>
                  <span style={{ fontSize: 28 }}>🖼️</span>
                  <p style={{ fontSize: 12, marginTop: 4 }}>Tap untuk upload Banner</p>
                </div>
            }
            <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.65)', borderRadius: 8, padding: '4px 10px', color: '#fff', fontSize: 11, fontWeight: 700 }}>
              {uplBanner ? '⏳ Uploading...' : '📷 Ubah Banner'}
            </div>
            <input ref={bannerRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files[0] && uploadImg(e.target.files[0], 'banner', setUplBanner, setPrevBanner)} />
          </div>

          {/* Logo overlapping banner */}
          <div style={{ padding: '0 16px 16px', marginTop: -32, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div
              style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', border: '3px solid var(--k-surface)', background: 'var(--k-input)', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => !uplLogo && logoRef.current?.click()}
            >
              {logoSrc
                ? <img src={logoSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 28 }}>🏪</div>
              }
            </div>
            <p style={{ fontSize: 12, color: 'var(--k-muted)', paddingBottom: 4 }}>
              {uplLogo ? '⏳ Uploading logo...' : 'Tap logo untuk ubah • Maks 5MB'}
            </p>
            <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files[0] && uploadImg(e.target.files[0], 'logo', setUplLogo, setPrevLogo)} />
          </div>
        </div>

        {/* Form */}
        <div style={{ background: 'var(--k-card)', borderRadius: 14, border: '1px solid var(--k-border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontWeight: 700, fontSize: 14 }}>Informasi Toko</p>

          {[
            { key: 'name',    label: 'Nama Toko *',  required: true },
            { key: 'phone',   label: 'No. HP Toko' },
            { key: 'address', label: 'Alamat Toko *', required: true },
          ].map(f => (
            <div key={f.key}>
              <label style={lbl}>{f.label}</label>
              <input value={form[f.key] || ''} required={f.required} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inp} />
            </div>
          ))}

          <div>
            <label style={lbl}>Deskripsi Toko</label>
            <textarea value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
              style={{ ...inp, resize: 'none' }} />
          </div>

          <div>
            <label style={lbl}>Lokasi Toko (untuk penghitungan ongkir)</label>
            <MerchantLocationPicker
              lat={form.lat} lng={form.lng}
              onPick={({ lat, lng, address }) => setForm(f => ({ ...f, lat, lng, address: address || f.address }))}
            />
          </div>

          <button onClick={save} disabled={saving} style={{
            padding: '13px', borderRadius: 12, border: 'none',
            background: saving ? 'var(--k-border)' : 'linear-gradient(135deg,#6366F1,#7C3AED)',
            color: '#fff', fontWeight: 800, fontSize: 14, cursor: saving ? 'default' : 'pointer',
          }}>
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>
    </MartSellerLayout>
  )
}
