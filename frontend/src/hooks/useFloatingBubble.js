import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../context/AuthContext'
import echo from '../services/echo'
import api from '../services/api'
import { showBubble, dismissBubble, hasOverlayPermission, requestOverlayPermission } from '../services/floatingBubble'

const IS_ANDROID = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

const DONE_STATUSES = ['completed', 'cancelled', 'rejected']

const MODULE_META = {
  zasaride: { emoji: '🚗', label: 'Ride aktif',  customerRoute: '/ride',             mitraRoute: '/mitra/ride' },
  zasago:   { emoji: '🛵', label: 'Order aktif', customerRoute: '/orders',           mitraRoute: '/mitra/orders' },
  zasafood: { emoji: '🍔', label: 'Food aktif',  customerRoute: '/food/orders',      mitraRoute: '/mitra/food/orders' },
  zasamart: { emoji: '🛍️', label: 'Mart aktif',  customerRoute: '/mart/orders',      mitraRoute: '/mitra/mart/orders' },
  zasahome: { emoji: '🏠', label: 'Home aktif',  customerRoute: '/home/orders',      mitraRoute: null },
  zasaserv: { emoji: '🔧', label: 'Serv aktif',  customerRoute: '/serv/orders',      mitraRoute: null },
}

function pickFirst(items) {
  return items.find(Boolean) ?? null
}

async function fetchActive(endpoint, params = {}) {
  try {
    const r = await api.get(endpoint, { params: { per_page: 5, ...params } })
    const list = r.data?.data ?? r.data ?? []
    return Array.isArray(list) ? list.filter(o => !DONE_STATUSES.includes(o.status)) : []
  } catch {
    return []
  }
}

export default function useFloatingBubble() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const timerRef = useRef(null)

  // Navigasi dari bubble tap (event dari MainActivity.java)
  useEffect(() => {
    if (!IS_ANDROID) return
    const handler = (e) => {
      const route = e.detail || window.__bubbleRoute
      if (route) navigate(route, { replace: false })
    }
    window.addEventListener('bubbleNavigate', handler)
    return () => window.removeEventListener('bubbleNavigate', handler)
  }, [navigate])

  // Minta izin overlay saat pertama kali user login
  useEffect(() => {
    if (!IS_ANDROID || !user) return
    hasOverlayPermission().then(granted => { if (!granted) requestOverlayPermission() })
  }, [user?.id])

  const syncBubble = useCallback(async () => {
    if (!user || !IS_ANDROID) return
    const role = user.role

    if (role === 'admin' || role === 'merchant' || role === 'seller') {
      dismissBubble(); return
    }

    const isMitra = role?.startsWith('mitra')

    if (isMitra) {
      // ── Mitra: cek order aktif di semua modul ─────────────────────────────
      const [goRes, foodRes, martRes, rideRes] = await Promise.allSettled([
        fetchActive('/mitra/orders'),
        fetchActive('/mitra/food/orders'),
        fetchActive('/mitra/mart/orders'),
        api.get('/ride/mitra/active').then(r => r.data?.order ? [r.data.order] : []).catch(() => []),
      ])

      const go   = goRes.status   === 'fulfilled' ? goRes.value   : []
      const food = foodRes.status === 'fulfilled' ? foodRes.value : []
      const mart = martRes.status === 'fulfilled' ? martRes.value : []
      const ride = rideRes.status === 'fulfilled' ? rideRes.value : []

      const activeModules = [
        ride.length  ? MODULE_META.zasaride : null,
        go.length    ? MODULE_META.zasago   : null,
        food.length  ? MODULE_META.zasafood : null,
        mart.length  ? MODULE_META.zasamart : null,
      ].filter(Boolean)

      const first = pickFirst(activeModules)
      if (first && first.mitraRoute) {
        showBubble({ emoji: first.emoji, label: first.label, route: first.mitraRoute })
      } else {
        dismissBubble()
      }
    } else {
      // ── Customer: cek order aktif di semua modul ─────────────────────────
      const [goRes, foodRes, martRes, homeRes, servRes, rideRes] = await Promise.allSettled([
        fetchActive('/orders'),
        fetchActive('/food/orders', { active_only: 1 }),
        fetchActive('/mart/orders'),
        fetchActive('/home/orders'),
        fetchActive('/serv/orders'),
        fetchActive('/ride/orders', { status: 'active' }),
      ])

      const go   = goRes.status   === 'fulfilled' ? goRes.value   : []
      const food = foodRes.status === 'fulfilled' ? foodRes.value : []
      const mart = martRes.status === 'fulfilled' ? martRes.value : []
      const home = homeRes.status === 'fulfilled' ? homeRes.value : []
      const serv = servRes.status === 'fulfilled' ? servRes.value : []
      const ride = rideRes.status === 'fulfilled' ? rideRes.value : []

      const activeModules = [
        ride.length  ? MODULE_META.zasaride : null,
        go.length    ? MODULE_META.zasago   : null,
        food.length  ? MODULE_META.zasafood : null,
        mart.length  ? MODULE_META.zasamart : null,
        home.length  ? MODULE_META.zasahome : null,
        serv.length  ? MODULE_META.zasaserv : null,
      ].filter(Boolean)

      const first = pickFirst(activeModules)
      if (first) {
        showBubble({ emoji: first.emoji, label: first.label, route: first.customerRoute })
      } else {
        dismissBubble()
      }
    }
  }, [user?.id, user?.role]) // eslint-disable-line

  // Polling tiap 15 detik
  useEffect(() => {
    if (!IS_ANDROID || !user) return
    syncBubble()
    timerRef.current = setInterval(syncBubble, 15000)
    return () => {
      clearInterval(timerRef.current)
      dismissBubble()
    }
  }, [syncBubble])

  // Real-time: mitra dengarkan incoming order baru langsung
  useEffect(() => {
    if (!IS_ANDROID || !user) return
    if (!user.role?.startsWith('mitra')) return

    const subChannels = []

    // ZasaGo / ZasaFood / ZasaMart new orders
    const vehicleType = user.role.replace('mitra_', '')
    const mitraCh = echo.private(`mitra.${vehicleType}`)
    mitraCh.listen('.order.new', () => {
      showBubble({ emoji: '📦', label: 'Order baru!', route: '/mitra/orders' })
    })
    subChannels.push(`mitra.${vehicleType}`)

    // ZasaRide incoming orders (public channel)
    const rideCh = echo.channel('ride.available')
    rideCh.listen('.ride.placed', () => {
      showBubble({ emoji: '🚗', label: 'Ride baru!', route: '/mitra/ride' })
    })
    subChannels.push('ride.available')

    return () => { subChannels.forEach(ch => echo.leave(ch)) }
  }, [user?.id, user?.role])
}
