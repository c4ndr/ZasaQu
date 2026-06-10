import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import axios from 'axios'

window.Pusher = Pusher

const noop  = { listen: () => noop, stopListening: () => {} }
const dummy = { channel: () => noop, private: () => noop, leave: () => {} }

const apiBase = import.meta.env.VITE_API_URL || 'https://zasaqu.uk'
const wsHost  = import.meta.env.VITE_REVERB_HOST || 'zasaqu.uk'
const isHttps = (import.meta.env.VITE_REVERB_SCHEME || 'https') === 'https'
const wsPort  = parseInt(import.meta.env.VITE_REVERB_PORT || '443')

// Gunakan /api/broadcasting/auth (Sanctum Bearer token) bukan /broadcasting/auth (web session)
const authEndpoint = `${apiBase}/api/broadcasting/auth`

// Axios instance khusus broadcasting auth — selalu baca token terbaru
const authAxios = axios.create({ baseURL: authEndpoint })
authAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers.Accept = 'application/json'
  return config
})

// Custom authorizer agar token selalu fresh saat subscribe private channel
function makeAuthorizer(channel) {
  return {
    authorize(socketId, callback) {
      authAxios.post('', {
        socket_id:    socketId,
        channel_name: channel.name,
      })
        .then(res  => callback(null, res.data))
        .catch(err => callback(err, null))
    },
  }
}

function makeEcho() {
  return new Echo({
    broadcaster:       'reverb',
    key:               import.meta.env.VITE_REVERB_APP_KEY || 'zasaqu-key',
    wsHost,
    wsPort,
    wssPort:           wsPort,
    forceTLS:          isHttps,
    enabledTransports: ['ws', 'wss'],
    disableStats:      true,
    authorizer:        makeAuthorizer,
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
