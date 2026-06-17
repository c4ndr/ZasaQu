import { useEffect, useState, useCallback } from 'react'
import api from '../services/api'

const DONE_GO   = ['completed', 'cancelled', 'rejected']
const DONE_FOOD = ['completed', 'cancelled', 'rejected']
const DONE_MART = ['completed', 'cancelled']
const DONE_HOME = ['completed', 'cancelled']
const DONE_SERV = ['completed', 'cancelled']

// Cache modul-level: card langsung muncul saat user re-navigate ke dashboard
let ordersCache = []

function isActive(order, module) {
  if (module === 'zasago')   return !DONE_GO.includes(order.status)
  if (module === 'zasafood') return !DONE_FOOD.includes(order.status)
  if (module === 'zasamart') return !DONE_MART.includes(order.status)
  if (module === 'zasahome') return !DONE_HOME.includes(order.status)
  if (module === 'zasaserv') return !DONE_SERV.includes(order.status)
  return false
}

async function fetchModule(endpoint, module, params = {}) {
  try {
    const r = await api.get(endpoint, { params: { per_page: 50, ...params } })
    const orders = r.data?.data ?? r.data ?? []
    return orders
      .filter(o => isActive(o, module))
      .map(o => ({ ...o, _module: module }))
  } catch {
    return null  // null = gagal, bukan kosong
  }
}

export default function useActiveOrders(enabled = true, features = {}) {
  const [orders, setOrders] = useState(ordersCache)

  const load = useCallback(async () => {
    if (!enabled) {
      ordersCache = []
      setOrders([])
      return
    }
    const results = await Promise.all([
      features?.zasago  !== false ? fetchModule('/orders', 'zasago')                              : [],
      features?.zasafood !== false ? fetchModule('/food/orders', 'zasafood', { active_only: 1 }) : [],
      features?.zasamart !== false ? fetchModule('/mart/orders', 'zasamart')                      : [],
      features?.zasahome !== false ? fetchModule('/home/orders', 'zasahome')                      : [],
      features?.zasaserv !== false ? fetchModule('/serv/orders', 'zasaserv')                      : [],
    ])
    // Jika ada modul yang gagal (null), pertahankan cache lama dari modul itu
    const failed = results.some(r => r === null)
    if (failed) {
      // Gabungkan: modul yang berhasil replace, modul yang gagal pakai cache lama
      const modules = ['zasago', 'zasafood', 'zasamart', 'zasahome', 'zasaserv']
      const merged = modules.map((mod, i) => {
        if (results[i] === null) return ordersCache.filter(o => o._module === mod)
        return results[i]
      }).flat()
      ordersCache = merged
      setOrders(merged)
    } else {
      const fresh = results.flat()
      ordersCache = fresh
      setOrders(fresh)
    }
  }, [enabled, features?.zasago, features?.zasafood, features?.zasamart, features?.zasahome, features?.zasaserv]) // eslint-disable-line

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  return { orders, reload: load }
}
