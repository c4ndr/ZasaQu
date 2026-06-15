import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './AuthContext'
import api from '../services/api'
import { isNative } from '../utils/nativePlatform'

const geo = isNative
  ? {
      getCurrent: async (opts) => { const { Geolocation } = await import('@capacitor/geolocation'); return Geolocation.getCurrentPosition(opts) },
      watch: async (opts, cb) => { const { Geolocation } = await import('@capacitor/geolocation'); return Geolocation.watchPosition(opts, (pos, err) => err ? cb(null, err) : cb(pos, null)) },
      clearWatch: async (id) => { const { Geolocation } = await import('@capacitor/geolocation'); return Geolocation.clearWatch({ id }) },
    }
  : {
      getCurrent: (opts) => new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, opts)),
      watch: (opts, cb) => Promise.resolve(navigator.geolocation.watchPosition(pos => cb(pos, null), err => cb(null, err), opts)),
      clearWatch: (id) => { navigator.geolocation.clearWatch(id); return Promise.resolve() },
    }

const GPS_SEND_INTERVAL = 8000   // kirim tiap 8 detik (lebih toleran di background)
const GPS_STALE_LIMIT   = 45000  // restart watch jika tidak ada update >45 detik

const MitraGpsContext = createContext(null)

export function MitraGpsProvider({ children }) {
  const { user } = useAuth()
  const isMitra  = user?.role?.startsWith('mitra')

  const [location, setLocation] = useState(null)
  const [active,   setActive]   = useState(false)
  const [error,    setError]    = useState(null)
  const [enabled,  setEnabled]  = useState(false)

  const watchIdRef       = useRef(null)
  const intervalRef      = useRef(null)
  const staleTimerRef    = useRef(null)
  const lastPosTimeRef   = useRef(0)
  const enabledRef       = useRef(false)
  const mountedRef       = useRef(true)
  const startingWatchRef = useRef(false) // guard race condition

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  const send = useCallback(async (lat, lng) => {
    try { await api.post('/mitra/gps/update', { lat, lng }) } catch {}
  }, [])

  const stopAll = useCallback(async () => {
    startingWatchRef.current = false
    if (watchIdRef.current !== null) { await geo.clearWatch(watchIdRef.current).catch(() => {}); watchIdRef.current = null }
    if (intervalRef.current)         { clearInterval(intervalRef.current);  intervalRef.current  = null }
    if (staleTimerRef.current)       { clearInterval(staleTimerRef.current); staleTimerRef.current = null }
  }, [])

  // startWatch dengan guard — cegah dua panggilan bersamaan
  const startWatch = useCallback(() => {
    if (startingWatchRef.current) return // sudah sedang mulai, skip
    startingWatchRef.current = true

    if (watchIdRef.current !== null) {
      geo.clearWatch(watchIdRef.current).catch(() => {})
      watchIdRef.current = null
    }

    const opts = { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
    geo.watch(opts, (pos, err) => {
      if (!mountedRef.current) return
      if (err) {
        if (err.code !== 1) return // bukan PERMISSION_DENIED — abaikan
        setError('Izin lokasi ditolak.')
        stopAll().then(() => { if (mountedRef.current) { setActive(false); setEnabled(false) } })
        return
      }
      const { latitude: lat, longitude: lng } = pos.coords
      lastPosTimeRef.current = Date.now()
      setLocation({ lat, lng })
      setError(null)
      setActive(true)
    }).then(id => {
      startingWatchRef.current = false
      if (mountedRef.current) watchIdRef.current = id
    }).catch(() => {
      startingWatchRef.current = false
    })
  }, [stopAll])

  useEffect(() => {
    if (!enabled || !isMitra) {
      stopAll()
      if (mountedRef.current) { setLocation(null); setActive(false) }
      if (enabled) api.post('/mitra/gps/lost').catch(() => {})
      return
    }

    setError(null)
    lastPosTimeRef.current = 0

    // Posisi awal cepat
    geo.getCurrent({ enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 })
      .then(pos => { if (!mountedRef.current) return; setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setActive(true) })
      .catch(() => {})

    startWatch()

    // Kirim ke server tiap 8 detik
    intervalRef.current = setInterval(() => {
      if (!enabledRef.current) return
      geo.getCurrent({ enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 })
        .then(pos => {
          if (!mountedRef.current) return
          const { latitude: lat, longitude: lng } = pos.coords
          lastPosTimeRef.current = Date.now()
          setLocation({ lat, lng })
          setActive(true)
          send(lat, lng)
        })
        .catch(() => {})
    }, GPS_SEND_INTERVAL)

    // Stale check — restart watchPosition jika tidak ada update >45 detik
    staleTimerRef.current = setInterval(() => {
      if (!enabledRef.current || !mountedRef.current) return
      if (lastPosTimeRef.current > 0 && Date.now() - lastPosTimeRef.current > GPS_STALE_LIMIT) {
        startWatch()
      }
    }, 20000)

    // Recover saat app kembali ke foreground
    const onResume = () => {
      // FIX: cek visibilityState — jangan jalankan saat document jadi hidden
      if (document.visibilityState !== 'visible') return
      if (!enabledRef.current || !mountedRef.current) return
      geo.getCurrent({ enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 })
        .then(pos => {
          if (!mountedRef.current) return
          const { latitude: lat, longitude: lng } = pos.coords
          lastPosTimeRef.current = Date.now()
          setLocation({ lat, lng }); setActive(true)
          send(lat, lng)
        })
        .catch(() => {})
      startWatch()
    }
    document.addEventListener('visibilitychange', onResume)

    // Native Android: gunakan appStateChange (lebih andal dari visibilitychange di WebView)
    let appStateSub = null
    if (isNative) {
      import('@capacitor/app').then(({ App: CapApp }) => {
        CapApp.addListener('appStateChange', ({ isActive }) => {
          if (!isActive || !enabledRef.current || !mountedRef.current) return
          geo.getCurrent({ enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 })
            .then(pos => {
              if (!mountedRef.current) return
              const { latitude: lat, longitude: lng } = pos.coords
              lastPosTimeRef.current = Date.now()
              setLocation({ lat, lng }); setActive(true)
              send(lat, lng)
            })
            .catch(() => {})
          startWatch()
        }).then(sub => { appStateSub = sub })
      }).catch(() => {})
    }

    return () => {
      stopAll()
      document.removeEventListener('visibilitychange', onResume)
      appStateSub?.remove?.()
    }
  }, [enabled, isMitra, startWatch, stopAll, send])

  // Wake Lock — cegah layar mati saat GPS aktif
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock = null
    navigator.wakeLock.request('screen').then(l => { lock = l }).catch(() => {})
    const reacquire = () => {
      if (document.visibilityState === 'visible' && enabledRef.current) {
        navigator.wakeLock.request('screen').then(l => { lock = l }).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', reacquire)
    return () => { lock?.release().catch(() => {}); document.removeEventListener('visibilitychange', reacquire) }
  }, [active])

  if (!isMitra) return <>{children}</>

  return (
    <MitraGpsContext.Provider value={{ location, active, error, enabled, setEnabled }}>
      {children}
    </MitraGpsContext.Provider>
  )
}

export function useMitraGps() {
  const ctx = useContext(MitraGpsContext)
  return ctx ?? { location: null, active: false, error: null, enabled: false, setEnabled: () => {} }
}
