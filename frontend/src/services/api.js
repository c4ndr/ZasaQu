import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '') + '/api',
  // Jangan set Content-Type di sini — axios otomatis atur per request:
  // JSON  → application/json
  // FormData → multipart/form-data (dengan boundary)
  headers: { 'Accept': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // Pakai custom event agar React Router yang navigasi (aman di Capacitor WebView)
      window.dispatchEvent(new CustomEvent('zasaqu:unauthorized'))
    }
    return Promise.reject(err)
  }
)

const BASE_URL = import.meta.env.VITE_API_URL || ''

// v: cache-buster opsional (misal updated_at atau timestamp)
export const storageUrl = (path, v) => {
  if (!path) return null
  const url = `${BASE_URL}/storage/${path}`
  return v ? `${url}?v=${typeof v === 'string' ? new Date(v).getTime() : v}` : url
}

export default api
