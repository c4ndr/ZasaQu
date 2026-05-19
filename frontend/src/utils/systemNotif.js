// Utilitas notifikasi sistem (notification bar) — bekerja saat browser minimize

export async function requestNotifPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied')  return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function showOrderStatusNotif({ emoji, message, order_number }) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const n = new Notification(`${emoji ?? '📦'} Update Order ${order_number ?? ''}`.trim(), {
      body: message,
      icon: '/favicon.ico',
      tag:  `order-status-${Date.now()}`,
    })
    n.onclick = () => { window.focus(); n.close() }
  } catch {}
}

export function showNewOrderNotif({ shipping_fee, pickup_address }) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    const n = new Notification('🚀 Order Baru Masuk!', {
      body: `Rp ${Number(shipping_fee).toLocaleString('id-ID')} · ${pickup_address}`,
      icon: '/favicon.ico',
      tag:  `new-order-${Date.now()}`,
      requireInteraction: true,
    })
    n.onclick = () => { window.focus(); n.close() }
  } catch {}
}
