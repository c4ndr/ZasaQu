import { useState, useEffect, useRef } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState({})
  const [saving, setSaving] = useState(null)
  const [success, setSuccess] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    api.get('/admin/settings').then(r => setSettings(r.data)).finally(() => setLoading(false))
    return () => clearTimeout(timerRef.current)
  }, [])

  const handleEdit = (key, val) => setEditing({ ...editing, [key]: val })

  const handleSave = async (setting) => {
    setSaving(setting.key)
    try {
      await api.put(`/admin/settings/${setting.key}`, { value: editing[setting.key] })
      setSettings(prev => prev.map(s => s.key === setting.key ? { ...s, value: editing[setting.key] } : s))
      setEditing(prev => { const n = { ...prev }; delete n[setting.key]; return n })
      setSuccess(setting.key)
      timerRef.current = setTimeout(() => setSuccess(null), 2000)
    } catch (e) {
      alert(e.response?.data?.message || 'Gagal menyimpan.')
    } finally {
      setSaving(null)
    }
  }

  const displayValue = (setting) => {
    if (setting.key in editing) return editing[setting.key]
    return setting.value
  }

  const suffix = (key) => {
    if (key.includes('percent'))      return '%'
    if (key.includes('meters'))       return 'm'
    if (key.includes('minutes'))      return 'menit'
    if (key.includes('days'))         return 'hari'
    if (key.includes('wallet_minimum') || key.includes('base') || key.includes('per_km')) return 'Rp'
    return ''
  }

  const GROUPS = [
    { label: '🚚 Tarif Ongkos Kirim', keys: ['shipping_motor_base','shipping_motor_per_km','shipping_mobil_base','shipping_mobil_per_km'] },
    { label: '💰 Komisi & Diskon',     keys: ['commission_master_percent','commission_jastip_percent','discount_master_percent'] },
    { label: '⚡ JastipQu',            keys: ['corridor_default_meters','corridor_max_meters','max_jastip_motor','max_jastip_mobil'] },
    { label: '⚙️ Umum',                keys: ['wallet_minimum_mitra','auto_confirm_minutes','cod_confirm_timeout_minutes','insurance_max_value'] },
    { label: '📸 Penyimpanan Foto',    keys: ['photos_expire_days'] },
  ]

  const grouped = (keys) => settings.filter(s => keys.includes(s.key))
  const ungrouped = settings.filter(s => !GROUPS.flatMap(g => g.keys).includes(s.key))

  if (loading) return <AdminLayout><p style={{ color: 'var(--k-muted)', padding: 16 }}>Memuat...</p></AdminLayout>

  const SettingRow = ({ setting }) => {
    const isEditing = setting.key in editing
    const isSaving  = saving === setting.key
    const isDone    = success === setting.key

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
                <input type="number" value={displayValue(setting)}
                  onChange={e => handleEdit(setting.key, e.target.value)}
                  step={setting.type === 'decimal' ? '0.1' : '1'} min="0"
                  style={{ width: 110, padding: '6px 10px', paddingRight: suffix(setting.key) ? 30 : 10,
                    background: 'var(--k-card2)', border: '1.5px solid var(--k-accent)', color: 'var(--k-text)',
                    borderRadius: 10, fontSize: 13, textAlign: 'right', outline: 'none' }} />
                {suffix(setting.key) && (
                  <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--k-muted)', pointerEvents: 'none' }}>
                    {suffix(setting.key)}
                  </span>
                )}
              </div>
              <button onClick={() => handleSave(setting)} disabled={isSaving}
                style={{ padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  background: 'var(--k-accent)', color: '#0C0C16', border: 'none', cursor: 'pointer', opacity: isSaving ? 0.5 : 1 }}>
                {isSaving ? '...' : 'Simpan'}
              </button>
              <button onClick={() => setEditing(prev => { const n = { ...prev }; delete n[setting.key]; return n })}
                style={{ padding: '6px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  background: 'var(--k-card2)', color: 'var(--k-muted)', border: '1px solid var(--k-border)', cursor: 'pointer' }}>
                Batal
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 14, fontWeight: 700, color: isDone ? 'var(--k-accent)' : 'var(--k-text)' }}>
                {Number(setting.value).toLocaleString('id-ID')} {suffix(setting.key)}{isDone ? ' ✓' : ''}
              </span>
              <button onClick={() => handleEdit(setting.key, setting.value)}
                style={{ padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  background: 'var(--k-card2)', color: 'var(--k-sub)', border: '1px solid var(--k-border)', cursor: 'pointer' }}>
                Edit
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Pengaturan Platform</h2>
        <p style={{ fontSize: 13, color: 'var(--k-muted)', marginTop: 4 }}>Semua perubahan dicatat di log audit</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {GROUPS.map(group => {
          const rows = grouped(group.keys)
          if (!rows.length) return null
          return (
            <div key={group.label} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--k-border)', background: 'var(--k-card2)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-sub)' }}>{group.label}</p>
              </div>
              {rows.map(s => <SettingRow key={s.key} setting={s} />)}
            </div>
          )
        })}
        {ungrouped.length > 0 && (
          <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--k-border)', background: 'var(--k-card2)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-sub)' }}>⚙️ Lainnya</p>
            </div>
            {ungrouped.map(s => <SettingRow key={s.key} setting={s} />)}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
