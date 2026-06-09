import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

window.Pusher = Pusher

const noop    = { listen: () => noop, stopListening: () => {} }
const dummy   = { channel: () => noop, private: () => noop, leave: () => {} }

// Di Capacitor native, window.location adalah file:// — pakai env var eksplisit
const isNative = !!(window.Capacitor?.isNativePlatform?.())

const apiBase  = import.meta.env.VITE_API_URL || 'https://zasaqu.uk'

const wsHost   = import.meta.env.VITE_REVERB_HOST || 'zasaqu.uk'
const isHttps  = (import.meta.env.VITE_REVERB_SCHEME || 'https') === 'https'
const wsPort   = parseInt(import.meta.env.VITE_REVERB_PORT || '443')

// authEndpoint harus URL absolut agar bisa dipakai dari native Android (file://)
const authEndpoint = `${apiBase}/broadcasting/auth`

function makeEcho() {
  const token = localStorage.getItem('token')
  return new Echo({
    broadcaster:       'reverb',
    key:               import.meta.env.VITE_REVERB_APP_KEY || 'zasaqu-key',
    wsHost,
    wsPort,
    wssPort:           wsPort,
    forceTLS:          isHttps,
    enabledTransports: ['ws', 'wss'],
    disableStats:      true,
    authEndpoint,
    auth: {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        Accept: 'application/json',
      },
    },
  })
}

let instance
try {
  instance = makeEcho()
} catch (e) {
  console.warn('Echo init failed:', e)
  instance = dummy
}

export default {
  channel: (name) => instance.channel(name),
  private: (name) => instance.private(name),
  leave:   (name) => instance.leave(name),
}
