import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { storageUrl } from '../../services/api'
import MerchantLocationPicker from '../../components/MerchantLocationPicker'

export default function HomeProviderSettingsPage() {
  const navigate = useNavigate()
  const [provider,  setProvider]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState(null)
  const [form,      setForm]      = useState({})
  const [previews,  setPreviews]  = useState({})
  const [uploading, setUploading] = useState({})

  useEffect(() => {
    api.get('/home/provider/profile')
      .then(r => {
        setProvider(r.data.data)
        const p = r.data.data
        setForm({
          name:       p.name || '',
          description:p.description || '',
          address:    p.address || '',
          lat:        p.lat ? String(p.lat) : '',
          lng:        p.lng ? String(p.lng) : '',
          phone:      p.phone || '',
          open_time:  p.open_time?.slice(0,5) || '',
          close_time: p.close_time?.slice(0,5) || '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await api.patch('/home/provider/profile', form)
      setProvider(res.data.data)
      showToast('success', 'Profil disimpan.')
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal.') }
    finally { setSaving(false) }
  }

  async function handleUpload(e, type) {
    const file = e.target.files?.[0]; if (!file) return
    const localUrl = URL.createObjectURL(file)
    setPreviews(p => ({ ...p, [type]: localUrl }))
    setUploading(u => ({ ...u, [type]: true }))
    const fd = new FormData(); fd.append('image', file)
    try {
      const res = await api.post(`/home/provider/upload-${type}`, fd)
      setProvider(p => ({ ...p, [`${type}_path`]: res.data[`${type}_path`], [`${type}_ts`]: Date.now() }))
      showToast('success', 'Foto diupload.')
    } catch { setPreviews(p => ({ ...p, [type]: null })); showToast('error', 'Gagal upload.') }
    finally { setUploading(u => ({ ...u, [type]: false })); e.target.value = '' }
  }

  function showToast(type, msg) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  const inp = { width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', boxSizing: 'border-box', outline: 'none' }
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--k-sub)', marginBottom: 6 }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--k-muted)' }}>Memuat...</p></div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff' }}>{toast.msg}</div>}

      <div style={{ padding: '52px 20px 20px', background: 'linear-gradient(160deg,#0F1E25 0%,var(--k-bg) 100%)' }}>
        <button onClick={() => navigate('/home/provider')} style={{ background: 'none', border: 'none', color: 'var(--k-muted)', fontSize: 14, cursor: 'pointer', marginBottom: 12, padding: 0 }}>← Dashboard</button>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Pengaturan</h1>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Menu navigasi */}
        <button onClick={() => navigate('/home/provider/services')} style={{ width: '100%', textAlign: 'left', background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14, padding: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 700, color: 'var(--k-text)' }}>🧺 Kelola Layanan</p>
            <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>Tambah atau edit daftar layanan</p>
          </div>
          <span style={{ color: 'var(--k-muted)' }}>›</span>
        </button>

        {/* Foto */}
        <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14, padding: 16 }}>
          <p style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Foto</p>
          <div style={{ display: 'flex', gap: 16 }}>
            {['logo','banner'].map(type => {
              const path = provider?.[`${type}_path`]; const ts = provider?.[`${type}_ts`] || ''; const imgSrc = previews[type] || (path ? storageUrl(path) + `?t=${ts}` : null); const isUpl = uploading[type]
              return (
                <label key={type} style={{ cursor: isUpl ? 'wait' : 'pointer', textAlign: 'center' }}>
                  <div style={{ width: type === 'logo' ? 72 : 144, height: 72, borderRadius: type === 'logo' ? '50%' : 10, background: 'var(--k-input)', border: `2px dashed ${isUpl ? '#6366F1' : 'var(--k-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 4, position: 'relative' }}>
                    {imgSrc ? <img src={imgSrc} alt={type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 24 }}>{type === 'logo' ? '🏠' : '🖼️'}</span>}
                    {isUpl && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏳</div>}
                  </div>
                  <p style={{ fontSize: 10, color: 'var(--k-muted)' }}>{type === 'logo' ? 'Logo' : 'Banner'}</p>
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={isUpl} onChange={e => handleUpload(e, type)} />
                </label>
              )
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 14 }}>Informasi</p>
          <div><label style={lbl}>Nama *</label><input style={inp} required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label style={lbl}>Alamat *</label><input style={inp} required value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
          <div><label style={lbl}>Lokasi di Map</label>
            <MerchantLocationPicker lat={form.lat} lng={form.lng}
              onPick={({ lat, lng, address }) => setForm(f => ({ ...f, lat, lng, address: f.address || address }))} />
          </div>
          <div><label style={lbl}>Telepon</label><input style={inp} type="tel" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>Jam Buka</label><input style={inp} type="time" value={form.open_time || ''} onChange={e => setForm(f => ({ ...f, open_time: e.target.value }))} /></div>
            <div><label style={lbl}>Jam Tutup</label><input style={inp} type="time" value={form.close_time || ''} onChange={e => setForm(f => ({ ...f, close_time: e.target.value }))} /></div>
          </div>
          <div><label style={lbl}>Deskripsi</label><textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <button type="submit" disabled={saving} style={{ padding: '12px', borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer', background: saving ? 'var(--k-border)' : 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700, fontSize: 14 }}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
      </div>
    </div>
  )
}
