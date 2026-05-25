import { useEffect, useRef, useState, useCallback } from 'react'
import api from '../services/api'
import { isNative } from '../utils/nativePlatform'

const GPS_INTERVAL = 5000

// Abstraksi geolocation: pakai Capacitor di native, browser API di web
const geo = isNative
  ? {
      async getCurrent(opts) {
        const { Geolocation } = await import('@capacitor/geolocation')
        return Geolocation.getCurrentPosition(opts)
      },
      async watch(opts, cb) {
        const { Geolocation } = await import('@capacitor/geolocation')
        // Capacitor watchPosition: callback(pos, err)
        return Geolocation.watchPosition(opts, (pos, err) => {
          if (err) { cb(null, err); return }
          cb(pos, null)
        })
      },
      async clearWatch(id) {
        const { Geolocation } = await import('@capacitor/geolocation')
        return Geolocation.clearWatch({ id })
      },
    }
  : {
      getCurrent: (opts) => new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, opts)),
      watch: (opts, cb) => {
        const id = navigator.geolocation.watchPosition(
          (pos) => cb(pos, null),
          (err) => cb(null, err),
          opts,
        )
        return Promise.resolve(id)
      },
      clearWatch: (id) => {
        navigator.geolocation.clearWatch(id)
        return Promise.resolve()
      },
    }

export default function useGps({ enabled = false, onLost, onUpdate } = {}) {
  const [location, setLocation] = useState(null)
  const [error, setError]       = useState(null)
  const [active, setActive]     = useState(false)

  const intervalRef     = useRef(null)
  const watchIdRef      = useRef(null)
  const reportedLostRef = useRef(false)
  const onLostRef       = useRef(onLost)
  const onUpdateRef     = useRef(onUpdate)

  useEffect(() => { onLostRef.current   = onLost   }, [onLost])
  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      await geo.clearWatch(watchIdRef.current).catch(() => {})
      watchIdRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const sendLocation = useCallback(async (lat, lng) => {
    try { await api.post('/mitra/gps/update', { lat, lng }) } catch {}
  }, [])

  const reportLost = useCallback(async () => {
    if (reportedLostRef.current) return
    reportedLostRef.current = true
    await stopTracking()
    setActive(false)
    try { await api.post('/mitra/gps/lost'); onLostRef.current?.() } catch {}
  }, [stopTracking])

  useEffect(() => {
    if (!enabled) {
      stopTracking()
      setLocation(null)
      setActive(false)
      // Beri tahu server bahwa GPS dimatikan secara manual agar is_online segera di-set false
      api.post('/mitra/gps/lost').catch(() => {})
      return
    }

    reportedLostRef.current = false
    setError(null)
    setLocation(null)
    setActive(false)

    const highOpts   = { enableHighAccuracy: true,  timeout: 30000, maximumAge: 10000 }
    const coarseOpts = { enableHighAccuracy: false,  timeout: 5000,  maximumAge: 60000 }

    // Posisi cepat awal
    geo.getCurrent(coarseOpts)
      .then(pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setActive(true)
      })
      .catch(() => {})

    // watchPosition
    geo.watch(highOpts, (pos, err) => {
      if (err) {
        if (err.code === 3) { setActive(false); return } // TIMEOUT sementara
        setError(err.message)
        reportLost()
        return
      }
      const { latitude: lat, longitude: lng } = pos.coords
      setLocation({ lat, lng })
      setError(null)
      setActive(true)
      onUpdateRef.current?.(pos)
    }).then(id => { watchIdRef.current = id }).catch(() => {})

    // Kirim ke server tiap 5 detik
    intervalRef.current = setInterval(() => {
      geo.getCurrent(highOpts)
        .then(pos => {
          const { latitude: lat, longitude: lng } = pos.coords
          setLocation({ lat, lng })
          setActive(true)
          sendLocation(lat, lng)
          onUpdateRef.current?.(pos)
        })
        .catch(() => { setActive(false) })
    }, GPS_INTERVAL)

    return () => { stopTracking() }
  }, [enabled, sendLocation, reportLost, stopTracking])

  return { location, error, active }
}
