import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

function fmtDate(d) { return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

const DOC_LABELS = {
  ktp:           '🪪 KTP',
  sim:           '🚗 SIM',
  stnk:          '📄 STNK',
  vehicle_photo: '📷 Foto Kendaraan',
}

const DOC_STATUS = {
  pending:  { color: '#F6AD55', label: 'Menunggu' },
  approved: { color: '#00C896', label: 'Disetujui' },
  rejected: { color: '#F56565', label: 'Ditolak' },
}

function hue(n) { return [...(n||'U')].reduce((a,c) => a + c.charCodeAt(0), 0) % 360 }

function Avatar({ name, size = 44 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue(name)},50%,32%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: '#fff',
    }}>{(name||'?')[0].toUpperCase()}</div>
  )
}

// ── Drawer detail + review ─────────────────────────────────────────────────────
function MitraDrawer({ mitra, onClose, onUpdated }) {
  const [loading,  setLoading]  = useState(false)
  const [reason,   setReason]   = useState('')
  const [toast,    setToast]    = useState(null)
  const [imgModal, setImgModal] = useState(null)

  function showToast(type, msg) {
    setToast({ type, msg }); setTimeout(() => setToast(null), 3000)
  }

  async function handleApprove() {
    setLoading(true)
    try {
      await api.post(`/admin/mitra/${mitra.id}/approve`)
      showToast('success', 'Mitra disetujui dan diaktifkan!')
      onUpdated(mitra.id)
    } catch (e) { showToast('error', e.response?.data?.message || 'Gagal.') }
    finally { setLoading(false) }
  }

  async function handleReject() {
    if (!reason.trim()) { showToast('error', 'Tuliskan alasan penolakan.'); return }
    setLoading(true)
    try {
      await api.post(`/admin/mitra/${mitra.id}/reject`, { reason })
      showToast('success', 'Permohonan ditolak.')
      onUpdated(mitra.id)
    } catch (e) { showToast('error', e.response?.data?.message || 'Gagal.') }
    finally { setLoading(false) }
  }

  const docs = mitra.mitra_documents ?? []
  const allPending = docs.length > 0 && docs.every(d => d.status === 'pending')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      {/* Image modal */}
      {imgModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setImgModal(null)}>
          <img src={imgModal} alt="doc" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12 }} />
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 460, background: 'var(--k-card)', height: '100%', overflowY: 'auto', padding: '24px' }}>
        {toast && (
          <div style={{ position: 'sticky', top: 0, zIndex: 10, marginBottom: 16, padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff' }}>{toast.msg}</div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <Avatar name={mitra.name} size={52} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{mitra.name}</div>
            <div style={{ fontSize: 13, color: 'var(--k-sub)' }}>{mitra.email}</div>
            <div style={{ fontSize: 12, color: 'var(--k-sub)', marginTop: 2 }}>
              {mitra.role === 'mitra_motor' ? '🏍️ Mitra Motor' : '🚗 Mitra Mobil'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--k-sub)' }}>×</button>
        </div>

        {/* Info kendaraan */}
        {mitra.mitra_detail && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--k-input)', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>Data Kendaraan</div>
            {[
              ['Plat Nomor', mitra.mitra_detail.vehicle_plate],
              ['Merek',      mitra.mitra_detail.vehicle_brand],
              ['Tahun',      mitra.mitra_detail.vehicle_year],
            ].map(([l, v]) => v && (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: 'var(--k-sub)' }}>{l}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--k-sub)' }}>Terdaftar</span>
              <span style={{ fontWeight: 600 }}>{fmtDate(mitra.created_at)}</span>
            </div>
          </div>
        )}

        {/* Dokumen */}
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Dokumen Verifikasi</div>
        {docs.length === 0 ? (
          <p style={{ color: 'var(--k-sub)', fontSize: 13, marginBottom: 20 }}>Belum ada dokumen yang diupload.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {docs.map(doc => {
              const ds = DOC_STATUS[doc.status] ?? DOC_STATUS.pending
              return (
                <div key={doc.id} style={{
                  padding: '12px', borderRadius: 12, background: 'var(--k-input)',
                  border: `1px solid ${doc.status === 'rejected' ? '#F56565' : 'var(--k-border)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: doc.file_path ? 8 : 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{DOC_LABELS[doc.type] ?? doc.type}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: ds.color }}>{ds.label}</span>
                  </div>
                  {doc.file_path && (
                    <img
                      src={`/storage/${doc.file_path}`}
                      alt={doc.type}
                      onClick={() => setImgModal(`/storage/${doc.file_path}`)}
                      style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, cursor: 'zoom-in' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Aksi approve/reject */}
        {docs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handleApprove} disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#00C896', color: '#fff', fontWeight: 700, fontSize: 14,
              opacity: loading ? 0.6 : 1,
            }}>✓ Setujui & Aktifkan Mitra</button>

            <div>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                placeholder="Tuliskan alasan penolakan..."
                style={{
                  width: '100%', padding: '10px', borderRadius: 10, boxSizing: 'border-box',
                  border: '1.5px solid var(--k-border)', background: 'var(--k-input)',
                  color: 'var(--k-text)', fontSize: 13, resize: 'vertical', marginBottom: 8,
                }} />
              <button onClick={handleReject} disabled={loading || !reason.trim()} style={{
                width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'rgba(245,101,101,0.12)', color: '#F56565', fontWeight: 700, fontSize: 14,
                opacity: (loading || !reason.trim()) ? 0.5 : 1,
              }}>✗ Tolak Permohonan</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Halaman Utama ─────────────────────────────────────────────────────────────
export default function AdminMitraVerificationPage() {
  const [mitras,   setMitras]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)
  const [page,     setPage]     = useState(1)
  const [meta,     setMeta]     = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/mitra/pending', { params: { page, ...(search && { search }) } })
      setMitras(res.data.data || [])
      setMeta(res.data.meta ?? {})
    } catch {} finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { setPage(1) }, [search])
  useEffect(() => { load() }, [load])

  function handleUpdated(id) {
    setSelected(null)
    setMitras(prev => prev.filter(m => m.id !== id))
  }

  return (
    <AdminLayout>
      {selected && <MitraDrawer mitra={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />}

      <div style={{ padding: '28px', maxWidth: 800 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Verifikasi Mitra Baru</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--k-sub)' }}>
              Review dokumen dan setujui/tolak permohonan mitra
            </p>
          </div>
          {mitras.length > 0 && (
            <span style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
              background: 'rgba(246,173,85,0.15)', color: '#F6AD55',
            }}>{meta.total ?? mitras.length} menunggu</span>
          )}
        </div>

        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama atau email mitra..."
          style={{
            width: '100%', maxWidth: 360, padding: '10px 16px', borderRadius: 10, fontSize: 14,
            border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)',
            marginBottom: 20, boxSizing: 'border-box',
          }} />

        {loading ? (
          <p style={{ color: 'var(--k-sub)' }}>Memuat...</p>
        ) : mitras.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700 }}>Semua permohonan sudah ditinjau</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Tidak ada mitra yang menunggu verifikasi.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mitras.map(mitra => {
              const docs = mitra.mitra_documents ?? []
              const uploaded = docs.length
              return (
                <div key={mitra.id} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                  borderRadius: 14, background: 'var(--k-card)', border: '1.5px solid var(--k-border)',
                  cursor: 'pointer',
                }} onClick={() => setSelected(mitra)}>
                  <Avatar name={mitra.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{mitra.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>
                      {mitra.role === 'mitra_motor' ? '🏍️' : '🚗'} {mitra.email}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--k-sub)', marginTop: 2 }}>
                      Daftar {fmtDate(mitra.created_at)} · {mitra.mitra_detail?.vehicle_plate ?? '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: uploaded >= 4 ? 'rgba(0,200,150,0.12)' : 'rgba(246,173,85,0.12)',
                      color: uploaded >= 4 ? '#00C896' : '#F6AD55',
                      marginBottom: 4,
                    }}>{uploaded}/4 dokumen</div>
                    <div style={{ fontSize: 11, color: 'var(--k-sub)' }}>Klik untuk review</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {meta.last_page > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} style={{ padding:'8px 16px',borderRadius:10,border:'1.5px solid var(--k-border)',background:'transparent',cursor:page===1?'default':'pointer',color:page===1?'var(--k-sub)':'var(--k-text)' }}>‹</button>
            <span style={{padding:'8px 14px',fontSize:13,color:'var(--k-sub)'}}>{page}/{meta.last_page}</span>
            <button onClick={() => setPage(p => Math.min(meta.last_page,p+1))} disabled={page===meta.last_page} style={{ padding:'8px 16px',borderRadius:10,border:'1.5px solid var(--k-border)',background:'transparent',cursor:page===meta.last_page?'default':'pointer',color:page===meta.last_page?'var(--k-sub)':'var(--k-text)' }}>›</button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
