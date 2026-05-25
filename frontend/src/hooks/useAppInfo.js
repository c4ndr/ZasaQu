import { useState, useEffect, useCallback } from 'react'

const BASE  = (import.meta.env.VITE_API_URL || '') + '/api'
const EVENT = 'zasaqu:app-info-updated'
const FALLBACK = { app_name: 'ZasaQu', app_tagline: '', app_logo_url: null, maintenance_mode: false }

let cache = null

async function fetchAppInfo() {
  try {
    const r = await fetch(`${BASE}/app-info`)
    if (!r.ok) return null
    const data = await r.json()
    cache = data
    return data
  } catch {
    return null
  }
}

export default function useAppInfo() {
  const [info, setInfo] = useState(cache ?? FALLBACK)

  useEffect(() => {
    if (cache) { setInfo(cache) } else {
      fetchAppInfo().then(data => { if (data) setInfo(data) })
    }
    const handler = (e) => setInfo(e.detail)
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [])

  const invalidate = useCallback(() => {
    cache = null
    fetchAppInfo().then(data => {
      if (data) window.dispatchEvent(new CustomEvent(EVENT, { detail: data }))
    })
  }, [])

  // Update logo langsung di memory tanpa fetch — pakai data URL agar tidak bergantung HTTP
  const updateLogo = useCallback((logoUrl) => {
    const updated = { ...(cache || FALLBACK), app_logo_url: logoUrl }
    cache = updated
    window.dispatchEvent(new CustomEvent(EVENT, { detail: updated }))
  }, [])

  return { ...info, invalidate, updateLogo }
}
