import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { useAuth } from '../context/AuthContext'
import useChatRoom from '../hooks/useChatRoom'
import useVoiceCall from '../hooks/useVoiceCall'
import CallModal from '../components/CallModal'
import { peekIncomingCall } from '../services/callBuffer'

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

const STORAGE = import.meta.env.VITE_STORAGE_URL || ((import.meta.env.VITE_API_URL || '') + '/storage')

// ── Ikon kirim ────────────────────────────────────────────────────────────────
const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)

const IconCamera = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
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
          ) : msg.type === 'image' && msg.image_path ? (
            <div>
              <img
                src={`${STORAGE}/${msg.image_path}`}
                alt="foto"
                onClick={() => window.open(`${STORAGE}/${msg.image_path}`, '_blank')}
                style={{ maxWidth: 220, maxHeight: 280, borderRadius: 10, display: 'block', cursor: 'zoom-in', objectFit: 'cover' }}
              />
              {msg.content && (
                <p style={{ fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word', color: isOwn ? '#0C0C16' : 'var(--k-text)', marginTop: 6 }}>
                  {msg.content}
                </p>
              )}
            </div>
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

const _isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
const AgoraVoice = _isAndroid ? registerPlugin('AgoraVoice') : null

// ── Halaman utama ─────────────────────────────────────────────────────────────
let _notifCtx = null
function playNotif() {
  if (_isAndroid) {
    // FCM tidak mainkan suara saat foreground — play notif_chat.mp3 via native plugin
    try { AgoraVoice.playNotifChat() } catch {}
    return
  }
  try {
    if (!_notifCtx || _notifCtx.state === 'closed') {
      _notifCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx  = _notifCtx
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

// Derive orderType + backTo dari pathname
function deriveContext(pathname, orderId) {
  const p = pathname
  if (p.startsWith('/mitra/food/'))          return { orderType: 'zasafood', isMitra: true,  backTo: '/mitra/food/orders' }
  if (p.startsWith('/mitra/mart/'))          return { orderType: 'zasamart', isMitra: true,  backTo: '/mitra/mart/orders' }
  if (p.startsWith('/mitra/serv/'))          return { orderType: 'zasaserv', isMitra: true,  backTo: '/mitra/serv/orders' }
  if (p.startsWith('/mitra/'))              return { orderType: 'zasago',   isMitra: true,  backTo: '/mitra/orders' }
  if (p.startsWith('/ride/mitra/'))          return { orderType: 'zasaride', isMitra: true,  backTo: '/mitra/ride' }
  if (p.startsWith('/ride/'))               return { orderType: 'zasaride', isMitra: false, backTo: '/ride' }
  if (p.startsWith('/food/'))               return { orderType: 'zasafood', isMitra: false, backTo: `/food/orders/${orderId}` }
  if (p.startsWith('/mart/'))               return { orderType: 'zasamart', isMitra: false, backTo: `/mart/orders/${orderId}` }
  if (p.startsWith('/home/provider/orders/')) return { orderType: 'zasahome', isMitra: true,  backTo: '/home/provider' }
  if (p.startsWith('/home/orders/'))         return { orderType: 'zasahome', isMitra: false, backTo: `/home/orders/${orderId}` }
  if (p.startsWith('/serv/orders/'))           return { orderType: 'zasaserv',               isMitra: false, backTo: `/serv/orders/${orderId}` }
  if (p.startsWith('/serv/providers/'))        return { orderType: 'zasaserv_consult',         isMitra: false, backTo: `/serv/providers/${orderId}` }
  if (p.startsWith('/serv/provider/consults/')) return { orderType: 'zasaserv_provider_consult', isMitra: true,  backTo: '/serv/provider' }
  if (p.startsWith('/mart/sellers/') && p.endsWith('/consult')) return { orderType: 'mart_consult',         isMitra: false, backTo: `/mart/sellers/${orderId}` }
  if (p.startsWith('/seller/mart/chats/'))     return { orderType: 'mart_seller_consult',       isMitra: true,  backTo: '/seller/mart/chats' }
  return                                              { orderType: 'zasago',                   isMitra: false, backTo: `/orders/${orderId}/tracking` }
}

export default function ChatPage() {
  const { id: orderId } = useParams()
  const { user }        = useAuth()
  const location        = useLocation()
  const { orderType, backTo } = deriveContext(location.pathname, orderId)
  const otherName = location.state?.otherName ?? peekIncomingCall()?.callerName ?? null

  const { room, messages, templates, loading, sendMessage, suspended } = useChatRoom(orderId, orderType)
  const { callState, isMuted, isSpeaker, duration, iceState, remoteAudio, isCaller, callError, clearCallError,
          startCall, answerCall, endCall, toggleMute, toggleSpeaker } =
    useVoiceCall(orderId, orderType, user?.id)

  const [input,         setInput]         = useState('')
  const [sending,       setSending]       = useState(false)
  const [warning,       setWarning]       = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [imageFile,     setImageFile]     = useState(null)
  const [imagePreview,  setImagePreview]  = useState(null)
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleImagePick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null); setImagePreview(null)
  }

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

  const handleSend = async (content, type = 'text', imgFile = null) => {
    const hasText  = content.trim().length > 0
    const hasImage = !!imgFile
    if ((!hasText && !hasImage) || sending) return
    setSending(true); setWarning(null)
    const res = await sendMessage(content, type, imgFile || null)
    if (res?.warning) setWarning(res.warning)
    setInput(''); setSending(false); setShowTemplates(false)
    clearImage()
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input, 'text', imageFile) }
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
    <div style={{ minHeight: '100dvh', background: 'var(--k-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 30, height: 30, border: '2.5px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--k-muted)', fontSize: 14 }}>Memuat percakapan...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ height: '100dvh', background: 'var(--k-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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

        {/* Tombol telepon in-app */}
        <button
          onClick={callState === 'idle' ? startCall : endCall}
          style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0, border: 'none',
            background: callState !== 'idle'
              ? 'linear-gradient(135deg,#EF4444,#DC2626)'
              : 'rgba(0,200,150,0.12)',
            border: '1px solid ' + (callState !== 'idle' ? 'transparent' : 'rgba(0,200,150,0.25)'),
            cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {callState !== 'idle' ? '📵' : '📞'}
        </button>
      </nav>

      <CallModal
        callState={callState}
        isMuted={isMuted}
        isSpeaker={isSpeaker}
        duration={duration}
        iceState={iceState}
        remoteAudio={remoteAudio}
        otherName={otherName}
        isCaller={isCaller}
        onAnswer={answerCall}
        onEnd={endCall}
        onMute={toggleMute}
        onSpeaker={toggleSpeaker}
      />

      {/* ── Error panggilan ── */}
      {callError && (
        <div style={{
          position: 'fixed', top: 70, left: 12, right: 12, zIndex: 10001,
          background: '#DC2626', borderRadius: 14,
          padding: '14px 16px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
          boxShadow: '0 8px 30px rgba(239,68,68,0.45)',
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🎤</span>
          <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: 1.55, flex: 1 }}>{callError}</p>
          <button onClick={clearCallError} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            cursor: 'pointer', fontSize: 16, fontWeight: 700,
            flexShrink: 0, padding: '2px 8px', borderRadius: 8,
          }}>×</button>
        </div>
      )}

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

      {/* ── Preview gambar sebelum kirim ── */}
      {imagePreview && (
        <div style={{ flexShrink: 0, padding: '8px 14px 0', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={imagePreview} alt="preview" style={{ maxHeight: 120, maxWidth: 180, borderRadius: 10, objectFit: 'cover', display: 'block', border: '1.5px solid var(--k-border)' }} />
            <button onClick={clearImage} style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: '#EF4444', border: 'none', color: '#fff', fontWeight: 900, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
          </div>
          <span style={{ fontSize: 12, color: 'var(--k-muted)', paddingTop: 4 }}>Siap dikirim</span>
        </div>
      )}

      {/* ── Input area ── */}
      {/* input file tersembunyi */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagePick} />
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

        {/* Tombol kamera/foto */}
        <button onClick={() => fileInputRef.current?.click()} disabled={suspended} style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: imageFile ? 'rgba(99,102,241,0.15)' : 'var(--k-card)',
          border: `1px solid ${imageFile ? '#6366F1' : 'var(--k-border)'}`,
          color: imageFile ? '#6366F1' : 'var(--k-muted)',
          cursor: suspended ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconCamera />
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
            onFocus={e => {
              e.target.style.borderColor = 'var(--k-accent)'
              e.target.style.boxShadow = '0 0 0 3px var(--k-glow)'
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 300)
            }}
            onBlur={e => { e.target.style.borderColor = 'var(--k-border)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {/* Tombol kirim */}
        <button onClick={() => handleSend(input, 'text', imageFile)} disabled={(!input.trim() && !imageFile) || sending} style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: (input.trim() || imageFile) && !sending ? 'var(--k-accent)' : 'var(--k-card)',
          border: `1px solid ${(input.trim() || imageFile) && !sending ? 'transparent' : 'var(--k-border)'}`,
          color: (input.trim() || imageFile) && !sending ? '#0C0C16' : 'var(--k-muted)',
          cursor: (input.trim() || imageFile) && !sending ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          boxShadow: (input.trim() || imageFile) && !sending ? '0 3px 10px rgba(0,200,150,0.35)' : 'none',
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
