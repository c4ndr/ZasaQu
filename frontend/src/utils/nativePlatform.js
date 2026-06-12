import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

export const isNative  = Capacitor.isNativePlatform()
export const platform  = Capacitor.getPlatform() // 'android' | 'ios' | 'web'

/**
 * Inisialisasi push notification native.
 * - onToken   : dipanggil dengan FCM token saat registrasi berhasil
 * - onForeground : dipanggil saat notif masuk dalam keadaan app terbuka
 * - onTap     : dipanggil saat user tap notifikasi (app di-background/mati)
 */
export async function initPushNotifications({ onToken, onForeground, onTap } = {}) {
  if (!isNative) return

  let status = await PushNotifications.checkPermissions()
  if (status.receive === 'prompt') {
    status = await PushNotifications.requestPermissions()
  }
  if (status.receive !== 'granted') return

  await PushNotifications.register()

  PushNotifications.addListener('registration', (token) => {
    onToken?.(token.value)
    // Simpan token — kirim ke backend hanya jika sudah login
    // Tanpa pengecekan ini, 401 memicu zasaqu:unauthorized → redirect paksa dari halaman login
    localStorage.setItem('_pending_fcm_token', token.value)
    if (!localStorage.getItem('token')) return
    import('../services/api').then(({ default: api }) => {
      api.post('/auth/fcm-token', { fcm_token: token.value }).catch(() => {})
    })
  })

  PushNotifications.addListener('registrationError', (err) => {
    console.warn('Push notification registration error:', err)
  })

  // Notifikasi masuk saat app di foreground — tampilkan manual
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    onForeground?.(notification)
  })

  // User tap notifikasi (app background atau mati)
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    onTap?.(action.notification)
  })
}

/**
 * Minta permission GPS secara eksplisit (hanya di native).
 * Mengembalikan true jika granted.
 */
export async function requestGeolocationPermission() {
  if (!isNative) return true
  const { Geolocation } = await import('@capacitor/geolocation')
  const status = await Geolocation.requestPermissions()
  return status.location === 'granted' || status.coarseLocation === 'granted'
}
