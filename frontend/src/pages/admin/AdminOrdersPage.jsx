import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'

const STATUS_COLOR = {
  pending:     '#F6AD55', accepted:    '#63B3ED', on_pickup:   '#63B3ED',
  picked_up:   '#63B3ED', on_delivery: '#B794F4', delivered:   '#00C896',
  completed:   '#00C896', cancelled:   '#F56565',
}
const STATUS_LABELS = {
  pending:'Pending', accepted:'Diterima', on_pickup:'Menuju Pickup',
  picked_up:'Diambil', on_delivery:'Dikirim', delivered:'Sampai Tujuan',
  completed:'Selesai', cancelled:'Dibatalkan',
}

function formatRp(v) { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
function formatDate(d) {
  return new Date(d).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] ?? '#A0A0BC'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
      background: `${color}18`, color, border: `1px solid ${color}33`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ── Drawer detail order ZasaGo ────────────────────────────────────────────────
function OrderDrawer({ order, onClose }) {
  const color  = STATUS_COLOR[order.status]  ?? '#A0A0BC'
  const label  = STATUS_LABELS[order.status] ?? order.status
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--k-card)', height: '100%', overflowY: 'auto', padding: 28, display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>#{order.order_number}</p>
            <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{formatDate(order.created_at)}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--k-sub)' }}>×</button>
        </div>

        {/* Status + tipe */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}33` }}>
            {label}
          </span>
          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: order.type === 'jastip' ? 'rgba(183,148,244,0.12)' : 'var(--k-input)', color: order.type === 'jastip' ? '#B794F4' : 'var(--k-muted)' }}>
            {order.type === 'jastip' ? '⚡ Jastip' : 'Master'}
          </span>
        </div>

        {/* Rute */}
        <div style={{ background: 'var(--k-input)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--k-muted)', letterSpacing: '0.07em', marginBottom: 10 }}>Rute Pengiriman</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3, gap: 2, flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C896' }} />
              <div style={{ width: 1.5, height: 18, background: 'var(--k-border)' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F56565' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 2 }}>Pickup</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)', marginBottom: 10 }}>{order.pickup_address}</p>
              <p style={{ fontSize: 11, color: 'var(--k-muted)', marginBottom: 2 }}>Dropoff</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--k-text)' }}>{order.dropoff_address}</p>
            </div>
          </div>
        </div>

        {/* Info */}
        {[
          ['Pelanggan', order.customer?.name],
          ['Mitra',     order.mitra?.name ?? '— (belum assign)'],
        ].map(([l, v]) => v && (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
            <span style={{ color: 'var(--k-sub)' }}>{l}</span>
            <span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}

        {order.notes && (
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.15)', fontSize: 12, color: 'var(--k-sub)', marginBottom: 16 }}>
            📝 {order.notes}
          </div>
        )}

        {/* Biaya */}
        <div style={{ borderTop: '1px solid var(--k-border)', paddingTop: 14, marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--k-sub)', marginBottom: 6 }}>
            <span>Ongkos Kirim</span><span>{formatRp(order.shipping_fee)}</span>
          </div>
          {order.jastip_discount_applied > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#00C896', marginBottom: 6 }}>
              <span>Diskon JastipQu</span><span>-{formatRp(order.jastip_discount_applied)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, paddingTop: 6, borderTop: '1px solid var(--k-border)' }}>
            <span>Total</span><span style={{ color: '#F97316' }}>{formatRp(order.shipping_fee)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminOrdersPage() {
  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter,   setTypeFilter]   = useState('')
  const [selected,     setSelected]     = useState(null)
  const [actionId,     setActionId]     = useState(null)
  const [showCancel,   setShowCancel]   = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  const fetchOrders = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search)       p.set('search', search)
    if (statusFilter) p.set('status', statusFilter)
    if (typeFilter)   p.set('type', typeFilter)
    api.get(`/admin/orders?${p}`).then(r => setData(r.data)).finally(() => setLoading(false))
  }, [search, statusFilter, typeFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const forceComplete = async (id) => {
    setActionId(id)
    try { await api.post(`/admin/orders/${id}/force-complete`); fetchOrders() }
    catch (err) { alert(err.response?.data?.message || 'Gagal') }
    finally { setActionId(null) }
  }

  const forceCancel = async (id) => {
    if (!cancelReason) return
    setActionId(id)
    try {
      await api.post(`/admin/orders/${id}/force-cancel`, { reason: cancelReason })
      setShowCancel(null); setCancelReason(''); fetchOrders()
    } catch (err) { alert(err.response?.data?.message || 'Gagal') }
    finally { setActionId(null) }
  }

  return (
    <AdminLayout>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {selected && <OrderDrawer order={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--k-text)' }}>Order ZasaGo</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--k-muted)' }}>Monitor dan kelola semua transaksi pengiriman</p>
        </div>
        <button onClick={fetchOrders} style={{
          padding: '8px 16px', borderRadius: 10, border: '1px solid var(--k-border)',
          background: 'var(--k-card)', color: 'var(--k-sub)', fontSize: 13, cursor: 'pointer',
        }}>↻ Refresh</button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nomor order, nama..."
          className="input-field"
          style={{ flex: '1 1 200px', maxWidth: 260, padding: '9px 14px', fontSize: 13 }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="input-field" style={{ padding: '9px 14px', fontSize: 13 }}>
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="input-field" style={{ padding: '9px 14px', fontSize: 13 }}>
          <option value="">Semua Tipe</option>
          <option value="master">Master</option>
          <option value="jastip">Jastip</option>
        </select>
        {(search || statusFilter || typeFilter) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter('') }}
            style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--k-border)', background: 'var(--k-card)', color: 'var(--k-muted)', fontSize: 13, cursor: 'pointer' }}>
            ✕ Reset
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 }}>
            <div style={{ width: 22, height: 22, border: '2.5px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: 'var(--k-muted)', fontSize: 14 }}>Memuat...</span>
          </div>
        ) : !data?.data?.length ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <p style={{ fontSize: 36, marginBottom: 10 }}>📭</p>
            <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Tidak ada order ditemukan</p>
          </div>
        ) : data.data.map((order, i) => (
          <div key={order.id} onClick={() => setSelected(order)}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--k-surface)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            style={{ padding: '16px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--k-border)', cursor: 'pointer', transition: 'background .1s' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>

              {/* Info utama */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Baris 1: nomor + badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <code style={{ fontSize: 11, color: 'var(--k-muted)', background: 'var(--k-card2)', padding: '2px 8px', borderRadius: 6 }}>
                    {order.order_number}
                  </code>
                  <StatusBadge status={order.status} />
                  <span style={{
                    padding: '3px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700,
                    background: order.type === 'jastip' ? 'rgba(183,148,244,0.12)' : 'var(--k-card2)',
                    color: order.type === 'jastip' ? '#B794F4' : 'var(--k-muted)',
                  }}>
                    {order.type === 'jastip' ? '⚡ Jastip' : 'Master'}
                  </span>
                  {order.is_jastip_enabled && (
                    <span style={{ padding: '3px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: 'rgba(183,148,244,0.08)', color: '#B794F4' }}>
                      JastipQu ON
                    </span>
                  )}
                </div>

                {/* Baris 2: rute */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3, gap: 2 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--k-accent)', flexShrink: 0 }} />
                    <div style={{ width: 1, height: 12, background: 'var(--k-border)' }} />
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F56565', flexShrink: 0 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: 'var(--k-sub)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.pickup_address}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.dropoff_address}
                    </p>
                  </div>
                </div>

                {/* Baris 3: meta */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)' }}>
                    {formatRp(order.shipping_fee)}
                  </span>
                  {order.jastip_discount_applied > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--k-accent)' }}>
                      Diskon {formatRp(order.jastip_discount_applied)}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>
                    👤 {order.customer?.name ?? '—'}
                  </span>
                  {order.mitra && (
                    <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>
                      🏍️ {order.mitra.name}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--k-muted)' }}>
                    {formatDate(order.created_at)}
                  </span>
                </div>
              </div>

              {/* Tombol aksi */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                {order.status === 'delivered' && (
                  <button onClick={e => { e.stopPropagation(); forceComplete(order.id) }} disabled={actionId === order.id}
                    style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                      background: 'rgba(0,200,150,0.1)', color: 'var(--k-accent)',
                      border: '1px solid rgba(0,200,150,0.25)', cursor: 'pointer',
                      opacity: actionId === order.id ? 0.5 : 1 }}>
                    ✓ Force Selesai
                  </button>
                )}
                {!['completed', 'cancelled'].includes(order.status) && (
                  <button onClick={e => { e.stopPropagation(); setShowCancel(showCancel === order.id ? null : order.id); setCancelReason('') }}
                    style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                      background: 'rgba(245,101,101,0.08)', color: 'var(--k-danger)',
                      border: '1px solid rgba(245,101,101,0.2)', cursor: 'pointer' }}>
                    ✕ Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Form cancel */}
            {showCancel === order.id && (
              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                  className="input-field" style={{ flex: 1, padding: '8px 14px', fontSize: 13 }}
                  placeholder="Alasan pembatalan..." />
                <button onClick={() => forceCancel(order.id)}
                  disabled={!cancelReason || actionId === order.id}
                  style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    background: 'var(--k-danger)', color: '#fff', border: 'none',
                    cursor: 'pointer', opacity: (!cancelReason || actionId === order.id) ? 0.5 : 1 }}>
                  Konfirmasi
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Jumlah hasil */}
      {data?.total > 0 && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--k-muted)', marginTop: 14 }}>
          Menampilkan <strong>{data.data?.length ?? 0}</strong> dari <strong>{data.total}</strong> order
        </p>
      )}
    </AdminLayout>
  )
}
