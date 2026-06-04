import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import api from '../../services/api'
import echo from '../../services/echo'

function fmtRp(v)   { return 'Rp ' + Number(v || 0).toLocaleString('id-ID') }
function fmtDate(d) { return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }

const STATUS_META = {
  pending:           { label: 'Menunggu Merchant', color: '#F6AD55', bg: 'rgba(246,173,85,0.12)',   icon: '⏳', pulse: true  },
  merchant_accepted: { label: 'Diterima!',          color: '#00C896', bg: 'rgba(0,200,150,0.12)',    icon: '✅', pulse: false },
  preparing:         { label: 'Sedang Dimasak',     color: '#9F7AEA', bg: 'rgba(159,122,234,0.12)',  icon: '👨‍🍳', pulse: true  },
  ready_for_pickup:  { label: 'Siap Diambil',       color: '#00C896', bg: 'rgba(0,200,150,0.12)',    icon: '🎉', pulse: true  },
  mitra_on_pickup:   { label: 'Mitra Menuju',       color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',   icon: '🏍️', pulse: true  },
  picked_up:         { label: 'Diambil Mitra',      color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',   icon: '📦', pulse: false },
  on_delivery:       { label: 'Dalam Perjalanan',   color: '#F97316', bg: 'rgba(249,115,22,0.12)',   icon: '🚀', pulse: true  },
  delivered:         { label: '🎊 Sudah Tiba!',     color: '#00C896', bg: 'rgba(0,200,150,0.15)',    icon: '🎊', pulse: true  },
  completed:         { label: 'Selesai',            color: '#00C896', bg: 'rgba(0,200,150,0.08)',    icon: '⭐', pulse: false },
  cancelled:         { label: 'Dibatalkan',         color: '#A0A0BC', bg: 'rgba(160,160,188,0.08)',  icon: '❌', pulse: false },
  rejected:          { label: 'Ditolak',            color: '#F56565', bg: 'rgba(245,101,101,0.08)',  icon: '❌', pulse: false },
}

const ACTIVE_STATUSES = ['pending','merchant_accepted','preparing','ready_for_pickup','mitra_on_pickup','picked_up','on_delivery','delivered']

export default function FoodOrdersPage() {
  const navigate = useNavigate()
  const [tab,      setTab]      = useState('active')
  const [orders,   setOrders]   = useState([])
  const [meta,     setMeta]     = useState(null)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [loadMore, setLoadMore] = useState(false)
  const channelsRef = useRef({})

  const fetchOrders = useCallback(async (currentPage = 1, append = false) => {
    append ? setLoadMore(true) : setLoading(true)
    try {
      const params = tab === 'active' ? { active_only: true } : { page: currentPage }
      const r = await api.get('/food/orders', { params })
      const newOrders = r.data.data || []
      setOrders(prev => append ? [...prev, ...newOrders] : newOrders)
      setMeta(r.data.meta ?? null)
    } catch {} finally {
      append ? setLoadMore(false) : setLoading(false)
    }
  }, [tab])

  useEffect(() => { setOrders([]); setPage(1); fetchOrders(1, false) }, [tab]) // eslint-disable-line

  // Subscribe WebSocket untuk tiap order aktif → update status real-time tanpa reload
  useEffect(() => {
    if (tab !== 'active') return

    const subscribe = (orderId) => {
      if (channelsRef.current[orderId]) return
      const ch = echo.channel(`food.${orderId}`)
      ch.listen('.food.order.status', e => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: e.status } : o))
      })
      channelsRef.current[orderId] = ch
    }

    orders.forEach(o => { if (ACTIVE_STATUSES.includes(o.status)) subscribe(o.id) })

    return () => {
      Object.keys(channelsRef.current).forEach(id => echo.leave(`food.${id}`))
      channelsRef.current = {}
    }
  }, [orders.map(o => o.id).join(','), tab]) // eslint-disable-line

  const handleLoadMore = () => { const next = page + 1; setPage(next); fetchOrders(next, true) }
  const hasMore = meta && page < meta.last_page

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', paddingBottom: 80 }}>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>

      {/* Header */}
      <div style={{ padding: '20px 16px 0', background: 'var(--k-card)', borderBottom: '1px solid var(--k-border)' }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 14 }}>Pesanan Makanan</div>
        <div style={{ display: 'flex', gap: 8, paddingBottom: 14 }}>
          {[['active','Aktif'],['history','Riwayat']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: tab === k ? 700 : 400, fontSize: 13,
              background: tab === k ? '#F97316' : 'var(--k-input)',
              color: tab === k ? '#fff' : 'var(--k-sub)',
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--k-sub)', padding: '60px 0' }}>Memuat...</p>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--k-sub)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
            <div>{tab === 'active' ? 'Tidak ada pesanan aktif.' : 'Belum ada riwayat.'}</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orders.map(order => {
                const sm     = STATUS_META[order.status] ?? STATUS_META.pending
                const isLive = ACTIVE_STATUSES.includes(order.status)
                const isArrived = order.status === 'delivered'

                return (
                  <div key={order.id} onClick={() => navigate(`/food/orders/${order.id}`)}
                    style={{
                      borderRadius: 16, background: 'var(--k-card)',
                      border: `1.5px solid ${isArrived ? '#00C89655' : 'var(--k-border)'}`,
                      cursor: 'pointer', overflow: 'hidden',
                      boxShadow: isArrived ? '0 4px 20px rgba(0,200,150,0.15)' : 'none',
                      transition: 'box-shadow 0.3s',
                    }}>

                    {/* Top strip untuk order arrived */}
                    {isArrived && (
                      <div style={{ background: 'linear-gradient(90deg, #00C896, #00A87D)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>🎊</span>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Pesanan sudah tiba! Konfirmasi sekarang</p>
                        <span style={{ marginLeft: 'auto', color: '#fff', fontSize: 16 }}>→</span>
                      </div>
                    )}

                    <div style={{ padding: '14px' }}>
                      {/* Row 1: merchant name + status badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏪</div>
                          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--k-text)' }}>{order.merchant?.name}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {sm.pulse && isLive && (
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: sm.color, animation: 'blink 2s infinite' }} />
                          )}
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg }}>
                            {sm.icon} {sm.label}
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      <p style={{ fontSize: 13, color: 'var(--k-sub)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.items?.map(i => `${i.item_name} ×${i.quantity}`).join(' · ')}
                      </p>

                      {/* Row bottom: tanggal + total + lacak */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{fmtDate(order.created_at)}</p>
                          <p style={{ fontWeight: 800, fontSize: 14, color: '#F97316', marginTop: 2 }}>{fmtRp(order.total_amount)}</p>
                        </div>
                        {isLive && !isArrived && (
                          <div style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)' }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#F97316' }}>📍 Lacak</p>
                          </div>
                        )}
                        {!isLive && (
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 11, color: 'var(--k-muted)' }}>{order.status === 'completed' ? '✓ Selesai' : ''}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {tab === 'history' && hasMore && (
              <button onClick={handleLoadMore} disabled={loadMore} style={{
                display: 'block', width: '100%', marginTop: 16, padding: '12px',
                borderRadius: 12, border: '1.5px solid var(--k-border)',
                background: 'var(--k-card)', color: 'var(--k-sub)',
                fontSize: 13, fontWeight: 600, cursor: loadMore ? 'default' : 'pointer',
              }}>{loadMore ? 'Memuat...' : 'Muat Lebih'}</button>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
