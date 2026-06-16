import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useAppInfo from '../../hooks/useAppInfo'
import api from '../../services/api'

const MODULE_META = {
  zasago:   { label: 'ZasaGo',   emoji: '🛵', color: '#1D4ED8', bg: 'rgba(29,78,216,0.10)'  },
  zasafood: { label: 'ZasaFood', emoji: '🍜', color: '#EA580C', bg: 'rgba(234,88,12,0.10)'  },
  zasamart: { label: 'ZasaMart', emoji: '🛒', color: '#7C3AED', bg: 'rgba(124,58,237,0.10)' },
  zasaride: { label: 'ZasaRide', emoji: '🚗', color: '#059669', bg: 'rgba(5,150,105,0.10)'  },
}

const STATUS_LABEL = {
  pending: 'Menunggu', accepted: 'Diterima', picking_up: 'Menuju Pickup',
  on_pickup: 'Di Lokasi Pickup', picked_up: 'Barang Diambil', on_delivery: 'Diantar',
  delivered: 'Tiba di Tujuan', completed: 'Selesai', cancelled: 'Dibatalkan', rejected: 'Ditolak',
  merchant_accepted: 'Diterima Warung', preparing: 'Dimasak', ready_for_pickup: 'Siap Diambil',
  mitra_on_pickup: 'Menuju Warung', confirmed: 'Dikonfirmasi', packed: 'Dikemas',
  picking_up_mart: 'Dijemput Mitra', active: 'Aktif',
}

const STATUS_COLOR = {
  pending: '#F59E0B', accepted: '#00C896', picking_up: '#3B82F6', on_pickup: '#3B82F6',
  picked_up: '#8B5CF6', on_delivery: '#6366F1', delivered: '#00C896', completed: '#10B981',
  merchant_accepted: '#00C896', preparing: '#8B5CF6', ready_for_pickup: '#00C896',
  mitra_on_pickup: '#3B82F6', confirmed: '#3B82F6', packed: '#8B5CF6',
  cancelled: '#9CA3AF', rejected: '#9CA3AF', active: '#00C896',
}

const GO_DONE   = ['completed', 'cancelled']
const FOOD_DONE = ['completed', 'cancelled', 'delivered']
const MART_DONE = ['completed', 'cancelled']

const fmtRp = (v) => v ? 'Rp ' + Number(v).toLocaleString('id-ID') : null

function fmtTime(s) {
  if (!s) return ''
  const d = new Date(s)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) +
    ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function getLabel(order) {
  const m = order._module
  if (m === 'zasago')   return order.pickup_address  || `Order #${order.order_number}`
  if (m === 'zasafood') return order.merchant?.name  || order.merchant_name || `Order #${order.order_number}`
  if (m === 'zasamart') return order.seller?.name    || order.seller_name   || `Order #${order.order_number}`
  if (m === 'zasaride') return order.pickup_address  || `Order #${order.order_number}`
  return `Order #${order.order_number}`
}

function getSub(order) {
  const m = order._module
  if (m === 'zasago')   return order.dropoff_address   || null
  if (m === 'zasafood') return order.delivery_address  || null
  if (m === 'zasamart') return order.delivery_address  || null
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

function getNavPath(order) {
  const m = order._module
  if (m === 'zasafood') return '/mitra/food/orders'
  if (m === 'zasamart') return '/mitra/mart/orders'
  if (m === 'zasaride') return '/mitra/ride'
  return '/mitra/orders'
}

function sortByDate(arr) {
  return [...arr].sort((a, b) =>
    new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
  )
}

export default function MitraAktivitasPage() {
  const { user }       = useAuth()
  const { features }   = useAppInfo()
  const navigate       = useNavigate()
  const feat           = features ?? {}
  const [tab, setTab]  = useState('active')
  const [active,  setActive]  = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [goRes, foodRes, martActiveRes, martHistRes, rideActiveRes, rideHistRes] = await Promise.allSettled([
        api.get('/mitra/orders/my'),
        feat.zasafood !== false ? api.get('/food/mitra/orders/my') : null,
        feat.zasamart !== false ? api.get('/mart/mitra/orders/my') : null,
        feat.zasamart !== false ? api.get('/mart/mitra/orders/history') : null,
        feat.zasaride === true  ? api.get('/ride/mitra/active') : null,
        feat.zasaride === true  ? api.get('/ride/mitra/history') : null,
      ])

      const get = (res) => {
        if (!res || res.status !== 'fulfilled' || !res.value) return []
        return res.value.data?.data ?? res.value.data ?? []
      }

      const goAll   = get(goRes).map(o => ({ ...o, _module: 'zasago' }))
      const foodAll = get(foodRes).map(o => ({ ...o, _module: 'zasafood' }))
      const martAct = get(martActiveRes).map(o => ({ ...o, _module: 'zasamart' }))
      const martHis = get(martHistRes).map(o => ({ ...o, _module: 'zasamart' }))
      const rideAct = get(rideActiveRes).map(o => ({ ...o, _module: 'zasaride' }))
      const rideHis = get(rideHistRes).map(o => ({ ...o, _module: 'zasaride' }))

      setActive(sortByDate([
        ...goAll.filter(o => !GO_DONE.includes(o.status)),
        ...foodAll.filter(o => !FOOD_DONE.includes(o.status)),
        ...martAct.filter(o => !MART_DONE.includes(o.status)),
        ...rideAct,
      ]))

      setHistory(sortByDate([
        ...goAll.filter(o => GO_DONE.includes(o.status)),
        ...foodAll.filter(o => FOOD_DONE.includes(o.status)),
        ...martHis,
        ...rideHis,
      ]))
    } catch {}
    setLoading(false)
  }, [feat.zasafood, feat.zasamart, feat.zasaride]) // eslint-disable-line

  useEffect(() => { load() }, [load])

  const orders = tab === 'active' ? active : history
  const isDone = tab === 'history'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--k-surface)',
        borderBottom: '1px solid var(--k-border)',
        padding: '16px 16px 0',
      }}>
        <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--k-text)', marginBottom: 12 }}>
          Aktivitas
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { k: 'active',  l: 'Order Aktif',  count: active.length  },
            { k: 'history', l: 'Riwayat',       count: history.length },
          ].map(({ k, l, count }) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 8px', fontSize: 13, fontWeight: tab === k ? 800 : 500,
              color: tab === k ? 'var(--k-primary)' : 'var(--k-muted)',
              borderBottom: tab === k ? '2.5px solid var(--k-primary)' : '2.5px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'color 0.18s',
            }}>
              {l}
              {count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 800, minWidth: 18, height: 18,
                  borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: tab === k ? 'var(--k-primary)' : 'var(--k-input)',
                  color: tab === k ? '#fff' : 'var(--k-muted)',
                  padding: '0 5px',
                }}>{count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              height: 80, borderRadius: 16, background: 'var(--k-card)',
              border: '1px solid var(--k-border)',
              animation: 'pulse 1.5s ease-in-out infinite',
              opacity: 1 - i * 0.15,
            }} />
          ))
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {tab === 'active' ? '🏍️' : '📋'}
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--k-text)', marginBottom: 6 }}>
              {tab === 'active' ? 'Tidak ada order aktif' : 'Belum ada riwayat'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--k-muted)' }}>
              {tab === 'active'
                ? 'Order yang sedang kamu kerjakan akan muncul di sini'
                : 'Order yang selesai atau dibatalkan akan muncul di sini'}
            </p>
          </div>
        ) : (
          orders.map(order => {
            const meta   = MODULE_META[order._module] ?? MODULE_META.zasago
            const label  = getLabel(order)
            const sub    = getSub(order)
            const income = getIncome(order)
            const status = order.status ?? 'active'
            const sColor = STATUS_COLOR[status] ?? '#9CA3AF'
            const sLabel = STATUS_LABEL[status] ?? status
            const time   = order.updated_at || order.created_at

            return (
              <button
                key={`${order._module}:${order.id}`}
                onClick={() => navigate(getNavPath(order))}
                style={{
                  background: 'var(--k-card)', border: '1px solid var(--k-border)',
                  borderRadius: 16, padding: '13px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  transition: 'opacity 0.15s',
                }}
              >
                {/* Icon modul */}
                <div style={{
                  width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                  background: meta.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>
                  {meta.emoji}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: meta.color, background: meta.bg,
                      borderRadius: 6, padding: '2px 7px', flexShrink: 0,
                    }}>{meta.label}</span>
                    {order.order_number && (
                      <span style={{ fontSize: 10, color: 'var(--k-muted)', fontFamily: 'monospace' }}>
                        #{order.order_number}
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--k-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginBottom: sub ? 3 : 0,
                  }}>{label}</p>
                  {sub && (
                    <p style={{
                      fontSize: 11, color: 'var(--k-muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginBottom: 3,
                    }}>→ {sub}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: sColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: sColor, fontWeight: 600 }}>{sLabel}</span>
                    {time && (
                      <span style={{ fontSize: 10, color: 'var(--k-muted)', marginLeft: 4 }}>
                        · {fmtTime(time)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Income / arrow */}
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {isDone && income ? (
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#00C896' }}>
                      +{fmtRp(income)}
                    </p>
                  ) : !isDone ? (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: sColor,
                      boxShadow: `0 0 6px ${sColor}`,
                      animation: 'pulse 1.8s ease-in-out infinite',
                    }} />
                  ) : (
                    <span style={{ color: 'var(--k-muted)', fontSize: 16, fontWeight: 700 }}>›</span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
