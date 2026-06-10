// Nada dering panggilan masuk — Web Audio API
// Singleton agar tidak ada dua dering bersamaan dari komponen berbeda.

let audioCtx  = null
let loopTimer = null
let active    = false

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

// Satu siklus nada: naik 3 nada (Do-Mi-Sol) lalu jeda — mirip nada dering HP modern
async function playCycle() {
  try {
    const ctx = getCtx()
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
    if (ctx.state !== 'running') return

    const now   = ctx.currentTime
    const notes = [
      { freq: 523, t: 0.00 },  // C5
      { freq: 659, t: 0.18 },  // E5
      { freq: 784, t: 0.36 },  // G5
      { freq: 659, t: 0.54 },  // E5 (turun)
      { freq: 784, t: 0.72 },  // G5
    ]

    notes.forEach(({ freq, t }) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type          = 'sine'
      osc.frequency.value = freq

      const start = now + t
      const end   = start + 0.25
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.35, start + 0.02)
      gain.gain.setValueAtTime(0.35, end - 0.03)
      gain.gain.linearRampToValueAtTime(0, end)

      osc.start(start)
      osc.stop(end)
    })
  } catch {}
}

export function startRingtone() {
  if (active) return
  active = true

  // Getar pola panggilan masuk
  try { navigator.vibrate?.([400, 200, 400, 600]) } catch {}

  playCycle()
  // Ulangi setiap 1.8 detik (siklus 0.97 detik + jeda ~0.83 detik)
  loopTimer = setInterval(() => {
    if (!active) return
    try { navigator.vibrate?.([400, 200, 400, 600]) } catch {}
    playCycle()
  }, 1800)
}

export function stopRingtone() {
  active = false
  clearInterval(loopTimer)
  loopTimer = null
  try { navigator.vibrate?.(0) } catch {}
  // Tutup AudioContext sepenuhnya agar tidak konflik dengan WebRTC getUserMedia.
  // Mengembalikan Promise agar pemanggil bisa await sebelum getUserMedia.
  if (audioCtx && audioCtx.state !== 'closed') {
    const p = audioCtx.close().catch(() => {})
    audioCtx = null
    return p
  }
  return Promise.resolve()
}
