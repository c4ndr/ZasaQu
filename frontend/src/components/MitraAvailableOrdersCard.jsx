import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const fmtRp = (v) => v ? 'Rp ' + Number(v).toLocaleString('id-ID') : null

const MODULE_META = {
  zasago:   { label: 'ZasaGo',   emoji: '🛵', color: '#1D4ED8', bg: 'rgba(29,78,216,0.10)',  path: '/mitra/orders' },
  zasafood: { label: 'ZasaFood', emoji: '🍜', color: '#EA580C', bg: 'rgba(234,88,12,0.10)',  path: '/mitra/food/orders' },
  zasamart: { label: 'ZasaMart', emoji: '🛒', color: '#7C3AED', bg: 'rgba(124,58,237,0.10)', path: '/mitra/mart/orders' },
  zasaride: { label: 'ZasaRide', emoji: '🚗', color: '#059669', bg: 'rgba(5,150,105,0.10)',  path: '/mitra/ride' },
}

function getOrderLabel(order) {
  const m = order._module
  if (m === 'zasago')   return order.pickup_address || order.item_description || `Order #${order.order_number}`
  if (m === 'zasafood') return order.merchant?.name || `Order #${order.order_number}`
  if (m === 'zasamart') return order.seller?.name   || `Order #${order.order_number}`
  if (m === 'zasaride') return order.pickup_address || `Order #${order.order_number}`
  return `Order #${order.order_number}`
}

function getOrderSub(order) {
  const m = order._module
  if (m === 'zasago')   return order.dropoff_address || order.item_description || null
  if (m === 'zasafood') return order.delivery_address || null
  if (m === 'zasamart') return order.delivery_address || null
  if (m === 'zasaride') return order.destination_address || null
  return null
}

function getIncome(order) {
  const m = order._module
  if (m === 'zasago')   return order.mitra_income || order.shipping_fee
  if (m === 'zasafood') return order.mitra_income
  if (m === 'zasamart') return order.shipping_fee
  if (m === 'zasaride') return order.mitra_income || order.fare
  return null
}

export default function MitraAvailableOrdersCard({ orders }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)

  if (!orders || orders.length === 0) return null

  const hasNew = orders.length > 0

  return (
    <div style={{
      borderRadius: 18, overflow: 'hidden',
      background: 'var(--k-surface)',
      border: `1.5px solid ${hasNew ? 'rgba(0,200,150,0.4)' : 'rgba(99,102,241,0.25)'}`,
      boxShadow: hasNew
        ? '0 4px 20px rgba(0,200,150,0.15)'
        : '0 4px 20px rgba(99,102,241,0.10)',
      marginBottom: 16,
    }}>
      <style>{`
        @keyframes availPulse {
          0%,100% { box-shadow: 0 4px 20px rgba(0,200,150,0.15); }
          50%      { box-shadow: 0 4px 28px rgba(0,200,150,0.35); }
        }
      `}</style>

      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', background: hasNew
            ? 'linear-gradient(135deg, rgba(0,200,150,0.08) 0%, transparent 100%)'
            : 'none',
          border: 'none', cursor: 'pointer',
          padding: '13px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: open ? '1px solid var(--k-border)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasNew && (
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#00C896', flexShrink: 0,
              animation: 'availPulse 1.8s infinite',
              display: 'inline-block',
            }} />
          )}
          <span style={{ fontSize: 17 }}>📋</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--k-text)' }}>
            Order Tersedia
          </span>
          <span style={{
            fontSize: 11, fontWeight: 800,
            background: '#00C896', color: '#0C0C16',
            borderRadius: 100, padding: '2px 8px',
            minWidth: 20, textAlign: 'center',
          }}>{orders.length}</span>
        </div>
        <span style={{
          color: 'var(--k-muted)', fontSize: 16, fontWeight: 700,
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s', display: 'inline-block',
        }}>›</span>
      </button>

      {/* Order list */}
      {open && (
        <div style={{ padding: '8px 12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map(order => {
            const meta   = MODULE_META[order._module] ?? MODULE_META.zasago
            const label  = getOrderLabel(order)
            const sub    = getOrderSub(order)
            const income = getIncome(order)
            const isCOD  = order.payment_method === 'cod'

            return (
              <button
                key={`${order._module}:${order.id}`}
                onClick={() => navigate(meta.path)}
                style={{
                  background: 'var(--k-card)', border: '1px solid var(--k-border)',
                  borderRadius: 14, padding: '11px 13px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                }}
              >
                {/* Module icon */}
                <div style={{
                  width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                  background: meta.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 19,
                }}>
                  {meta.emoji}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: meta.color, background: meta.bg,
                      borderRadius: 6, padding: '2px 6px', flexShrink: 0,
                    }}>{meta.label}</span>
                    {order.order_number && (
                      <span style={{ fontSize: 10, color: 'var(--k-muted)', fontFamily: 'monospace' }}>
                        #{order.order_number}
                      </span>
                    )}
                    {isCOD && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#EF4444', borderRadius: 6, padding: '2px 6px', flexShrink: 0 }}>
                        COD
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--k-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginBottom: sub ? 2 : 0,
                  }}>{label}</p>
                  {sub && (
                    <p style={{
                      fontSize: 11, color: 'var(--k-muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>→ {sub}</p>
                  )}
                </div>

                {/* Income */}
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {income ? (
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#00C896' }}>
                      +{fmtRp(income)}
                    </p>
                  ) : (
                    <span style={{ color: 'var(--k-muted)', fontSize: 16, fontWeight: 700 }}>›</span>
                  )}
                </div>
              </button>
            )
          })}

          {/* Footer hint */}
          <p style={{ fontSize: 11, color: 'var(--k-muted)', textAlign: 'center', paddingTop: 4 }}>
            Ketuk untuk buka halaman order
          </p>
        </div>
      )}
    </div>
  )
}
