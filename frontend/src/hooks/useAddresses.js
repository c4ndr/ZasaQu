import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export default function useAddresses(enabled = true) {
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const r = await api.get('/addresses')
      setAddresses(r.data)
    } catch {} finally { setLoading(false) }
  }, [enabled])

  useEffect(() => { load() }, [load])

  return { addresses, loading, reload: load, setAddresses }
}
