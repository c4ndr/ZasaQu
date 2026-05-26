import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

const fmtRp   = (v) => 'Rp ' + Number(v || 0).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
const STORAGE = import.meta.env.VITE_STORAGE_URL

const STATUS_META = {
  pending:   { label: 'Pending',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  active:    { label: 'Aktif',     color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  suspended: { label: 'Suspended', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
}

const EMPTY_CREATE = { name: '', email: '', phone: '', password: '', store_name: '', store_address: '', store_phone: '' }

export default function AdminMartSellersPage() {
  const [tab, setTab]       = useState('')
  const [sellers, setSellers] = useState([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail]     = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE)
  const [creating, setCreating]     = useState(false)
  const [acting, setActing]         = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/admin/mart/sellers', { params: { status: tab || undefined, search: search || undefined } })
      .then(r => setSellers(r.data.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [tab, search])

  useEffect(() => {
    if (!selected) { setDetail(null); return }
    api.get(`/admin/mart/sellers/${selected}`).then(r => setDetail(r.data))
  }, [selected])

  const approve = async (id) => {
    setActing(true)
    try { await api.post(`/admin/mart/sellers/${id}/approve`); load(); if (selected === id) { const r = await api.get(`/admin/mart/sellers/${id}`); setDetail(r.data) } } finally { setActing(false) }
  }

  const suspend = async (id) => {
    setActing(true)
    try { await api.post(`/admin/mart/sellers/${id}/suspend`); load(); if (selected === id) { const r = await api.get(`/admin/mart/sellers/${id}`); setDetail(r.data) } } finally { setActing(false) }
  }

  const create = async () => {
    setCreating(true)
    try { await api.post('/admin/mart/sellers', createForm); setShowCreate(false); setCreateForm(EMPTY_CREATE); load() }
    catch (e) { alert(e.response?.data?.message || 'Gagal') } finally { setCreating(false) }
  }

  return (
    <AdminLayout>
      <div style={{ padding: '0 0 80px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', overflowX: 'auto', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', scrollbarWidth: 'none' }}>
          {[{ v: '', l: 'Semua' }, { v: 'pending', l: 'Pending' }, { v: 'active', l: 'Aktif' }, { v: 'suspended', l: 'Suspended' }].map(t => (
            <button key={t.v} onClick={() => setTab(t.v)}
              style={{ padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.v ? 700 : 500, color: tab === t.v ? 'var(--k-accent)' : 'var(--k-muted)', borderBottom: tab === t.v ? '2px solid var(--k-accent)' : '2px solid transparent', whiteSpace: 'nowrap' }}>
              {t.l}
            </button>
          ))}
        </div>

        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama toko / email..."
              style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 13, outline: 'none' }} />
            <button onClick={() => setShowCreate(true)}
              style={{ padding: '10px 14px', borderRadius: 12, border: 'none', background: 'var(--k-accent)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              + Buat Seller
            </button>
          </div>

          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '3px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sellers.map(s => {
                const sm = STATUS_META[s.status]
                return (
                  <div key={s.id} onClick={() => setSelected(s.id === selected ? null : s.id)}
                    style={{ background: 'var(--k-card)', borderRadius: 12, border: `1px solid ${selected === s.id ? 'var(--k-accent)' : 'var(--k-border)'}`, padding: '12px 14px', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
                        {s.logo_path ? <img src={`${STORAGE}/${s.logo_path}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 22 }}>🏪</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{s.user?.email} · {fmtDate(s.created_at)}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: sm.bg, color: sm.color }}>{sm.label}</span>
                        <span style={{ fontSize: 10, color: 'var(--k-muted)' }}>{s.orders_count ?? 0} order</span>
                      </div>
                    </div>

                    {selected === s.id && detail && (
                      <div style={{ marginTop: 14, borderTop: '1px solid var(--k-border)', paddingTop: 14 }}>
                        {/* Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 12 }}>
                          {[
                            { label: 'Total Order', value: detail.stats?.total_orders },
                            { label: 'Selesai', value: detail.stats?.completed_orders },
                            { label: 'Produk Aktif', value: detail.stats?.total_products },
                            { label: 'Pendapatan', value: fmtRp(detail.stats?.total_revenue) },
                          ].map(s => (
                            <div key={s.label} style={{ background: 'var(--k-card2)', borderRadius: 8, padding: '8px 10px' }}>
                              <p style={{ fontSize: 10, color: 'var(--k-muted)', marginBottom: 2 }}>{s.label}</p>
                              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)' }}>{s.value ?? '—'}</p>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          {s.status === 'pending' && (
                            <button onClick={e => { e.stopPropagation(); approve(s.id) }} disabled={acting}
                              style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                              ✅ Setujui
                            </button>
                          )}
                          {s.status === 'active' && (
                            <button onClick={e => { e.stopPropagation(); suspend(s.id) }} disabled={acting}
                              style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                              🚫 Suspend
                            </button>
                          )}
                          {s.status === 'suspended' && (
                            <button onClick={e => { e.stopPropagation(); approve(s.id) }} disabled={acting}
                              style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                              ✅ Aktifkan
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <>
          <div onClick={() => setShowCreate(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9000 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(480px, 96vw)', maxHeight: '90vh', overflowY: 'auto', background: 'var(--k-surface)', borderRadius: 20, padding: '24px', zIndex: 9001 }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--k-text)', marginBottom: 16 }}>➕ Buat Seller Baru</p>
            {[
              { key: 'name', label: 'Nama Pemilik' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'phone', label: 'No. HP (opsional)' },
              { key: 'password', label: 'Password', type: 'password' },
              { key: 'store_name', label: 'Nama Toko' },
              { key: 'store_address', label: 'Alamat Toko' },
              { key: 'store_phone', label: 'No. HP Toko (opsional)' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--k-muted)', marginBottom: 4 }}>{f.label}</p>
                <input type={f.type || 'text'} value={createForm[f.key]} onChange={e => setCreateForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--k-text)' }}>Batal</button>
              <button onClick={create} disabled={creating || !createForm.name || !createForm.email || !createForm.store_name}
                style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: 'var(--k-accent)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: creating ? 0.7 : 1 }}>
                {creating ? 'Membuat...' : 'Buat Seller'}
              </button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
