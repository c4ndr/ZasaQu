import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { useAuth } from '../context/AuthContext'
import echo from '../services/echo'
import {
  showBubble, resetBubbleBadge,
  hasOverlayPermission, requestOverlayPermission,
  hasBatteryOptimizationExemption, requestBatteryOptimization,
} from '../services/floatingBubble'

const IS_ANDROID = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

function resolveChatPath(role, orderType, orderId) {
  const isMitra = role?.startsWith('mitra')
  if (orderType === 'zasaride') return isMitra ? `/ride/mitra/chat/${orderId}` : `/ride/chat/${orderId}`
  if (orderType === 'zasafood') return isMitra ? `/mitra/food/orders/${orderId}/chat` : `/food/orders/${orderId}/chat`
  if (orderType === 'zasamart') return isMitra ? `/mitra/mart/orders/${orderId}/chat` : `/mart/orders/${orderId}/chat`
  if (orderType === 'zasahome') return role === 'home_provider' ? `/home/provider/orders/${orderId}/chat` : `/home/orders/${orderId}/chat`
  return isMitra ? `/mitra/orders/${orderId}/chat` : `/orders/${orderId}/chat`
}

export default function useFloatingBubble() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const userRef     = useRef(user)
  const locationRef = useRef(location)
  useEffect(() => { userRef.current     = user },     [user])
  useEffect(() => { locationRef.current = location }, [location])

  const pendingRouteRef = useRef(typeof window !== 'undefined' ? (window.__bubbleRoute || null) : null)

  // ── Listener event bubbleNavigate dari MainActivity ───────────────────────
  useEffect(() => {
    if (!IS_ANDROID) return
    const handler = (e) => {
      const route = e.detail || window.__bubbleRoute
      if (!route) return
      window.__bubbleRoute = null
      if (userRef.current) {
        if (locationRef.current.pathname === route) {
          // Sudah di halaman chat → tutup chat, BUBBLE TETAP (tidak dismissBubble)
          navigate(-1)
        } else {
          // Buka halaman chat + reset badge unread
          navigate(route, { replace: false })
          resetBubbleBadge()
        }
      } else {
        pendingRouteRef.current = route
      }
    }
    window.addEventListener('bubbleNavigate', handler)
    return () => window.removeEventListener('bubbleNavigate', handler)
  }, [navigate])

  // Consume pending route saat user baru login (cold start)
  useEffect(() => {
    if (!IS_ANDROID || !user || !pendingRouteRef.current) return
    const route = pendingRouteRef.current
    pendingRouteRef.current = null
    navigate(route, { replace: false })
    resetBubbleBadge()
  }, [user?.id, navigate])

  // ── Minta izin overlay sekali saat pertama login ──────────────────────────
  useEffect(() => {
    if (!IS_ANDROID || !user) return

    async function ensurePermissions() {
      const overlayGranted = await hasOverlayPermission()
      if (!overlayGranted) {
        await requestOverlayPermission()
        return // battery akan diminta setelah user balik dari Settings
      }
      const batteryExempt = await hasBatteryOptimizationExemption()
      if (!batteryExempt) requestBatteryOptimization()
    }

    ensurePermissions()
  }, [user?.id])

  // ── Re-check izin saat app kembali ke foreground (setelah dari Settings) ──
  useEffect(() => {
    if (!IS_ANDROID || !user) return
    let handle
    App.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive) return
      const overlayGranted = await hasOverlayPermission()
      if (!overlayGranted) return
      const batteryExempt = await hasBatteryOptimizationExemption()
      if (!batteryExempt) requestBatteryOptimization()
    }).then(h => { handle = h })
    return () => { handle?.remove() }
  }, [user?.id])

  // ── Subscribe pesan chat masuk via WebSocket ──────────────────────────────
  useEffect(() => {
    if (!IS_ANDROID || !user) return

    const channel = echo.private(`user.${user.id}`)

    const handleChatInbox = (data) => {
      const { order_id, order_type, sender_name, content } = data
      if (!order_id || !order_type) return

      const chatPath = resolveChatPath(user.role, order_type, order_id)

      // Jangan tampilkan bubble jika user sudah berada di halaman chat ini
      if (locationRef.current.pathname === chatPath) return

      const preview = content?.length > 35 ? content.slice(0, 35) + '…' : (content || '')
      const label   = sender_name ? `${sender_name}: ${preview}` : 'Pesan baru'

      showBubble({ emoji: '💬', label, route: chatPath })
    }

    channel.listen('.chat.inbox', handleChatInbox)

    return () => {
      channel.stopListening('.chat.inbox')
      echo.leave(`user.${user.id}`)
    }
  }, [user?.id, user?.role])
}
