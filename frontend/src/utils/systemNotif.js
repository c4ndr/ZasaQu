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
let _chimeCtx = null
function getChimeCtx() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!_chimeCtx) _chimeCtx = new AC()
  return _chimeCtx
}

export async function playNewOrderChime() {
  try {
    const ctx = getChimeCtx()
    if (!ctx) return
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
    if (ctx.state !== 'running') return
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
