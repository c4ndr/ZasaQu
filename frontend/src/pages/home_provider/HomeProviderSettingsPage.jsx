import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { storageUrl } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { getCategoryConfig } from '../../utils/homeServiceConfig'
import MerchantLocationPicker from '../../components/MerchantLocationPicker'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { isNative } from '../../utils/nativePlatform'
import { compressImage } from '../../utils/compressImage'

async function pickImageNative() {
  const photo = await Camera.getPhoto({ allowEditing: false, resultType: CameraResultType.DataUrl, source: CameraSource.Photos, quality: 75, width: 1200, height: 1200 })
  if (!photo.dataUrl) throw new Error('Tidak ada data foto')
  return compressImage(photo.dataUrl)
}

function fmtStatus(s) {
  return { pending: 'Menunggu Persetujuan', active: 'Aktif', suspended: 'Disuspend' }[s] ?? s
}
function statusColor(s) {
  return { pending: '#F6AD55', active: '#00C896', suspended: '#F56565' }[s] ?? '#A0A0BC'
}

export default function HomeProviderSettingsPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [provider,  setProvider]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState(null)
  const [form,      setForm]      = useState({})
  const [previews,  setPreviews]  = useState({})
  const [uploading, setUploading] = useState({})
  const [acct,      setAcct]      = useState({ name: '', email: '' })
  const [acctSaving, setAcctSaving] = useState(false)
  const [pwd,       setPwd]       = useState({ current_password: '', new_password: '', new_password_confirmation: '' })
  const [pwdSaving, setPwdSaving] = useState(false)

  useEffect(() => {
    api.get('/home/provider/profile')
      .then(r => {
        setProvider(r.data.data)
        const p = r.data.data
        // Isi form akun dari data user yang disertakan di response
        if (p.user) setAcct({ name: p.user.name || '', email: p.user.email || '' })
        setForm({
          name:          p.name || '',
          description:   p.description || '',
          address:       p.address || '',
          lat:           p.lat ? String(p.lat) : '',
          lng:           p.lng ? String(p.lng) : '',
          phone:         p.phone || '',
          open_time:     p.open_time?.slice(0, 5) || '',
          close_time:    p.close_time?.slice(0, 5) || '',
          offers_pickup:    p.offers_pickup ?? false,
          pickup_fee:       p.pickup_fee ?? '',
          specializations:  p.specializations ?? [],
          skill_level:      p.skill_level ?? '',
          experience_years: p.experience_years ?? '',
          certificates:     p.certificates ?? [],
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

  async function handleUploadNative(type) {
    setUploading(u => ({ ...u, [type]: true }))
    try {
      const { dataUrl, mime } = await pickImageNative()
      setPreviews(p => ({ ...p, [type]: dataUrl }))
      const res = await api.post(`/home/provider/upload-${type}-base64`, { data: dataUrl, mime })
      setProvider(p => ({ ...p, [`${type}_path`]: res.data[`${type}_path`] }))
      showToast('success', `${type === 'logo' ? 'Logo' : 'Banner'} berhasil diupload.`)
    } catch (e) {
      const msg = String(e?.message || e || 'unknown')
      if (!/cancel(l?ed)?|no image|user denied/i.test(msg)) showToast('error', 'Gagal upload: ' + msg)
      setPreviews(p => ({ ...p, [type]: null }))
    } finally { setUploading(u => ({ ...u, [type]: false })) }
  }

  async function handleUpload(e, type) {
    const file = e.target.files?.[0]
    if (!file) return
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic|gif)$/i.test(file.name)
    if (!isImage) { showToast('error', 'File harus berupa gambar.'); e.target.value = ''; return }
    setUploading(u => ({ ...u, [type]: true }))
    try {
      const raw = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = ev => res(ev.target.result); r.onerror = rej; r.readAsDataURL(file)
      })
      const maxW = type === 'banner' ? 1600 : 800
      const { dataUrl, mime } = await compressImage(raw, { maxWidth: maxW, maxHeight: maxW })
      setPreviews(p => ({ ...p, [type]: dataUrl }))
      const res = await api.post(`/home/provider/upload-${type}-base64`, { data: dataUrl, mime })
      setProvider(p => ({ ...p, [`${type}_path`]: res.data[`${type}_path`] }))
      showToast('success', `${type === 'logo' ? 'Logo' : 'Banner'} berhasil diupload.`)
    } catch (err) {
      setPreviews(p => ({ ...p, [type]: null }))
      showToast('error', err?.response?.data?.message || 'Gagal upload.')
    } finally { setUploading(u => ({ ...u, [type]: false })); e.target.value = '' }
  }

  function showToast(type, msg) {
    setToast({ type, msg }); setTimeout(() => setToast(null), 3500)
  }

  async function handleSaveAcct(e) {
    e.preventDefault()
    if (!acct.name.trim()) { showToast('error', 'Nama tidak boleh kosong.'); return }
    if (!acct.email.trim()) { showToast('error', 'Email tidak boleh kosong.'); return }
    setAcctSaving(true)
    try {
      await api.patch('/auth/profile', { name: acct.name, email: acct.email })
      showToast('success', 'Akun berhasil diperbarui.')
    } catch (err) {
      const errs = err.response?.data?.errors
      showToast('error', errs ? Object.values(errs).flat()[0] : (err.response?.data?.message || 'Gagal menyimpan.'))
    } finally { setAcctSaving(false) }
  }

  async function handleChangePwd(e) {
    e.preventDefault()
    if (pwd.new_password !== pwd.new_password_confirmation) { showToast('error', 'Konfirmasi password tidak cocok.'); return }
    if (pwd.new_password.length < 6) { showToast('error', 'Password minimal 6 karakter.'); return }
    setPwdSaving(true)
    try {
      await api.post('/auth/change-password', pwd)
      showToast('success', 'Password berhasil diubah.')
      setPwd({ current_password: '', new_password: '', new_password_confirmation: '' })
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal mengubah password.')
    } finally { setPwdSaving(false) }
  }

  const inp = {
    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
    border: '1.5px solid var(--k-border)', background: 'var(--k-input)',
    color: 'var(--k-text)', boxSizing: 'border-box', outline: 'none',
  }
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--k-sub)', marginBottom: 6 }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--k-muted)' }}>Memuat...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 40 }}>
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
              const imgBox = (
                <div style={{ width: type === 'logo' ? 88 : 176, height: 88, borderRadius: type === 'logo' ? '50%' : 12, background: 'var(--k-input)', border: `2px dashed ${isUpl ? '#6366F1' : 'var(--k-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6, position: 'relative', transition: 'border-color 0.2s' }}>
                  {imgSrc ? <img src={imgSrc} alt={type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28 }}>{type === 'logo' ? '🏠' : '🖼️'}</span>}
                  {isUpl && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⏳</div>}
                </div>
              )
              const caption = <div style={{ fontSize: 11, color: isUpl ? '#6366F1' : 'var(--k-sub)', fontWeight: isUpl ? 700 : 400 }}>{isUpl ? 'Mengupload...' : `${type === 'logo' ? 'Logo' : 'Banner'} (klik ganti)`}</div>
              return isNative ? (
                <div key={type} onClick={() => !isUpl && handleUploadNative(type)} style={{ cursor: isUpl ? 'wait' : 'pointer', textAlign: 'center' }}>{imgBox}{caption}</div>
              ) : (
                <label key={type} style={{ cursor: isUpl ? 'wait' : 'pointer', textAlign: 'center' }}>
                  {imgBox}{caption}
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={isUpl} onChange={e => handleUpload(e, type)} />
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

          {/* Layanan Antar Jemput */}
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--k-input)', border: '1px solid var(--k-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.offers_pickup ? 12 : 0 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)' }}>🚚 Layanan Antar Jemput</p>
                <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 2 }}>Tawarkan antar jemput ke pelanggan</p>
              </div>
              <button type="button" onClick={() => setForm(f => ({ ...f, offers_pickup: !f.offers_pickup }))}
                style={{
                  width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: form.offers_pickup ? '#6366F1' : 'var(--k-border)', position: 'relative', transition: 'background 0.2s',
                }}>
                <span style={{
                  position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', left: form.offers_pickup ? 25 : 3,
                }} />
              </button>
            </div>
            {form.offers_pickup && (
              <div>
                <label style={{ ...lbl, marginBottom: 6 }}>Biaya Antar Jemput (Rp)</label>
                <input
                  style={inp} type="number" min="0" step="1000"
                  value={form.pickup_fee}
                  onChange={e => setForm(f => ({ ...f, pickup_fee: e.target.value }))}
                  placeholder="0 = Gratis"
                />
              </div>
            )}
          </div>

          {/* Keahlian / Spesialisasi */}
          {(() => {
            const cfg = getCategoryConfig(provider?.category)
            if (!cfg.skills?.length) return null
            const selected = form.specializations ?? []
            const toggle = skill => setForm(f => {
              const cur = f.specializations ?? []
              return { ...f, specializations: cur.includes(skill) ? cur.filter(s => s !== skill) : [...cur, skill] }
            })
            return (
              <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--k-input)', border: '1px solid var(--k-border)' }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)', marginBottom: 4 }}>
                  {cfg.icon} Keahlian / Spesialisasi
                </p>
                <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 12 }}>
                  Pilih yang sesuai dengan layanan Anda
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {cfg.skills.map(skill => {
                    const active = selected.includes(skill)
                    return (
                      <button key={skill} type="button" onClick={() => toggle(skill)}
                        style={{
                          padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                          fontWeight: active ? 700 : 400, fontSize: 13,
                          background: active ? '#6366F1' : 'var(--k-card)',
                          color: active ? '#fff' : 'var(--k-sub)',
                          border: active ? '1.5px solid #6366F1' : '1.5px solid var(--k-border)',
                          transition: 'all 0.15s',
                        }}>
                        {active ? '✓ ' : ''}{skill}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Level Keahlian + Pengalaman + Sertifikat (on_site saja) */}
          {getCategoryConfig(provider?.category).flow === 'on_site' && (
            <>
              {/* Level keahlian */}
              <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--k-input)', border: '1px solid var(--k-border)' }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)', marginBottom: 4 }}>🏅 Level Keahlian</p>
                <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 12 }}>Tingkat kemampuan Anda saat ini</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { key: 'pemula',         label: 'Pemula',          desc: 'Baru belajar, < 1 tahun',          color: '#94A3B8', badge: '⭐' },
                    { key: 'terlatih',       label: 'Terlatih',        desc: '1–3 tahun pengalaman',             color: '#22C55E', badge: '⭐⭐' },
                    { key: 'berpengalaman',  label: 'Berpengalaman',   desc: '3–5 tahun, punya teknik sendiri',  color: '#3B82F6', badge: '⭐⭐⭐' },
                    { key: 'profesional',    label: 'Profesional',     desc: '5–10 tahun, bersertifikat',        color: '#8B5CF6', badge: '⭐⭐⭐⭐' },
                    { key: 'master',         label: 'Master',          desc: '10+ tahun, terlatih & diakui',     color: '#F59E0B', badge: '⭐⭐⭐⭐⭐' },
                  ].map(lv => {
                    const active = form.skill_level === lv.key
                    return (
                      <button key={lv.key} type="button" onClick={() => setForm(f => ({ ...f, skill_level: lv.key }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                          borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                          border: active ? `2px solid ${lv.color}` : '1.5px solid var(--k-border)',
                          background: active ? `${lv.color}15` : 'var(--k-card)',
                        }}>
                        <span style={{ fontSize: 18, minWidth: 60, textAlign: 'center' }}>{lv.badge}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: 14, color: active ? lv.color : 'var(--k-text)' }}>{lv.label}</p>
                          <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 1 }}>{lv.desc}</p>
                        </div>
                        {active && <span style={{ fontSize: 16, color: lv.color }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tahun pengalaman */}
              <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--k-input)', border: '1px solid var(--k-border)' }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)', marginBottom: 4 }}>📅 Tahun Pengalaman</p>
                <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 10 }}>Sudah berapa lama Anda di bidang ini?</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="number" min="0" max="60" placeholder="0"
                    value={form.experience_years}
                    onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))}
                    style={{ ...inp, width: 90, textAlign: 'center', fontSize: 20, fontWeight: 700 }}
                  />
                  <p style={{ fontSize: 14, color: 'var(--k-sub)' }}>tahun</p>
                </div>
              </div>

              {/* Sertifikat */}
              <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--k-input)', border: '1px solid var(--k-border)' }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)', marginBottom: 4 }}>🎖️ Sertifikat & Lisensi</p>
                <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 12 }}>
                  Tambahkan sertifikat yang Anda miliki (BNSP, kursus, pelatihan, dll.)
                </p>
                {(form.certificates ?? []).map((cert, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      type="text" placeholder={`Contoh: Sertifikat Pijat Tradisional BNSP`}
                      value={cert}
                      onChange={e => setForm(f => {
                        const certs = [...(f.certificates ?? [])]
                        certs[i] = e.target.value
                        return { ...f, certificates: certs }
                      })}
                      style={{ ...inp, flex: 1, marginBottom: 0 }}
                    />
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, certificates: (f.certificates ?? []).filter((_, j) => j !== i) }))}
                      style={{ padding: '0 12px', borderRadius: 10, border: '1px solid rgba(245,101,101,0.4)', background: 'rgba(245,101,101,0.08)', color: '#F56565', cursor: 'pointer', fontSize: 16 }}>
                      ✕
                    </button>
                  </div>
                ))}
                {(form.certificates ?? []).length < 10 && (
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, certificates: [...(f.certificates ?? []), ''] }))}
                    style={{ width: '100%', padding: '9px', borderRadius: 10, border: '1.5px dashed rgba(99,102,241,0.4)', background: 'transparent', color: '#6366F1', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    + Tambah Sertifikat
                  </button>
                )}
              </div>
            </>
          )}

          <button type="submit" disabled={saving} style={{
            padding: '12px', borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer',
            background: saving ? 'var(--k-border)' : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
            color: '#fff', fontWeight: 700, fontSize: 14,
          }}>
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>

          <button type="button" onClick={() => { if (confirm('Keluar dari akun?')) { logout(); navigate('/login') } }} style={{
            padding: '12px', borderRadius: 12, border: '1.5px solid rgba(245,101,101,0.4)',
            background: 'rgba(245,101,101,0.06)', color: '#F56565',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            Keluar (Logout)
          </button>
        </form>

        {/* ── Akun (nama & email) ── */}
        <form onSubmit={handleSaveAcct} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--k-card)', border: '1px solid var(--k-border)' }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)', marginBottom: 14 }}>👤 Akun Login</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>Nama Lengkap</label>
                <input style={inp} type="text" value={acct.name}
                  onChange={e => setAcct(a => ({ ...a, name: e.target.value }))}
                  placeholder="Nama tampilan Anda" />
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input style={inp} type="email" value={acct.email}
                  onChange={e => setAcct(a => ({ ...a, email: e.target.value }))}
                  placeholder="email@contoh.com" />
              </div>
            </div>
          </div>
          <button type="submit" disabled={acctSaving} style={{
            padding: '12px', borderRadius: 12, border: 'none', cursor: acctSaving ? 'default' : 'pointer',
            background: acctSaving ? 'var(--k-border)' : 'linear-gradient(135deg,#0EA5E9,#6366F1)',
            color: '#fff', fontWeight: 700, fontSize: 14,
          }}>
            {acctSaving ? 'Menyimpan...' : 'Simpan Akun'}
          </button>
        </form>

        {/* ── Ganti Password ── */}
        <form onSubmit={handleChangePwd} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16, paddingBottom: 40 }}>
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--k-card)', border: '1px solid var(--k-border)' }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)', marginBottom: 14 }}>🔒 Ganti Password</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>Password Saat Ini</label>
                <input style={inp} type="password" value={pwd.current_password}
                  onChange={e => setPwd(p => ({ ...p, current_password: e.target.value }))}
                  placeholder="••••••••" autoComplete="current-password" />
              </div>
              <div>
                <label style={lbl}>Password Baru</label>
                <input style={inp} type="password" value={pwd.new_password}
                  onChange={e => setPwd(p => ({ ...p, new_password: e.target.value }))}
                  placeholder="Minimal 6 karakter" autoComplete="new-password" />
              </div>
              <div>
                <label style={lbl}>Konfirmasi Password Baru</label>
                <input style={inp} type="password" value={pwd.new_password_confirmation}
                  onChange={e => setPwd(p => ({ ...p, new_password_confirmation: e.target.value }))}
                  placeholder="Ulangi password baru" autoComplete="new-password" />
              </div>
            </div>
          </div>
          <button type="submit" disabled={pwdSaving} style={{
            padding: '12px', borderRadius: 12, border: 'none', cursor: pwdSaving ? 'default' : 'pointer',
            background: pwdSaving ? 'var(--k-border)' : 'linear-gradient(135deg,#F59E0B,#EF4444)',
            color: '#fff', fontWeight: 700, fontSize: 14,
          }}>
            {pwdSaving ? 'Mengubah...' : 'Ubah Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
