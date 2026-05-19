import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useNewOrderNotif from '../hooks/useNewOrderNotif'
import NewOrderBanner from './NewOrderBanner'
import api from '../services/api'

// ── Daftarkan Service Worker mitra ────────────────────────────────────────────
let _swReg = null

async function getSwReg() {
  if (!('serviceWorker' in navigator)) return null
  if (_swReg) return _swReg
  try {
    _swReg = await navigator.serviceWorker.register('/sw-mitra.js', { scope: '/' })
    await navigator.serviceWorker.ready
    return _swReg
  } catch {
    return null
  }
}

function sendToSw(msg) {
  if (!navigator.serviceWorker?.controller) return
  navigator.serviceWorker.controller.postMessage(msg)
}

// ── Komponen utama ────────────────────────────────────────────────────────────
export default function MitraOrderAlert() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [accepting, setAccepting] = useState(null)

  const isMitra    = user?.role === 'mitra_motor' || user?.role === 'mitra_mobil'
  const vehicleType = user?.role === 'mitra_motor' ? 'motor'
    : user?.role === 'mitra_mobil' ? 'mobil' : null

  const { pendingOrders, dismiss } = useNewOrderNotif(isMitra ? vehicleType : null)
  const seenIdsRef = useRef(new Set())

  // ── Init Service Worker saat mitra login ──────────────────────────────────
  useEffect(() => {
    if (!isMitra) return

    const token = localStorage.getItem('token')
    if (!token) return

    // Daftarkan SW dan kirim inisialisasi
    getSwReg().then(reg => {
      if (!reg) return
      // Pastikan SW controller aktif
      const ctrl = reg.active
      if (!ctrl) return
      // apiBase kosong = pakai origin yang sama (Vite proxy handle /api)
      sendToSw({
        type:        'MITRA_INIT',
        token,
        vehicleType,
        apiBase:     '',
        knownIds:    [...seenIdsRef.current],
      })
    })

    // Dengar pesan dari SW (misal order berhasil diterima dari notif)
    const onMessage = (event) => {
      if (event.data?.type === 'ORDER_ACCEPTED') {
        dismiss(event.data.orderId)
        navigate('/mitra/orders')
      }
    }
    navigator.serviceWorker?.addEventListener('message', onMessage)
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage)
  }, [isMitra, vehicleType, dismiss, navigate])

  // ── Sinkronisasi known IDs ke SW ──────────────────────────────────────────
  useEffect(() => {
    if (!isMitra) return
    const ids = pendingOrders.map(o => o.id)
    ids.forEach(id => seenIdsRef.current.add(id))
    sendToSw({ type: 'MITRA_KNOWN_IDS', knownIds: [...seenIdsRef.current] })
  }, [pendingOrders, isMitra])

  // ── Kelola polling SW berdasarkan visibilitas halaman ─────────────────────
  useEffect(() => {
    if (!isMitra) return

    const token = localStorage.getItem('token')
    if (!token) return

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // App di-minimize → aktifkan polling SW
        sendToSw({
          type:     'MITRA_POLL_START',
          knownIds: [...seenIdsRef.current],
        })
      } else {
        // App kembali aktif → hentikan polling SW (halaman yang handle)
        sendToSw({ type: 'MITRA_POLL_STOP' })
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isMitra])

  // ── Terima order dari popup in-app ────────────────────────────────────────
  const handleAccept = useCallback(async (orderId) => {
    setAccepting(orderId)
    try {
      await api.post(`/mitra/orders/${orderId}/accept`)
      dismiss(orderId)
      navigate('/mitra/orders')
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menerima order.')
    } finally {
      setAccepting(null)
    }
  }, [dismiss, navigate])

  // Tidak render apapun jika bukan mitra atau tidak ada order pending
  if (!isMitra || pendingOrders.length === 0) return null

  return (
    <NewOrderBanner
      order={pendingOrders[0]}
      total={pendingOrders.length}
      accepting={accepting === pendingOrders[0].id}
      onAccept={handleAccept}
      onDismiss={dismiss}
    />
  )
}
