import { useEffect, useState, useRef } from 'react'
import echo from '../services/echo'
import api from '../services/api'

export default function useChatRoom(orderId) {
  const [room,      setRoom]      = useState(null)
  const [messages,  setMessages]  = useState([])
  const [templates, setTemplates] = useState([])
  const [loading,   setLoading]   = useState(true)
  const roomRef = useRef(null)

  const [suspended, setSuspended] = useState(false)

  // Muat room + pesan awal
  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    api.get(`/chat/orders/${orderId}`)
      .then(r => {
        setRoom(r.data.room)
        setMessages(r.data.messages)
        setTemplates(r.data.templates)
        setSuspended(r.data.room_suspended ?? false)
        roomRef.current = r.data.room
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orderId])

  // Subscribe WebSocket real-time
  useEffect(() => {
    if (!room) return
    const channel = echo.private(`chat.${room.id}`)
    channel.listen('.message.new', (data) => {
      setMessages(prev => prev.find(m => m.id === data.id) ? prev : [...prev, data])
    })
    return () => echo.leave(`chat.${room.id}`)
  }, [room])

  // Polling fallback setiap 5 detik — tangkap pesan yang mungkin terlewat WebSocket
  useEffect(() => {
    if (!orderId) return
    const timer = setInterval(() => {
      const r = roomRef.current
      if (!r) return
      api.get(`/chat/orders/${orderId}`)
        .then(res => {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id))
            const newMsgs = res.data.messages.filter(m => !existingIds.has(m.id))
            return newMsgs.length ? [...prev, ...newMsgs] : prev
          })
          if (res.data.room_suspended) setSuspended(true)
        })
        .catch(() => {})
    }, 5000)
    return () => clearInterval(timer)
  }, [orderId])

  const sendMessage = async (content, type = 'text') => {
    if (!room || !content.trim()) return null
    try {
      const res = await api.post(`/chat/rooms/${room.id}/messages`, { content, type })
      setMessages(prev => prev.find(m => m.id === res.data.data?.id) ? prev : [...prev, res.data.data])
      if (res.data.room_suspended) setSuspended(true)
      return res.data
    } catch (err) {
      const data = err.response?.data || null
      if (data?.room_suspended) setSuspended(true)
      return data
    }
  }

  return { room, messages, templates, loading, sendMessage, suspended }
}
