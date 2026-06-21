import { Capacitor, registerPlugin } from '@capacitor/core'

const FloatingBubble = registerPlugin('FloatingBubble')
const IS_ANDROID = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

// Apakah overlay permission sudah granted
export async function hasOverlayPermission() {
  if (!IS_ANDROID) return false
  try {
    const { granted } = await FloatingBubble.hasPermission()
    return granted
  } catch { return false }
}

// Minta izin overlay (buka Settings jika belum)
export async function requestOverlayPermission() {
  if (!IS_ANDROID) return
  try { await FloatingBubble.requestPermission() } catch {}
}

// Tampilkan bubble
// emoji: string emoji, label: string deskripsi, route: string path navigasi
export async function showBubble({ emoji = '📦', label = 'Order aktif', route = '/' } = {}) {
  if (!IS_ANDROID) return
  try {
    const granted = await hasOverlayPermission()
    if (!granted) return
    await FloatingBubble.show({ emoji, label, route })
  } catch {}
}

// Update konten bubble yang sudah tampil
export async function updateBubble({ emoji, label, route } = {}) {
  if (!IS_ANDROID) return
  try { await FloatingBubble.update({ emoji, label, route }) } catch {}
}

// Sembunyikan bubble
export async function dismissBubble() {
  if (!IS_ANDROID) return
  try { await FloatingBubble.dismiss() } catch {}
}

// Reset badge unread (panggil saat user membuka halaman chat)
export async function resetBubbleBadge() {
  if (!IS_ANDROID) return
  try { await FloatingBubble.resetBadge() } catch {}
}

// Cek apakah app sudah dibebaskan dari battery optimization
export async function hasBatteryOptimizationExemption() {
  if (!IS_ANDROID) return true
  try {
    const { exempt } = await FloatingBubble.hasBatteryOptimizationExemption()
    return exempt
  } catch { return true }
}

// Minta user bebaskan app dari battery optimization (buka dialog sistem)
export async function requestBatteryOptimization() {
  if (!IS_ANDROID) return
  try { await FloatingBubble.requestBatteryOptimization() } catch {}
}
