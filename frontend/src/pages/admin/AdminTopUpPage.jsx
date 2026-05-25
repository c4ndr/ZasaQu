import { useState, useEffect, useRef, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api, { storageUrl } from '../../services/api'
import useAdminAlert from '../../hooks/useAdminAlert'

// ── Helpers ───────────────────────────────────────────────────────────────────
const STORAGE_URL  = null // digantikan storageUrl() dari api.js
function fmtRp(v)  { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
function fmtDate(d){ return new Date(d).toLocaleString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) }
function fmtTime(d){ return new Date(d).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }) }
function initial(n){ return (n || '?')[0].toUpperCase() }
function hue(n)    { return [...(n||'U')].reduce((a,c) => a + c.charCodeAt(0), 0) % 360 }

const METHOD_META = {
  bank_manual:     { label: 'Transfer Manual', icon: '📋', color: '#F6AD55', bg: 'rgba(246,173,85,0.12)' },
  virtual_account: { label: 'Virtual Account', icon: '🏦', color: '#63B3ED', bg: 'rgba(99,179,237,0.12)' },
  qris:            { label: 'QRIS',            icon: '⚡', color: '#00C896', bg: 'rgba(0,200,150,0.12)'  },
}
const STATUS_META = {
  pending:   { label: 'Menunggu',      color: '#F6AD55', bg: 'rgba(246,173,85,0.12)',  dot: '#F6AD55' },
  confirmed: { label: 'Dikonfirmasi', color: '#00C896', bg: 'rgba(0,200,150,0.12)',  dot: '#00C896' },
  rejected:  { label: 'Ditolak',      color: '#F56565', bg: 'rgba(245,101,101,0.12)', dot: '#F56565' },
  expired:   { label: 'Kedaluwarsa', color: '#A0A0BC', bg: 'rgba(160,160,188,0.12)', dot: '#A0A0BC' },
}
const STATUS_TABS = [
  { key: 'pending',   label: 'Pending',       color: '#F6AD55' },
  { key: 'confirmed', label: 'Dikonfirmasi',  color: '#00C896' },
  { key: 'rejected',  label: 'Ditolak',       color: '#F56565' },
  { key: 'all',       label: 'Semua',         color: 'var(--k-sub)' },
]


// ── Komponen timeline status ──────────────────────────────────────────────────
function StatusTimeline({ item }) {
  const steps = [
    {
      label:  'Permintaan Masuk',
      sub:    fmtDate(item.created_at),
      done:   true,
      active: false,
    },
    {
      label:  item.status === 'pending' ? 'Menunggu Konfirmasi Admin' : (item.status === 'confirmed' ? 'Dikonfirmasi Admin' : 'Ditolak Admin'),
      sub:    item.confirmed_at ? fmtDate(item.confirmed_at) : (item.status === 'pending' ? 'Menunggu tindakan...' : ''),
      done:   item.status !== 'pending',
      active: item.status === 'pending',
      ok:     item.status === 'confirmed',
      fail:   item.status === 'rejected',
    },
    {
      label:  'Saldo Ditambahkan',
      sub:    item.status === 'confirmed' ? 'Saldo user berhasil dikreditkan' : (item.status === 'rejected' ? 'Dibatalkan' : 'Menunggu konfirmasi'),
      done:   item.status === 'confirmed',
      skip:   item.status === 'rejected',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, margin: '12px 0' }}>
      {steps.map((s, i) => {
        const dotColor = s.fail ? '#F56565' : s.ok || s.done ? '#00C896' : s.active ? '#F6AD55' : 'var(--k-border)'
        const lineColor = s.done && !s.skip ? '#00C896' : 'var(--k-border)'
        return (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {/* Dot + line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 20 }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                background: s.active ? `${dotColor}22` : (s.done && !s.skip) ? dotColor : 'var(--k-card2)',
                border: `2px solid ${dotColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, color: '#fff', fontWeight: 900,
              }}>
                {s.fail ? '✕' : (s.done && !s.skip) ? '✓' : s.active ? '' : ''}
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 2, flex: 1, minHeight: 20, background: lineColor, margin: '2px 0' }} />
              )}
            </div>
            {/* Label */}
            <div style={{ paddingBottom: i < steps.length - 1 ? 14 : 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: s.active ? '#F6AD55' : s.fail ? '#F56565' : s.done ? 'var(--k-text)' : 'var(--k-muted)', marginBottom: 1 }}>
                {s.label}
              </p>
              <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{s.sub}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Kartu item top up ─────────────────────────────────────────────────────────
function TopUpCard({ item, isNew, onConfirm, onReject, actionLoading }) {
  const [showDetail,  setShowDetail]  = useState(false)
  const [showReject,  setShowReject]  = useState(false)
  const [rejectNote,  setRejectNote]  = useState('')
  const method  = METHOD_META[item.method] ?? { label: item.method, icon: '💳', color: '#A0A0BC', bg: 'rgba(160,160,188,0.1)' }
  const status  = STATUS_META[item.status] ?? STATUS_META.pending
  const h       = hue(item.user?.name)
  const isManual = item.method === 'bank_manual'
  const busy     = actionLoading === item.id

  return (
    <div style={{
      borderTop: '1px solid var(--k-border)',
      background: isNew ? 'rgba(246,173,85,0.04)' : 'transparent',
      transition: 'background 0.5s',
    }}>
      {/* Badge NEW */}
      {isNew && (
        <div style={{ padding: '6px 20px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 10, fontWeight: 800,
            background: 'rgba(246,173,85,0.2)', color: '#F6AD55', letterSpacing: '0.08em', border: '1px solid rgba(246,173,85,0.4)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}>🔔 BARU</span>
        </div>
      )}

      <div style={{ padding: '14px 20px' }}>
        {/* ── Row header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {/* Avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: `hsl(${h},50%,30%)`, border: `2px solid hsl(${h},50%,45%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, fontWeight: 800, color: '#fff',
          }}>{initial(item.user?.name)}</div>

          {/* Info utama */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--k-text)' }}>{item.user?.name}</span>
              <span style={{ padding: '2px 9px', borderRadius: 100, fontSize: 10, fontWeight: 700,
                background: status.bg, color: status.color, border: `1px solid ${status.color}44` }}>
                {status.label}
              </span>
              <span style={{ padding: '2px 9px', borderRadius: 100, fontSize: 10, fontWeight: 700,
                background: method.bg, color: method.color, border: `1px solid ${method.color}44` }}>
                {method.icon} {method.label}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--k-muted)', marginBottom: 6 }}>{item.user?.email}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#00C896', letterSpacing: '-0.01em' }}>
                {fmtRp(item.amount)}
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--k-muted)', marginTop: 3 }}>
              {fmtDate(item.created_at)}
            </p>
          </div>

          {/* Aksi kanan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, alignItems: 'flex-end' }}>
            {item.status === 'pending' && isManual && (
              <>
                <button onClick={() => onConfirm(item.id)} disabled={busy}
                  style={{ padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    border: 'none', background: 'var(--k-accent)', color: '#0C0C16',
                    opacity: busy ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                  {busy ? '...' : '✓ Konfirmasi'}
                </button>
                <button onClick={() => { setShowReject(true); setShowDetail(true) }}
                  style={{ padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    background: 'transparent', border: '1px solid var(--k-danger)', color: 'var(--k-danger)', whiteSpace: 'nowrap' }}>
                  ✕ Tolak
                </button>
              </>
            )}
            {item.status === 'pending' && !isManual && (
              <span style={{ fontSize: 11, color: 'var(--k-muted)', fontStyle: 'italic', textAlign: 'right' }}>
                Otomatis via<br/>payment gateway
              </span>
            )}
            <button onClick={() => setShowDetail(s => !s)}
              style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: 'var(--k-card2)', border: '1px solid var(--k-border)', color: 'var(--k-muted)' }}>
              {showDetail ? '▲ Tutup' : '▼ Detail'}
            </button>
          </div>
        </div>

        {/* ── Detail panel ── */}
        {showDetail && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeIn 0.2s ease' }}>

            {/* Timeline status */}
            <div style={{ background: 'var(--k-card2)', border: '1px solid var(--k-border)', borderRadius: 14, padding: '14px 16px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Alur Status</p>
              <StatusTimeline item={item} />
            </div>

            {/* Dua kolom detail */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

              {/* Kolom kiri: info metode */}
              <div style={{ background: 'var(--k-card2)', border: '1px solid var(--k-border)', borderRadius: 14, padding: '14px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Detail Metode</p>
                {item.method === 'bank_manual' && item.bank_account && (
                  <>
                    <Row label="Bank Tujuan"  value={item.bank_account.bank_name} />
                    <Row label="No. Rekening" value={item.bank_account.account_number} mono />
                    <Row label="A.n."         value={item.bank_account.account_name} />
                  </>
                )}
                {item.method === 'virtual_account' && item.virtual_account && (
                  <>
                    <Row label="Bank VA"  value={item.virtual_account.bank_name} />
                    <Row label="No. VA"   value={item.virtual_account.va_number} mono />
                    <Row label="Berlaku"  value={fmtDate(item.virtual_account.expired_at)} />
                    <Row label="Bayar"    value={item.virtual_account.paid_at ? fmtDate(item.virtual_account.paid_at) : '—'} />
                  </>
                )}
                {item.method === 'qris' && item.qris_transaction && (
                  <>
                    <Row label="Referensi"  value={item.qris_transaction.payment_reference} mono />
                    <Row label="Berlaku"    value={fmtDate(item.qris_transaction.expired_at)} />
                    <Row label="Bayar"      value={item.qris_transaction.paid_at ? fmtDate(item.qris_transaction.paid_at) : '—'} />
                  </>
                )}
                <Row label="ID Request" value={`#${item.id}`} mono />
              </div>

              {/* Kolom kanan: info proses */}
              <div style={{ background: 'var(--k-card2)', border: '1px solid var(--k-border)', borderRadius: 14, padding: '14px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Info Proses</p>
                <Row label="Diajukan"    value={fmtDate(item.created_at)} />
                <Row label="Diproses"    value={item.confirmed_at ? fmtDate(item.confirmed_at) : '—'} />
                <Row label="Diproses oleh" value={item.confirmed_by ? `Admin #${item.confirmed_by}` : '—'} />
                {item.notes && <Row label="Catatan" value={item.notes} danger />}
              </div>
            </div>

            {/* Bukti transfer */}
            {item.proof_image && (
              <div style={{ background: 'var(--k-card2)', border: '1px solid var(--k-border)', borderRadius: 14, padding: '14px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Bukti Transfer</p>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <a href={storageUrl(item.proof_image)} target="_blank" rel="noreferrer"
                    style={{ display: 'block', borderRadius: 12, overflow: 'hidden', border: '2px solid var(--k-border)', flexShrink: 0 }}>
                    <img src={storageUrl(item.proof_image)} alt="Bukti Transfer"
                      style={{ width: 160, height: 120, objectFit: 'cover', display: 'block' }}
                      onError={e => { e.target.style.display='none' }} />
                  </a>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 8 }}>Klik gambar untuk membuka ukuran penuh.</p>
                    <a href={storageUrl(item.proof_image)} target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10,
                        fontSize: 12, fontWeight: 700, background: 'rgba(99,179,237,0.1)', color: 'var(--k-info)',
                        border: '1px solid rgba(99,179,237,0.25)', textDecoration: 'none' }}>
                      🔍 Buka Bukti Transfer
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Form tolak */}
            {showReject && item.status === 'pending' && isManual && (
              <div style={{ background: 'rgba(245,101,101,0.06)', border: '1px solid rgba(245,101,101,0.25)', borderRadius: 14, padding: '14px 16px' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--k-danger)', marginBottom: 10 }}>Alasan Penolakan</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input-field" style={{ flex: 1, padding: '9px 14px', fontSize: 13 }}
                    value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                    placeholder="Tuliskan alasan penolakan yang jelas..." />
                  <button onClick={() => onReject(item.id, rejectNote)} disabled={!rejectNote || busy}
                    style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      border: 'none', background: 'var(--k-danger)', color: '#fff',
                      opacity: (!rejectNote || busy) ? 0.5 : 1, flexShrink: 0 }}>
                    Kirim
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, mono, danger }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--k-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: danger ? 'var(--k-danger)' : 'var(--k-text)',
        fontFamily: mono ? 'monospace' : 'inherit', textAlign: 'right', wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function AdminTopUpPage() {
  const [status,       setStatus]       = useState('pending')
  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [actionLoading,setActionLoading]= useState(null)
  const [newIds,       setNewIds]       = useState(new Set())
  const [toast,        setToast]        = useState(null)
  const knownIds    = useRef(new Set())
  const initialized = useRef(false)
  const pollRef     = useRef(null)

  const { notifStatus, activate, alertDeposit } = useAdminAlert()

  const fetchData = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    api.get(`/admin/topup?status=${status}`)
      .then(r => {
        setData(r.data)
        if (status === 'pending') {
          const items    = r.data?.data ?? []
          const freshIds = new Set(items.map(i => i.id))
          const added    = [...freshIds].filter(id => !knownIds.current.has(id))
          if (added.length > 0 && initialized.current) {
            setNewIds(prev => new Set([...prev, ...added]))
            alertDeposit(added.length)
            setToast({ type: 'deposit', count: added.length })
            setTimeout(() => setToast(null), 6000)
          }
          knownIds.current   = freshIds
          initialized.current = true
        }
      })
      .finally(() => { if (!silent) setLoading(false) })
  }, [status, alertDeposit])

  // Poll tiap 30 detik
  useEffect(() => {
    fetchData()
    pollRef.current = setInterval(() => fetchData(true), 30000)
    return () => clearInterval(pollRef.current)
  }, [fetchData])

  // Reset saat pindah tab
  useEffect(() => {
    setNewIds(new Set())
    knownIds.current    = new Set()
    initialized.current = false
  }, [status])

  const handleConfirm = async (id) => {
    setActionLoading(id)
    try {
      await api.post(`/admin/topup/${id}/confirm`)
      setNewIds(prev => { const s = new Set(prev); s.delete(id); return s })
      fetchData(true)
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengkonfirmasi top up.')
    } finally { setActionLoading(null) }
  }

  const handleReject = async (id, notes) => {
    if (!notes) return
    setActionLoading(id)
    try {
      await api.post(`/admin/topup/${id}/reject`, { notes })
      setNewIds(prev => { const s = new Set(prev); s.delete(id); return s })
      fetchData(true)
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menolak top up.')
    } finally { setActionLoading(null) }
  }

  const pendingCount = status === 'pending' ? (data?.data?.length ?? 0) : null

  return (
    <AdminLayout>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse   { 0%,100% { opacity:1 } 50% { opacity:0.55 } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-12px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* Toast notifikasi */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: '#1A2A1E', border: '1.5px solid #00C896',
          borderRadius: 16, padding: '14px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', gap: 12, animation: 'slideDown 0.3s ease',
          minWidth: 260,
        }}>
          <span style={{ fontSize: 28 }}>💰</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#00C896', marginBottom: 2 }}>Top Up Baru Masuk!</p>
            <p style={{ fontSize: 12, color: 'rgba(0,200,150,0.7)' }}>
              {toast.count} permintaan deposit baru menunggu konfirmasi
            </p>
          </div>
          <button onClick={() => setToast(null)} style={{ background:'none',border:'none',color:'var(--k-muted)',cursor:'pointer',fontSize:18,marginLeft:'auto' }}>✕</button>
        </div>
      )}

      {/* Banner aktifkan — selalu tampil agar admin bisa klik untuk unlock audio */}
      <div style={{ marginBottom: 16, padding: '11px 16px', borderRadius: 14,
        background: notifStatus === 'granted' ? 'rgba(0,200,150,0.07)' : 'rgba(246,173,85,0.08)',
        border: `1px solid ${notifStatus === 'granted' ? 'rgba(0,200,150,0.2)' : 'rgba(246,173,85,0.3)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{notifStatus === 'granted' ? '🔔' : '🔕'}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700,
              color: notifStatus === 'granted' ? '#00C896' : '#F6AD55', marginBottom: 1 }}>
              {notifStatus === 'granted' ? 'Notifikasi aktif' : 'Aktifkan Suara & Notifikasi'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>
              {notifStatus === 'granted'
                ? 'Klik "Tes Suara" tiap buka halaman ini untuk memastikan audio siap'
                : 'Klik Aktifkan agar berbunyi saat ada deposit baru'}
            </p>
          </div>
        </div>
        <button onClick={activate}
          style={{ padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            border: 'none', flexShrink: 0, whiteSpace: 'nowrap',
            background: notifStatus === 'granted' ? 'rgba(0,200,150,0.15)' : '#F6AD55',
            color: notifStatus === 'granted' ? '#00C896' : '#0C0C16' }}>
          {notifStatus === 'granted' ? '🔊 Tes Suara' : 'Aktifkan'}
        </button>
      </div>

      {/* Sub-header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>
          Kelola permintaan top up — konfirmasi atau tolak deposit masuk
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {pendingCount > 0 && (
            <span style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700,
              background: 'rgba(246,173,85,0.15)', color: '#F6AD55', border: '1px solid rgba(246,173,85,0.35)' }}>
              ⏳ {pendingCount} menunggu
            </span>
          )}
          <button onClick={() => fetchData()} style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            background: 'var(--k-card)', border: '1px solid var(--k-border)', color: 'var(--k-sub)', cursor: 'pointer' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Tab pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_TABS.map(t => {
          const active = status === t.key
          return (
            <button key={t.key} onClick={() => setStatus(t.key)}
              style={{ padding: '7px 18px', borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                border: active ? `1px solid ${t.color}` : '1px solid var(--k-border)',
                background: active ? `${t.color}18` : 'transparent',
                color: active ? t.color : 'var(--k-sub)', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 20, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 16 }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--k-border)', borderTop: '3px solid var(--k-accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ color: 'var(--k-muted)', fontSize: 14 }}>Memuat data...</span>
          </div>
        ) : !data?.data?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 12 }}>
            <span style={{ fontSize: 48 }}>📭</span>
            <span style={{ color: 'var(--k-muted)', fontSize: 14 }}>Tidak ada permintaan top up</span>
          </div>
        ) : (
          data.data.map((item, i) => (
            <TopUpCard
              key={item.id}
              item={item}
              isNew={newIds.has(item.id)}
              onConfirm={handleConfirm}
              onReject={handleReject}
              actionLoading={actionLoading}
            />
          ))
        )}
      </div>
    </AdminLayout>
  )
}
