import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const MODULE_META = {
  zasago:   { label: 'ZasaGo',   emoji: '🛵', color: '#1D4ED8', bg: 'rgba(29,78,216,0.10)',  detailPath: (id) => `/orders/${id}/tracking` },
  zasafood: { label: 'ZasaFood', emoji: '🍔', color: '#EA580C', bg: 'rgba(234,88,12,0.10)',  detailPath: (id) => `/food/orders/${id}` },
  zasamart: { label: 'ZasaMart', emoji: '🛒', color: '#7C3AED', bg: 'rgba(124,58,237,0.10)', detailPath: (id) => `/mart/orders/${id}` },
}

const STATUS_LABEL = {
  // ZasaGo
  pending: 'Mencari Mitra', accepted: 'Mitra Ditemukan', picking_up: 'Menuju Pickup',
  on_pickup: 'Di Lokasi Pickup', picked_up: 'Barang Diambil', on_delivery: 'Dalam Perjalanan',
  delivered: 'Tiba di Tujuan', completed: 'Selesai',
  // ZasaFood
  merchant_accepted: 'Diterima Warung', preparing: 'Sedang Dimasak',
  ready_for_pickup: 'Siap Diambil', mitra_on_pickup: 'Mitra ke Warung',
  // ZasaMart
  confirmed: 'Dikonfirmasi Toko', packed: 'Dikemas', picking_up_mart: 'Dijemput Mitra',
  // Common
  cancelled: 'Dibatalkan', rejected: 'Ditolak',
}

const STATUS_COLOR = {
  pending: '#F59E0B', accepted: '#00C896', picking_up: '#3B82F6', on_pickup: '#3B82F6',
  picked_up: '#8B5CF6', on_delivery: '#6366F1', delivered: '#00C896', completed: '#10B981',
  merchant_accepted: '#00C896', preparing: '#8B5CF6', ready_for_pickup: '#00C896',
  mitra_on_pickup: '#3B82F6', confirmed: '#3B82F6', packed: '#8B5CF6',
  cancelled: '#9CA3AF', rejected: '#9CA3AF',
}

function getOrderLabel(order) {
  const m = order._module
  if (m === 'zasago')   return order.pickup_address || `Order #${order.id}`
  if (m === 'zasafood') return order.merchant?.name || order.merchant_name || `Order #${order.id}`
  if (m === 'zasamart') return order.seller?.name   || order.seller_name   || `Order #${order.id}`
  return `Order #${order.id}`
}

export default function ActiveOrdersCard({ orders }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)

  if (!orders || orders.length === 0) return null

  return (
    <div style={{
      borderRadius: 18, overflow: 'hidden',
      background: 'var(--k-surface)',
      border: '1.5px solid rgba(99,102,241,0.25)',
      boxShadow: '0 4px 20px rgba(99,102,241,0.10)',
      marginBottom: 16,
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '13px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: open ? '1px solid var(--k-border)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 17 }}>📦</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)' }}>Pesanan Aktif</span>
          <span style={{
            fontSize: 11, fontWeight: 800,
            background: '#6366F1', color: '#fff',
            borderRadius: 100, padding: '2px 8px',
            minWidth: 20, textAlign: 'center',
          }}>{orders.length}</span>
        </div>
        <span style={{
          color: 'var(--k-muted)', fontSize: 16, fontWeight: 700,
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
          display: 'inline-block',
        }}>›</span>
      </button>

      {/* Order list */}
      {open && (
        <div style={{ padding: '8px 12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map(order => {
            const meta   = MODULE_META[order._module] ?? MODULE_META.zasago
            const status = order.status
            const sColor = STATUS_COLOR[status] ?? '#9CA3AF'
            const sLabel = STATUS_LABEL[status] ?? status
            const label  = getOrderLabel(order)

            return (
              <button
                key={`${order._module}:${order.id}`}
                onClick={() => navigate(meta.detailPath(order.id))}
                style={{
                  background: 'var(--k-card)', border: '1px solid var(--k-border)',
                  borderRadius: 14, padding: '11px 13px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                }}
              >
                {/* Module icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: meta.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>
                  {meta.emoji}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: meta.color, background: meta.bg,
                      borderRadius: 6, padding: '2px 6px',
                    }}>{meta.label}</span>
                    {order.order_number && (
                      <span style={{ fontSize: 10, color: 'var(--k-muted)' }}>#{order.order_number}</span>
                    )}
                  </div>
                  <p style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--k-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginBottom: 3,
                  }}>{label}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: sColor, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 11, color: sColor, fontWeight: 600 }}>{sLabel}</span>
                  </div>
                </div>

                {/* Arrow */}
                <span style={{ color: 'var(--k-muted)', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>›</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
