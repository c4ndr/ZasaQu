import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

function fmtDate(d) { return d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-' }
function fmtRp(v)   { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

const STATUS_META = {
  pending:   { label: 'Pending',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  active:    { label: 'Aktif',     color: '#059669', bg: 'rgba(5,150,105,0.12)'   },
  suspended: { label: 'Suspended', color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
}

const CATEGORIES = {
  ac:         { label: 'Servis AC',    emoji: '❄️' },
  elektronik: { label: 'Elektronik',  emoji: '📺' },
  listrik:    { label: 'Listrik',     emoji: '⚡' },
  air:        { label: 'Pipa & Air',  emoji: '💧' },
  bangunan:   { label: 'Bangunan',    emoji: '🏗️' },
  jahit:      { label: 'Jahit/Permak', emoji: '🧵' },
  cctv:       { label: 'Pasang CCTV', emoji: '📹' },
  lainnya:    { label: 'Lainnya',     emoji: '🛠️' },
}

const SKILL_META = {
  pemula:        { label: 'Pemula',        color: '#94A3B8' },
  terlatih:      { label: 'Terlatih',      color: '#22C55E' },
  berpengalaman: { label: 'Berpengalaman', color: '#3B82F6' },
  profesional:   { label: 'Profesional',   color: '#8B5CF6' },
  master:        { label: 'Master',        color: '#F59E0B' },
}

const STATUS_TABS = [
  { key: 'pending',   label: 'Pending',   color: '#F59E0B' },
  { key: 'active',    label: 'Aktif',     color: '#059669' },
  { key: 'suspended', label: 'Suspended', color: '#EF4444' },
  { key: 'all',       label: 'Semua',     color: 'var(--k-muted)' },
]

const EMPTY_FORM = {
  name: '', category: 'ac', address: '', phone: '',
  open_time: '08:00', close_time: '21:00',
  owner_name: '', owner_email: '', owner_password: '', owner_phone: '',
}

// ── Modal Tambah Provider ─────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }) {
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      const res = await api.post('/admin/serv/providers', form)
      onCreated(res.data.data); onClose()
    } catch (err) {
      setError(err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(', ')
        : err.response?.data?.message || 'Gagal membuat provider.')
    } finally { setLoading(false) }
  }

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', boxSizing: 'border-box', outline: 'none' }
  const lbl = { fontSize: 11, color: 'var(--k-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--k-card)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontWeight: 800, fontSize: 17, margin: 0 }}>Tambah Provider ZasaServisis</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--k-muted)', lineHeight: 1 }}>×</button>
        </div>
        {error && (
          <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: 13 }}>{error}</div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={lbl}>Nama Provider *</label>
                <input style={inp} required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Servis AC Jaya" />
              </div>
              <div>
                <label style={lbl}>Kategori *</label>
                <select style={inp} value={form.category} onChange={e => set('category', e.target.value)}>
                  {Object.entries(CATEGORIES).map(([v, c]) => (
                    <option key={v} value={v}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={lbl}>Alamat *</label>
              <input style={inp} required value={form.address} onChange={e => set('address', e.target.value)} placeholder="Jl. Contoh No. 1, Kota" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={lbl}>Telepon</label>
                <input style={inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08xx" />
              </div>
              <div>
                <label style={lbl}>Jam Buka</label>
                <input style={inp} type="time" value={form.open_time} onChange={e => set('open_time', e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Jam Tutup</label>
                <input style={inp} type="time" value={form.close_time} onChange={e => set('close_time', e.target.value)} />
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--k-border)', margin: '4px 0' }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-muted)', margin: 0 }}>AKUN TEKNISI / PEMILIK</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={lbl}>Nama *</label>
                <input style={inp} required value={form.owner_name} onChange={e => set('owner_name', e.target.value)} placeholder="Ahmad Teknisi" />
              </div>
              <div>
                <label style={lbl}>Email *</label>
                <input style={inp} type="email" required value={form.owner_email} onChange={e => set('owner_email', e.target.value)} placeholder="email@contoh.com" />
              </div>
              <div>
                <label style={lbl}>Password * (min 8)</label>
                <input style={inp} type="password" required minLength={8} value={form.owner_password} onChange={e => set('owner_password', e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Telepon Pemilik</label>
                <input style={inp} value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} placeholder="08xx" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 20, padding: 13, borderRadius: 12, border: 'none', cursor: loading ? 'default' : 'pointer', background: loading ? 'var(--k-border)' : '#059669', color: '#fff', fontWeight: 700, fontSize: 14 }}>
            {loading ? 'Membuat...' : 'Buat Provider'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Detail Provider ───────────────────────────────────────────────────────────
function ProviderDetail({ provider: p, stats, onApprove, onSuspend, onClose }) {
  const sm   = STATUS_META[p.status] ?? { label: p.status, color: '#94A3B8', bg: 'var(--k-input)' }
  const cat  = CATEGORIES[p.category] ?? { label: p.category, emoji: '🔧' }
  const skill = SKILL_META[p.skill_level]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--k-card)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 18, margin: 0, marginBottom: 4 }}>{p.name}</h2>
            <p style={{ fontSize: 12, color: 'var(--k-muted)', margin: 0 }}>{cat.emoji} {cat.label}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--k-muted)', lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sm.bg, color: sm.color }}>{sm.label}</span>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: p.is_open ? 'rgba(5,150,105,0.1)' : 'var(--k-input)', color: p.is_open ? '#059669' : 'var(--k-muted)' }}>
            {p.is_open ? '● Buka' : '○ Tutup'}
          </span>
          {skill && (
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: `${skill.color}18`, color: skill.color, fontWeight: 600 }}>
              {skill.label}
            </span>
          )}
          {p.experience_years > 0 && (
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--k-input)', color: 'var(--k-muted)' }}>
              {p.experience_years} tahun
            </span>
          )}
          {p.average_rating > 0 && (
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', color: '#F59E0B', fontWeight: 700 }}>
              ⭐ {Number(p.average_rating).toFixed(1)} ({p.total_ratings ?? 0})
            </span>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            ['Total Order', stats?.total_orders ?? p.orders_count ?? 0],
            ['Selesai',     stats?.completed_orders ?? 0],
            ['Pending',     stats?.pending_orders ?? 0],
            ['Revenue',     fmtRp(stats?.total_revenue ?? 0)],
          ].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--k-input)', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 4 }}>{l}</p>
              <p style={{ fontWeight: 800, fontSize: 14 }}>{v}</p>
            </div>
          ))}
        </div>

        {/* Info */}
        <div style={{ fontSize: 13, color: 'var(--k-muted)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <p>📍 {p.address}</p>
          {p.phone && <p>📞 {p.phone}</p>}
          {p.open_time && <p>🕐 {p.open_time?.slice(0,5)} – {p.close_time?.slice(0,5)}</p>}
          <p>👤 {p.user?.name} ({p.user?.email})</p>
          {p.description && <p style={{ fontStyle: 'italic' }}>"{p.description}"</p>}
          <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 2 }}>Dibuat: {fmtDate(p.created_at)}</p>
        </div>

        {/* Spesialisasi */}
        {p.specializations?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Spesialisasi</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {p.specializations.map(s => (
                <span key={s} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(5,150,105,0.1)', color: '#059669', fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Sertifikat */}
        {p.certificates?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sertifikat</p>
            {p.certificates.map((c, i) => (
              <p key={i} style={{ fontSize: 12, color: 'var(--k-text)', marginBottom: 3 }}>🎖️ {c}</p>
            ))}
          </div>
        )}

        {/* Layanan */}
        {p.all_services?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Layanan ({p.all_services.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {p.all_services.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--k-border)' }}>
                  <div>
                    <p style={{ fontSize: 13, color: s.is_active ? 'var(--k-text)' : 'var(--k-muted)' }}>{s.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>per {s.unit} {!s.is_active && '· Nonaktif'}</p>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>Rp {Number(s.price).toLocaleString('id')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aksi */}
        <div style={{ display: 'flex', gap: 10 }}>
          {p.status !== 'active' && (
            <button onClick={onApprove} style={{ flex: 1, padding: 11, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(5,150,105,0.12)', color: '#059669', fontWeight: 700, fontSize: 13 }}>
              ✓ Setujui
            </button>
          )}
          {p.status !== 'suspended' && (
            <button onClick={onSuspend} style={{ flex: 1, padding: 11, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontWeight: 700, fontSize: 13 }}>
              Suspend
            </button>
          )}
          {p.status === 'suspended' && (
            <button onClick={onApprove} style={{ flex: 1, padding: 11, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(5,150,105,0.12)', color: '#059669', fontWeight: 700, fontSize: 13 }}>
              Aktifkan Kembali
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function AdminServProvidersPage() {
  const [providers,  setProviders]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState('pending')
  const [catFilter,  setCatFilter]  = useState('')
  const [search,     setSearch]     = useState('')
  const [page,       setPage]       = useState(1)
  const [lastPage,   setLastPage]   = useState(1)
  const [total,      setTotal]      = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [selected,   setSelected]   = useState(null)
  const [selStats,   setSelStats]   = useState(null)
  const [toast,      setToast]      = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (tab !== 'all') params.set('status', tab)
    if (catFilter) params.set('category', catFilter)
    if (search) params.set('search', search)
    params.set('page', page)
    api.get('/admin/serv/providers?' + params)
      .then(r => {
        setProviders(r.data.data ?? [])
        setLastPage(r.data.meta?.last_page ?? 1)
        setTotal(r.data.meta?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab, catFilter, search, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [tab, catFilter, search])

  async function openDetail(p) {
    setSelected(p); setSelStats(null)
    try {
      const r = await api.get(`/admin/serv/providers/${p.id}`)
      setSelected(r.data.data); setSelStats(r.data.stats)
    } catch {}
  }

  async function handleApprove() {
    try {
      await api.post(`/admin/serv/providers/${selected.id}/approve`)
      showToast('success', 'Provider disetujui.')
      setSelected(s => ({ ...s, status: 'active' }))
      load()
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal.') }
  }

  async function handleSuspend() {
    const reason = prompt('Alasan suspend:')
    if (reason === null) return
    try {
      await api.post(`/admin/serv/providers/${selected.id}/suspend`, { reason })
      showToast('success', 'Provider disuspend.')
      setSelected(s => ({ ...s, status: 'suspended', is_open: false }))
      load()
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal.') }
  }

  function showToast(type, msg) { setToast({ type, msg }); setTimeout(() => setToast(null), 3000) }
  const sm = s => STATUS_META[s] ?? { label: s, color: '#94A3B8', bg: 'var(--k-input)' }

  return (
    <AdminLayout title="ZasaServis — Provider">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: toast.type === 'success' ? '#059669' : '#EF4444', color: '#fff' }}>
          {toast.msg}
        </div>
      )}
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={p => { setProviders(ps => [p, ...ps]); setTotal(t => t + 1); showToast('success', 'Provider dibuat.') }} />
      )}
      {selected && (
        <ProviderDetail provider={selected} stats={selStats} onApprove={handleApprove} onSuspend={handleSuspend} onClose={() => setSelected(null)} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Provider ZasaServis</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--k-muted)' }}>
            Kelola teknisi: AC, elektronik, listrik, pipa, bangunan, jahit, dll · {total} total
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#059669', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          + Tambah Provider
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
            border: `1px solid ${tab === t.key ? t.color + '40' : 'var(--k-border)'}`,
            cursor: 'pointer', background: tab === t.key ? `${t.color}22` : 'var(--k-card)',
            color: tab === t.key ? t.color : 'var(--k-muted)',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, outline: 'none' }}>
          <option value="">Semua Kategori</option>
          {Object.entries(CATEGORIES).map(([v, c]) => (
            <option key={v} value={v}>{c.emoji} {c.label}</option>
          ))}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau alamat..."
          style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, width: 240, outline: 'none', marginLeft: 'auto' }} />
      </div>

      {/* List */}
      {loading ? (
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Memuat...</p>
      ) : providers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 40, marginBottom: 10 }}>🔧</p>
          <p style={{ color: 'var(--k-text)', fontWeight: 700, marginBottom: 4 }}>Tidak ada provider</p>
          <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Coba ubah filter atau tambahkan provider baru</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {providers.map(p => {
            const s   = sm(p.status)
            const cat = CATEGORIES[p.category] ?? { emoji: '🔧', label: p.category }
            const sk  = SKILL_META[p.skill_level]
            return (
              <div key={p.id}
                onClick={() => openDetail(p)}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#059669'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--k-border)'}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)', cursor: 'pointer', transition: 'border-color .15s' }}>

                <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                  {cat.emoji}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)', marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.user?.email} · {cat.label}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
                  <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--k-muted)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span style={{ padding: '2px 7px', borderRadius: 10, background: p.is_open ? 'rgba(5,150,105,0.1)' : 'var(--k-input)', color: p.is_open ? '#059669' : 'var(--k-muted)' }}>
                      {p.is_open ? 'Buka' : 'Tutup'}
                    </span>
                    {sk && <span style={{ padding: '2px 7px', borderRadius: 10, background: `${sk.color}18`, color: sk.color }}>{sk.label}</span>}
                    <span>{p.orders_count ?? 0} order</span>
                    {p.average_rating > 0 && <span>⭐ {Number(p.average_rating).toFixed(1)}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', cursor: page === 1 ? 'default' : 'pointer', color: page === 1 ? 'var(--k-muted)' : 'var(--k-text)', fontWeight: 600 }}>
            ‹ Prev
          </button>
          <span style={{ padding: '8px 14px', fontSize: 13, color: 'var(--k-muted)' }}>{page} / {lastPage}</span>
          <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage}
            style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', cursor: page === lastPage ? 'default' : 'pointer', color: page === lastPage ? 'var(--k-muted)' : 'var(--k-text)', fontWeight: 600 }}>
            Next ›
          </button>
        </div>
      )}
    </AdminLayout>
  )
}
