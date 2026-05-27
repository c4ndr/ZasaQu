import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { storageUrl } from '../../services/api'
import MerchantLocationPicker from '../../components/MerchantLocationPicker'

function fmtStatus(s) {
  return { pending: 'Menunggu Persetujuan', active: 'Aktif', suspended: 'Disuspend' }[s] ?? s
}
function statusColor(s) {
  return { pending: '#F6AD55', active: '#00C896', suspended: '#F56565' }[s] ?? '#A0A0BC'
}

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
          name:        p.name || '',
          description: p.description || '',
          address:     p.address || '',
          lat:         p.lat ? String(p.lat) : '',
          lng:         p.lng ? String(p.lng) : '',
          phone:       p.phone || '',
          open_time:   p.open_time?.slice(0, 5) || '',
          close_time:  p.close_time?.slice(0, 5) || '',
        })
      })
      .catch(() => showToast('error', 'Gagal memuat profil.'))
      .finally(() => setLoading(false))
  }, [])

  function field(k) {
    return { value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) }
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await api.patch('/home/provider/profile', form)
      setProvider(res.data.data)
      showToast('success', 'Profil berhasil disimpan.')
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal menyimpan.')
    } finally { setSaving(false) }
  }

  async function handleToggleOpen() {
    try {
      const res = await api.post('/home/provider/toggle-open')
      setProvider(p => ({ ...p, is_open: res.data.is_open }))
      showToast('success', res.data.message)
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal.')
    }
  }

  async function handleUpload(e, type) {
    const file = e.target.files?.[0]
    if (!file) return

    const maxBytes = type === 'logo' ? 5 * 1024 * 1024 : 10 * 1024 * 1024
    const isImage  = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic|gif)$/i.test(file.name)
    if (!isImage) {
      showToast('error', 'File harus berupa gambar (JPG, PNG, WEBP).')
      e.target.value = ''; return
    }
    if (file.size > maxBytes) {
      showToast('error', `Ukuran maksimal ${type === 'logo' ? '5' : '10'}MB.`)
      e.target.value = ''; return
    }

    const localUrl = URL.createObjectURL(file)
    setPreviews(p => ({ ...p, [type]: localUrl }))
    setUploading(u => ({ ...u, [type]: true }))
    const fd = new FormData(); fd.append('image', file)
    try {
      const res = await api.post(`/home/provider/upload-${type}`, fd)
      setProvider(p => ({ ...p, [`${type}_path`]: res.data[`${type}_path`], [`${type}_ts`]: Date.now() }))
      showToast('success', `${type === 'logo' ? 'Logo' : 'Banner'} berhasil diupload.`)
    } catch (err) {
      setPreviews(p => ({ ...p, [type]: null }))
      showToast('error', err.response?.data?.message || 'Gagal upload.')
    } finally {
      setUploading(u => ({ ...u, [type]: false })); e.target.value = ''
    }
  }

  function showToast(type, msg) {
    setToast({ type, msg }); setTimeout(() => setToast(null), 3000)
  }

  const inp = {
    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
    border: '1.5px solid var(--k-border)', background: 'var(--k-input)',
    color: 'var(--k-text)', boxSizing: 'border-box', outline: 'none',
  }
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--k-sub)', marginBottom: 6 }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--k-muted)' }}>Memuat...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 40 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '52px 20px 20px', background: 'linear-gradient(160deg,#0F1E25 0%,var(--k-bg) 100%)' }}>
        <button onClick={() => navigate('/home/provider')} style={{ background: 'none', border: 'none', color: 'var(--k-muted)', fontSize: 14, cursor: 'pointer', marginBottom: 12, padding: 0 }}>
          ← Dashboard
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Pengaturan</h1>
      </div>

      <div style={{ padding: '0 16px', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Status + Toggle Buka/Tutup */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 4 }}>Status Usaha</div>
            <div style={{ fontWeight: 700, color: statusColor(provider?.status), fontSize: 15 }}>
              {fmtStatus(provider?.status)}
            </div>
          </div>
          {provider?.status === 'active' && (
            <button onClick={handleToggleOpen} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: provider?.is_open ? 'rgba(245,101,101,0.12)' : 'rgba(0,200,150,0.12)',
              color: provider?.is_open ? '#F56565' : '#00C896',
            }}>
              {provider?.is_open ? 'Tutup Usaha' : 'Buka Usaha'}
            </button>
          )}
        </div>

        {/* Navigasi ke Kelola Layanan */}
        <button onClick={() => navigate('/home/provider/services')} style={{ width: '100%', textAlign: 'left', background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14, padding: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 700, color: 'var(--k-text)' }}>🧺 Kelola Layanan</p>
            <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 2 }}>Tambah, edit, dan nonaktifkan layanan</p>
          </div>
          <span style={{ color: 'var(--k-muted)', fontSize: 18 }}>›</span>
        </button>

        {/* Upload Foto */}
        <div style={{ padding: '20px', borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)' }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Foto Usaha</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {['logo', 'banner'].map(type => {
              const path   = provider?.[`${type}_path`]
              const ts     = provider?.[`${type}_ts`] || ''
              const imgSrc = previews[type] || (path ? storageUrl(path) + `?t=${ts}` : null)
              const isUpl  = uploading[type]
              return (
                <label key={type} style={{ cursor: isUpl ? 'wait' : 'pointer', textAlign: 'center' }}>
                  <div style={{
                    width: type === 'logo' ? 88 : 176, height: 88,
                    borderRadius: type === 'logo' ? '50%' : 12,
                    background: 'var(--k-input)',
                    border: `2px dashed ${isUpl ? '#6366F1' : 'var(--k-border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', marginBottom: 6, position: 'relative',
                    transition: 'border-color 0.2s',
                  }}>
                    {imgSrc
                      ? <img src={imgSrc} alt={type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 28 }}>{type === 'logo' ? '🏠' : '🖼️'}</span>
                    }
                    {isUpl && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                        ⏳
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: isUpl ? '#6366F1' : 'var(--k-sub)', fontWeight: isUpl ? 700 : 400 }}>
                    {isUpl ? 'Mengupload...' : `${type === 'logo' ? 'Logo' : 'Banner'} (klik ganti)`}
                  </div>
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={isUpl}
                    onChange={e => handleUpload(e, type)} />
                </label>
              )
            })}
          </div>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 12 }}>
            Logo maks 5MB • Banner maks 10MB • JPG, PNG, WEBP
          </p>
        </div>

        {/* Form Informasi */}
        <form onSubmit={handleSave} style={{ background: 'var(--k-card)', border: '1.5px solid var(--k-border)', borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Informasi Usaha</div>

          <div>
            <label style={lbl}>Nama Usaha *</label>
            <input style={inp} required {...field('name')} placeholder="Laundry Bersih Jaya" />
          </div>

          <div>
            <label style={lbl}>Alamat *</label>
            <input style={inp} required {...field('address')} placeholder="Jl. Contoh No. 1, Kota" />
          </div>

          <div>
            <label style={lbl}>Lokasi di Map</label>
            <MerchantLocationPicker
              lat={form.lat} lng={form.lng}
              onPick={({ lat, lng, address }) => setForm(f => ({ ...f, lat, lng, address: f.address || address }))}
            />
          </div>

          <div>
            <label style={lbl}>Nomor Telepon</label>
            <input style={inp} type="tel" {...field('phone')} placeholder="08xxxxxxxxxx" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Jam Buka</label>
              <input style={inp} type="time" {...field('open_time')} />
            </div>
            <div>
              <label style={lbl}>Jam Tutup</label>
              <input style={inp} type="time" {...field('close_time')} />
            </div>
          </div>

          <div>
            <label style={lbl}>Deskripsi</label>
            <textarea style={{ ...inp, resize: 'vertical' }} rows={3}
              placeholder="Ceritakan layanan Anda..." {...field('description')} />
          </div>

          <button type="submit" disabled={saving} style={{
            padding: '12px', borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer',
            background: saving ? 'var(--k-border)' : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
            color: '#fff', fontWeight: 700, fontSize: 14,
          }}>
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>
    </div>
  )
}
