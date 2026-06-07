import { isNative } from './nativePlatform'

// ── Permission ────────────────────────────────────────────────────────────────

export async function requestNotifPermission() {
  if (isNative) return true // permission diminta saat initPushNotifications di App.jsx
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied')  return false
  return (await Notification.requestPermission()) === 'granted'
}

// ── Tampilkan notifikasi ───────────────────────────────────────────────────────

export function showOrderStatusNotif({ emoji, message, order_number }) {
  if (isNative) return // di native, notif ditampilkan oleh FCM (sudah dari backend)
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const n = new Notification(`${emoji ?? '📦'} Update Order ${order_number ?? ''}`.trim(), {
      body: message,
      icon: '/favicon.ico',
      tag:  `order-status-${Date.now()}`,
    })
    n.onclick = () => { window.focus(); n.close() }
  } catch {}
}

// ── Bunyi notifikasi order masuk (merchant) — berbunyi 3x ─────────────────────
// AudioContext browser hanya bisa "running" jika dibuka dari gesture user
// (klik/tap/keydown). Event order baru datang dari WebSocket di background,
// jadi context harus di-unlock LEBIH DULU dari interaksi pertama merchant —
// sama seperti pola di useAdminAlert.js — baru aman diputar dari listener WS.
let _chimeCtx = null
let _chimeUnlockAdded = false

function unlockChimeCtx() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  if (!_chimeCtx) _chimeCtx = new AC()
  if (_chimeCtx.state !== 'running') _chimeCtx.resume().catch(() => {})
}

export function setupChimeUnlock() {
  if (_chimeUnlockAdded) return
  _chimeUnlockAdded = true
  const handler = () => unlockChimeCtx()
  document.addEventListener('click',      handler, { once: true, capture: true })
  document.addEventListener('touchstart', handler, { once: true, capture: true })
  document.addEventListener('keydown',    handler, { once: true, capture: true })
}

async function getChimeCtx() {
  if (!_chimeCtx) return null                         // belum ada gesture, hentikan
  if (_chimeCtx.state !== 'running') {
    try { await _chimeCtx.resume() } catch {}
  }
  return _chimeCtx.state === 'running' ? _chimeCtx : null
}

export async function playNewOrderChime() {
  try {
    const ctx = await getChimeCtx()
    if (!ctx) return
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    // "Ding-dong" diulang 3 kali agar merchant pasti dengar walau tidak menatap layar
    ;[0, 0.7, 1.4].forEach(base => {
      ;[[784, base], [1046, base + 0.2]].forEach(([freq, when]) => {
        const osc = ctx.createOscillator()
        osc.connect(gain)
        osc.type = 'sine'
        osc.frequency.value = freq
        const t = ctx.currentTime + when
        gain.gain.setValueAtTime(0.5, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
        osc.start(t)
        osc.stop(t + 0.4)
      })
    })
  } catch {}
  try { navigator.vibrate?.([250, 100, 250, 100, 250]) } catch {}
}

export function showNewOrderNotif({ shipping_fee, pickup_address }) {
  if (isNative) return // di native, notif ditampilkan oleh FCM (sudah dari backend)
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const n = new Notification('🚀 Order Baru Masuk!', {
      body: `Rp ${Number(shipping_fee).toLocaleString('id-ID')} · ${pickup_address}`,
      icon: '/favicon.ico',
      tag:  `new-order-${Date.now()}`,
      requireInteraction: true,
    })
    n.onclick = () => { window.focus(); n.close() }
  } catch {}
}
