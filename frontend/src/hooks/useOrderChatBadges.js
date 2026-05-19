import { useEffect, useState, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import echo from '../services/echo'
import api from '../services/api'

function playChatSound() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    // Nada pendek "ting" — khas notifikasi chat
    [[1047, 0], [1319, 0.12]].forEach(([freq, when]) => {
      const osc = ctx.createOscillator()
      osc.connect(gain); osc.type = 'sine'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0.3, ctx.currentTime + when)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + 0.25)
      osc.start(ctx.currentTime + when); osc.stop(ctx.currentTime + when + 0.28)
    })
    if (ctx.state === 'suspended') ctx.resume()
  } catch {}
}

// orderIds: array string/number ID order aktif
export default function useOrderChatBadges(orderIds) {
  const [unread, setUnread] = useState({})   // { [orderId]: true }
  const roomMap   = useRef({})               // { [orderId]: roomId }
  const location  = useLocation()
  const locRef    = useRef(location.pathname)

  useEffect(() => { locRef.current = location.pathname }, [location.pathname])

  // Bersihkan badge saat user masuk halaman chat
  useEffect(() => {
    const match = locRef.current.match(/orders\/(\d+)\/chat/)
    if (match) markRead(match[1])
  }, [location.pathname]) // eslint-disable-line

  useEffect(() => {
    if (!orderIds?.length) return
    const cleanups = []

    orderIds.forEach(orderId => {
      if (roomMap.current[orderId]) return // sudah subscribe

      api.get(`/chat/orders/${orderId}`)
        .then(res => {
          const roomId = res.data.room?.id
          if (!roomId) return
          roomMap.current[orderId] = roomId

          const ch = echo.channel(`chat.${roomId}`)
          ch.listen('.message.new', (data) => {
            // Cek apakah user sedang buka chat order ini
            const path = locRef.current
            const onThisChat = path.includes(`/orders/${orderId}/chat`) ||
                               path.includes(`/mitra/orders/${orderId}/chat`)
            if (!onThisChat) {
              playChatSound()
              setUnread(prev => ({ ...prev, [String(orderId)]: true }))
            }
          })
          cleanups.push(() => echo.leave(`chat.${roomId}`))
        })
        .catch(() => {})
    })

    return () => {
      cleanups.forEach(fn => fn())
      roomMap.current = {}
    }
  }, [orderIds?.join?.(',')]) // eslint-disable-line

  const markRead = useCallback((orderId) => {
    setUnread(prev => { const n = { ...prev }; delete n[String(orderId)]; return n })
  }, [])

  return { unread, markRead }
}
