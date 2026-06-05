import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

/**
 * Mengembalikan total quantity item di keranjang ZasaShop.
 * - Poll setiap 30 detik
 * - Update instan via custom event 'mart-cart-updated'
 *   (dispatch dari MartProductPage / MartCartPage setelah mutasi)
 */
export default function useMartCartCount() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  const refresh = useCallback(() => {
    if (user?.role !== 'pelanggan') return
    api.get('/mart/cart')
      .then(r => {
        const total = (Array.isArray(r.data) ? r.data : [])
          .reduce((s, i) => s + (i.quantity || 0), 0)
        setCount(total)
      })
      .catch(() => {})
  }, [user?.role])

  // Poll 30 detik
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 30000)
    return () => clearInterval(t)
  }, [refresh])

  // Update instan ketika komponen lain dispatch 'mart-cart-updated'
  useEffect(() => {
    window.addEventListener('mart-cart-updated', refresh)
    return () => window.removeEventListener('mart-cart-updated', refresh)
  }, [refresh])

  return { count, refresh }
}
