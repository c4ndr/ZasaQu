import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import useAddresses from '../hooks/useAddresses'
import LocationSearch from '../components/LocationSearch'
import { getPosition } from '../utils/geo'

const LABELS = ['Rumah', 'Kantor', 'Lainnya']
const LABEL_COLOR = {
  Rumah:   { bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6' },
  Kantor:  { bg: 'rgba(16,185,129,0.12)',  color: '#10B981' },
  Lainnya: { bg: 'rgba(156,163,175,0.15)', color: '#9CA3AF' },
}
const LABEL_EMOJI = { Rumah: '🏠', Kantor: '🏢', Lainnya: '📌' }

const EMPTY_FORM = {
  label: 'Rumah',
  recipient_name: '',
  recipient_phone: '',
  address: '',
  lat: null,
  lng: null,
  notes: '',
  is_default: false,
}

function AddressForm({ initial, onSave, onCancel, saving }) {
  const [form,      setForm]      = useState(initial ?? EMPTY_FORM)
  const [err,       setErr]       = useState('')
  const [nearLat,   setNearLat]   = useState(initial?.lat ?? null)
  const [nearLng,   setNearLng]   = useState(initial?.lng ?? null)
  const [gpsLoading, setGpsLoading] = useState(false)

  // Ambil GPS diam-diam sebagai hint viewbox saat tambah baru
  useEffect(() => {
    if (initial?.lat) return
    getPosition()
      .then(({ lat, lng }) => { setNearLat(lat); setNearLng(lng) })
      .catch(() => {})
  }, []) // eslint-disable-line

  async function handleGPS() {
    setGpsLoading(true)
    try {
      const { lat, lng } = await getPosition()
      setNearLat(lat); setNearLng(lng)
      setForm(f => ({ ...f, lat, lng }))
    } catch {
      alert('Gagal mendapatkan lokasi GPS.')
    } finally { setGpsLoading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!form.recipient_name.trim()) { setErr('Nama penerima wajib diisi.'); return }
    if (!form.recipient_phone.trim()) { setErr('No. HP wajib diisi.'); return }
    if (!form.address.trim()) { setErr('Alamat lengkap wajib diisi.'); return }
    await onSave(form, setErr)
  }

  const inp = {
    width: '100%', padding: '11px 13px', borderRadius: 12,
    background: 'var(--k-card2)', border: '1px solid var(--k-border)',
    color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '18px' }}>
      {/* Label segmented */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Label</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {LABELS.map(l => (
            <button
              key={l} type="button"
              onClick={() => setForm(f => ({ ...f, label: l }))}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${form.label === l ? 'var(--k-primary)' : 'var(--k-border)'}`,
                background: form.label === l ? 'rgba(99,102,241,0.1)' : 'var(--k-card)',
                color: form.label === l ? 'var(--k-primary)' : 'var(--k-muted)',
                fontWeight: form.label === l ? 700 : 400, fontSize: 13,
              }}
            >
              {LABEL_EMOJI[l]} {l}
            </button>
          ))}
        </div>
      </div>

      {/* Nama penerima */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Nama Penerima</label>
        <input type="text" value={form.recipient_name}
          onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))}
          placeholder="Nama lengkap penerima" style={inp} />
      </div>

      {/* No HP */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>No. HP Penerima</label>
        <input type="tel" value={form.recipient_phone}
          onChange={e => setForm(f => ({ ...f, recipient_phone: e.target.value }))}
          placeholder="08xxxxxxxxxx" style={inp} />
      </div>

      {/* Alamat lengkap */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Alamat Lengkap</label>
          <button type="button" onClick={handleGPS} disabled={gpsLoading}
            style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: gpsLoading ? 0.6 : 1 }}>
            {gpsLoading ? 'Mendeteksi...' : '📍 Gunakan GPS'}
          </button>
        </div>
        <LocationSearch
          value={form.address}
          onChange={val => setForm(f => ({ ...f, address: val, lat: null, lng: null }))}
          onSelect={({ lat, lng, display }) => setForm(f => ({ ...f, address: display, lat, lng }))}
          nearLat={nearLat}
          nearLng={nearLng}
          placeholder="Ketik nama tempat, jalan, atau daerah..."
          confirmed={!!(form.lat && form.lng)}
        />
        {form.lat && form.lng && (
          <p style={{ fontSize: 10, color: 'var(--k-accent)', marginTop: 4 }}>
            📍 Koordinat tersimpan ({parseFloat(form.lat).toFixed(5)}, {parseFloat(form.lng).toFixed(5)})
          </p>
        )}
      </div>

      {/* Catatan */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Catatan Pengiriman (opsional)</label>
        <textarea value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="cth: Depan warung Bu Sri, pagar warna biru"
          rows={2} style={{ ...inp, resize: 'vertical' }} />
      </div>

      {/* Default toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <div
          onClick={() => setForm(f => ({ ...f, is_default: !f.is_default }))}
          style={{
            width: 44, height: 24, borderRadius: 12, cursor: 'pointer', flexShrink: 0,
            background: form.is_default ? 'var(--k-primary)' : 'var(--k-border)',
            position: 'relative', transition: 'background 0.2s',
          }}
        >
          <div style={{
            position: 'absolute', top: 2, left: form.is_default ? 22 : 2,
            width: 20, height: 20, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)', marginBottom: 1 }}>Jadikan alamat default</p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>Digunakan otomatis saat checkout</p>
        </div>
      </label>

      {err && <p style={{ color: 'var(--k-danger)', fontSize: 12 }}>⚠ {err}</p>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Batal
        </button>
        <button type="submit" disabled={saving}
          style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer', fontWeight: 700, fontSize: 13,
            background: saving ? 'var(--k-card2)' : 'var(--k-primary)', color: saving ? 'var(--k-muted)' : '#fff' }}>
          {saving ? 'Menyimpan...' : 'Simpan Alamat'}
        </button>
      </div>
    </form>
  )
}

export default function AddressesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromCheckout = searchParams.get('from') === 'checkout'

  const { addresses, loading, reload } = useAddresses()
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null) // null = tambah baru, obj = edit
  const [saving, setSaving] = useState(false)

  async function handleSave(form, setErr) {
    setSaving(true)
    try {
      if (editTarget) {
        await api.put(`/addresses/${editTarget.id}`, form)
      } else {
        await api.post('/addresses', form)
      }
      await reload()
      setShowForm(false)
      setEditTarget(null)
    } catch (e) {
      const errs = e.response?.data?.errors
      setErr(errs ? Object.values(errs).flat().join(' ') : (e.response?.data?.message ?? 'Gagal menyimpan.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(addr) {
    if (!window.confirm(`Hapus alamat "${addr.label}" (${addr.recipient_name})?`)) return
    try {
      await api.delete(`/addresses/${addr.id}`)
      await reload()
    } catch (e) {
      alert(e.response?.data?.message ?? 'Gagal menghapus alamat.')
    }
  }

  async function handleSetDefault(addr) {
    try {
      await api.post(`/addresses/${addr.id}/set-default`)
      await reload()
    } catch (e) {
      alert(e.response?.data?.message ?? 'Gagal mengatur default.')
    }
  }

  function openAdd() {
    setEditTarget(null)
    setShowForm(true)
  }

  function openEdit(addr) {
    setEditTarget(addr)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditTarget(null)
  }

  const card = {
    background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14,
    overflow: 'hidden', marginBottom: 12,
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', background: 'var(--k-surface)',
        borderBottom: '1px solid var(--k-border)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => navigate(fromCheckout ? -1 : '/profile')}
          style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: 'var(--k-text)' }}>←</button>
        <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--k-text)' }}>Alamat Saya</p>
        <button onClick={openAdd}
          style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 10, border: 'none', background: 'var(--k-primary)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          ➕ Tambah
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--k-muted)', fontSize: 14 }}>
            Memuat alamat...
          </div>
        )}

        {!loading && addresses.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--k-text)', marginBottom: 8 }}>Belum ada alamat tersimpan</p>
            <p style={{ fontSize: 13, color: 'var(--k-muted)', marginBottom: 24 }}>Tambahkan alamat pengiriman untuk memudahkan checkout</p>
            <button onClick={openAdd}
              style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'var(--k-primary)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              ➕ Tambah Alamat Pertama
            </button>
          </div>
        )}

        {/* Form tambah/edit di bottom sheet */}
        {showForm && (
          <div
            onClick={closeForm}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1000,
              display: 'flex', alignItems: 'flex-end',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 520, margin: '0 auto',
                background: 'var(--k-surface)',
                borderRadius: '20px 20px 0 0',
                maxHeight: '90dvh',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 18px', borderBottom: '1px solid var(--k-border)', flexShrink: 0,
              }}>
                <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--k-text)' }}>
                  {editTarget ? 'Edit Alamat' : 'Tambah Alamat Baru'}
                </p>
                <button onClick={closeForm}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--k-muted)' }}>✕</button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <AddressForm
                  initial={editTarget ? {
                    label: editTarget.label,
                    recipient_name: editTarget.recipient_name,
                    recipient_phone: editTarget.recipient_phone,
                    address: editTarget.address,
                    notes: editTarget.notes ?? '',
                    is_default: editTarget.is_default,
                  } : undefined}
                  onSave={handleSave}
                  onCancel={closeForm}
                  saving={saving}
                />
              </div>
            </div>
          </div>
        )}

        {/* Daftar alamat */}
        {addresses.map(addr => {
          const lc = LABEL_COLOR[addr.label] ?? LABEL_COLOR.Lainnya
          return (
            <div key={addr.id} style={card}>
              <div style={{ padding: '14px' }}>
                {/* Label + badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    background: lc.bg, color: lc.color,
                  }}>
                    {LABEL_EMOJI[addr.label] ?? '📌'} {addr.label}
                  </span>
                  {addr.is_default && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                      background: 'rgba(0,200,150,0.12)', color: 'var(--k-accent)',
                    }}>
                      ✓ Default
                    </span>
                  )}
                </div>

                {/* Nama & HP */}
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--k-text)', marginBottom: 4 }}>
                  {addr.recipient_name}
                  <span style={{ fontWeight: 400, color: 'var(--k-muted)', marginLeft: 8, fontSize: 13 }}>
                    {addr.recipient_phone}
                  </span>
                </p>

                {/* Alamat */}
                <p style={{ fontSize: 12, color: 'var(--k-sub)', lineHeight: 1.5, marginBottom: addr.notes ? 4 : 0 }}>
                  {addr.address}
                </p>
                {addr.notes && (
                  <p style={{ fontSize: 12, color: 'var(--k-muted)', fontStyle: 'italic' }}>
                    📝 {addr.notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex', gap: 0, borderTop: '1px solid var(--k-border)',
              }}>
                {!addr.is_default && (
                  <button onClick={() => handleSetDefault(addr)} style={{
                    flex: 1, padding: '10px 8px', background: 'none', border: 'none',
                    borderRight: '1px solid var(--k-border)', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, color: 'var(--k-primary)',
                  }}>
                    Jadikan Default
                  </button>
                )}
                <button onClick={() => openEdit(addr)} style={{
                  flex: 1, padding: '10px 8px', background: 'none', border: 'none',
                  borderRight: !addr.is_default ? '1px solid var(--k-border)' : '1px solid var(--k-border)',
                  cursor: 'pointer', fontSize: 13, color: 'var(--k-text)',
                }}>
                  ✏️ Edit
                </button>
                <button onClick={() => handleDelete(addr)} style={{
                  flex: addr.is_default ? 2 : 1, padding: '10px 8px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'var(--k-danger)',
                }}>
                  🗑️ Hapus
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
