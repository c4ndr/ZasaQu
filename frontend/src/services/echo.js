import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

window.Pusher = Pusher

const dummy = {
  channel: () => ({ listen: () => dummy.channel(), stopListening: () => {} }),
  leave: () => {},
}

// Deteksi otomatis: apakah diakses lokal (HTTP) atau via tunnel (HTTPS)
// WebSocket pakai port & scheme yang sama dengan halaman agar bisa melewati Vite proxy (/app)
const isHttps  = window.location.protocol === 'https:'
const forceTLS = isHttps

// Port: gunakan port halaman saat ini (5173 lokal, 443 tunnel)
// Ini memastikan WebSocket melewati Vite proxy yang mem-forward ke Reverb :8080
const pagePort = window.location.port
const wsPort   = pagePort ? parseInt(pagePort) : (isHttps ? 443 : 80)

let instance
try {
  instance = new Echo({
    broadcaster:       'reverb',
    key:               import.meta.env.VITE_REVERB_APP_KEY || 'zasaqu-key',
    wsHost:            window.location.hostname,
    wsPort,
    wssPort:           wsPort,
    forceTLS,
    enabledTransports: ['ws', 'wss'],
    disableStats:      true,
  })
} catch (e) {
  console.warn('Echo init failed:', e)
  instance = dummy
}

export default {
  channel: (name) => instance.channel(name),
  leave:   (name) => instance.leave(name),
}
