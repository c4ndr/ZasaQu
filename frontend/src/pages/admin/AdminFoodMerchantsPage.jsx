import { useState, useEffect, useRef, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'
import useAdminAlert from '../../hooks/useAdminAlert'

function fmtDate(d) { return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
function fmtRp(v)   { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }

const STATUS_META = {
  pending:   { label: 'Pending',    color: '#F6AD55', bg: 'rgba(246,173,85,0.12)'  },
  active:    { label: 'Aktif',      color: '#00C896', bg: 'rgba(0,200,150,0.12)'   },
  suspended: { label: 'Suspended',  color: '#F56565', bg: 'rgba(245,101,101,0.12)' },
}

const CAT_LABEL = {
  makanan_berat: 'Makanan Berat', minuman: 'Minuman', snack: 'Snack', lainnya: 'Lainnya',
}

const STATUS_TABS = [
  { key: 'pending',   label: 'Pending',   color: '#F6AD55' },
  { key: 'active',    label: 'Aktif',     color: '#00C896' },
  { key: 'suspended', label: 'Suspended', color: '#F56565' },
  { key: 'all',       label: 'Semua',     color: 'var(--k-sub)' },
]

// ── Detail Drawer ─────────────────────────────────────────────────────────────
function MerchantDrawer({ merchant, onClose, onUpdated }) {
  const [loading, setLoading]   = useState(false)
  const [detail,  setDetail]    = useState(null)
  const [reason,  setReason]    = useState('')
  const [toast,   setToast]     = useState(null)

  useEffect(() => {
    setDetail(null)
    setReason('')
    setToast(null)
    api.get(`/admin/food/merchants/${merchant.id}`)
      .then(r => setDetail(r.data))
      .catch(() => setToast({ type: 'error', msg: 'Gagal memuat detail.' }))
  }, [merchant.id])

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleApprove() {
    setLoading(true)
    try {
      await api.post(`/admin/food/merchants/${merchant.id}/approve`)
      showToast('success', 'Merchant disetujui.')
      onUpdated(merchant.id, 'active')
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal.')
    } finally { setLoading(false) }
  }

  async function handleSuspend() {
    if (!confirm(`Suspend merchant "${merchant.name}"?`)) return
    setLoading(true)
    try {
      await api.post(`/admin/food/merchants/${merchant.id}/suspend`, { reason })
      showToast('success', 'Merchant disuspend.')
      onUpdated(merchant.id, 'suspended')
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal.')
    } finally { setLoading(false) }
  }

  const m = detail?.data ?? merchant
  const s = detail?.stats

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', justifyContent: 'flex-end',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: 440, background: 'var(--k-card)', height: '100%',
        overflowY: 'auto', padding: '28px',
      }}>
        {toast && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 10, marginBottom: 16,
            padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff',
          }}>{toast.msg}</div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
            background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
          }}>
            {m?.logo_path ? <img src={`/storage/${m.logo_path}`} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏪'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{m?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--k-sub)' }}>{m?.user?.name} · {m?.user?.email}</div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                color: STATUS_META[m?.status]?.color, background: STATUS_META[m?.status]?.bg,
              }}>{STATUS_META[m?.status]?.label}</span>
              <span style={{
                padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                color: m?.is_open ? '#00C896' : 'var(--k-sub)',
                background: m?.is_open ? 'rgba(0,200,150,0.1)' : 'var(--k-input)',
              }}>{m?.is_open ? 'Buka' : 'Tutup'}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--k-sub)', fontSize: 20 }}>×</button>
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {[
            ['Alamat', m?.address],
            ['Kategori', CAT_LABEL[m?.category] ?? m?.category],
            ['Telepon', m?.user?.phone || m?.phone || '—'],
            ['Jam Operasional', m?.open_time && m?.close_time ? `${m.open_time.slice(0,5)} – ${m.close_time.slice(0,5)}` : '—'],
            ['Est. Waktu Masak', m?.avg_prep_time_minutes ? `${m.avg_prep_time_minutes} menit` : '—'],
            ['Terdaftar', m?.created_at ? fmtDate(m.created_at) : '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--k-sub)' }}>{label}</span>
              <span style={{ fontWeight: 600, maxWidth: '60%', textAlign: 'right' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Statistik */}
        {s && (
          <div style={{
            padding: '16px', borderRadius: 12, background: 'var(--k-input)',
            display: 'flex', gap: 16, marginBottom: 24,
          }}>
            {[
              ['Total Order', s.total_orders],
              ['Selesai', s.completed_orders],
              ['Pendapatan', fmtRp(s.total_revenue)],
            ].map(([l, v]) => (
              <div key={l} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{v}</div>
                <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Aksi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {m?.status === 'pending' && (
            <button onClick={handleApprove} disabled={loading} style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#00C896', color: '#fff', fontWeight: 700, fontSize: 14,
            }}>Setujui Merchant</button>
          )}
          {m?.status !== 'suspended' && (
            <>
              <input
                type="text" value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Alasan suspend (opsional)..."
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                  border: '1.5px solid var(--k-border)', background: 'var(--k-input)',
                  color: 'var(--k-text)', boxSizing: 'border-box',
                }}
              />
              <button onClick={handleSuspend} disabled={loading} style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'rgba(245,101,101,0.12)', color: '#F56565', fontWeight: 700, fontSize: 14,
              }}>Suspend Merchant</button>
            </>
          )}
          {m?.status === 'suspended' && (
            <button onClick={handleApprove} disabled={loading} style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#00C896', color: '#fff', fontWeight: 700, fontSize: 14,
            }}>Aktifkan Kembali</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Halaman Utama ─────────────────────────────────────────────────────────────
export default function AdminFoodMerchantsPage() {
  const [merchants, setMerchants] = useState([])
  const [meta,      setMeta]      = useState({})
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('pending')
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState(null)
  const [page,      setPage]      = useState(1)
  const alert = useAdminAlert()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, ...(tab !== 'all' && { status: tab }), ...(search && { search }) }
      const res = await api.get('/admin/food/merchants', { params })
      setMerchants(res.data.data)
      setMeta(res.data.meta ?? {})
    } catch { alert.error('Gagal memuat data.') } finally { setLoading(false) }
  }, [tab, search, page])

  useEffect(() => { setPage(1) }, [tab, search])
  useEffect(() => { load() }, [load])

  function handleUpdated(id, newStatus) {
    setMerchants(prev => prev.map(m => m.id === id ? { ...m, status: newStatus, is_open: newStatus === 'suspended' ? false : m.is_open } : m))
    setSelected(null)
  }

  return (
    <AdminLayout>
      {selected && (
        <MerchantDrawer
          merchant={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}

      <div style={{ padding: '28px', maxWidth: 900 }}>
        <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 800 }}>Merchant ZasaFood</h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: tab === t.key ? 700 : 400, fontSize: 13,
              background: tab === t.key ? `${t.color}22` : 'var(--k-input)',
              color: tab === t.key ? t.color : 'var(--k-sub)',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama toko atau alamat..."
          style={{
            width: '100%', maxWidth: 360, padding: '10px 16px', borderRadius: 10, fontSize: 14,
            border: '1.5px solid var(--k-border)', background: 'var(--k-input)',
            color: 'var(--k-text)', marginBottom: 20, boxSizing: 'border-box',
          }}
        />

        {/* List */}
        {loading ? (
          <p style={{ color: 'var(--k-sub)' }}>Memuat...</p>
        ) : merchants.length === 0 ? (
          <p style={{ color: 'var(--k-sub)', textAlign: 'center', padding: '40px 0' }}>Tidak ada merchant.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {merchants.map(m => {
              const sm = STATUS_META[m.status] ?? STATUS_META.pending
              return (
                <div key={m.id}
                  onClick={() => setSelected(m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 20px', borderRadius: 14, background: 'var(--k-card)',
                    border: '1.5px solid var(--k-border)', cursor: 'pointer',
                    transition: 'border-color .15s',
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                    background: 'var(--k-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}>
                    {m.logo_path ? <img src={`/storage/${m.logo_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏪'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>{m.user?.name} · {CAT_LABEL[m.category] ?? m.category}</div>
                    <div style={{ fontSize: 12, color: 'var(--k-sub)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.address}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      color: sm.color, background: sm.bg,
                    }}>{sm.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--k-sub)' }}>
                      {m.menu_items_count ?? 0} item menu
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {meta.last_page > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
              padding: '8px 16px', borderRadius: 10, border: '1.5px solid var(--k-border)',
              background: 'transparent', color: page === 1 ? 'var(--k-sub)' : 'var(--k-text)',
              cursor: page === 1 ? 'default' : 'pointer',
            }}>‹ Sebelumnya</button>
            <span style={{ padding: '8px 14px', fontSize: 13, color: 'var(--k-sub)' }}>
              {page} / {meta.last_page}
            </span>
            <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page} style={{
              padding: '8px 16px', borderRadius: 10, border: '1.5px solid var(--k-border)',
              background: 'transparent', color: page === meta.last_page ? 'var(--k-sub)' : 'var(--k-text)',
              cursor: page === meta.last_page ? 'default' : 'pointer',
            }}>Berikutnya ›</button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
