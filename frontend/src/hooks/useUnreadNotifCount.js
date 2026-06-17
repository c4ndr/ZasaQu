import { useState, useEffect } from 'react'
import api from '../services/api'

let cache = { count: 0, ts: 0 }

export default function useUnreadNotifCount() {
  const [count, setCount] = useState(cache.count)

  useEffect(() => {
    const fetch = async () => {
      try {
        const r = await api.get('/notifications/unread-count')
        const n = r.data.count ?? 0
        cache = { count: n, ts: Date.now() }
        setCount(n)
      } catch {}
    }

    // Ambil langsung jika cache stale (>60s)
    if (Date.now() - cache.ts > 60_000) fetch()

    const id = setInterval(fetch, 60_000)
    return () => clearInterval(id)
  }, [])

  return count
}
