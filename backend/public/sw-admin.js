// Service Worker ZasaQu Admin — tangani notifikasi latar belakang

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// ── Tangani push dari server ──────────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = { title: '🔔 ZasaQu Admin', body: 'Ada notifikasi baru.', tag: 'admin' }
  try { data = { ...data, ...event.data.json() } } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:             data.body,
      icon:             '/icon-192.png',
      badge:            '/icon-72.png',
      tag:              data.tag,
      requireInteraction: true,
      vibrate:          [200, 100, 200, 100, 300],
      data:             { url: data.url || '/admin/topup' },
    })
  )
})

// ── Klik notifikasi → buka/fokus tab admin ────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/admin'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Fokus tab yang sudah ada
      for (const client of clients) {
        if (client.url.includes('/admin') && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // Buka tab baru jika belum ada
      return self.clients.openWindow(targetUrl)
    })
  )
})
