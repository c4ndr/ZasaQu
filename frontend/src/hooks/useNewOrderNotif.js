import { useEffect, useState, useRef, useCallback } from 'react'
import echo from '../services/echo'
import api from '../services/api'
import { showNewOrderNotif } from '../utils/systemNotif'

// ── AudioContext singleton ────────────────────────────────────────────────────
let audioCtx = null
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}
export function unlockAudio() {
  try { const ctx = getAudioCtx(); if (ctx.state === 'suspended') ctx.resume() } catch {}
}

export { requestNotifPermission } from '../utils/systemNotif'

// ── Bunyi + getar ─────────────────────────────────────────────────────────────
async function playOrderSound() {
  try { navigator.vibrate?.([300, 100, 300, 100, 500]) } catch {}
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
    if (ctx.state !== 'running') return
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    [[523,0],[659,0.18],[784,0.36],[659,0.54],[784,0.72]].forEach(([freq, when]) => {
      const osc = ctx.createOscillator()
      osc.connect(gain); osc.type = 'triangle'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0.4, ctx.currentTime + when)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + 0.3)
      osc.start(ctx.currentTime + when); osc.stop(ctx.currentTime + when + 0.35)
    })
  } catch {}
}

// ── Konfigurasi per modul ─────────────────────────────────────────────────────
const MODULES = [
  {
    key:      'zasago',
    endpoint: '/mitra/orders/available',
    wsEvent:  'order.new',
    label:    'ZasaGo',
    emoji:    '🛵',
  },
  {
    key:      'zasafood',
    endpoint: '/food/mitra/orders/available',
    wsEvent:  'food.order.new',
    label:    'ZasaFood',
    emoji:    '🍔',
  },
  {
    key:      'zasamart',
    endpoint: '/mart/mitra/orders/available',
    wsEvent:  'mart.order.new',
    label:    'ZasaMart',
    emoji:    '🛒',
  },
  {
    key:      'zasaride',
    endpoint: '/ride/mitra/available',
    wsEvent:  'ride.placed',
    label:    'ZasaRide',
    emoji:    '🚗',
  },
]

// ── Hook utama — handle semua modul sekaligus ─────────────────────────────────
export default function useNewOrderNotif(vehicleType) {
  const [pendingOrders, setPendingOrders] = useState([])
  const seenIds      = useRef(new Set())
  const dismissedIds = useRef(new Set())
  // Track inisialisasi per modul agar order yang sudah ada tidak di-alert
  const initializedModules = useRef(new Set())

  const addOrder = useCallback((order, module) => {
    const uid = `${module}:${order.id}`
    if (seenIds.current.has(uid))      return
    if (dismissedIds.current.has(uid)) return
    seenIds.current.add(uid)
    playOrderSound()
    showNewOrderNotif({ ...order, module })
    setPendingOrders(prev =>
      prev.find(o => o._uid === uid) ? prev : [{ ...order, _uid: uid, _module: module }, ...prev]
    )
  }, [])

  const removeOrder = useCallback((uid) => {
    dismissedIds.current.add(uid)
    setPendingOrders(prev => prev.filter(o => o._uid !== uid))
  }, [])

  // ── Polling per modul setiap 8 detik ─────────────────────────────────────
  useEffect(() => {
    if (!vehicleType) return

    const timers = MODULES.map(mod => {
      const poll = async () => {
        try {
          const res    = await api.get(mod.endpoint)
          const orders = res.data ?? []

          if (!initializedModules.current.has(mod.key)) {
            // Pertama kali — tandai semua order yang sudah ada agar tidak di-alert
            orders.forEach(o => seenIds.current.add(`${mod.key}:${o.id}`))
            initializedModules.current.add(mod.key)
            return
          }

          // Order baru yang belum pernah muncul
          orders.forEach(o => addOrder(o, mod.key))

          // Bersihkan order yang sudah tidak available dari pending list
          setPendingOrders(prev =>
            prev.filter(p => p._module !== mod.key || orders.some(o => `${mod.key}:${o.id}` === p._uid))
          )
        } catch {}
      }

      poll()
      return setInterval(poll, 8000)
    })

    return () => timers.forEach(t => clearInterval(t))
  }, [vehicleType, addOrder])

  // ── WebSocket real-time per modul ─────────────────────────────────────────
  useEffect(() => {
    if (!vehicleType) return

    const ch = echo.channel(`mitra.${vehicleType}`)

    MODULES.forEach(mod => {
      ch.listen(`.${mod.wsEvent}`, (data) => addOrder(data, mod.key))
    })

    // Order sudah diambil mitra lain — hapus dari pending
    ch.listen('.order.taken', (data) => {
      const uid = `zasago:${data.order_id}`
      removeOrder(uid)
    })

    return () => echo.leave(`mitra.${vehicleType}`)
  }, [vehicleType, addOrder, removeOrder])

  return { pendingOrders, dismiss: removeOrder }
}
