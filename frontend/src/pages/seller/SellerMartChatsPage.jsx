import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const STORAGE = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')

function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 60000)  return 'baru saja'
  if (diff < 3600000) return Math.floor(diff / 60000) + ' mnt lalu'
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' jam lalu'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

export default function SellerMartChatsPage() {
  const navigate          = useNavigate()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/chat/mart/seller/inbox')
      .then(r => setRooms(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ background: 'var(--k-bg)', minHeight: '100dvh', paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)' }}>
        <button onClick={() => navigate('/seller')} style={{ background: 'var(--k-card)', border: '1px solid var(--k-border)', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: 'var(--k-text)' }}>←</button>
        <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--k-text)', flex: 1 }}>💬 Chat Pembeli</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 28, height: 28, border: '3px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : rooms.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 64, gap: 12 }}>
          <p style={{ fontSize: 48 }}>💬</p>
          <p style={{ fontWeight: 700, color: 'var(--k-text)', fontSize: 16 }}>Belum ada chat masuk</p>
          <p style={{ fontSize: 13, color: 'var(--k-muted)', textAlign: 'center' }}>Chat dari pembeli akan muncul di sini</p>
        </div>
      ) : (
        <div style={{ padding: '8px 0' }}>
          {rooms.map(r => (
            <div
              key={r.room_id}
              onClick={() => navigate(`/seller/mart/chats/${r.room_id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: '1px solid var(--k-border)', cursor: 'pointer', background: r.unread_count > 0 ? 'rgba(99,102,241,0.04)' : 'transparent' }}
            >
              {/* Avatar */}
              <div style={{ width: 48, height: 48, borderRadius: 24, background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                {r.customer?.photo_url
                  ? <img src={`${STORAGE}/${r.customer.photo_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : r.customer?.avatar_preset
                    ? (() => {
                        const [emoji, bg] = (r.customer.avatar_preset || '').split('|')
                        return <div style={{ width: '100%', height: '100%', background: bg || '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{emoji}</div>
                      })()
                    : <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{(r.customer?.name || '?')[0].toUpperCase()}</span>
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <p style={{ fontWeight: r.unread_count > 0 ? 800 : 600, fontSize: 14, color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.customer?.name || 'Pembeli'}
                  </p>
                  <span style={{ fontSize: 11, color: 'var(--k-muted)', flexShrink: 0 }}>{fmtTime(r.updated_at)}</span>
                </div>
                <p style={{ fontSize: 12, color: r.unread_count > 0 ? 'var(--k-text)' : 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: r.unread_count > 0 ? 600 : 400 }}>
                  {r.last_message?.is_blocked ? '[Pesan diblokir]' : (r.last_message?.content || 'Belum ada pesan')}
                </p>
              </div>

              {/* Badge unread */}
              {r.unread_count > 0 && (
                <span style={{ background: '#6366F1', color: '#fff', fontSize: 10, fontWeight: 900, minWidth: 20, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>
                  {r.unread_count > 99 ? '99+' : r.unread_count}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
