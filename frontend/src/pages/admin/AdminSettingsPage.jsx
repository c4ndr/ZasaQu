import { useState, useEffect, useRef, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'
import useAppInfo from '../../hooks/useAppInfo'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'

function dataUrlToFile(dataUrl, filename) {
  const [header, b64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  return new File([bytes], filename, { type: mime })
}

const STORAGE_URL = (import.meta.env.VITE_API_URL || '') + '/storage'

const GROUPS = [
  { label: '🏷️ Identitas Aplikasi',  keys: ['app_name', 'app_tagline', 'maintenance_mode', 'app_logo_path'] },
  { label: '🚚 Tarif Ongkos Kirim',   keys: ['shipping_motor_base', 'shipping_motor_per_km', 'shipping_mobil_base', 'shipping_mobil_per_km'] },
  { label: '💰 Komisi & Diskon',      keys: ['commission_master_percent', 'commission_jastip_percent', 'discount_master_percent'] },
  { label: '⚡ JastipQu',             keys: ['corridor_default_meters', 'corridor_max_meters', 'max_jastip_motor', 'max_jastip_mobil'] },
  { label: '🍜 ZasaFood',             keys: ['food_commission_percent', 'food_commission_delivery_percent', 'food_auto_confirm_minutes', 'food_merchant_timeout_minutes', 'food_mitra_assign_radius_km'] },
  { label: '⚙️ Umum ZasaGo',          keys: ['wallet_minimum_mitra', 'auto_confirm_minutes', 'cod_confirm_timeout_minutes', 'insurance_max_value'] },
  { label: '📸 Penyimpanan Foto',     keys: ['photos_expire_days'] },
]

const ALL_GROUPED_KEYS = GROUPS.flatMap(g => g.keys)

function getSuffix(key) {
  if (key.includes('percent'))   return '%'
  if (key.includes('meters'))    return 'm'
  if (key.includes('minutes'))   return 'menit'
  if (key.includes('days'))      return 'hari'
  if (key.includes('_km'))       return 'km'
  if (key.includes('wallet_minimum') || key.includes('base') || key.includes('per_km') || key.includes('insurance')) return 'Rp'
  return ''
}

/* ─── BooleanRow ─────────────────────────────────────────── */
function BooleanRow({ setting, onToggle, saving, success }) {
  const boolVal = setting.value === '1' || setting.value === 'true'
  return (
    <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--k-border)' }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)', marginBottom: 2 }}>
          {setting.label}
          {success && <span style={{ marginLeft: 6, color: 'var(--k-accent)', fontSize: 12 }}>✓</span>}
        </p>
        {setting.description && <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{setting.description}</p>}
      </div>
      <button onClick={() => onToggle(setting)} disabled={saving} style={{
        width: 48, height: 26, borderRadius: 100, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: boolVal ? 'var(--k-accent)' : 'var(--k-border)',
        position: 'relative', transition: 'background 0.2s', opacity: saving ? 0.6 : 1,
      }}>
        <span style={{
          position: 'absolute', top: 4, left: boolVal ? 24 : 4,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', display: 'block',
        }} />
      </button>
    </div>
  )
}

/* ─── StringRow ──────────────────────────────────────────── */
function StringRow({ setting, editVal, isEditing, isSaving, isDone, onEdit, onSave, onCancel }) {
  return (
    <div style={{ padding: '14px 20px', borderTop: '1px solid var(--k-border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)', marginBottom: 2 }}>{setting.label}</p>
          {setting.description && <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 8 }}>{setting.description}</p>}
          {isEditing ? (
            <input
              autoFocus
              value={editVal}
              onChange={e => onEdit(setting.key, e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 10,
                background: 'var(--k-card2)', border: '1.5px solid var(--k-accent)',
                color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
            />
          ) : (
            <p style={{ fontSize: 13, color: isDone ? 'var(--k-accent)' : 'var(--k-sub)', fontStyle: setting.value ? 'normal' : 'italic' }}>
              {setting.value || '(kosong)'}{isDone ? ' ✓' : ''}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, paddingTop: 4 }}>
          {isEditing ? (
            <>
              <button onClick={() => onSave(setting)} disabled={isSaving}
                style={{ padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'var(--k-accent)', color: '#0C0C16', border: 'none', cursor: 'pointer', opacity: isSaving ? 0.5 : 1 }}>
                {isSaving ? '...' : 'Simpan'}
              </button>
              <button onClick={() => onCancel(setting.key)}
                style={{ padding: '6px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'var(--k-card2)', color: 'var(--k-muted)', border: '1px solid var(--k-border)', cursor: 'pointer' }}>
                Batal
              </button>
            </>
          ) : (
            <button onClick={() => onEdit(setting.key, setting.value)}
              style={{ padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'var(--k-card2)', color: 'var(--k-sub)', border: '1px solid var(--k-border)', cursor: 'pointer' }}>
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── NumericRow ─────────────────────────────────────────── */
function NumericRow({ setting, editVal, isEditing, isSaving, isDone, onEdit, onSave, onCancel }) {
  const suf = getSuffix(setting.key)
  const displayNum = () => {
    const n = Number(setting.value)
    return isNaN(n) ? setting.value : n.toLocaleString('id-ID')
  }
  return (
    <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--k-border)' }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)', marginBottom: 2 }}>{setting.label}</p>
        {setting.description && <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{setting.description}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {isEditing ? (
          <>
            <div style={{ position: 'relative' }}>
              <input autoFocus type="number" value={editVal}
                onChange={e => onEdit(setting.key, e.target.value)}
                step={setting.type === 'decimal' ? '0.1' : '1'} min="0"
                style={{ width: 110, padding: '6px 10px', paddingRight: suf ? 34 : 10,
                  background: 'var(--k-card2)', border: '1.5px solid var(--k-accent)',
                  color: 'var(--k-text)', borderRadius: 10, fontSize: 13, textAlign: 'right', outline: 'none' }} />
              {suf && <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--k-muted)', pointerEvents: 'none' }}>{suf}</span>}
            </div>
            <button onClick={() => onSave(setting)} disabled={isSaving}
              style={{ padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'var(--k-accent)', color: '#0C0C16', border: 'none', cursor: 'pointer', opacity: isSaving ? 0.5 : 1 }}>
              {isSaving ? '...' : 'Simpan'}
            </button>
            <button onClick={() => onCancel(setting.key)}
              style={{ padding: '6px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'var(--k-card2)', color: 'var(--k-muted)', border: '1px solid var(--k-border)', cursor: 'pointer' }}>
              Batal
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 14, fontWeight: 700, color: isDone ? 'var(--k-accent)' : 'var(--k-text)' }}>
              {displayNum()} {suf}{isDone ? ' ✓' : ''}
            </span>
            <button onClick={() => onEdit(setting.key, setting.value)}
              style={{ padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'var(--k-card2)', color: 'var(--k-sub)', border: '1px solid var(--k-border)', cursor: 'pointer' }}>
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── LogoSection ────────────────────────────────────────── */
function LogoSection({ logoPreview, logoDataUrl, logoUploading, onPickImage, onWebFileChange, webInputRef, onUpload, onPreviewClear }) {
  return (
    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--k-border)' }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)', marginBottom: 4 }}>Logo Aplikasi</p>
      <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 12 }}>Logo ditampilkan di topbar admin dan header aplikasi</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 14, overflow: 'hidden',
          background: 'var(--k-card2)', border: '1px solid var(--k-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {logoPreview
            ? <img src={logoPreview} alt="Logo"
                onError={() => onPreviewClear()}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <span style={{ fontSize: 28, color: 'var(--k-muted)' }}>🖼️</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Tombol Galeri: Capacitor Camera plugin (native) atau hidden input (web) */}
          <button onClick={onPickImage} style={{
            padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: 'var(--k-card2)', color: 'var(--k-sub)',
            border: '1px solid var(--k-border)', cursor: 'pointer',
          }}>
            📷 {logoPreview ? 'Ganti (Galeri)' : 'Galeri'}
          </button>
          {/* Tombol File Manager: overlay input agar tap langsung ke <input> */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div style={{
              padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: 'var(--k-card2)', color: 'var(--k-sub)',
              border: '1px solid var(--k-border)', userSelect: 'none',
            }}>
              📁 File Manager
            </div>
            <input type="file" accept="image/*" onChange={onWebFileChange}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
          </div>
          <input ref={webInputRef} type="file" accept="image/*"
            style={{ display: 'none' }} onChange={onWebFileChange} />
          {logoDataUrl && (
            <button onClick={onUpload} disabled={logoUploading} style={{
              padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: 'var(--k-accent)', color: '#0C0C16', border: 'none', cursor: 'pointer',
              opacity: logoUploading ? 0.6 : 1,
            }}>
              {logoUploading ? 'Mengupload...' : 'Upload Sekarang'}
            </button>
          )}
        </div>
        {logoDataUrl && (
          <p style={{ fontSize: 11, color: 'var(--k-accent)', flex: 1 }}>✓ Foto dipilih, tap Upload</p>
        )}
      </div>
    </div>
  )
}

/* ─── Halaman utama ──────────────────────────────────────── */
export default function AdminSettingsPage() {
  const [settings,      setSettings]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [editing,       setEditing]       = useState({})
  const [saving,        setSaving]        = useState(null)
  const [success,       setSuccess]       = useState(null)
  const [logoDataUrl,   setLogoDataUrl]   = useState(null)
  const [logoPreview,   setLogoPreview]   = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const timerRef    = useRef(null)
  const webInputRef = useRef(null)
  const { invalidate: invalidateAppInfo, updateLogo } = useAppInfo()

  useEffect(() => {
    api.get('/admin/settings').then(r => {
      setSettings(r.data)
      const lp = r.data.find(s => s.key === 'app_logo_path')
      if (lp?.value) setLogoPreview(`${STORAGE_URL}/${lp.value}`)
    }).finally(() => setLoading(false))
    return () => clearTimeout(timerRef.current)
  }, [])

  const handleEdit = useCallback((key, val) => {
    setEditing(prev => ({ ...prev, [key]: val }))
  }, [])

  const handleCancel = useCallback((key) => {
    setEditing(prev => { const n = { ...prev }; delete n[key]; return n })
  }, [])

  const handleSave = useCallback(async (setting) => {
    setSaving(setting.key)
    try {
      const val = editing[setting.key]
      await api.put(`/admin/settings/${setting.key}`, { value: val })
      setSettings(prev => prev.map(s => s.key === setting.key ? { ...s, value: val } : s))
      setEditing(prev => { const n = { ...prev }; delete n[setting.key]; return n })
      setSuccess(setting.key)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setSuccess(null), 2000)
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menyimpan.')
    } finally { setSaving(null) }
  }, [editing])

  const handleToggle = useCallback(async (setting) => {
    const next = (setting.value === '1' || setting.value === 'true') ? '0' : '1'
    setSaving(setting.key)
    try {
      await api.put(`/admin/settings/${setting.key}`, { value: next })
      setSettings(prev => prev.map(s => s.key === setting.key ? { ...s, value: next } : s))
      setSuccess(setting.key)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setSuccess(null), 2000)
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menyimpan.')
    } finally { setSaving(null) }
  }, [])

  // Proses URL (webPath atau blob URL) → resize → simpan sebagai data URL format asli
  const processImageFromUrl = useCallback((url) => new Promise((resolve) => {
    fetch(url).then(r => r.arrayBuffer()).then(buf => {
      // Deteksi format via magic bytes (lebih reliable dari Content-Type)
      const b    = new Uint8Array(buf, 0, 4)
      const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47
      const mime  = isPng ? 'image/png' : 'image/jpeg'
      const blob  = new Blob([buf], { type: mime })
      const objUrl = URL.createObjectURL(blob)
      const img    = new Image()
      img.onload = () => {
        URL.revokeObjectURL(objUrl)
        const ratio  = Math.min(800 / img.width, 800 / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * ratio)
        canvas.height = Math.round(img.height * ratio)
        const ctx = canvas.getContext('2d')
        if (isPng) ctx.clearRect(0, 0, canvas.width, canvas.height) // transparan
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL(mime, isPng ? undefined : 0.85)
        setLogoDataUrl(dataUrl)
        setLogoPreview(dataUrl)
        resolve()
      }
      img.onerror = () => resolve()
      img.src = objUrl
    }).catch(() => resolve())
  }), [])

  // File input (file manager/penyimpanan) → baca sebagai data URL
  const handleWebFileChange = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const objUrl = URL.createObjectURL(file)
    processImageFromUrl(objUrl)
  }, [processImageFromUrl])

  // Tombol "Pilih Logo" — native Android: Capacitor Camera (hasil DataUrl langsung disimpan)
  const handlePickImage = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const image = await Camera.getPhoto({
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Photos,
        })
        await processImageFromUrl(image.webPath)
      } catch (e) {
        if (!String(e).includes('cancelled') && !String(e).includes('cancel')) {
          alert('Gagal buka galeri: ' + e.message)
        }
      }
    } else {
      webInputRef.current?.click()
    }
  }, [processImageFromUrl])

  // Upload: kirim base64 sebagai JSON — axios sudah terbukti bekerja, hindari FormData
  const handleLogoUpload = useCallback(async () => {
    if (!logoDataUrl) return
    setLogoUploading(true)
    try {
      const mime = logoDataUrl.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg'
      const r = await api.post('/admin/settings/upload-logo-base64', { data: logoDataUrl, mime })
      const savedDataUrl = logoDataUrl  // simpan sebelum di-null-kan
      setLogoDataUrl(null)
      // Tetap tampilkan data URL (sudah ada di memory, tidak perlu load HTTP)
      // setLogoPreview sudah berisi dataUrl — biarkan saja
      setSettings(prev => prev.map(s => s.key === 'app_logo_path' ? r.data.data : s))
      // Update topbar & dashboard langsung pakai data URL (hindari HTTP image loading)
      updateLogo(savedDataUrl)
    } catch (err) {
      alert('Gagal upload: ' + (err.response?.data?.message || err.message || 'unknown'))
    } finally { setLogoUploading(false) }
  }, [logoDataUrl, updateLogo])

  const settingMap = Object.fromEntries(settings.map(s => [s.key, s]))
  const ungrouped  = settings.filter(s => !ALL_GROUPED_KEYS.includes(s.key))

  if (loading) return <AdminLayout><p style={{ color: 'var(--k-muted)', padding: 16 }}>Memuat pengaturan...</p></AdminLayout>

  const renderRow = (setting) => {
    if (setting.key === 'app_logo_path') return null
    const isEditing = setting.key in editing
    const isSaving  = saving === setting.key
    const isDone    = success === setting.key
    const editVal   = editing[setting.key] ?? setting.value

    if (setting.type === 'boolean') {
      return <BooleanRow key={setting.key} setting={setting}
        onToggle={handleToggle} saving={isSaving} success={isDone} />
    }
    if (setting.type === 'string') {
      return <StringRow key={setting.key} setting={setting}
        editVal={editVal} isEditing={isEditing} isSaving={isSaving} isDone={isDone}
        onEdit={handleEdit} onSave={handleSave} onCancel={handleCancel} />
    }
    return <NumericRow key={setting.key} setting={setting}
      editVal={editVal} isEditing={isEditing} isSaving={isSaving} isDone={isDone}
      onEdit={handleEdit} onSave={handleSave} onCancel={handleCancel} />
  }

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Pengaturan Platform</h2>
        <p style={{ fontSize: 13, color: 'var(--k-muted)', marginTop: 4 }}>Semua perubahan dicatat di log audit</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {GROUPS.map(group => {
          const rows    = group.keys.map(k => settingMap[k]).filter(Boolean)
          const isIdent = group.label.includes('Identitas')
          if (!rows.length && !isIdent) return null
          return (
            <div key={group.label} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--k-border)', background: 'var(--k-card2)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-sub)' }}>{group.label}</p>
              </div>
              {isIdent && (
                <>
                  <LogoSection
                    logoPreview={logoPreview}
                    logoDataUrl={logoDataUrl}
                    logoUploading={logoUploading}
                    onPickImage={handlePickImage}
                    onWebFileChange={handleWebFileChange}
                    webInputRef={webInputRef}
                    onUpload={handleLogoUpload}
                    onPreviewClear={() => setLogoPreview(null)}
                  />
                </>
              )}
              {rows.map(s => renderRow(s))}
            </div>
          )
        })}
        {ungrouped.length > 0 && (
          <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--k-border)', background: 'var(--k-card2)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-sub)' }}>⚙️ Lainnya</p>
            </div>
            {ungrouped.map(s => renderRow(s))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
