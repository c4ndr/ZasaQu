importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            "AIzaSyDHPImt9TAYPuipPcoMFzut94lpkiWxyuk",
  authDomain:        "zasaqu.firebaseapp.com",
  projectId:         "zasaqu",
  storageBucket:     "zasaqu.firebasestorage.app",
  messagingSenderId: "876039877855",
  appId:             "1:876039877855:web:03fd916667b2fe0900e56a",
})

const messaging = firebase.messaging()

// Tampilkan notifikasi saat app di background
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {}
  if (!title) return

  self.registration.showNotification(title, {
    body:  body ?? '',
    icon:  '/icon-192.png',
    badge: '/icon-72.png',
    data:  payload.data ?? {},
  })
})

// Klik notifikasi → buka/fokus tab zasaqu.uk
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow('/')
    })
  )
})
