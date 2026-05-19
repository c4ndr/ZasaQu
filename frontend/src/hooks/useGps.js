import { useEffect, useRef, useState, useCallback } from 'react'
import api from '../services/api'

const GPS_INTERVAL = 5000

export default function useGps({ enabled = false, onLost, onUpdate } = {}) {
  const [location, setLocation] = useState(null)
  const [error, setError]       = useState(null)
  const [active, setActive]     = useState(false)

  const intervalRef      = useRef(null)
  const watchRef         = useRef(null)
  const reportedLostRef  = useRef(false) // guard agar reportLost tidak dipanggil duplikat
  const onLostRef        = useRef(onLost)
  const onUpdateRef      = useRef(onUpdate)

  useEffect(() => { onLostRef.current   = onLost   }, [onLost])
  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])

  // Hentikan tracking langsung (tidak tunggu React re-render)
  const stopTracking = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const sendLocation = useCallback(async (lat, lng) => {
    try {
      await api.post('/mitra/gps/update', { lat, lng })
    } catch {
      // Gagal kirim sementara — coba lagi interval berikutnya
    }
  }, [])

  const reportLost = useCallback(async () => {
    // Guard: jangan panggil dua kali
    if (reportedLostRef.current) return
    reportedLostRef.current = true

    // Hentikan watch & interval SEGERA tanpa tunggu React cleanup
    stopTracking()
    setActive(false)

    try {
      await api.post('/mitra/gps/lost')
      onLostRef.current?.()
    } catch {}
  }, [stopTracking])

  useEffect(() => {
    if (!enabled) {
      setLocation(null)
      setActive(false)
      // JANGAN hapus error di sini — biarkan user membaca pesan error
      return
    }

    // Reset state & guard saat GPS diaktifkan ulang
    reportedLostRef.current = false
    setError(null)
    setLocation(null)
    setActive(false)

    if (!navigator.geolocation) {
      setError('Browser tidak mendukung GPS.')
      return
    }

    // Ambil posisi cepat dulu (jaringan/WiFi) agar langsung aktif,
    // kemudian watchPosition akan update dengan posisi lebih akurat
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setActive(true)
      },
      () => { /* fallback gagal — lanjut ke watchPosition */ },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    )

    // watchPosition — update terus-menerus dengan akurasi tinggi
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setLocation({ lat, lng })
        setError(null)
        setActive(true)
        onUpdateRef.current?.(pos)
      },
      (err) => {
        if (err.code === 3) {
          // TIMEOUT sementara — jangan matikan GPS, coba lagi
          setActive(false)
          return
        }
        // PERMISSION_DENIED (1) atau POSITION_UNAVAILABLE (2) = fatal
        setError(err.message)
        reportLost()
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
    )

    // Kirim koordinat ke server setiap 5 detik
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords
          setLocation({ lat, lng })
          setActive(true)
          sendLocation(lat, lng)
          onUpdateRef.current?.(pos)
        },
        () => {
          // Gagal sementara — jangan lapor hilang, coba lagi interval berikutnya
          setActive(false)
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      )
    }, GPS_INTERVAL)

    return () => { stopTracking() }
  }, [enabled, sendLocation, reportLost, stopTracking])

  return { location, error, active }
}
