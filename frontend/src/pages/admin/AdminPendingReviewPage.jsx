import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

function fmtDate(d) {
  return d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
}

// ── Config per modul ──────────────────────────────────────────────────────────
const MODULES = {
  food: {
    key: 'food', label: 'ZasaFood', emoji: '🍜', color: '#F97316',
    reviewPath: '/admin/food/review',
    fetch: (page) => api.get(`/admin/food/merchants?status=pending&page=${page}`),
    approve: (id) => api.post(`/admin/food/merchants/${id}/approve`),
    reject:  (id, reason) => api.post(`/admin/food/merchants/${id}/suspend`, { reason }),
    normalize: (m) => ({
      id: m.id, module: 'food',
      name: m.name,
      sub: m.category,
      address: m.address,
      ownerName: m.user?.name,
      ownerEmail: m.user?.email,
      phone: m.phone,
      extra: m.menu_items_count > 0 ? `${m.menu_items_count} menu` : null,
      created_at: m.created_at,
    }),
  },
  home: {
    key: 'home', label: 'ZasaHome', emoji: '🏠', color: '#8B5CF6',
    reviewPath: '/admin/home/review',
    fetch: (page) => api.get(`/admin/home/providers?status=pending&page=${page}`),
    approve: (id) => api.post(`/admin/home/providers/${id}/approve`),
    reject:  (id, reason) => api.post(`/admin/home/providers/${id}/suspend`, { reason }),
    normalize: (p) => ({
      id: p.id, module: 'home',
      name: p.name,
      sub: p.category,
      address: p.address,
      ownerName: p.user?.name,
      ownerEmail: p.user?.email,
      phone: p.phone,
      extra: p.skill_level ? `${p.skill_level}${p.experience_years ? ` · ${p.experience_years}th` : ''}` : null,
      created_at: p.created_at,
    }),
  },
  serv: {
    key: 'serv', label: 'ZasaServis', emoji: '🔧', color: '#059669',
    reviewPath: '/admin/serv/review',
    fetch: (page) => api.get(`/admin/serv/providers?status=pending&page=${page}`),
    approve: (id) => api.post(`/admin/serv/providers/${id}/approve`),
    reject:  (id, reason) => api.post(`/admin/serv/providers/${id}/suspend`, { reason }),
    normalize: (p) => ({
      id: p.id, module: 'serv',
      name: p.name,
      sub: p.category,
      address: p.address,
      ownerName: p.user?.name,
      ownerEmail: p.user?.email,
      phone: p.phone,
      extra: p.skill_level ? `${p.skill_level}${p.experience_years ? ` · ${p.experience_years}th` : ''}` : null,
      created_at: p.created_at,
    }),
  },
  mart: {
    key: 'mart', label: 'ZasaShop', emoji: '🛒', color: '#3B82F6',
    reviewPath: '/admin/mart/review',
    fetch: (page) => api.get(`/admin/mart/sellers?status=pending&page=${page}`),
    approve: (id) => api.post(`/admin/mart/sellers/${id}/approve`),
    reject:  (id, reason) => api.post(`/admin/mart/sellers/${id}/suspend`, { reason }),
    normalize: (s) => ({
      id: s.id, module: 'mart',
      name: s.name,
      sub: null,
      address: s.address,
      ownerName: s.user?.name,
      ownerEmail: s.user?.email,
      phone: s.phone,
      extra: null,
      created_at: s.created_at,
    }),
  },
  mitra: {
    key: 'mitra', label: 'Mitra Go', emoji: '🏍️', color: '#00C896',
    reviewPath: '/admin/mitra/review',
    fetch: (page) => api.get(`/admin/mitra/pending?page=${page}`),
    approve: (id) => api.post(`/admin/mitra/${id}/approve`),
    reject:  (id, reason) => api.post(`/admin/mitra/${id}/reject`, { reason }),
    normalize: (m) => ({
      id: m.id, module: 'mitra',
      name: m.name,
      sub: m.role === 'mitra_motor' ? 'Motor' : 'Mobil',
      address: null,
      ownerName: null,
      ownerEmail: m.email,
      phone: m.phone,
      extra: m.mitra_detail?.vehicle_plate ?? null,
      created_at: m.created_at,
    }),
  },
}

// ── Item card ─────────────────────────────────────────────────────────────────
function ItemCard({ item, onApprove, onReject }) {
  const [showReject, setShowReject] = useState(false)
  const [reason,     setReason]     = useState('')
  const [busy,       setBusy]       = useState(false)
  const mod = MODULES[item.module]

  async function handleApprove() {
    setBusy(true)
    await onApprove(item)
    setBusy(false)
  }

  async function handleReject() {
    if (!reason.trim()) return
    setBusy(true)
    await onReject(item, reason)
    setBusy(false)
    setShowReject(false)
  }

  return (
    <div style={{
      background: 'var(--k-card)', borderRadius: 14,
      border: `1.5px solid ${mod.color}28`,
      padding: '14px 16px',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{mod.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, background: `${mod.color}18`, color: mod.color, fontWeight: 700 }}>{mod.label}</span>
              {item.sub && <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>{item.sub}</span>}
              {item.extra && <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>· {item.extra}</span>}
            </div>
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--k-muted)', flexShrink: 0 }}>{fmtDate(item.created_at)}</span>
      </div>

      {/* Info row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 12, fontSize: 12, color: 'var(--k-muted)' }}>
        {item.ownerName  && <span>👤 {item.ownerName}</span>}
        {item.ownerEmail && <span>✉️ {item.ownerEmail}</span>}
        {item.phone      && <span>📞 {item.phone}</span>}
        {item.address    && <span style={{ flexBasis: '100%' }}>📍 {item.address}</span>}
      </div>

      {/* Reject form */}
      {showReject && (
        <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
            placeholder="Tuliskan alasan penolakan..."
            style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 12, resize: 'none', boxSizing: 'border-box', outline: 'none' }} />
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button onClick={() => { setShowReject(false); setReason('') }}
              style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              Batal
            </button>
            <button onClick={handleReject} disabled={busy || !reason.trim()}
              style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', background: reason.trim() ? '#EF4444' : 'var(--k-border)', color: reason.trim() ? '#fff' : 'var(--k-muted)', cursor: reason.trim() ? 'pointer' : 'default', fontSize: 12, fontWeight: 700 }}>
              {busy ? '...' : 'Konfirmasi Tolak'}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {!showReject && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowReject(true)} disabled={busy}
            style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1.5px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#EF4444', fontWeight: 700, fontSize: 12, cursor: busy ? 'default' : 'pointer' }}>
            ✕ Tolak
          </button>
          <button onClick={handleApprove} disabled={busy}
            style={{ flex: 2, padding: '8px', borderRadius: 10, border: 'none', background: busy ? 'var(--k-border)' : mod.color, color: busy ? 'var(--k-muted)' : '#fff', fontWeight: 700, fontSize: 12, cursor: busy ? 'default' : 'pointer' }}>
            {busy ? 'Memproses...' : '✓ Setujui'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
const TABS = ['semua', 'food', 'home', 'serv', 'mart', 'mitra']

export default function AdminPendingReviewPage() {
  const navigate = useNavigate()

  // items per modul: { food: [], home: [], ... }
  const [items,    setItems]    = useState({ food: [], home: [], serv: [], mart: [], mitra: [] })
  const [counts,   setCounts]   = useState({ food: 0, home: 0, serv: 0, mart: 0, mitra: 0 })
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('semua')
  const [toast,    setToast]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const results = await Promise.allSettled(
      Object.values(MODULES).map(m => m.fetch(1))
    )
    const keys = Object.keys(MODULES)
    const nextItems = {}
    const nextCounts = {}
    results.forEach((r, i) => {
      const key = keys[i]
      const mod = MODULES[key]
      if (r.status === 'fulfilled') {
        const data = r.value.data.data ?? []
        nextItems[key]  = data.map(mod.normalize)
        nextCounts[key] = r.value.data.meta?.total ?? data.length
      } else {
        nextItems[key]  = []
        nextCounts[key] = 0
      }
    })
    setItems(nextItems)
    setCounts(nextCounts)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function removeItem(module, id) {
    setItems(prev => ({ ...prev, [module]: prev[module].filter(i => i.id !== id) }))
    setCounts(prev => ({ ...prev, [module]: Math.max(0, prev[module] - 1) }))
  }

  async function handleApprove(item) {
    const mod = MODULES[item.module]
    try {
      await mod.approve(item.id)
      removeItem(item.module, item.id)
      showToast('success', `✓ ${item.name} disetujui.`)
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal menyetujui.') }
  }

  async function handleReject(item, reason) {
    const mod = MODULES[item.module]
    try {
      await mod.reject(item.id, reason)
      removeItem(item.module, item.id)
      showToast('info', `${item.name} ditolak.`)
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal menolak.') }
  }

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const total = Object.values(counts).reduce((s, n) => s + n, 0)

  const visibleItems = tab === 'semua'
    ? Object.values(items).flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : (items[tab] ?? [])

  const toastColor = { success: '#059669', error: '#EF4444', info: '#F59E0B' }

  return (
    <AdminLayout title="Semua Pending Review">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: toastColor[toast.type], color: '#fff', maxWidth: 320, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Semua Pending Review</h2>
          {total > 0 && (
            <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontWeight: 800, fontSize: 13, border: '1px solid rgba(239,68,68,0.3)' }}>
              {total} total
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--k-muted)' }}>
          Semua antrian persetujuan dari semua modul dalam satu tampilan
        </p>
      </div>

      {/* Stat cards per modul */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 28 }}>
        {Object.values(MODULES).map(m => {
          const n = counts[m.key]
          return (
            <button key={m.key} onClick={() => navigate(m.reviewPath)}
              style={{
                padding: '14px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'center',
                border: `1.5px solid ${n > 0 ? m.color + '40' : 'var(--k-border)'}`,
                background: n > 0 ? `${m.color}10` : 'var(--k-card)',
                transition: 'all 0.15s',
              }}
            >
              <p style={{ fontSize: 22, marginBottom: 6 }}>{m.emoji}</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: n > 0 ? m.color : 'var(--k-muted)', lineHeight: 1 }}>{n}</p>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 4, fontWeight: 600 }}>{m.label}</p>
            </button>
          )
        })}
      </div>
      <style>{`@media(max-width:800px){.pend-grid{grid-template-columns:repeat(3,1fr)!important}}`}</style>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const mod   = t === 'semua' ? null : MODULES[t]
          const count = t === 'semua' ? total : (counts[t] ?? 0)
          const active = tab === t
          return (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
                borderColor: active ? (mod?.color ?? '#EF4444') : 'var(--k-border)',
                background: active ? (mod ? `${mod.color}15` : 'rgba(239,68,68,0.1)') : 'var(--k-card)',
                color: active ? (mod?.color ?? '#EF4444') : 'var(--k-muted)',
                fontWeight: active ? 700 : 500, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {mod ? `${mod.emoji} ${mod.label}` : '📋 Semua'}
              {count > 0 && (
                <span style={{ fontSize: 11, fontWeight: 800, padding: '1px 6px', borderRadius: 10, background: active ? (mod?.color ?? '#EF4444') : 'var(--k-border)', color: active ? '#fff' : 'var(--k-muted)' }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 160, borderRadius: 14, background: 'var(--k-card)', border: '1px solid var(--k-border)', animation: 'pulse 1.5s infinite' }} />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
        </div>
      ) : visibleItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--k-card)', borderRadius: 20, border: '1px solid var(--k-border)' }}>
          <p style={{ fontSize: 52, marginBottom: 14 }}>🎉</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--k-text)', marginBottom: 6 }}>Semua beres!</p>
          <p style={{ fontSize: 13, color: 'var(--k-muted)' }}>
            {tab === 'semua' ? 'Tidak ada item yang menunggu review.' : `Tidak ada pending di ${MODULES[tab]?.label}.`}
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 12 }}>
            Menampilkan {visibleItems.length} item{counts[tab] > visibleItems.length ? ` dari ${counts[tab]} total` : ''} — halaman 1
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {visibleItems.map(item => (
              <ItemCard key={`${item.module}-${item.id}`} item={item} onApprove={handleApprove} onReject={handleReject} />
            ))}
          </div>
          {/* Link ke halaman review dedicated untuk load more */}
          {tab !== 'semua' && counts[tab] > visibleItems.length && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button onClick={() => navigate(MODULES[tab].reviewPath)}
                style={{ padding: '10px 24px', borderRadius: 12, border: '1.5px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                Lihat semua {counts[tab]} di halaman {MODULES[tab].label} →
              </button>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  )
}
