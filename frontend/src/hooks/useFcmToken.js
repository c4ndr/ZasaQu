import { useEffect } from 'react'
import api from '../services/api'

const FCM_SW_PATH = '/firebase-messaging-sw.js'

// Daftarkan FCM token ke backend setelah login.
// Membutuhkan VITE_FIREBASE_VAPID_KEY dan VITE_FIREBASE_CONFIG di .env frontend.
export default function useFcmToken(user) {
  useEffect(() => {
    if (!user) return

    const vapidKey    = import.meta.env.VITE_FIREBASE_VAPID_KEY
    const firebaseConfig = import.meta.env.VITE_FIREBASE_CONFIG

    if (!vapidKey || !firebaseConfig) return  // FCM belum dikonfigurasi

    // Cek support
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    Notification.requestPermission().then(async (permission) => {
      if (permission !== 'granted') return

      try {
        // Dynamic import Firebase agar tidak load jika tidak dikonfigurasi
        const { initializeApp }      = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js')
        const { getMessaging, getToken } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js')

        const config  = JSON.parse(firebaseConfig)
        const app     = initializeApp(config)
        const messaging = getMessaging(app)

        const token = await getToken(messaging, { vapidKey })
        if (token) {
          await api.post('/auth/fcm-token', { fcm_token: token })
        }
      } catch {
        // FCM tidak kritis — gagal diam-diam
      }
    })
  }, [user?.id])
}
