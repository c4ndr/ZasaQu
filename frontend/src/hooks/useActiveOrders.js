import { useEffect, useState, useCallback } from 'react'
import api from '../services/api'

const DONE_GO   = ['completed', 'cancelled', 'rejected']
const DONE_FOOD = ['completed', 'cancelled', 'rejected']
const DONE_MART = ['completed', 'cancelled']

function isActive(order, module) {
  if (module === 'zasago')   return !DONE_GO.includes(order.status)
  if (module === 'zasafood') return !DONE_FOOD.includes(order.status)
  if (module === 'zasamart') return !DONE_MART.includes(order.status)
  return false
}

async function fetchModule(endpoint, module, features) {
  try {
    const r = await api.get(endpoint, { params: { per_page: 10 } })
    const orders = r.data?.data ?? r.data ?? []
    return orders
      .filter(o => isActive(o, module))
      .map(o => ({ ...o, _module: module }))
  } catch { return [] }
}

export default function useActiveOrders(enabled = true, features = {}) {
  const [orders, setOrders] = useState([])

  const load = useCallback(async () => {
    if (!enabled) { setOrders([]); return }
    const results = await Promise.all([
      features?.zasago  !== false ? fetchModule('/orders', 'zasago', features)    : [],
      features?.zasafood !== false ? fetchModule('/food/orders', 'zasafood', features) : [],
      features?.zasamart !== false ? fetchModule('/mart/orders', 'zasamart', features) : [],
    ])
    setOrders(results.flat())
  }, [enabled, features?.zasago, features?.zasafood, features?.zasamart]) // eslint-disable-line

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  return { orders, reload: load }
}
