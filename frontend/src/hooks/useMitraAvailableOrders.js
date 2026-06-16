import { useEffect, useState, useCallback } from 'react'
import api from '../services/api'

async function fetchAvailable(endpoint, module) {
  try {
    const r = await api.get(endpoint)
    const orders = r.data?.data ?? r.data ?? []
    return orders.map(o => ({ ...o, _module: module }))
  } catch { return [] }
}

export default function useMitraAvailableOrders(enabled = true, features = {}) {
  const [orders, setOrders] = useState([])

  const load = useCallback(async () => {
    if (!enabled) { setOrders([]); return }
    const results = await Promise.all([
      fetchAvailable('/mitra/orders/available',      'zasago'),
      features?.zasafood !== false ? fetchAvailable('/food/mitra/orders/available',  'zasafood') : [],
      features?.zasamart !== false ? fetchAvailable('/mart/mitra/orders/available',  'zasamart') : [],
      features?.zasaride === true  ? fetchAvailable('/ride/mitra/available',         'zasaride') : [],
    ])
    setOrders(results.flat())
  }, [enabled, features?.zasafood, features?.zasamart, features?.zasaride]) // eslint-disable-line

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  return { orders, reload: load }
}
