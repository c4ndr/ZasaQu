import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

window.Pusher = Pusher

const noop    = { listen: () => noop, stopListening: () => {} }
const dummy   = { channel: () => noop, private: () => noop, leave: () => {} }

// Di Capacitor native, window.location adalah file:// — pakai env var eksplisit
const isNative = !!(window.Capacitor?.isNativePlatform?.())

const wsHost   = isNative
  ? (import.meta.env.VITE_REVERB_HOST || '202.73.27.118')
  : window.location.hostname

const isHttps  = isNative
  ? (import.meta.env.VITE_REVERB_SCHEME === 'https')
  : window.location.protocol === 'https:'

const wsPort   = isNative
  ? parseInt(import.meta.env.VITE_REVERB_PORT || '8080')
  : (window.location.port ? parseInt(window.location.port) : (isHttps ? 443 : 80))

let instance
try {
  instance = new Echo({
    broadcaster:       'reverb',
    key:               import.meta.env.VITE_REVERB_APP_KEY || 'zasaqu-key',
    wsHost,
    wsPort,
    wssPort:           wsPort,
    forceTLS:          isHttps,
    enabledTransports: ['ws', 'wss'],
    disableStats:      true,
  })
} catch (e) {
  console.warn('Echo init failed:', e)
  instance = dummy
}

export default {
  channel: (name) => instance.channel(name),
  private: (name) => instance.private(name),
  leave:   (name) => instance.leave(name),
}
