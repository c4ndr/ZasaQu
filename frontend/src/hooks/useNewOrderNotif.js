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

// ── Hook utama ────────────────────────────────────────────────────────────────
export default function useNewOrderNotif(vehicleType) {
  const [pendingOrders, setPendingOrders] = useState([])
  const seenIds      = useRef(new Set())
  const dismissedIds = useRef(new Set())
  const initialized  = useRef(false)

  const addOrder = useCallback((order) => {
    if (seenIds.current.has(order.id))    return
    if (dismissedIds.current.has(order.id)) return
    seenIds.current.add(order.id)
    playOrderSound()
    showNewOrderNotif(order)   // notifikasi sistem (notification bar)
    setPendingOrders(prev => prev.find(o => o.id === order.id) ? prev : [order, ...prev])
  }, [])

  const removeOrder = useCallback((orderId) => {
    dismissedIds.current.add(orderId)
    setPendingOrders(prev => prev.filter(o => o.id !== orderId))
  }, [])

  // Polling fallback setiap 8 detik
  useEffect(() => {
    if (!vehicleType) return
    const poll = async () => {
      try {
        const res    = await api.get('/mitra/orders/available')
        const orders = res.data ?? []
        if (!initialized.current) {
          orders.forEach(o => seenIds.current.add(o.id))
          initialized.current = true
          return
        }
        orders.forEach(o => addOrder(o))
        setPendingOrders(prev => prev.filter(p => orders.some(o => o.id === p.id)))
      } catch {}
    }
    poll()
    const timer = setInterval(poll, 8000)
    return () => clearInterval(timer)
  }, [vehicleType, addOrder])

  // WebSocket real-time
  useEffect(() => {
    if (!vehicleType) return
    const ch = echo.channel(`mitra.${vehicleType}`)
    ch.listen('.order.new',   (data) => addOrder(data))
    ch.listen('.order.taken', (data) => {
      removeOrder(data.order_id)
      setPendingOrders(prev => prev.filter(o => o.id !== data.order_id))
    })
    return () => echo.leave(`mitra.${vehicleType}`)
  }, [vehicleType, addOrder, removeOrder])

  return { pendingOrders, dismiss: removeOrder }
}
