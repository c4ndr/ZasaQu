import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

const fmt = (n) => new Intl.NumberFormat('id-ID').format(n ?? 0)

const MODULES = [
  { key: 'zasago',    label: 'ZasaGo' },
  { key: 'zasafood',  label: 'ZasaFood' },
  { key: 'zasamart',  label: 'ZasaMart' },
  { key: 'zasaride',  label: 'ZasaRide' },
  { key: 'zasaserv',  label: 'ZasaServis' },
]

const DEFAULT_FORM = {
  code: '', title: '', discount_type: 'flat', discount_value: '',
  max_discount: '', min_order_amount: '', max_uses: '',
  expires_at: '', applicable_modules: [], is_active: true,
}

function StatusBadge({ voucher }) {
  const now = new Date()
  if (!voucher.is_active) return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: 'rgba(160,160,188,0.15)', color: '#A0A0BC' }}>Nonaktif</span>
  if (voucher.expires_at && new Date(voucher.expires_at) < now) return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>Kedaluwarsa</span>
  if (voucher.max_uses && voucher.used_count >= voucher.max_uses) return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>Habis</span>
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: 'rgba(0,200,150,0.1)', color: '#00C896' }}>Aktif</span>
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(DEFAULT_FORM)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [err,      setErr]      = useState('')

  const fetchVouchers = () => {
    setLoading(true)
    api.get('/admin/vouchers').then(r => setVouchers(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { fetchVouchers() }, [])

  const openNew = () => {
    setEditing(null); setForm(DEFAULT_FORM); setErr(''); setShowForm(true)
  }

  const openEdit = (v) => {
    setEditing(v)
    setForm({
      code:                v.code ?? '',
      title:               v.title ?? '',
      discount_type:       v.discount_type ?? 'flat',
      discount_value:      v.discount_value ?? '',
      max_discount:        v.max_discount ?? '',
      min_order_amount:    v.min_order_amount ?? '',
      max_uses:            v.max_uses ?? '',
      expires_at:          v.expires_at ? v.expires_at.slice(0, 16) : '',
      applicable_modules:  v.applicable_modules ?? [],
      is_active:           v.is_active ?? true,
    })
    setErr(''); setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.code.trim())            { setErr('Kode wajib diisi.'); return }
    if (!form.title.trim())           { setErr('Nama wajib diisi.'); return }
    if (!form.discount_value)         { setErr('Nilai diskon wajib diisi.'); return }
    setSaving(true); setErr('')
    try {
      const payload = {
        ...form,
        code:             form.code.toUpperCase().trim(),
        discount_value:   Number(form.discount_value),
        max_discount:     form.max_discount ? Number(form.max_discount) : null,
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
        max_uses:         form.max_uses ? Number(form.max_uses) : null,
        expires_at:       form.expires_at || null,
        applicable_modules: form.applicable_modules.length ? form.applicable_modules : null,
        is_active:        form.is_active ? 1 : 0,
      }
      if (editing) {
        await api.patch(`/admin/vouchers/${editing.id}`, payload)
      } else {
        await api.post('/admin/vouchers', payload)
      }
      setShowForm(false); fetchVouchers()
    } catch (e) {
      const msgs = e.response?.data?.errors
      setErr(msgs ? Object.values(msgs).flat().join(' ') : (e.response?.data?.message || 'Gagal menyimpan.'))
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus voucher ini?')) return
    setDeleting(id)
    try {
      await api.delete(`/admin/vouchers/${id}`)
      setVouchers(prev => prev.filter(v => v.id !== id))
    } catch { alert('Gagal menghapus.') }
    finally { setDeleting(null) }
  }

  const toggleModule = (key) => {
    setForm(f => ({
      ...f,
      applicable_modules: f.applicable_modules.includes(key)
        ? f.applicable_modules.filter(m => m !== key)
        : [...f.applicable_modules, key],
    }))
  }

  const inp = { width: '100%', padding: '10px 12px', borderRadius: 10, background: 'var(--k-card2)', border: '1.5px solid var(--k-border)', color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }

  return (
    <AdminLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>🎟 Voucher & Diskon</h2>
          <p style={{ fontSize: 13, color: 'var(--k-muted)', marginTop: 4 }}>Kelola kode promo diskon untuk semua modul ZasaQu</p>
        </div>
        <button onClick={openNew} style={{ padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, background: 'var(--k-accent)', color: '#0C0C16', border: 'none', cursor: 'pointer' }}>
          + Buat Voucher
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-muted)' }}>Memuat...</div>
      ) : vouchers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>🎟</p>
          <p style={{ color: 'var(--k-text)', fontWeight: 700, marginBottom: 6 }}>Belum ada voucher</p>
          <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Buat kode promo untuk diberikan ke pengguna</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {vouchers.map(v => (
            <div key={v.id} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>

              {/* Kode + Nama */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-accent)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{v.code}</span>
                  <StatusBadge voucher={v} />
                </div>
                <p style={{ fontSize: 13, color: 'var(--k-text)', marginBottom: 4 }}>{v.title}</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>
                    {v.discount_type === 'percent' ? `${v.discount_value}%` : `Rp ${fmt(v.discount_value)}`}
                    {v.max_discount ? ` (maks Rp ${fmt(v.max_discount)})` : ''}
                  </span>
                  {v.min_order_amount > 0 && <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>Min Rp {fmt(v.min_order_amount)}</span>}
                  <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>Dipakai: {v.used_count ?? 0}{v.max_uses ? `/${v.max_uses}` : ''}</span>
                  {v.expires_at && <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>Exp: {new Date(v.expires_at).toLocaleDateString('id-ID')}</span>}
                  {v.applicable_modules?.length > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>{v.applicable_modules.join(', ')}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => openEdit(v)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: 'var(--k-card2)', color: 'var(--k-sub)', border: '1px solid var(--k-border)', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleDelete(v.id)} disabled={deleting === v.id} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.08)', color: 'var(--k-danger)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', opacity: deleting === v.id ? 0.5 : 1 }}>
                  {deleting === v.id ? '...' : 'Hapus'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: 'var(--k-surface)', border: '1px solid var(--k-border)', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', padding: 28 }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--k-text)' }}>{editing ? 'Edit Voucher' : 'Buat Voucher'}</h3>
              <button onClick={() => setShowForm(false)} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--k-card2)', border: '1px solid var(--k-border)', color: 'var(--k-muted)', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Kode + Nama */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Kode Voucher *</label>
                  <input style={{ ...inp, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="PROMO10" />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={lbl}>Nama / Deskripsi *</label>
                  <input style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Diskon Ongkir 10%" />
                </div>
              </div>

              {/* Tipe + Nilai */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Tipe Diskon *</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}>
                    <option value="flat">Nominal (Rp)</option>
                    <option value="percent">Persentase (%)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>{form.discount_type === 'percent' ? 'Persen (%)' : 'Nominal (Rp)'} *</label>
                  <input style={inp} type="number" min="1" value={form.discount_value}
                    onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                    placeholder={form.discount_type === 'percent' ? '10' : '5000'} />
                </div>
                {form.discount_type === 'percent' && (
                  <div style={{ flex: 1 }}>
                    <label style={lbl}>Maks Diskon (Rp)</label>
                    <input style={inp} type="number" min="0" value={form.max_discount}
                      onChange={e => setForm(f => ({ ...f, max_discount: e.target.value }))} placeholder="50000" />
                  </div>
                )}
              </div>

              {/* Min order + Max uses */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Min. Order (Rp)</label>
                  <input style={inp} type="number" min="0" value={form.min_order_amount}
                    onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))} placeholder="20000" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Maks. Pemakaian</label>
                  <input style={inp} type="number" min="1" value={form.max_uses}
                    onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="100 (kosong = unlimited)" />
                </div>
              </div>

              {/* Kedaluwarsa */}
              <div>
                <label style={lbl}>Kedaluwarsa (opsional)</label>
                <input style={inp} type="datetime-local" value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
              </div>

              {/* Modul */}
              <div>
                <label style={lbl}>Berlaku untuk Modul (kosong = semua)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {MODULES.map(m => (
                    <button key={m.key} type="button" onClick={() => toggleModule(m.key)} style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1.5px solid ${form.applicable_modules.includes(m.key) ? 'var(--k-accent)' : 'var(--k-border)'}`,
                      background: form.applicable_modules.includes(m.key) ? 'rgba(0,200,150,0.08)' : 'var(--k-card2)',
                      color: form.applicable_modules.includes(m.key) ? 'var(--k-accent)' : 'var(--k-muted)',
                    }}>{m.label}</button>
                  ))}
                </div>
              </div>

              {/* Status aktif */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--k-card2)', borderRadius: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)' }}>Voucher aktif</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} style={{
                  width: 42, height: 24, borderRadius: 100, border: 'none', cursor: 'pointer',
                  background: form.is_active ? 'var(--k-accent)' : 'var(--k-border)', position: 'relative', transition: 'background 0.2s',
                }}>
                  <span style={{ position: 'absolute', top: 3, left: form.is_active ? 20 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                </button>
              </div>

              {err && <p style={{ fontSize: 12, color: '#EF4444' }}>{err}</p>}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: 'var(--k-card2)', color: 'var(--k-muted)', border: '1px solid var(--k-border)', cursor: 'pointer' }}>Batal</button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 700, background: 'var(--k-accent)', color: '#0C0C16', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Menyimpan...' : (editing ? 'Simpan Perubahan' : 'Buat Voucher')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
