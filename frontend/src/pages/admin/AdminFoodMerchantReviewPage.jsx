import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

function fmtDate(d) {
  return d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
}
function fmtRp(n) { return 'Rp ' + Number(n || 0).toLocaleString('id') }

const CATEGORIES = {
  makanan_berat: { label: 'Makanan Berat', emoji: '🍛' },
  minuman:       { label: 'Minuman',       emoji: '🧋' },
  snack:         { label: 'Snack',         emoji: '🍟' },
  lainnya:       { label: 'Lainnya',       emoji: '🍽️' },
}

// ── Kartu review satu merchant ────────────────────────────────────────────────
function ReviewCard({ merchant: m, onApprove, onReject }) {
  const [expanded,      setExpanded]      = useState(false)
  const [detail,        setDetail]        = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showReject,    setShowReject]    = useState(false)
  const [reason,        setReason]        = useState('')
  const [busy,          setBusy]          = useState(false)

  const cat = CATEGORIES[m.category] ?? { emoji: '🍽️', label: m.category }

  async function loadDetail() {
    if (detail) return
    setDetailLoading(true)
    try {
      const r = await api.get(`/admin/food/merchants/${m.id}`)
      setDetail(r.data)
    } catch {}
    finally { setDetailLoading(false) }
  }

  function toggleExpand() {
    const next = !expanded
    setExpanded(next)
    if (next) loadDetail()
  }

  async function handleApprove() {
    setBusy(true)
    await onApprove(m.id, m.name)
    setBusy(false)
  }

  async function handleReject() {
    if (!reason.trim()) return
    setBusy(true)
    await onReject(m.id, m.name, reason)
    setBusy(false)
    setShowReject(false)
  }

  const merchant    = detail?.data ?? m
  const stats       = detail?.stats ?? null
  const categories  = detail?.data?.categories ?? []
  const totalMenus  = categories.reduce((s, c) => s + (c.items?.length ?? 0), 0)

  return (
    <div style={{
      background: 'var(--k-card)', border: '1.5px solid rgba(249,115,22,0.25)',
      borderRadius: 18, overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(249,115,22,0.07)',
    }}>
      {/* Header strip */}
      <div style={{ background: 'rgba(249,115,22,0.07)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(249,115,22,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{cat.emoji}</span>
          <div>
            <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--k-text)', lineHeight: 1.2 }}>{m.name}</p>
            <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 2 }}>{cat.label}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>
            ⏳ Menunggu Review
          </span>
          <button onClick={toggleExpand} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-muted)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            {expanded ? '▲ Tutup' : '▼ Detail'}
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 18px' }}>
        {/* Info ringkas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', marginBottom: 14, fontSize: 13 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--k-muted)', flexShrink: 0 }}>📍</span>
            <span style={{ color: 'var(--k-text)', lineHeight: 1.4 }}>{m.address}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: 'var(--k-muted)', flexShrink: 0 }}>👤</span>
            <span style={{ color: 'var(--k-text)' }}>{m.user?.name}</span>
          </div>
          {m.phone && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: 'var(--k-muted)', flexShrink: 0 }}>📞</span>
              <span style={{ color: 'var(--k-text)' }}>{m.phone}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: 'var(--k-muted)', flexShrink: 0 }}>✉️</span>
            <span style={{ color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.user?.email}</span>
          </div>
          {m.open_time && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: 'var(--k-muted)', flexShrink: 0 }}>🕐</span>
              <span style={{ color: 'var(--k-text)' }}>{m.open_time?.slice(0, 5)} – {m.close_time?.slice(0, 5)}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: 'var(--k-muted)', flexShrink: 0 }}>📅</span>
            <span style={{ color: 'var(--k-text)', fontSize: 11 }}>Daftar: {fmtDate(m.created_at)}</span>
          </div>
        </div>

        {/* Menu count badge */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {m.menu_items_count > 0 && (
            <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(249,115,22,0.1)', color: '#F97316', fontWeight: 700 }}>
              🍜 {m.menu_items_count} menu
            </span>
          )}
        </div>

        {/* Detail yang di-expand */}
        {expanded && (
          <div style={{ borderTop: '1px solid var(--k-border)', paddingTop: 14, marginBottom: 14 }}>
            {detailLoading ? (
              <p style={{ fontSize: 13, color: 'var(--k-muted)', textAlign: 'center', padding: '10px 0' }}>Memuat detail...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Deskripsi */}
                {merchant.description && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Deskripsi Restoran</p>
                    <p style={{ fontSize: 13, color: 'var(--k-text)', lineHeight: 1.6, fontStyle: 'italic' }}>"{merchant.description}"</p>
                  </div>
                )}

                {/* Statistik */}
                {stats && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Statistik</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {[
                        { label: 'Total Order',  val: stats.total_orders,     emoji: '🛒' },
                        { label: 'Selesai',      val: stats.completed_orders, emoji: '✓' },
                        { label: 'Revenue',      val: fmtRp(stats.total_revenue), emoji: '💰' },
                      ].map(item => (
                        <div key={item.label} style={{ background: 'var(--k-input)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                          <p style={{ fontSize: 16 }}>{item.emoji}</p>
                          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)' }}>{item.val}</p>
                          <p style={{ fontSize: 10, color: 'var(--k-muted)', marginTop: 2 }}>{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Menu per kategori */}
                {categories.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      Menu ({totalMenus} item dalam {categories.length} kategori)
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {categories.map(cat => (
                        <div key={cat.id}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#F97316', marginBottom: 4 }}>📂 {cat.name}</p>
                          {cat.items?.length > 0 ? (
                            <div style={{ background: 'var(--k-input)', borderRadius: 10, overflow: 'hidden', marginLeft: 8 }}>
                              {cat.items.map((item, i) => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderTop: i === 0 ? 'none' : '1px solid var(--k-border)', gap: 8 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13, color: 'var(--k-text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                                    {item.description && (
                                      <p style={{ fontSize: 11, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</p>
                                    )}
                                  </div>
                                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#F97316' }}>{fmtRp(item.price)}</p>
                                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: item.is_available ? 'rgba(5,150,105,0.12)' : 'rgba(156,163,175,0.15)', color: item.is_available ? '#059669' : '#9CA3AF', fontWeight: 600 }}>
                                      {item.is_available ? 'Tersedia' : 'Habis'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: 12, color: 'var(--k-muted)', marginLeft: 8, fontStyle: 'italic' }}>Belum ada menu</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!merchant.description && !stats && categories.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--k-muted)', fontStyle: 'italic', textAlign: 'center' }}>Belum ada info tambahan</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Inline reject form */}
        {showReject && (
          <div style={{ marginBottom: 14, padding: '14px', borderRadius: 12, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 8 }}>Alasan penolakan:</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
              placeholder="Contoh: Foto menu tidak lengkap, mohon lengkapi informasi restoran..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'var(--k-card)', color: 'var(--k-text)', fontSize: 13, resize: 'none', boxSizing: 'border-box', outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => { setShowReject(false); setReason('') }}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Batal
              </button>
              <button onClick={handleReject} disabled={busy || !reason.trim()}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: reason.trim() ? '#EF4444' : 'var(--k-border)', color: reason.trim() ? '#fff' : 'var(--k-muted)', cursor: reason.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 700 }}>
                {busy ? 'Menolak...' : 'Konfirmasi Tolak'}
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showReject && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowReject(true)} disabled={busy}
              style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1.5px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontWeight: 700, fontSize: 13, cursor: busy ? 'default' : 'pointer' }}>
              ✕ Tolak
            </button>
            <button onClick={handleApprove} disabled={busy}
              style={{ flex: 2, padding: '11px', borderRadius: 12, border: 'none', background: busy ? 'var(--k-border)' : '#F97316', color: busy ? 'var(--k-muted)' : '#fff', fontWeight: 700, fontSize: 13, cursor: busy ? 'default' : 'pointer' }}>
              {busy ? 'Memproses...' : '✓ Setujui Restoran'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function AdminFoodMerchantReviewPage() {
  const [merchants, setMerchants] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [page,      setPage]      = useState(1)
  const [lastPage,  setLastPage]  = useState(1)
  const [total,     setTotal]     = useState(0)
  const [toast,     setToast]     = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get(`/admin/food/merchants?status=pending&page=${page}`)
      .then(r => {
        setMerchants(r.data.data ?? [])
        setLastPage(r.data.meta?.last_page ?? 1)
        setTotal(r.data.meta?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => { load() }, [load])

  function removeFromList(id) {
    setMerchants(ms => ms.filter(m => m.id !== id))
    setTotal(t => Math.max(0, t - 1))
  }

  async function handleApprove(id, name) {
    try {
      await api.post(`/admin/food/merchants/${id}/approve`)
      removeFromList(id)
      showToast('success', `✓ Restoran ${name} berhasil disetujui.`)
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal menyetujui.') }
  }

  async function handleReject(id, name, reason) {
    try {
      await api.post(`/admin/food/merchants/${id}/suspend`, { reason })
      removeFromList(id)
      showToast('info', `Restoran ${name} ditolak.`)
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal menolak.') }
  }

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const toastColor = { success: '#059669', error: '#EF4444', info: '#F59E0B' }

  return (
    <AdminLayout title="Review Merchant ZasaFood">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: toastColor[toast.type] ?? '#F97316', color: '#fff', maxWidth: 320, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Review Merchant ZasaFood</h2>
          {total > 0 && (
            <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontWeight: 800, fontSize: 13, border: '1px solid rgba(245,158,11,0.35)' }}>
              {total} menunggu
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--k-muted)' }}>
          Tinjau registrasi restoran baru — periksa kelengkapan menu dan informasi sebelum mengaktifkan
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 160, borderRadius: 18, background: 'var(--k-card)', border: '1px solid var(--k-border)', animation: 'pulse 1.5s infinite' }} />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
        </div>
      ) : merchants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--k-card)', borderRadius: 20, border: '1px solid var(--k-border)' }}>
          <p style={{ fontSize: 52, marginBottom: 14 }}>🎉</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--k-text)', marginBottom: 6 }}>Semua beres!</p>
          <p style={{ fontSize: 13, color: 'var(--k-muted)' }}>Tidak ada restoran yang menunggu review saat ini.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>
          {merchants.map(m => (
            <ReviewCard key={m.id} merchant={m} onApprove={handleApprove} onReject={handleReject} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24 }}>
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
