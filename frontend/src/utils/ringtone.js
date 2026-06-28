// Singleton audio manager untuk ringtone & ringback.
// Android native: pakai ringtone_call.mp3 via AgoraVoice plugin (ring stream, volume penuh).
// Web/debug: Web Audio API oscillator.

import { Capacitor, registerPlugin } from '@capacitor/core'

const IS_ANDROID = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
const AgoraVoice = IS_ANDROID ? registerPlugin('AgoraVoice') : null

// ─── RINGTONE (callee) ───────────────────────────────────────────────────────

let ringCtx   = null
let ringTimer = null
let ringActive = false

function getRingCtx() {
  if (!ringCtx || ringCtx.state === 'closed') {
    ringCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return ringCtx
}

async function playRingCycle() {
  try {
    const ctx = getRingCtx()
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
    if (ctx.state !== 'running') return

    const now   = ctx.currentTime
    // Nada lebih keras (gain 0.9) dan lebih panjang
    const notes = [
      { freq: 523, t: 0.00 },  // C5
      { freq: 659, t: 0.20 },  // E5
      { freq: 784, t: 0.40 },  // G5
      { freq: 659, t: 0.60 },  // E5
      { freq: 784, t: 0.80 },  // G5
      { freq: 1047, t: 1.00 }, // C6
    ]

    notes.forEach(({ freq, t }) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'triangle'  // lebih keras dari 'sine'
      osc.frequency.value = freq
      const start = now + t
      const end   = start + 0.28
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.85, start + 0.02)
      gain.gain.setValueAtTime(0.85, end - 0.04)
      gain.gain.linearRampToValueAtTime(0, end)
      osc.start(start)
      osc.stop(end)
    })
  } catch {}
}

export function startRingtone() {
  if (ringActive) return
  ringActive = true

  if (IS_ANDROID) {
    try { AgoraVoice.playRingtone() } catch {}
    return
  }

  // Getar kuat pola panggilan masuk
  try { navigator.vibrate?.([600, 200, 600, 200, 600, 800]) } catch {}

  playRingCycle()
  ringTimer = setInterval(() => {
    if (!ringActive) return
    try { navigator.vibrate?.([600, 200, 600, 200, 600, 800]) } catch {}
    playRingCycle()
  }, 2200)
}

export function stopRingtone() {
  ringActive = false
  clearInterval(ringTimer)
  ringTimer = null

  if (IS_ANDROID) {
    try { AgoraVoice.stopRingtone() } catch {}
    return Promise.resolve()
  }

  try { navigator.vibrate?.(0) } catch {}
  if (ringCtx && ringCtx.state !== 'closed') {
    const p = ringCtx.close().catch(() => {})
    ringCtx = null
    return p
  }
  return Promise.resolve()
}

// ─── RINGBACK (caller — nada tunggu "tut...tut...tut...") ───────────────────

let rbCtx    = null
let rbTimer  = null
let rbActive = false

function getRbCtx() {
  if (!rbCtx || rbCtx.state === 'closed') {
    rbCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return rbCtx
}

async function playRingbackBeep() {
  try {
    const ctx = getRbCtx()
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
    if (ctx.state !== 'running') return

    const now = ctx.currentTime
    // Dua beep pendek — "tut-tut"
    ;[0, 0.6].forEach(offset => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 425  // nada dial standar
      const t = now + offset
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.4, t + 0.02)
      gain.gain.setValueAtTime(0.4, t + 0.38)
      gain.gain.linearRampToValueAtTime(0, t + 0.40)
      osc.start(t)
      osc.stop(t + 0.45)
    })
  } catch {}
}

export function startRingback() {
  if (rbActive) return
  rbActive = true
  playRingbackBeep()
  rbTimer = setInterval(() => {
    if (!rbActive) return
    playRingbackBeep()
  }, 3500)
}

export function stopRingback() {
  rbActive = false
  clearInterval(rbTimer)
  rbTimer = null
  if (rbCtx && rbCtx.state !== 'closed') {
    const p = rbCtx.close().catch(() => {})
    rbCtx = null
    return p
  }
  return Promise.resolve()
}
