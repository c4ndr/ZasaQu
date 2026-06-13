import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const UNITS = [
  { value: 'item',  label: 'item (per buah)' },
  { value: 'jam',   label: 'jam (per jam)' },
  { value: 'sesi',  label: 'sesi (per sesi)' },
  { value: 'titik', label: 'titik (per titik/unit)' },
  { value: 'meter', label: 'meter (per meter)' },
]

const EMPTY = { name: '', description: '', unit: 'item', price: '', min_order: '1', estimated_hours: '2', is_active: true }

export default function ServProviderServicesPage() {
  const navigate = useNavigate()
  const [services, setServices] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState(EMPTY)
  const [editId,   setEditId]   = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState(null)

  useEffect(() => {
    api.get('/serv/provider/profile')
      .then(r => setServices(r.data.data?.all_services ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function openEdit(sv) {
    setForm({ name: sv.name, description: sv.description || '', unit: sv.unit, price: String(sv.price), min_order: String(sv.min_order), estimated_hours: String(sv.estimated_hours), is_active: sv.is_active })
    setEditId(sv.id)
    setShowForm(true)
  }

  function openNew() { setForm(EMPTY); setEditId(null); setShowForm(true) }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...form, price: parseInt(form.price), min_order: parseFloat(form.min_order), estimated_hours: parseInt(form.estimated_hours) }
      const res = editId
        ? await api.patch(`/serv/provider/services/${editId}`, payload)
        : await api.post('/serv/provider/services', payload)
      if (editId) {
        setServices(ss => ss.map(s => s.id === editId ? res.data.data : s))
      } else {
        setServices(ss => [...ss, res.data.data])
      }
      setShowForm(false)
      showToast('success', editId ? 'Layanan diperbarui.' : 'Layanan ditambahkan.')
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal menyimpan.')
    } finally { setSaving(false) }
  }

  async function toggleActive(sv) {
    try {
      const res = await api.patch(`/serv/provider/services/${sv.id}`, { is_active: !sv.is_active })
      setServices(ss => ss.map(s => s.id === sv.id ? res.data.data : s))
    } catch {}
  }

  async function handleDelete(sv) {
    if (!confirm(`Hapus layanan "${sv.name}"?`)) return
    try {
      await api.delete(`/serv/provider/services/${sv.id}`)
      setServices(ss => ss.filter(s => s.id !== sv.id))
      showToast('success', 'Layanan dihapus.')
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal menghapus.')
    }
  }

  function showToast(type, msg) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  const inp = { width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', boxSizing: 'border-box', outline: 'none' }
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--k-muted)', marginBottom: 6 }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: toast.type === 'success' ? '#059669' : '#EF4444', color: '#fff' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ padding: '52px 20px 20px', background: 'linear-gradient(135deg,#064e3b,#059669)' }}>
        <button onClick={() => navigate('/serv/provider')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', marginBottom: 12, padding: '6px 14px', borderRadius: 20 }}>
          ← Dashboard
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Kelola Layanan</h1>
          <button onClick={openNew} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
            + Tambah
          </button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          [1,2].map(i => <div key={i} style={{ height: 80, borderRadius: 14, background: 'var(--k-card)', marginBottom: 10 }} />)
        ) : services.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--k-muted)' }}>
            <p style={{ fontSize: 40, marginBottom: 10 }}>🔧</p>
            <p style={{ fontWeight: 600 }}>Belum ada layanan</p>
            <button onClick={openNew} style={{ marginTop: 14, padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#059669', color: '#fff', fontWeight: 700 }}>
              Tambah Layanan
            </button>
          </div>
        ) : services.map(sv => (
          <div key={sv.id} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 14, padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: sv.is_active ? 'var(--k-text)' : 'var(--k-muted)' }}>{sv.name}</p>
                {!sv.is_active && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'rgba(160,160,188,0.12)', color: 'var(--k-muted)' }}>Nonaktif</span>}
              </div>
              <p style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>Rp {Number(sv.price).toLocaleString('id')}/{sv.unit}</p>
              <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>Min {sv.min_order} {sv.unit} • ~{sv.estimated_hours} jam</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => toggleActive(sv)} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-muted)', fontSize: 10, cursor: 'pointer' }}>
                {sv.is_active ? 'Nonaktif' : 'Aktifkan'}
              </button>
              <button onClick={() => openEdit(sv)} style={{ padding: '6px 8px', borderRadius: 8, border: 'none', background: 'rgba(5,150,105,0.12)', color: '#059669', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>
                Edit
              </button>
              <button onClick={() => handleDelete(sv)} style={{ padding: '6px 8px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', background: 'var(--k-card)', borderRadius: '20px 20px 0 0', padding: '24px 20px', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 17, color: 'var(--k-text)' }}>{editId ? 'Edit Layanan' : 'Tambah Layanan'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--k-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Nama Layanan *</label>
                <input style={inp} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Servis AC 1/2 PK" />
              </div>
              <div>
                <label style={lbl}>Satuan *</label>
                <select style={inp} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                  {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Harga per {form.unit} (Rp) *</label>
                <input style={inp} type="number" required min={1000} step={1000} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="50000" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>Min. Order</label>
                  <input style={inp} type="number" min={0.1} step={0.1} value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Est. Selesai (jam)</label>
                  <input style={inp} type="number" min={0} step={0.5} value={form.estimated_hours} onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={lbl}>Deskripsi</label>
                <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Cuci filter, cek freon, bersihkan evaporator..." />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: form.is_active ? '#059669' : 'var(--k-border)', position: 'relative', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: form.is_active ? 22 : 2 }} />
                </button>
                <span style={{ fontSize: 13, color: 'var(--k-text)' }}>Layanan aktif</span>
              </div>
              <button type="submit" disabled={saving} style={{ padding: 13, borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer', background: saving ? 'var(--k-border)' : '#059669', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'var(--k-card)', borderTop: '1px solid var(--k-border)', display: 'flex', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {[
          { icon: '📋', label: 'Dashboard', path: '/serv/provider' },
          { icon: '🔧', label: 'Layanan',   path: null },
          { icon: '👤', label: 'Akun',      path: '/serv/provider/settings' },
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
