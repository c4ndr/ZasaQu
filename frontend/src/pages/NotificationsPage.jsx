import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import api from '../services/api'

const TYPE_ICON = {
  order_accepted:  '✅',
  order_picked_up: '📦',
  order_delivered: '🏠',
  order_completed: '💰',
  rating_request:  '⭐',
  jastip_accepted: '⚡',
  new_order:       '🔔',
}

const TYPE_COLOR = {
  order_accepted:  '#00C896',
  order_picked_up: '#63B3ED',
  order_delivered: '#00C896',
  order_completed: '#00C896',
  rating_request:  '#F6AD55',
  jastip_accepted: '#00C896',
  new_order:       '#B794F4',
}

function formatTime(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60)   return 'Baru saja'
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifs,   setNotifs]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [marking,  setMarking]  = useState(false)

  const fetchNotifs = useCallback(() => {
    api.get('/notifications').then(r => {
      setNotifs(r.data.data?.data ?? [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])

  const markAllRead = async () => {
    setMarking(true)
    try {
      await api.post('/notifications/read')
      setNotifs(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
    } finally {
      setMarking(false)
    }
  }

  const markOneRead = async (notif) => {
    if (!notif.read_at) {
      await api.post('/notifications/read', { id: notif.id }).catch(() => {})
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n))
    }
    // Navigasi ke order jika ada
    if (notif.data?.order_number) {
      navigate('/orders')
    }
  }

  const unreadCount = notifs.filter(n => !n.read_at).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', paddingBottom: 100 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)', padding: '52px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/dashboard" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--k-card)', border: '1px solid var(--k-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--k-muted)', textDecoration: 'none', fontSize: 18 }}>←</Link>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--k-text)' }}>
              Notifikasi
              {unreadCount > 0 && (
                <span style={{ marginLeft: 8, background: 'var(--k-accent)', color: '#0C0C16', fontSize: 11, fontWeight: 900, padding: '2px 8px', borderRadius: 100 }}>
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} disabled={marking} style={{
              fontSize: 12, fontWeight: 700, color: 'var(--k-accent)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
            }}>
              {marking ? '...' : 'Tandai semua dibaca'}
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 28, height: 28, border: '2.5px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🔔</p>
            <p style={{ color: 'var(--k-text)', fontWeight: 700, marginBottom: 6 }}>Belum ada notifikasi</p>
            <p style={{ color: 'var(--k-muted)', fontSize: 13 }}>Notifikasi order dan transaksi akan muncul di sini</p>
          </div>
        ) : notifs.map(notif => {
          const icon  = TYPE_ICON[notif.type]  ?? '🔔'
          const color = TYPE_COLOR[notif.type] ?? '#A0A0BC'
          const isUnread = !notif.read_at
          return (
            <button key={notif.id} onClick={() => markOneRead(notif)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '14px 16px', borderRadius: 18, textAlign: 'left',
              background: isUnread ? `${color}08` : 'var(--k-card)',
              border: `1px solid ${isUnread ? `${color}25` : 'var(--k-border)'}`,
              cursor: 'pointer', width: '100%',
              transition: 'all 0.15s',
            }}>
              {/* Ikon */}
              <div style={{
                width: 42, height: 42, borderRadius: 14, flexShrink: 0,
                background: `${color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, position: 'relative',
              }}>
                {icon}
                {isUnread && (
                  <span style={{
                    position: 'absolute', top: -2, right: -2,
                    width: 10, height: 10, borderRadius: '50%',
                    background: color, border: '2px solid var(--k-bg)',
                  }} />
                )}
              </div>

              {/* Konten */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: isUnread ? 700 : 600, color: 'var(--k-text)', marginBottom: 3, lineHeight: 1.4 }}>
                  {notif.title}
                </p>
                <p style={{ fontSize: 12, color: 'var(--k-muted)', lineHeight: 1.5, marginBottom: 4 }}>
                  {notif.body}
                </p>
                <p style={{ fontSize: 10, color: 'var(--k-muted)', fontWeight: isUnread ? 700 : 400, color: isUnread ? color : 'var(--k-muted)' }}>
                  {formatTime(notif.created_at)}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <BottomNav />
    </div>
  )
}
