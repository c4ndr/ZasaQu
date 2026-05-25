import { useState, useEffect, useRef, useCallback } from 'react'
import MerchantLayout from '../../components/MerchantLayout'
import api from '../../services/api'
import echo from '../../services/echo'
import { useAuth } from '../../context/AuthContext'

function fmtRp(v)   { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
function fmtTime(d) { return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }

const STATUS_META = {
  pending:           { label: 'Menunggu',      color: '#F6AD55', bg: 'rgba(246,173,85,0.12)'  },
  merchant_accepted: { label: 'Diterima',      color: '#63B3ED', bg: 'rgba(99,179,237,0.12)'  },
  preparing:         { label: 'Dimasak',       color: '#9F7AEA', bg: 'rgba(159,122,234,0.12)' },
  ready_for_pickup:  { label: 'Siap Diambil',  color: '#00C896', bg: 'rgba(0,200,150,0.12)'   },
  mitra_on_pickup:   { label: 'Mitra Menuju',  color: '#63B3ED', bg: 'rgba(99,179,237,0.12)'  },
  picked_up:         { label: 'Diambil',       color: '#9F7AEA', bg: 'rgba(159,122,234,0.12)' },
  on_delivery:       { label: 'Dikirim',       color: '#63B3ED', bg: 'rgba(99,179,237,0.12)'  },
  delivered:         { label: 'Terkirim',      color: '#00C896', bg: 'rgba(0,200,150,0.12)'   },
  completed:         { label: 'Selesai',       color: '#00C896', bg: 'rgba(0,200,150,0.12)'   },
  cancelled:         { label: 'Dibatalkan',    color: '#A0A0BC', bg: 'rgba(160,160,188,0.12)' },
  rejected:          { label: 'Ditolak',       color: '#F56565', bg: 'rgba(245,101,101,0.12)' },
}

const ACTIVE = ['pending','merchant_accepted','preparing','ready_for_pickup','mitra_on_pickup','picked_up','on_delivery','delivered']

function PrepModal({ order, onClose, onAccepted }) {
  const [mins,      setMins]      = useState(15)
  const [busy,      setBusy]      = useState(false)
  const [err,       setErr]       = useState('')
  const submitting = useRef(false)

  async function submit() {
    if (submitting.current) return
    submitting.current = true
    setBusy(true); setErr('')
    try {
      await api.post(`/food/merchant/orders/${order.id}/accept`, { prep_minutes: mins })
      onAccepted()
    } catch (e) {
      setErr(e.response?.data?.message || 'Gagal.')
      submitting.current = false
    } finally { setBusy(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--k-card)', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: 440 }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Terima Order #{order.order_number}</div>
        <div style={{ fontSize: 13, color: 'var(--k-sub)', marginBottom: 20 }}>Berapa menit estimasi pesanan siap?</div>
        {err && <div style={{ color: '#F56565', fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[10,15,20,30,45,60].map(m => (
            <button key={m} onClick={() => setMins(m)} style={{
              flex: 1, padding: '10px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: mins === m ? '#F97316' : 'var(--k-input)',
              color: mins === m ? '#fff' : 'var(--k-sub)', fontWeight: mins === m ? 700 : 400, fontSize: 13,
            }}>{m}m</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid var(--k-border)', background: 'transparent', color: 'var(--k-sub)', cursor: 'pointer' }}>Batal</button>
          <button onClick={submit} disabled={busy} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#00C896', color: '#fff', fontWeight: 700 }}>
            {busy ? 'Menyimpan...' : 'Terima Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RejectModal({ order, onClose, onRejected }) {
  const [reason, setReason] = useState('')
  const [busy,   setBusy]   = useState(false)
  const [err,    setErr]    = useState('')
  const submitting = useRef(false)

  async function submit() {
    if (submitting.current) return
    submitting.current = true
    setBusy(true); setErr('')
    try {
      await api.post(`/food/merchant/orders/${order.id}/reject`, { reason })
      onRejected()
    } catch (e) {
      setErr(e.response?.data?.message || 'Gagal menolak order.')
      submitting.current = false
    } finally { setBusy(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--k-card)', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: 440 }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Tolak Order #{order.order_number}</div>
        {err && <div style={{ color: '#F56565', fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Alasan penolakan (opsional)..."
          style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid var(--k-border)', background: 'var(--k-input)', color: 'var(--k-text)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 14 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid var(--k-border)', background: 'transparent', color: 'var(--k-sub)', cursor: 'pointer' }}>Batal</button>
          <button onClick={submit} disabled={busy} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(245,101,101,0.12)', color: '#F56565', fontWeight: 700 }}>
            {busy ? 'Memproses...' : 'Tolak Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MerchantOrdersPage() {
  const [orders,    setOrders]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('active')
  const [modal,     setModal]     = useState(null) // { type: 'accept'|'reject', order }
  const [toast,     setToast]     = useState(null)
  const [syncError, setSyncError] = useState(false)
  const pollRef = useRef(null)
  const { user } = useAuth()

  const load = useCallback(() => {
    api.get('/food/merchant/orders')
      .then(r => { setOrders(r.data.data || []); setSyncError(false) })
      .catch(() => setSyncError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    // WebSocket: order baru masuk → reload langsung tanpa tunggu polling
    const channelName = `App.Models.User.${user?.id}`
    const ch = echo.channel(channelName)
    ch.listen('.food.order.created', () => load())
    // WebSocket: update status order aktif (mis. customer batalkan)
    ch.listen('.food.order.status', () => load())

    pollRef.current = setInterval(load, 30000)
    return () => {
      clearInterval(pollRef.current)
      echo.leave(channelName)
    }
  }, [load, user?.id])

  function showToast(type, msg) {
    setToast({ type, msg }); setTimeout(() => setToast(null), 3000)
  }

  async function doAction(orderId, action) {
    try {
      await api.post(`/food/merchant/orders/${orderId}/${action}`)
      showToast('success', 'Status diperbarui.')
      load()
    } catch (e) { showToast('error', e.response?.data?.message || 'Gagal.') }
  }

  const filtered = tab === 'active'
    ? orders.filter(o => ACTIVE.includes(o.status))
    : orders.filter(o => ['completed','cancelled','rejected'].includes(o.status))

  const nextAction = {
    merchant_accepted: { label: 'Mulai Masak', action: 'preparing', color: '#9F7AEA', bg: 'rgba(159,122,234,0.12)' },
    preparing:         { label: 'Pesanan Siap', action: 'ready', color: '#00C896', bg: 'rgba(0,200,150,0.12)' },
  }

  return (
    <MerchantLayout title="Order Masuk">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: toast.type === 'success' ? '#00C896' : '#F56565', color: '#fff' }}>{toast.msg}</div>
      )}

      {modal?.type === 'accept'  && <PrepModal   order={modal.order} onClose={() => setModal(null)} onAccepted={() => { setModal(null); showToast('success', 'Order diterima!'); load() }} />}
      {modal?.type === 'reject'  && <RejectModal order={modal.order} onClose={() => setModal(null)} onRejected={() => { setModal(null); showToast('success', 'Order ditolak.'); load() }} />}

      <div style={{ maxWidth: 700 }}>
        {syncError && (
          <div style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 16,
            background: 'rgba(245,101,101,0.1)', color: '#F56565', fontSize: 13, fontWeight: 600,
          }}>
            ⚠ Data order tidak dapat dimuat. Periksa koneksi internet.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[['active','Aktif'],['history','Riwayat']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: tab === k ? 700 : 400, fontSize: 13,
              background: tab === k ? '#F97316' : 'var(--k-input)',
              color: tab === k ? '#fff' : 'var(--k-sub)',
            }}>{l}</button>
          ))}
        </div>

        {loading ? <p style={{ color: 'var(--k-sub)' }}>Memuat...</p>
          : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛎️</div>
              <div>{tab === 'active' ? 'Belum ada order aktif.' : 'Belum ada riwayat.'}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filtered.map(order => {
                const sm  = STATUS_META[order.status] ?? STATUS_META.pending
                const na  = nextAction[order.status]
                return (
                  <div key={order.id} style={{ padding: '18px', borderRadius: 16, background: 'var(--k-card)', border: '1.5px solid var(--k-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>#{order.order_number}</div>
                        <div style={{ fontSize: 12, color: 'var(--k-sub)' }}>{order.customer?.name} · {fmtTime(order.created_at)}</div>
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: sm.color, background: sm.bg }}>{sm.label}</span>
                    </div>

                    {order.items?.map(i => (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span>{i.item_name} ×{i.quantity}</span>
                        <span>{fmtRp(i.item_price * i.quantity)}</span>
                      </div>
                    ))}

                    {order.notes && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--k-sub)', background: 'var(--k-input)', padding: '8px 12px', borderRadius: 8 }}>📝 {order.notes}</div>}

                    <div style={{ borderTop: '1px solid var(--k-border)', marginTop: 12, paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800, color: '#F97316' }}>{fmtRp(order.total_amount)}</span>

                      <div style={{ display: 'flex', gap: 8 }}>
                        {order.status === 'pending' && (
                          <>
                            <button onClick={() => setModal({ type: 'reject', order })} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(245,101,101,0.12)', color: '#F56565', fontWeight: 700, fontSize: 13 }}>Tolak</button>
                            <button onClick={() => setModal({ type: 'accept', order })} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#00C896', color: '#fff', fontWeight: 700, fontSize: 13 }}>Terima</button>
                          </>
                        )}
                        {na && (
                          <button onClick={() => doAction(order.id, na.action)} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: na.bg, color: na.color, fontWeight: 700, fontSize: 13 }}>{na.label}</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        }
      </div>
    </MerchantLayout>
  )
}
