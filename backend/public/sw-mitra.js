// Service Worker ZasaQu — Notifikasi order untuk mitra
// Berjalan di background saat app di-minimize
// Butuh HTTPS (gunakan tunnel) agar terdaftar di HP

self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', e  => e.waitUntil(self.clients.claim()))

// ── State SW ──────────────────────────────────────────────────────────────────
let _token      = null
let _vehicleType = null
let _apiBase    = ''
let _knownIds   = new Set()
let _polling    = false

// ── Terima pesan dari halaman utama ───────────────────────────────────────────
self.addEventListener('message', event => {
  const { type, token, vehicleType, apiBase, knownIds } = event.data ?? {}

  if (type === 'MITRA_INIT') {
    _token       = token
    _vehicleType = vehicleType
    _apiBase     = apiBase || ''
    _knownIds    = new Set(knownIds ?? [])
  }

  if (type === 'MITRA_POLL_START') {
    if (_polling) return
    _polling = true
    // Mulai loop — waitUntil menjaga SW tetap hidup selama polling
    event.waitUntil(pollLoop())
  }

  if (type === 'MITRA_POLL_STOP') {
    _polling = false
  }

  if (type === 'MITRA_KNOWN_IDS') {
    // Update daftar ID yang sudah diketahui agar tidak double notif
    _knownIds = new Set(event.data.knownIds ?? [])
  }
})

// ── Loop polling saat app di-background ──────────────────────────────────────
async function pollLoop() {
  while (_polling && _token) {
    await checkOrders()
    // Tunggu 10 detik sebelum cek lagi
    await wait(10000)
  }
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ── Cek order baru dari API ───────────────────────────────────────────────────
async function checkOrders() {
  try {
    const res = await fetch(`${_apiBase}/api/mitra/orders/available`, {
      headers: {
        'Authorization': `Bearer ${_token}`,
        'Accept': 'application/json',
      },
    })
    if (!res.ok) return

    const orders = await res.json()
    const list   = Array.isArray(orders) ? orders : (orders.data ?? [])

    for (const order of list) {
      if (_knownIds.has(order.id)) continue
      _knownIds.add(order.id)
      await showOrderNotif(order)
    }

    // Hapus ID yang sudah tidak ada di list (order diambil orang lain)
    const activeIds = new Set(list.map(o => o.id))
    for (const id of [..._knownIds]) {
      if (!activeIds.has(id)) _knownIds.delete(id)
    }
  } catch {}
}

// ── Tampilkan notifikasi order ────────────────────────────────────────────────
async function showOrderNotif(order) {
  const fee      = Number(order.shipping_fee || 0).toLocaleString('id-ID')
  const title    = `🚀 Order Baru! Rp ${fee}`
  const body     = `${order.pickup_address ?? ''} → ${order.dropoff_address ?? ''}`
  const vehicle  = order.vehicle_type === 'mobil' ? '🚗' : '🏍️'

  await self.registration.showNotification(title, {
    body,
    icon:             '/icon-192.png',
    badge:            '/icon-72.png',
    tag:              `mitra-order-${order.id}`,
    requireInteraction: true,
    vibrate:          [300, 100, 300, 100, 500],
    actions: [
      { action: `accept:${order.id}`, title: '✅ Terima' },
      { action: `skip:${order.id}`,   title: '⏭️ Lewati' },
    ],
    data: {
      orderId:  order.id,
      token:    _token,
      apiBase:  _apiBase,
      fee,
      vehicle,
    },
  })
}

// ── Klik tombol di notifikasi ─────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()

  const { orderId, token, apiBase } = event.notification.data ?? {}
  const action = event.action ?? ''

  if (action.startsWith('accept:') && orderId && token) {
    // Terima order langsung dari notifikasi
    event.waitUntil(acceptOrder(orderId, token, apiBase))
  } else {
    // Lewati atau tap body notifikasi → buka halaman order
    event.waitUntil(openOrdersPage())
  }
})

// ── Terima order dari notifikasi ──────────────────────────────────────────────
async function acceptOrder(orderId, token, apiBase) {
  try {
    const res = await fetch(`${apiBase}/api/mitra/orders/${orderId}/accept`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept':        'application/json',
        'Content-Type':  'application/json',
      },
    })

    if (res.ok) {
      // Beritahu halaman aktif bahwa order sudah diterima
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      clients.forEach(c => c.postMessage({ type: 'ORDER_ACCEPTED', orderId }))

      // Buka / fokus halaman order
      await openOrdersPage()

      // Tutup notifikasi order ini (jika masih ada)
      const notifs = await self.registration.getNotifications({ tag: `mitra-order-${orderId}` })
      notifs.forEach(n => n.close())
    } else {
      // Order mungkin sudah diambil orang lain
      const data = await res.json().catch(() => ({}))
      await self.registration.showNotification('Order Tidak Tersedia', {
        body:  data.message || 'Order ini sudah diambil mitra lain.',
        icon:  '/icon-192.png',
        tag:   `order-fail-${orderId}`,
        vibrate: [200],
      })
    }
  } catch {
    await openOrdersPage()
  }
}

// ── Buka / fokus halaman order mitra ─────────────────────────────────────────
async function openOrdersPage() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const client of clients) {
    if (client.url.includes('/mitra') || client.url.includes('/dashboard')) {
      await client.focus()
      client.navigate('/mitra/orders')
      return
    }
  }
  // Tidak ada tab aktif — buka tab baru
  await self.clients.openWindow('/mitra/orders')
}
