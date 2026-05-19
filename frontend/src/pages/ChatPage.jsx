import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useChatRoom from '../hooks/useChatRoom'

function formatTime(d) {
  return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(d) {
  const date  = new Date(d)
  const today = new Date()
  const diff  = Math.floor((today - date) / 86400000)
  if (diff === 0) return 'Hari ini'
  if (diff === 1) return 'Kemarin'
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })
}

// ── Avatar huruf ──────────────────────────────────────────────────────────────
function Avatar({ name, size = 32 }) {
  const initial = (name ?? '?')[0].toUpperCase()
  const hue = [...(name ?? 'U')].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue},55%,38%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700, color: '#fff',
      letterSpacing: 0,
    }}>
      {initial}
    </div>
  )
}

// ── Ikon kirim ────────────────────────────────────────────────────────────────
const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)

const IconTemplate = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
)

// ── Bubble pesan ──────────────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn, showAvatar, senderName }) {
  // System message
  if (msg.type === 'system') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
        <span style={{
          fontSize: 11, color: 'var(--k-muted)', fontWeight: 600,
          background: 'var(--k-surface)', padding: '4px 14px',
          borderRadius: 100, border: '1px solid var(--k-border)',
        }}>
          {msg.content}
        </span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row',
      alignItems: 'flex-end', gap: 8, marginBottom: 4,
      animation: 'msgIn 0.18s ease',
    }}>
      {/* Avatar (hanya pesan orang lain) */}
      {!isOwn && (
        <div style={{ flexShrink: 0, marginBottom: 16 }}>
          {showAvatar
            ? <Avatar name={senderName} size={28} />
            : <div style={{ width: 28 }} />
          }
        </div>
      )}

      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
        {/* Nama pengirim */}
        {!isOwn && showAvatar && (
          <p style={{ fontSize: 11, color: 'var(--k-muted)', fontWeight: 600, marginBottom: 3, marginLeft: 2 }}>
            {senderName}
          </p>
        )}

        {/* Bubble */}
        <div style={{
          padding: '10px 14px',
          borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isOwn
            ? 'linear-gradient(135deg, #00C896, #00A87D)'
            : 'var(--k-card2)',
          border: isOwn ? 'none' : '1px solid var(--k-border)',
          boxShadow: isOwn ? '0 2px 10px rgba(0,200,150,0.25)' : '0 1px 4px rgba(0,0,0,0.2)',
          opacity: msg.is_blocked ? 0.45 : 1,
          position: 'relative',
        }}>
          {/* Badge template */}
          {msg.type === 'template' && !msg.is_blocked && (
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
              color: isOwn ? 'rgba(12,12,22,0.55)' : 'var(--k-accent)',
              marginBottom: 4, textTransform: 'uppercase',
            }}>
              📋 Template
            </p>
          )}

          {/* Konten */}
          {msg.is_blocked ? (
            <span style={{ fontSize: 12, fontStyle: 'italic',
              color: isOwn ? 'rgba(12,12,22,0.6)' : 'var(--k-muted)',
              textDecoration: 'line-through' }}>
              {isOwn ? 'Pesan diblokir — mengandung kontak/link' : '[Pesan diblokir]'}
            </span>
          ) : (
            <p style={{
              fontSize: 14, lineHeight: 1.55, wordBreak: 'break-word',
              color: isOwn ? '#0C0C16' : 'var(--k-text)',
            }}>
              {msg.content}
            </p>
          )}
        </div>

        {/* Waktu */}
        <p style={{
          fontSize: 10, color: 'var(--k-muted)', marginTop: 3,
          marginLeft: isOwn ? 0 : 2, marginRight: isOwn ? 2 : 0,
        }}>
          {formatTime(msg.created_at)}
        </p>
      </div>
    </div>
  )
}

// ── Divider tanggal ───────────────────────────────────────────────────────────
function DateDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 10px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--k-border)' }} />
      <span style={{ fontSize: 11, color: 'var(--k-muted)', fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--k-border)' }} />
    </div>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
function playNotif() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
  } catch {}
}

export default function ChatPage() {
  const { id: orderId } = useParams()
  const { user }        = useAuth()
  const location        = useLocation()
  const isMitra         = location.pathname.startsWith('/mitra/')
  const backTo          = isMitra ? '/mitra/orders' : `/orders/${orderId}/tracking`
  const { room, messages, templates, loading, sendMessage, suspended } = useChatRoom(orderId)

  const [input,         setInput]         = useState('')
  const [sending,       setSending]       = useState(false)
  const [warning,       setWarning]       = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const bottomRef  = useRef(null)
  const textareaRef = useRef(null)

  const prevMsgCount = useRef(0)

  // Auto-scroll + suara notifikasi saat pesan baru
  useEffect(() => {
    const count = messages.length
    if (count > prevMsgCount.current) {
      const last = messages[count - 1]
      // Bunyi hanya untuk pesan masuk dari orang lain
      const isOwn = last?.sender_id === user?.id || last?.sender?.id === user?.id
      if (!isOwn && prevMsgCount.current > 0) playNotif()
    }
    prevMsgCount.current = count
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, user])

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [])

  const handleSend = async (content, type = 'text') => {
    if (!content.trim() || sending) return
    setSending(true); setWarning(null)
    const res = await sendMessage(content, type)
    if (res?.warning) setWarning(res.warning)
    setInput(''); setSending(false); setShowTemplates(false)
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input) }
  }

  // Sisipkan divider tanggal
  const renderedItems = []
  let lastDate = ''
  messages.forEach((msg, i) => {
    const d = new Date(msg.created_at).toDateString()
    if (d !== lastDate) {
      renderedItems.push({ type: 'divider', label: formatDateLabel(msg.created_at), key: `d-${i}` })
      lastDate = d
    }
    const prev = messages[i - 1]
    const showAvatar = !prev || prev.sender_id !== msg.sender_id || prev.type === 'system'
    renderedItems.push({ type: 'msg', msg, showAvatar, key: msg.id ?? i })
  })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 30, height: 30, border: '2.5px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Memuat percakapan...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--k-bg)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Header ── */}
      <nav style={{
        background: 'var(--k-surface)', borderBottom: '1px solid var(--k-border)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 30, flexShrink: 0,
      }}>
        <Link to={backTo} style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--k-card)', border: '1px solid var(--k-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--k-muted)', textDecoration: 'none', fontSize: 18, flexShrink: 0,
        }}>←</Link>

        {/* Icon chat */}
        <div style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
          background: 'var(--k-glow)', border: '1px solid rgba(0,200,150,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>💬</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--k-text)', lineHeight: 1.2 }}>
            Chat Order
          </p>
          <p style={{ fontSize: 11, color: 'var(--k-muted)', fontFamily: 'monospace' }}>
            #{orderId}
          </p>
        </div>

        {/* Badge keamanan */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 100, flexShrink: 0,
          background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)',
        }}>
          <span style={{ fontSize: 12 }}>🔒</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-accent)' }}>Aman</span>
        </div>
      </nav>

      {/* ── Warning banner ── */}
      {warning && (
        <div style={{
          margin: '10px 14px 0', padding: '10px 14px', borderRadius: 14, flexShrink: 0,
          background: 'rgba(246,173,85,0.08)', border: '1px solid rgba(246,173,85,0.25)',
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <p style={{ color: 'var(--k-warn)', fontSize: 13, lineHeight: 1.5 }}>{warning}</p>
        </div>
      )}

      {/* ── Area pesan ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px' }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 10 }}>
            <span style={{ fontSize: 48 }}>💬</span>
            <p style={{ color: 'var(--k-muted)', fontSize: 14, fontWeight: 600 }}>Belum ada pesan</p>
            <p style={{ color: 'var(--k-muted)', fontSize: 12 }}>Mulai percakapan dengan template di bawah</p>
          </div>
        ) : (
          renderedItems.map(item =>
            item.type === 'divider'
              ? <DateDivider key={item.key} label={item.label} />
              : <MessageBubble
                  key={item.key}
                  msg={item.msg}
                  isOwn={item.msg.sender_id === user?.id || item.msg.sender?.id === user?.id}
                  showAvatar={item.showAvatar}
                  senderName={item.msg.sender_name ?? item.msg.sender?.name}
                />
          )
        )}
        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {/* ── Template chips (slide-up) ── */}
      <div style={{
        flexShrink: 0, overflow: 'hidden',
        maxHeight: showTemplates ? 160 : 0,
        transition: 'max-height 0.25s ease',
        background: 'var(--k-surface)', borderTop: showTemplates ? '1px solid var(--k-border)' : 'none',
      }}>
        <div style={{ padding: '12px 14px 8px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--k-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Pesan Cepat
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 108, overflowY: 'auto' }}>
            {templates.map(t => (
              <button key={t.id} onClick={() => handleSend(t.text, 'template')} style={{
                textAlign: 'left', padding: '10px 14px', borderRadius: 12,
                background: 'var(--k-card)', border: '1px solid var(--k-border)',
                color: 'var(--k-sub)', fontSize: 13, cursor: 'pointer',
                transition: 'all 0.15s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--k-glow)'; e.currentTarget.style.color = 'var(--k-accent)'; e.currentTarget.style.borderColor = 'rgba(0,200,150,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--k-card)'; e.currentTarget.style.color = 'var(--k-sub)'; e.currentTarget.style.borderColor = 'var(--k-border)' }}
              >
                {t.text}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Banner chat disuspend ── */}
      {suspended && (
        <div style={{
          flexShrink: 0, background: 'rgba(245,101,101,0.08)',
          borderTop: '1px solid rgba(245,101,101,0.25)',
          padding: '12px 16px', textAlign: 'center',
        }}>
          <p style={{ color: '#F56565', fontSize: 13, fontWeight: 700 }}>
            🚫 Chat ini dinonaktifkan karena pelanggaran berulang.
          </p>
          <p style={{ color: 'var(--k-muted)', fontSize: 11, marginTop: 4 }}>
            Hubungi admin untuk informasi lebih lanjut.
          </p>
        </div>
      )}

      {/* ── Input area ── */}
      <div style={{
        flexShrink: 0,
        background: 'var(--k-surface)', borderTop: '1px solid var(--k-border)',
        padding: '10px 14px 20px',
        display: 'flex', alignItems: 'flex-end', gap: 8,
      }}>
        {/* Tombol template */}
        <button onClick={() => setShowTemplates(s => !s)} style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: showTemplates ? 'var(--k-glow)' : 'var(--k-card)',
          border: `1px solid ${showTemplates ? 'rgba(0,200,150,0.35)' : 'var(--k-border)'}`,
          color: showTemplates ? 'var(--k-accent)' : 'var(--k-muted)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}>
          <IconTemplate />
        </button>

        {/* Textarea */}
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); resizeTextarea() }}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={suspended}
            placeholder={suspended ? 'Chat dinonaktifkan.' : 'Tulis pesan... (Enter kirim)'}
            style={{
              width: '100%', background: 'var(--k-card)', color: 'var(--k-text)',
              border: '1.5px solid var(--k-border)', borderRadius: 16,
              padding: '10px 14px', fontSize: 14, lineHeight: 1.5,
              outline: 'none', resize: 'none', fontFamily: 'inherit',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              maxHeight: 120, overflow: 'auto',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--k-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--k-glow)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--k-border)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {/* Tombol kirim */}
        <button onClick={() => handleSend(input)} disabled={!input.trim() || sending} style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: input.trim() && !sending ? 'var(--k-accent)' : 'var(--k-card)',
          border: `1px solid ${input.trim() && !sending ? 'transparent' : 'var(--k-border)'}`,
          color: input.trim() && !sending ? '#0C0C16' : 'var(--k-muted)',
          cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          boxShadow: input.trim() && !sending ? '0 3px 10px rgba(0,200,150,0.35)' : 'none',
        }}>
          {sending
            ? <div style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : <IconSend />
          }
        </button>
      </div>
    </div>
  )
}
