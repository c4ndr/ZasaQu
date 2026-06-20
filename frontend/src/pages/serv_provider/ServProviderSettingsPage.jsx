import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { storageUrl } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { isNative } from '../../utils/nativePlatform'
import { compressImage } from '../../utils/compressImage'

async function pickImageNative() {
  const photo = await Camera.getPhoto({ allowEditing: false, resultType: CameraResultType.DataUrl, source: CameraSource.Photos, quality: 75, width: 1200, height: 1200 })
  if (!photo.dataUrl) throw new Error('Tidak ada data foto')
  return compressImage(photo.dataUrl)
}

const SKILL_LEVELS = [
  { key: 'pemula',        label: 'Pemula',        desc: 'Baru belajar, < 1 tahun',         color: '#94A3B8', badge: '⭐' },
  { key: 'terlatih',      label: 'Terlatih',      desc: '1–3 tahun pengalaman',             color: '#22C55E', badge: '⭐⭐' },
  { key: 'berpengalaman', label: 'Berpengalaman', desc: '3–5 tahun, punya teknik sendiri',  color: '#3B82F6', badge: '⭐⭐⭐' },
  { key: 'profesional',   label: 'Profesional',   desc: '5–10 tahun, bersertifikat',        color: '#8B5CF6', badge: '⭐⭐⭐⭐' },
  { key: 'master',        label: 'Master',        desc: '10+ tahun, terlatih & diakui',     color: '#F59E0B', badge: '⭐⭐⭐⭐⭐' },
]

const CATEGORY_SKILLS = {
  ac:         ['Cuci AC', 'Isi Freon', 'Perbaikan Kompresor', 'Instalasi AC Baru', 'Service AC Central'],
  elektronik: ['TV', 'Kulkas', 'Mesin Cuci', 'Microwave', 'DVD/Receiver', 'Speaker', 'Laptop', 'HP'],
  listrik:    ['Instalasi Baru', 'Perbaikan Kabel', 'Stop Kontak', 'Saklar', 'MCB/Sekring', 'Lampu'],
  air:        ['Pipa Bocor', 'Pompa Air', 'Kran', 'Wastafel', 'WC Mampet', 'Tandon'],
  bangunan:   ['Pengecatan', 'Plamir', 'Keramik', 'Plafon', 'Partisi', 'Pintu & Jendela', 'Las'],
  jahit:      ['Jahit Baju', 'Jahit Celana', 'Permak Baju', 'Permak Celana', 'Ganti Ritsleting', 'Sulam', 'Bordir', 'Kebaya', 'Seragam'],
  lainnya:    [],
}

function fmtStatus(s) {
  return { pending: 'Menunggu Persetujuan', active: 'Aktif', suspended: 'Disuspend' }[s] ?? s
}
function statusColor(s) {
  return { pending: '#F59E0B', active: '#059669', suspended: '#EF4444' }[s] ?? '#94A3B8'
}

export default function ServProviderSettingsPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [provider,   setProvider]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState(null)
  const [form,       setForm]       = useState({})
  const [previews,   setPreviews]   = useState({})
  const [uploading,  setUploading]  = useState({})
  const [acct,       setAcct]       = useState({ name: '', email: '' })
  const [acctSaving, setAcctSaving] = useState(false)
  const [pwd,        setPwd]        = useState({ current_password: '', new_password: '', new_password_confirmation: '' })
  const [pwdSaving,  setPwdSaving]  = useState(false)

  useEffect(() => {
    api.get('/serv/provider/profile')
      .then(r => {
        const p = r.data.data
        setProvider(p)
        if (p.user) setAcct({ name: p.user.name || '', email: p.user.email || '' })
        setForm({
          name:             p.name || '',
          description:      p.description || '',
          address:          p.address || '',
          lat:              p.lat ? String(p.lat) : '',
          lng:              p.lng ? String(p.lng) : '',
          phone:            p.phone || '',
          open_time:        p.open_time?.slice(0, 5) || '',
          close_time:       p.close_time?.slice(0, 5) || '',
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
      const res = await api.patch('/serv/provider/profile', form)
      setProvider(res.data.data)
      showToast('success', 'Profil berhasil disimpan.')
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal menyimpan.')
    } finally { setSaving(false) }
  }

  async function handleToggleOpen() {
    try {
      const res = await api.post('/serv/provider/toggle-open')
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
      const res = await api.post(`/serv/provider/upload-${type}-base64`, { data: dataUrl, mime })
      setProvider(p => ({ ...p, [`${type}_path`]: res.data[`${type}_path`] }))
      showToast('success', `${type === 'logo' ? 'Logo' : 'Banner'} berhasil diupload.`)
    } catch (e) {
      const msg = String(e?.message || e || 'unknown')
      if (!/cancel(l?ed)?|no image|user denied/i.test(msg)) showToast('error', 'Gagal upload: ' + msg)
      setPreviews(p => ({ ...p, [type]: null }))
    } finally { setUploading(u => ({ ...u, [type]: false })) }
  }

  async function handleUploadWeb(e, type) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { showToast('error', 'File harus berupa gambar.'); e.target.value = ''; return }
    setUploading(u => ({ ...u, [type]: true }))
    try {
      const raw = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = ev => res(ev.target.result); r.onerror = rej; r.readAsDataURL(file)
      })
      const maxW = type === 'banner' ? 1600 : 800
      const { dataUrl, mime } = await compressImage(raw, { maxWidth: maxW, maxHeight: maxW })
      setPreviews(p => ({ ...p, [type]: dataUrl }))
      const res = await api.post(`/serv/provider/upload-${type}-base64`, { data: dataUrl, mime })
      setProvider(p => ({ ...p, [`${type}_path`]: res.data[`${type}_path`] }))
      showToast('success', `${type === 'logo' ? 'Logo' : 'Banner'} berhasil diupload.`)
    } catch (err) {
      setPreviews(p => ({ ...p, [type]: null }))
      showToast('error', err?.response?.data?.message || 'Gagal upload.')
    } finally { setUploading(u => ({ ...u, [type]: false })); e.target.value = '' }
  }

  async function handleSaveAcct(e) {
    e.preventDefault()
    if (!acct.name.trim() || !acct.email.trim()) { showToast('error', 'Nama dan email wajib diisi.'); return }
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

  function showToast(type, msg) { setToast({ type, msg }); setTimeout(() => setToast(null), 3500) }

  const inp = { width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', boxSizing: 'border-box', outline: 'none' }
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--k-muted)', marginBottom: 6 }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--k-muted)' }}>Memuat...</p>
    </div>
  )

  const skills = CATEGORY_SKILLS[provider?.category] ?? []

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 100 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: toast.type === 'success' ? '#059669' : '#EF4444', color: '#fff' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ padding: '52px 20px 20px', background: 'linear-gradient(135deg,#064e3b,#059669)' }}>
        <button onClick={() => navigate('/serv/provider')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', marginBottom: 12, padding: '6px 14px', borderRadius: 20 }}>
          ← Dashboard
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Pengaturan</h1>
      </div>

      <div style={{ padding: '16px', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Status + Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 4 }}>Status Usaha</div>
            <div style={{ fontWeight: 700, color: statusColor(provider?.status), fontSize: 15 }}>{fmtStatus(provider?.status)}</div>
          </div>
          {provider?.status === 'active' && (
            <button onClick={handleToggleOpen} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: provider?.is_open ? 'rgba(239,68,68,0.12)' : 'rgba(5,150,105,0.12)', color: provider?.is_open ? '#EF4444' : '#059669' }}>
              {provider?.is_open ? 'Tutup Usaha' : 'Buka Usaha'}
            </button>
          )}
        </div>

        {/* Nav ke kelola layanan */}
        <button onClick={() => navigate('/serv/provider/services')} style={{ width: '100%', textAlign: 'left', background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14, padding: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 700, color: 'var(--k-text)' }}>🔧 Kelola Layanan</p>
            <p style={{ fontSize: 12, color: 'var(--k-muted)', marginTop: 2 }}>Tambah, edit, dan nonaktifkan layanan</p>
          </div>
          <span style={{ color: 'var(--k-muted)', fontSize: 18 }}>›</span>
        </button>

        {/* Upload foto */}
        <div style={{ padding: 20, borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)' }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Foto Usaha</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {['logo', 'banner'].map(type => {
              const path   = provider?.[`${type}_path`]
              const ts     = provider?.[`${type}_ts`] || ''
              const imgSrc = previews[type] || (path ? storageUrl(path) + `?t=${ts}` : null)
              const isUpl  = uploading[type]
              const imgBox = (
                <div style={{ width: type === 'logo' ? 88 : 176, height: 88, borderRadius: type === 'logo' ? '50%' : 12, background: 'var(--k-input)', border: `2px dashed ${isUpl ? '#059669' : 'var(--k-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6, position: 'relative' }}>
                  {imgSrc ? <img src={imgSrc} alt={type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28 }}>{type === 'logo' ? '🔧' : '🖼️'}</span>}
                  {isUpl && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⏳</div>}
                </div>
              )
              const caption = <div style={{ fontSize: 11, color: isUpl ? '#059669' : 'var(--k-muted)', fontWeight: isUpl ? 700 : 400 }}>{isUpl ? 'Mengupload...' : `${type === 'logo' ? 'Logo' : 'Banner'} (klik ganti)`}</div>
              return isNative ? (
                <div key={type} onClick={() => !isUpl && handleUploadNative(type)} style={{ cursor: isUpl ? 'wait' : 'pointer', textAlign: 'center' }}>{imgBox}{caption}</div>
              ) : (
                <label key={type} style={{ cursor: isUpl ? 'wait' : 'pointer', textAlign: 'center' }}>
                  {imgBox}{caption}
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={isUpl} onChange={e => handleUploadWeb(e, type)} />
                </label>
              )
            })}
          </div>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 12 }}>Logo maks 5MB • Banner maks 10MB • JPG, PNG, WEBP</p>
        </div>

        {/* Form informasi */}
        <form onSubmit={handleSave} style={{ background: 'var(--k-card)', border: '1.5px solid var(--k-border)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Informasi Usaha</div>

          <div><label style={lbl}>Nama Usaha *</label><input style={inp} required {...field('name')} placeholder="Servis AC Jaya" /></div>
          <div><label style={lbl}>Alamat *</label><input style={inp} required {...field('address')} placeholder="Jl. Contoh No. 1, Kota" /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>Latitude (opsional)</label><input style={inp} type="number" step="any" {...field('lat')} placeholder="-6.200000" /></div>
            <div><label style={lbl}>Longitude (opsional)</label><input style={inp} type="number" step="any" {...field('lng')} placeholder="106.816666" /></div>
          </div>

          <div><label style={lbl}>Nomor Telepon</label><input style={inp} type="tel" {...field('phone')} placeholder="08xxxxxxxxxx" /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Jam Buka</label><input style={inp} type="time" {...field('open_time')} /></div>
            <div><label style={lbl}>Jam Tutup</label><input style={inp} type="time" {...field('close_time')} /></div>
          </div>

          <div><label style={lbl}>Deskripsi</label><textarea style={{ ...inp, resize: 'vertical' }} rows={3} placeholder="Ceritakan layanan Anda..." {...field('description')} /></div>

          {/* Spesialisasi berdasarkan kategori */}
          {skills.length > 0 && (
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--k-input)', border: '1px solid var(--k-border)' }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)', marginBottom: 4 }}>🏅 Spesialisasi</p>
              <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 12 }}>Pilih yang sesuai dengan keahlian Anda</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {skills.map(skill => {
                  const active = (form.specializations ?? []).includes(skill)
                  return (
                    <button key={skill} type="button"
                      onClick={() => setForm(f => {
                        const cur = f.specializations ?? []
                        return { ...f, specializations: cur.includes(skill) ? cur.filter(s => s !== skill) : [...cur, skill] }
                      })}
                      style={{ padding: '7px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: active ? 700 : 400, fontSize: 12, background: active ? '#059669' : 'var(--k-card)', color: active ? '#fff' : 'var(--k-muted)', border: active ? '1.5px solid #059669' : '1.5px solid var(--k-border)' }}>
                      {active ? '✓ ' : ''}{skill}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Level keahlian */}
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--k-input)', border: '1px solid var(--k-border)' }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)', marginBottom: 4 }}>🏅 Level Keahlian</p>
            <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 12 }}>Tingkat kemampuan Anda saat ini</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SKILL_LEVELS.map(lv => {
                const active = form.skill_level === lv.key
                return (
                  <button key={lv.key} type="button" onClick={() => setForm(f => ({ ...f, skill_level: lv.key }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', border: active ? `2px solid ${lv.color}` : '1.5px solid var(--k-border)', background: active ? `${lv.color}18` : 'var(--k-card)' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
              <input type="number" min="0" max="60" placeholder="0" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))}
                style={{ ...inp, width: 90, textAlign: 'center', fontSize: 20, fontWeight: 700 }} />
              <p style={{ fontSize: 14, color: 'var(--k-muted)' }}>tahun</p>
            </div>
          </div>

          {/* Sertifikat */}
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--k-input)', border: '1px solid var(--k-border)' }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)', marginBottom: 4 }}>🎖️ Sertifikat & Lisensi</p>
            <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 12 }}>Tambahkan sertifikat yang Anda miliki</p>
            {(form.certificates ?? []).map((cert, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="text" placeholder="Contoh: Sertifikat Teknisi AC BNSP" value={cert}
                  onChange={e => setForm(f => { const certs = [...(f.certificates ?? [])]; certs[i] = e.target.value; return { ...f, certificates: certs } })}
                  style={{ ...inp, flex: 1, marginBottom: 0 }} />
                <button type="button" onClick={() => setForm(f => ({ ...f, certificates: (f.certificates ?? []).filter((_, j) => j !== i) }))}
                  style={{ padding: '0 12px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            ))}
            {(form.certificates ?? []).length < 10 && (
              <button type="button" onClick={() => setForm(f => ({ ...f, certificates: [...(f.certificates ?? []), ''] }))}
                style={{ width: '100%', padding: 9, borderRadius: 10, border: '1.5px dashed rgba(5,150,105,0.4)', background: 'transparent', color: '#059669', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                + Tambah Sertifikat
              </button>
            )}
          </div>

          <button type="submit" disabled={saving} style={{ padding: 12, borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer', background: saving ? 'var(--k-border)' : '#059669', color: '#fff', fontWeight: 700, fontSize: 14 }}>
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>

          <button type="button" onClick={() => { if (confirm('Keluar dari akun?')) { logout(); navigate('/login') } }}
            style={{ padding: 12, borderRadius: 12, border: '1.5px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Keluar (Logout)
          </button>
        </form>

        {/* Akun login */}
        <form onSubmit={handleSaveAcct} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--k-card)', border: '1px solid var(--k-border)' }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)', marginBottom: 14 }}>👤 Akun Login</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={lbl}>Nama Lengkap</label><input style={inp} type="text" value={acct.name} onChange={e => setAcct(a => ({ ...a, name: e.target.value }))} placeholder="Nama tampilan Anda" /></div>
              <div><label style={lbl}>Email</label><input style={inp} type="email" value={acct.email} onChange={e => setAcct(a => ({ ...a, email: e.target.value }))} placeholder="email@contoh.com" /></div>
            </div>
          </div>
          <button type="submit" disabled={acctSaving} style={{ padding: 12, borderRadius: 12, border: 'none', cursor: acctSaving ? 'default' : 'pointer', background: acctSaving ? 'var(--k-border)' : 'linear-gradient(135deg,#0EA5E9,#059669)', color: '#fff', fontWeight: 700, fontSize: 14 }}>
            {acctSaving ? 'Menyimpan...' : 'Simpan Akun'}
          </button>
        </form>

        {/* Ganti password */}
        <form onSubmit={handleChangePwd} style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 40 }}>
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--k-card)', border: '1px solid var(--k-border)' }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)', marginBottom: 14 }}>🔒 Ganti Password</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={lbl}>Password Saat Ini</label><input style={inp} type="password" value={pwd.current_password} onChange={e => setPwd(p => ({ ...p, current_password: e.target.value }))} placeholder="••••••••" autoComplete="current-password" /></div>
              <div><label style={lbl}>Password Baru</label><input style={inp} type="password" value={pwd.new_password} onChange={e => setPwd(p => ({ ...p, new_password: e.target.value }))} placeholder="Minimal 6 karakter" autoComplete="new-password" /></div>
              <div><label style={lbl}>Konfirmasi Password Baru</label><input style={inp} type="password" value={pwd.new_password_confirmation} onChange={e => setPwd(p => ({ ...p, new_password_confirmation: e.target.value }))} placeholder="Ulangi password baru" autoComplete="new-password" /></div>
            </div>
          </div>
          <button type="submit" disabled={pwdSaving} style={{ padding: 12, borderRadius: 12, border: 'none', cursor: pwdSaving ? 'default' : 'pointer', background: pwdSaving ? 'var(--k-border)' : 'linear-gradient(135deg,#F59E0B,#EF4444)', color: '#fff', fontWeight: 700, fontSize: 14 }}>
            {pwdSaving ? 'Mengubah...' : 'Ubah Password'}
          </button>
        </form>
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'var(--k-card)', borderTop: '1px solid var(--k-border)', display: 'flex', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {[
          { icon: '📋', label: 'Dashboard', path: '/serv/provider' },
          { icon: '🔧', label: 'Layanan',   path: '/serv/provider/services' },
          { icon: '👤', label: 'Akun',      path: null },
        ].map(item => (
          <button key={item.label} onClick={() => item.path && navigate(item.path)}
            style={{ flex: 1, padding: '10px 4px 8px', border: 'none', cursor: 'pointer', background: 'transparent', color: !item.path ? '#059669' : 'var(--k-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: !item.path ? 700 : 400 }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
