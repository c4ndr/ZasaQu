import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

// Poll unread notification count setiap 30 detik
export default function useNotifCount() {
  const [count, setCount] = useState(0)

  const fetch = useCallback(() => {
    api.get('/notifications/unread-count')
      .then(r => setCount(r.data.unread_count ?? 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 30000)
    return () => clearInterval(interval)
  }, [fetch])

  return { count, refresh: fetch }
}
