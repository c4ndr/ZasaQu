import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

function fmtDate(d) { return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
function fmtRp(v)   { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

const STATUS_META = {
  pending:   { label: 'Pending',   color: '#F6AD55', bg: 'rgba(246,173,85,0.12)'  },
  active:    { label: 'Aktif',     color: '#00C896', bg: 'rgba(0,200,150,0.12)'   },
  suspended: { label: 'Suspended', color: '#F56565', bg: 'rgba(245,101,101,0.12)' },
}

const CAT_LABEL = { laundry: 'Laundry', pijat: 'Pijat', cleaning: 'Cleaning', tukang: 'Tukang', lainnya: 'Lainnya' }

const STATUS_TABS = [
  { key: 'pending',   label: 'Pending',   color: '#F6AD55' },
  { key: 'active',    label: 'Aktif',     color: '#00C896' },
  { key: 'suspended', label: 'Suspended', color: '#F56565' },
  { key: 'all',       label: 'Semua',     color: 'var(--k-sub)' },
]

const EMPTY_FORM = {
  name: '', category: 'laundry', address: '', phone: '',
  open_time: '08:00', close_time: '21:00',
  owner_name: '', owner_email: '', owner_password: '', owner_phone: '',
}

function CreateModal({ onClose, onCreated }) {
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      const res = await api.post('/admin/home/providers', form)
      onCreated(res.data.data); onClose()
    } catch (err) {
      setError(err.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(', ') : err.response?.data?.message || 'Gagal.')
    } finally { setLoading(false) }
  }

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', boxSizing: 'border-box', outline: 'none' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--k-card)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontWeight: 800, fontSize: 17 }}>Tambah Provider</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--k-muted)' }}>×</button>
        </div>
        {error && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(245,101,101,0.1)', color: '#F56565', fontSize: 13 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={{ fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 4 }}>Nama Provider *</label><input style={inp} required value={form.name} onChange={e => set('name', e.target.value)} /></div>
              <div><label style={{ fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 4 }}>Kategori *</label>
                <select style={inp} value={form.category} onChange={e => set('category', e.target.value)}>
                  {Object.entries(CAT_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div><label style={{ fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 4 }}>Alamat *</label><input style={inp} required value={form.address} onChange={e => set('address', e.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div><label style={{ fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 4 }}>Telepon</label><input style={inp} value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
              <div><label style={{ fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 4 }}>Jam Buka</label><input style={inp} type="time" value={form.open_time} onChange={e => set('open_time', e.target.value)} /></div>
              <div><label style={{ fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 4 }}>Jam Tutup</label><input style={inp} type="time" value={form.close_time} onChange={e => set('close_time', e.target.value)} /></div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--k-border)', margin: '4px 0' }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)' }}>AKUN PEMILIK</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={{ fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 4 }}>Nama *</label><input style={inp} required value={form.owner_name} onChange={e => set('owner_name', e.target.value)} /></div>
              <div><label style={{ fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 4 }}>Email *</label><input style={inp} type="email" required value={form.owner_email} onChange={e => set('owner_email', e.target.value)} /></div>
              <div><label style={{ fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 4 }}>Password *</label><input style={inp} type="password" required minLength={8} value={form.owner_password} onChange={e => set('owner_password', e.target.value)} /></div>
              <div><label style={{ fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 4 }}>Telepon</label><input style={inp} value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} /></div>
            </div>
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 12, border: 'none', cursor: loading ? 'default' : 'pointer', background: loading ? 'var(--k-border)' : 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700, fontSize: 14 }}>
            {loading ? 'Membuat...' : 'Buat Provider'}
          </button>
        </form>
      </div>
    </div>
  )
}

function ProviderDetail({ provider: p, stats, onApprove, onSuspend, onClose }) {
  const sm = STATUS_META[p.status] ?? { label: p.status, color: '#A0A0BC', bg: 'var(--k-input)' }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--k-card)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontWeight: 800, fontSize: 17 }}>{p.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--k-muted)' }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sm.bg, color: sm.color }}>{sm.label}</span>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--k-input)', color: 'var(--k-muted)' }}>{CAT_LABEL[p.category] ?? p.category}</span>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: p.is_open ? 'rgba(0,200,150,0.1)' : 'var(--k-input)', color: p.is_open ? '#00C896' : 'var(--k-muted)' }}>{p.is_open ? 'Buka' : 'Tutup'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[['Total Order', stats?.total_orders], ['Selesai', stats?.completed_orders], ['Pending', stats?.pending_orders], ['Revenue', fmtRp(stats?.total_revenue)]].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--k-input)', borderRadius: 12, padding: '12px 14px' }}>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 4 }}>{l}</p>
              <p style={{ fontWeight: 800, fontSize: 16 }}>{v ?? 0}</p>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: 'var(--k-muted)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p>📍 {p.address}</p>
          {p.phone && <p>📞 {p.phone}</p>}
          {p.open_time && <p>🕐 {p.open_time?.slice(0,5)} – {p.close_time?.slice(0,5)}</p>}
          <p>👤 {p.user?.name} ({p.user?.email})</p>
          <p style={{ color: 'var(--k-sub)', fontSize: 12 }}>Dibuat: {fmtDate(p.created_at)}</p>
        </div>
        {p.all_services?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-sub)', marginBottom: 8 }}>LAYANAN</p>
            {p.all_services.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--k-border)' }}>
                <p style={{ fontSize: 13 }}>{s.name} <span style={{ color: 'var(--k-muted)', fontSize: 11 }}>({s.unit})</span></p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#6366F1' }}>Rp {s.price.toLocaleString('id')}</p>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          {p.status !== 'active' && (
            <button onClick={onApprove} style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(0,200,150,0.12)', color: '#00C896', fontWeight: 700, fontSize: 13 }}>
              ✓ Setujui
            </button>
          )}
          {p.status !== 'suspended' && (
            <button onClick={onSuspend} style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(245,101,101,0.08)', color: '#F56565', fontWeight: 700, fontSize: 13 }}>
              Suspend
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminHomeProvidersPage() {
  const [providers,   setProviders]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('pending')
  const [search,      setSearch]      = useState('')
  const [showCreate,  setShowCreate]  = useState(false)
  const [selected,    setSelected]    = useState(null)
  const [selStats,    setSelStats]    = useState(null)
  const [toast,       setToast]       = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (tab !== 'all') params.set('status', tab)
    if (search) params.set('search', search)
    api.get('/admin/home/providers?' + params)
      .then(r => setProviders(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab, search])

  useEffect(() => { load() }, [load])

  async function openDetail(p) {
    setSelected(p); setSelStats(null)
    try {
      const r = await api.get(`/admin/home/providers/${p.id}`)
      setSelected(r.data.data); setSelStats(r.data.stats)
    } catch {}
  }

  async function handleApprove() {
    try {
      await api.post(`/admin/home/providers/${selected.id}/approve`)
      showToast('success', 'Provider disetujui.')
      setSelected(s => ({ ...s, status: 'active' }))
      load()
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal.') }
  }

  async function handleSuspend() {
    const reason = prompt('Alasan suspend:') ?? ''
    try {
      await api.post(`/admin/home/providers/${selected.id}/suspend`, { reason })
      showToast('success', 'Provider disuspend.')
      setSelected(s => ({ ...s, status: 'suspended', is_open: false }))
      load()
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal.') }
  }

  function showToast(type, msg) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }

  const sm = s => STATUS_META[s] ?? { label: s, color: '#A0A0BC', bg: 'var(--k-input)' }

  return (
    <AdminLayout title="ZasaHome — Provider">
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff' }}>{toast.msg}</div>}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={p => { setProviders(ps => [p, ...ps]); showToast('success', 'Provider dibuat.') }} />}
      {selected && <ProviderDetail provider={selected} stats={selStats} onApprove={handleApprove} onSuspend={handleSuspend} onClose={() => setSelected(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau alamat..."
          style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, width: 240, outline: 'none' }} />
        <button onClick={() => setShowCreate(true)} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
          + Tambah Provider
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: tab === t.key ? t.color : 'var(--k-card)', color: tab === t.key ? '#fff' : 'var(--k-sub)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Memuat...</p>
      ) : providers.length === 0 ? (
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Tidak ada provider.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--k-border)', textAlign: 'left' }}>
                {['Nama', 'Kategori', 'Status', 'Buka', 'Order', 'Rating', 'Dibuat', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', color: 'var(--k-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {providers.map(p => {
                const s = sm(p.status)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--k-border)' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>
                      <p>{p.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 2 }}>{p.user?.email}</p>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--k-muted)' }}>{CAT_LABEL[p.category] ?? p.category}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: p.is_open ? 'rgba(0,200,150,0.1)' : 'var(--k-input)', color: p.is_open ? '#00C896' : 'var(--k-muted)' }}>
                        {p.is_open ? 'Buka' : 'Tutup'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{p.orders_count ?? 0}</td>
                    <td style={{ padding: '12px' }}>{p.average_rating > 0 ? `⭐ ${p.average_rating.toFixed(1)}` : '—'}</td>
                    <td style={{ padding: '12px', color: 'var(--k-muted)', fontSize: 11 }}>{fmtDate(p.created_at)}</td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => openDetail(p)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(99,102,241,0.1)', color: '#6366F1', fontWeight: 700, fontSize: 12 }}>
                        Detail
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
