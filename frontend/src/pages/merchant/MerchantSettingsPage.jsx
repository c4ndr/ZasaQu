import { useState, useEffect } from 'react'
import MerchantLayout from '../../components/MerchantLayout'
import api, { storageUrl } from '../../services/api'

function fmtStatus(s) {
  return { pending: 'Menunggu Persetujuan', active: 'Aktif', suspended: 'Disuspend' }[s] ?? s
}
function statusColor(s) {
  return { pending: '#F6AD55', active: '#00C896', suspended: '#F56565' }[s] ?? '#A0A0BC'
}

export default function MerchantSettingsPage() {
  const [merchant,   setMerchant]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState(null)
  const [form,       setForm]       = useState({})
  const [previews,   setPreviews]   = useState({})   // objectURL preview lokal
  const [uploading,  setUploading]  = useState({})

  useEffect(() => {
    api.get('/food/merchant/profile')
      .then(r => {
        setMerchant(r.data.data)
        const m = r.data.data
        setForm({
          name:                  m.name || '',
          description:           m.description || '',
          category:              m.category || 'lainnya',
          address:               m.address || '',
          phone:                 m.phone || '',
          open_time:             m.open_time?.slice(0, 5) || '',
          close_time:            m.close_time?.slice(0, 5) || '',
          avg_prep_time_minutes: m.avg_prep_time_minutes || 15,
        })
      })
      .catch(() => setToast({ type: 'error', msg: 'Gagal memuat profil.' }))
      .finally(() => setLoading(false))
  }, [])

  function field(k) {
    return { value: form[k] ?? '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.patch('/food/merchant/profile', form)
      setMerchant(res.data.data)
      showToast('success', 'Profil berhasil disimpan.')
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal menyimpan.')
    } finally { setSaving(false) }
  }

  async function handleToggleOpen() {
    try {
      const res = await api.post('/food/merchant/toggle-open')
      setMerchant(m => ({ ...m, is_open: res.data.is_open }))
      showToast('success', res.data.message)
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal.')
    }
  }

  async function handleUpload(e, type) {
    const file = e.target.files?.[0]
    if (!file) return

    const maxBytes = type === 'logo' ? 5 * 1024 * 1024 : 10 * 1024 * 1024
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic|gif)$/i.test(file.name)
    if (!isImage) {
      showToast('error', 'File harus berupa gambar (JPG, PNG, WEBP).')
      e.target.value = ''
      return
    }
    if (file.size > maxBytes) {
      showToast('error', `Ukuran maksimal ${type === 'logo' ? '5' : '10'}MB.`)
      e.target.value = ''
      return
    }

    // Tampilkan preview lokal langsung (bypass cache)
    const localUrl = URL.createObjectURL(file)
    setPreviews(p => ({ ...p, [type]: localUrl }))
    setUploading(u => ({ ...u, [type]: true }))

    const fd = new FormData()
    fd.append('image', file)
    try {
      const res = await api.post(`/food/merchant/upload-${type}`, fd)
      // Simpan path baru + timestamp cache-buster
      setMerchant(m => ({ ...m, [`${type}_path`]: res.data[`${type}_path`], [`${type}_ts`]: Date.now() }))
      showToast('success', res.data.message)
    } catch (err) {
      // Batalkan preview lokal jika upload gagal
      setPreviews(p => ({ ...p, [type]: null }))
      showToast('error', err.response?.data?.message || 'Gagal upload.')
    } finally {
      setUploading(u => ({ ...u, [type]: false }))
      e.target.value = ''
    }
  }

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  const inp = {
    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
    border: '1.5px solid var(--k-border)', background: 'var(--k-input)',
    color: 'var(--k-text)', boxSizing: 'border-box',
  }
  const label = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--k-sub)', marginBottom: 6 }

  if (loading) return <MerchantLayout title="Pengaturan Toko"><p style={{ color: 'var(--k-sub)' }}>Memuat...</p></MerchantLayout>

  return (
    <MerchantLayout title="Pengaturan Toko">
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600,
          background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff',
        }}>{toast.msg}</div>
      )}

      <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Status badge */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderRadius: 14, background: 'var(--k-card)',
          border: '1.5px solid var(--k-border)',
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 4 }}>Status Toko</div>
            <div style={{ fontWeight: 700, color: statusColor(merchant?.status), fontSize: 15 }}>
              {fmtStatus(merchant?.status)}
            </div>
          </div>
          {merchant?.status === 'active' && (
            <button onClick={handleToggleOpen} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: merchant?.is_open ? 'rgba(245,101,101,0.12)' : 'rgba(0,200,150,0.12)',
              color: merchant?.is_open ? '#F56565' : '#00C896',
            }}>
              {merchant?.is_open ? 'Tutup Toko' : 'Buka Toko'}
            </button>
          )}
        </div>

        {/* Upload Logo & Banner */}
        <div style={{ padding: '20px', borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)' }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Foto Toko</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {['logo', 'banner'].map(type => {
              const path    = merchant?.[`${type}_path`]
              const ts      = merchant?.[`${type}_ts`] || ''
              // Preview lokal (objectURL) diutamakan, fallback ke storageUrl + cache-buster
              const imgSrc  = previews[type] || (path ? storageUrl(path) + `?t=${ts}` : null)
              const isUpl   = uploading[type]
              return (
                <label key={type} style={{ cursor: isUpl ? 'wait' : 'pointer', textAlign: 'center' }}>
                  <div style={{
                    width: type === 'logo' ? 88 : 176, height: 88,
                    borderRadius: type === 'logo' ? '50%' : 12,
                    background: 'var(--k-input)', border: `2px dashed ${isUpl ? '#F97316' : 'var(--k-border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', marginBottom: 6, position: 'relative',
                    transition: 'border-color 0.2s',
                  }}>
                    {imgSrc
                      ? <img src={imgSrc} alt={type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 28 }}>{type === 'logo' ? '🏪' : '🖼️'}</span>
                    }
                    {isUpl && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                      }}>⏳</div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: isUpl ? '#F97316' : 'var(--k-sub)', fontWeight: isUpl ? 700 : 400 }}>
                    {isUpl ? 'Mengupload...' : `${type === 'logo' ? 'Logo' : 'Banner'} (klik ganti)`}
                  </div>
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={isUpl}
                    onChange={e => handleUpload(e, type)} />
                </label>
              )
            })}
          </div>
        </div>

        {/* Form Profil */}
        <form onSubmit={handleSave} style={{
          padding: '24px', borderRadius: 14, background: 'var(--k-card)',
          border: '1.5px solid var(--k-border)', display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Informasi Toko</div>

          {[
            { k: 'name', label: 'Nama Toko', type: 'text', required: true },
            { k: 'address', label: 'Alamat', type: 'text', required: true },
            { k: 'phone', label: 'Nomor HP Toko', type: 'tel' },
          ].map(({ k, label: l, type, required }) => (
            <div key={k}>
              <label style={label}>{l}{required && ' *'}</label>
              <input type={type} style={inp} required={required} {...field(k)} />
            </div>
          ))}

          <div>
            <label style={label}>Kategori *</label>
            <select style={inp} value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {[['makanan_berat','Makanan Berat'],['minuman','Minuman'],['snack','Snack'],['lainnya','Lainnya']].map(([v,l]) =>
                <option key={v} value={v}>{l}</option>
              )}
            </select>
          </div>

          <div>
            <label style={label}>Deskripsi Toko</label>
            <textarea rows={3} style={{ ...inp, resize: 'vertical' }} {...field('description')} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Jam Buka</label>
              <input type="time" style={inp} {...field('open_time')} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Jam Tutup</label>
              <input type="time" style={inp} {...field('close_time')} />
            </div>
          </div>

          <div>
            <label style={label}>Estimasi Waktu Masak Default (menit)</label>
            <input type="number" min={1} max={180} style={inp}
              value={form.avg_prep_time_minutes || ''}
              onChange={e => setForm(f => ({ ...f, avg_prep_time_minutes: parseInt(e.target.value) || 15 }))} />
          </div>

          <button type="submit" disabled={saving} style={{
            padding: '12px', borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer',
            background: saving ? 'var(--k-border)' : '#F97316', color: '#fff',
            fontWeight: 700, fontSize: 14,
          }}>
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>
    </MerchantLayout>
  )
}
