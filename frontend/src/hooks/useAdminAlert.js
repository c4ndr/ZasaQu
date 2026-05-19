import { useState, useCallback, useEffect } from 'react'

// ── AudioContext singleton ────────────────────────────────────────────────────
let _ctx = null
let _unlockListenerAdded = false

// Dibuat / di-resume dari dalam klik handler (user gesture)
function unlockCtx() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  if (!_ctx) _ctx = new AC()
  if (_ctx.state !== 'running') _ctx.resume().catch(() => {})
}

// Daftarkan listener sekali — unlock AudioContext pada interaksi PERTAMA apapun
// Ini memastikan ctx siap sebelum suara pertama dibunyikan dari polling
function setupUnlockOnFirstInteraction() {
  if (_unlockListenerAdded) return
  _unlockListenerAdded = true
  const handler = () => unlockCtx()
  document.addEventListener('click',      handler, { once: true, capture: true })
  document.addEventListener('touchstart', handler, { once: true, capture: true })
  document.addEventListener('keydown',    handler, { once: true, capture: true })
}

// Hanya gunakan _ctx yang sudah ada — jangan buat baru dari polling
async function getCtx() {
  if (!_ctx) return null                                 // belum ada gesture, hentikan
  if (_ctx.state !== 'running') {
    try { await _ctx.resume() } catch {}
  }
  return _ctx.state === 'running' ? _ctx : null
}

// ── Play nada ─────────────────────────────────────────────────────────────────
async function playTones(tones) {
  const ctx = await getCtx()
  if (!ctx) return
  tones.forEach(([freq, delay, dur, type = 'sine', vol = 0.85]) => {
    try {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type            = type
      osc.frequency.value = freq
      const t = ctx.currentTime + delay
      gain.gain.setValueAtTime(vol, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
      osc.start(t)
      osc.stop(t + dur + 0.01)
    } catch {}
  })
}

export async function playDepositSound() {
  await playTones([
    [880,  0.00, 0.18], [1100, 0.22, 0.18], [1320, 0.44, 0.25],
    [440,  0.00, 0.06, 'sawtooth', 0.2],
    [440,  0.22, 0.06, 'sawtooth', 0.2],
    [880,  0.85, 0.18], [1100, 1.07, 0.18], [1320, 1.29, 0.28],
  ])
  try { navigator.vibrate?.([150, 80, 150, 80, 300]) } catch {}
}

export async function playWithdrawSound() {
  await playTones([
    [660,  0.00, 0.20], [880,  0.24, 0.20], [550,  0.48, 0.28],
    [330,  0.48, 0.08, 'sawtooth', 0.3],
    [660,  0.90, 0.20], [880,  1.14, 0.20], [550,  1.38, 0.30],
  ])
  try { navigator.vibrate?.([200, 80, 200, 80, 400]) } catch {}
}

// ── Notifikasi browser (via Service Worker agar muncul di background) ─────────
function showBrowserNotif(title, body, tag) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const opts = {
    body,
    icon:             '/icon-192.png',
    badge:            '/icon-72.png',
    tag,
    requireInteraction: true,
    vibrate:          [200, 100, 200],
    data:             { url: tag === 'deposit-alert' ? '/admin/topup' : '/admin/withdraw' },
  }
  try {
    navigator.serviceWorker?.ready
      .then(reg => reg.showNotification(title, opts))
      .catch(() => new Notification(title, opts))
  } catch {
    try { new Notification(title, opts) } catch {}
  }
}

// ── Service Worker ────────────────────────────────────────────────────────────
async function registerSW() {
  if (!('serviceWorker' in navigator)) return
  try { await navigator.serviceWorker.register('/sw-admin.js', { scope: '/' }) } catch {}
}

// ── Hook utama ────────────────────────────────────────────────────────────────
export default function useAdminAlert() {
  const [notifStatus, setNotifStatus] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  useEffect(() => {
    // Daftarkan unlock listener — ctx akan dibuat pada interaksi pertama admin
    setupUnlockOnFirstInteraction()
    registerSW()
  }, [])

  // Tombol "Aktifkan" — unlock audio + minta izin notifikasi
  const activate = useCallback(async () => {
    // Langsung unlock dari sini (ini adalah klik handler)
    unlockCtx()

    if (typeof Notification === 'undefined') return

    if (Notification.permission === 'granted') {
      setNotifStatus('granted')
      playDepositSound() // test suara
      return
    }
    if (Notification.permission === 'denied') {
      setNotifStatus('denied')
      playDepositSound() // tetap test suara walau notif ditolak
      return
    }

    // 'default' → tampilkan dialog izin
    try {
      const result = await Notification.requestPermission()
      setNotifStatus(result)
      playDepositSound()
    } catch {
      Notification.requestPermission(result => {
        setNotifStatus(result)
        playDepositSound()
      })
    }
  }, [])

  const alertDeposit = useCallback((count = 1) => {
    playDepositSound()
    showBrowserNotif(
      '💰 Deposit Baru Masuk!',
      `${count} permintaan top up menunggu konfirmasi`,
      'deposit-alert',
    )
  }, [])

  const alertWithdraw = useCallback((count = 1) => {
    playWithdrawSound()
    showBrowserNotif(
      '💸 Withdraw Baru!',
      `${count} permintaan withdraw mitra perlu diproses`,
      'withdraw-alert',
    )
  }, [])

  return { notifStatus, activate, alertDeposit, alertWithdraw }
}
