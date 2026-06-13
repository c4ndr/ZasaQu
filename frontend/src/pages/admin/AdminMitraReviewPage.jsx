import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api, { storageUrl } from '../../services/api'

function fmtDate(d) {
  return d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
}

const DOC_LABELS = {
  ktp:           { label: 'KTP',             emoji: '🪪' },
  sim:           { label: 'SIM',             emoji: '🚗' },
  stnk:          { label: 'STNK',            emoji: '📄' },
  vehicle_photo: { label: 'Foto Kendaraan',  emoji: '📷' },
}

// ── Lightbox gambar global ────────────────────────────────────────────────────
function Lightbox({ src, onClose }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
    }}>
      <img src={src} alt="doc" style={{ maxWidth: '92vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()} />
      <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
    </div>
  )
}

// ── Kartu review satu mitra ───────────────────────────────────────────────────
function ReviewCard({ mitra: m, onApprove, onReject, onViewImg }) {
  const [expanded,   setExpanded]   = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [reason,     setReason]     = useState('')
  const [busy,       setBusy]       = useState(false)

  const isMotor = m.role === 'mitra_motor'
  const docs    = m.mitra_documents ?? []
  const detail  = m.mitra_detail

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

  const hasAllDocs = ['ktp', 'sim', 'stnk', 'vehicle_photo'].every(t => docs.some(d => d.type === t))

  return (
    <div style={{
      background: 'var(--k-card)', border: '1.5px solid rgba(0,200,150,0.25)',
      borderRadius: 18, overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,200,150,0.07)',
    }}>
      {/* Header strip */}
      <div style={{ background: 'rgba(0,200,150,0.07)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,200,150,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: isMotor ? 'rgba(0,200,150,0.15)' : 'rgba(99,102,241,0.15)', border: `2px solid ${isMotor ? 'rgba(0,200,150,0.3)' : 'rgba(99,102,241,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            {isMotor ? '🏍️' : '🚗'}
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--k-text)', lineHeight: 1.2 }}>{m.name}</p>
            <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 2 }}>{isMotor ? 'Mitra Motor' : 'Mitra Mobil'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!hasAllDocs && (
            <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              ⚠ Dokumen belum lengkap
            </span>
          )}
          <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>
            ⏳ Menunggu Review
          </span>
          <button onClick={() => setExpanded(e => !e)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-muted)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            {expanded ? '▲ Tutup' : '▼ Dokumen'}
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 18px' }}>
        {/* Info ringkas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', marginBottom: 14, fontSize: 13 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: 'var(--k-muted)', flexShrink: 0 }}>✉️</span>
            <span style={{ color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</span>
          </div>
          {m.phone && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: 'var(--k-muted)', flexShrink: 0 }}>📞</span>
              <span style={{ color: 'var(--k-text)' }}>{m.phone}</span>
            </div>
          )}
          {detail?.vehicle_plate && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: 'var(--k-muted)', flexShrink: 0 }}>🔖</span>
              <span style={{ color: 'var(--k-text)', fontWeight: 700 }}>{detail.vehicle_plate}</span>
            </div>
          )}
          {detail?.vehicle_brand && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: 'var(--k-muted)', flexShrink: 0 }}>🏎️</span>
              <span style={{ color: 'var(--k-text)' }}>{detail.vehicle_brand}{detail.vehicle_year ? ` (${detail.vehicle_year})` : ''}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: 'var(--k-muted)', flexShrink: 0 }}>📅</span>
            <span style={{ color: 'var(--k-text)', fontSize: 11 }}>Daftar: {fmtDate(m.created_at)}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: 'var(--k-muted)', flexShrink: 0 }}>📎</span>
            <span style={{ color: 'var(--k-text)' }}>{docs.length} / 4 dokumen diupload</span>
          </div>
        </div>

        {/* Dokumen — expand */}
        {expanded && (
          <div style={{ borderTop: '1px solid var(--k-border)', paddingTop: 14, marginBottom: 14 }}>
            {docs.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--k-muted)', fontStyle: 'italic', textAlign: 'center' }}>Belum ada dokumen yang diupload.</p>
            ) : (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Dokumen Verifikasi</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {['ktp', 'sim', 'stnk', 'vehicle_photo'].map(type => {
                    const doc = docs.find(d => d.type === type)
                    const meta = DOC_LABELS[type]
                    return (
                      <div key={type} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${doc ? 'var(--k-border)' : 'rgba(239,68,68,0.2)'}`, background: 'var(--k-input)' }}>
                        <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: doc?.file_path ? '1px solid var(--k-border)' : 'none' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-text)' }}>{meta.emoji} {meta.label}</span>
                          {doc ? (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#00C896' }}>✓ Ada</span>
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444' }}>✗ Belum</span>
                          )}
                        </div>
                        {doc?.file_path ? (
                          <img
                            src={storageUrl(doc.file_path)}
                            alt={type}
                            onClick={() => onViewImg(storageUrl(doc.file_path))}
                            style={{ width: '100%', height: 110, objectFit: 'cover', cursor: 'zoom-in', display: 'block' }}
                          />
                        ) : (
                          <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <p style={{ fontSize: 12, color: 'var(--k-muted)' }}>Belum diupload</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Inline reject form */}
        {showReject && (
          <div style={{ marginBottom: 14, padding: '14px', borderRadius: 12, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 8 }}>Alasan penolakan:</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
              placeholder="Contoh: Foto KTP buram, mohon upload ulang dengan kualitas lebih baik..."
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
            <button onClick={handleApprove} disabled={busy || docs.length === 0}
              title={docs.length === 0 ? 'Mitra belum mengupload dokumen' : ''}
              style={{ flex: 2, padding: '11px', borderRadius: 12, border: 'none', background: busy || docs.length === 0 ? 'var(--k-border)' : '#00C896', color: busy || docs.length === 0 ? 'var(--k-muted)' : '#fff', fontWeight: 700, fontSize: 13, cursor: busy || docs.length === 0 ? 'default' : 'pointer' }}>
              {busy ? 'Memproses...' : docs.length === 0 ? 'Dokumen belum ada' : '✓ Setujui & Aktifkan'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function AdminMitraReviewPage() {
  const [mitras,   setMitras]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total,    setTotal]    = useState(0)
  const [toast,    setToast]    = useState(null)
  const [lightbox, setLightbox] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/mitra/pending', { params: { page, ...(search && { search }) } })
      .then(r => {
        setMitras(r.data.data ?? [])
        setLastPage(r.data.meta?.last_page ?? 1)
        setTotal(r.data.meta?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search])

  function removeFromList(id) {
    setMitras(ms => ms.filter(m => m.id !== id))
    setTotal(t => Math.max(0, t - 1))
  }

  async function handleApprove(id, name) {
    try {
      await api.post(`/admin/mitra/${id}/approve`)
      removeFromList(id)
      showToast('success', `✓ ${name} disetujui dan diaktifkan.`)
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal menyetujui.') }
  }

  async function handleReject(id, name, reason) {
    try {
      await api.post(`/admin/mitra/${id}/reject`, { reason })
      removeFromList(id)
      showToast('info', `${name} ditolak.`)
    } catch (err) { showToast('error', err.response?.data?.message || 'Gagal menolak.') }
  }

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const toastColor = { success: '#059669', error: '#EF4444', info: '#F59E0B' }

  return (
    <AdminLayout title="Review Mitra ZasaGo">
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9000, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: toastColor[toast.type] ?? '#00C896', color: '#fff', maxWidth: 320, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Review Mitra ZasaGo</h2>
          {total > 0 && (
            <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontWeight: 800, fontSize: 13, border: '1px solid rgba(245,158,11,0.35)' }}>
              {total} menunggu
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--k-muted)' }}>
          Verifikasi dokumen mitra baru — periksa KTP, SIM, STNK, dan foto kendaraan sebelum mengaktifkan
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, maxWidth: 400 }}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama atau email mitra..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 160, borderRadius: 18, background: 'var(--k-card)', border: '1px solid var(--k-border)', animation: 'pulse 1.5s infinite' }} />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
        </div>
      ) : mitras.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--k-card)', borderRadius: 20, border: '1px solid var(--k-border)' }}>
          <p style={{ fontSize: 52, marginBottom: 14 }}>{search ? '🔍' : '🎉'}</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--k-text)', marginBottom: 6 }}>
            {search ? 'Tidak ditemukan' : 'Semua beres!'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--k-muted)' }}>
            {search ? `Tidak ada mitra dengan kata kunci "${search}"` : 'Tidak ada mitra yang menunggu verifikasi saat ini.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>
          {mitras.map(m => (
            <ReviewCard key={m.id} mitra={m} onApprove={handleApprove} onReject={handleReject} onViewImg={setLightbox} />
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
