import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import ApkPopup from './components/ApkPopup'
import { useEffect, useState, useRef, useCallback } from 'react'
import useFcmToken from './hooks/useFcmToken'
import echo from './services/echo'
import api from './services/api'
import { storeIncomingCall, markAutoAnswer, peekIncomingCall, onIncomingCallUpdate } from './services/callBuffer'
import { startRingtone, stopRingtone } from './utils/ringtone'
import { useJsApiLoader } from '@react-google-maps/api'
import { AuthProvider, useAuth } from './context/AuthContext'

const _GMAPS_LIBS = ['places']
import { MitraGpsProvider } from './context/MitraGpsContext'
import { useTheme } from './hooks/useTheme'
import { unlockAudio } from './hooks/useNewOrderNotif'
import { isNative, initPushNotifications } from './utils/nativePlatform'
import { App as CapApp } from '@capacitor/app'
import { registerPlugin } from '@capacitor/core'
const AgoraVoice = registerPlugin('AgoraVoice')
import useAppInfo from './hooks/useAppInfo'

// Guard route modul — redirect ke dashboard jika modul dinonaktifkan admin
function ModuleRoute({ featureKey, children }) {
  const { features } = useAppInfo()
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (features && features[featureKey] === false) return <Navigate to="/dashboard" replace />
  return children
}
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import DashboardPage from './pages/DashboardPage'
import WalletPage from './pages/WalletPage'
import TopUpPage from './pages/TopUpPage'
import WithdrawPage from './pages/WithdrawPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminPendingReviewPage from './pages/admin/AdminPendingReviewPage'
import AdminTopUpPage from './pages/admin/AdminTopUpPage'
import AdminWithdrawPage from './pages/admin/AdminWithdrawPage'
import AdminWalletPage from './pages/admin/AdminWalletPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminAuditLogPage from './pages/admin/AdminAuditLogPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import OrdersPage from './pages/OrdersPage'
import CreateOrderPage from './pages/CreateOrderPage'
import MitraOrdersPage from './pages/MitraOrdersPage'
import TrackingPage from './pages/TrackingPage'
import MitraGpsPage from './pages/MitraGpsPage'
import ChatPage from './pages/ChatPage'
import JastipPage from './pages/JastipPage'
import MitraJastipPage from './pages/MitraJastipPage'
import ProfilePage from './pages/ProfilePage'
import NotificationsPage from './pages/NotificationsPage'
import MitraOrderAlert from './components/MitraOrderAlert'
import AdminFoodMerchantsPage from './pages/admin/AdminFoodMerchantsPage'
import AdminFoodMerchantReviewPage from './pages/admin/AdminFoodMerchantReviewPage'
import AdminHomeProvidersPage from './pages/admin/AdminHomeProvidersPage'
import AdminHomeProviderReviewPage from './pages/admin/AdminHomeProviderReviewPage'
import AdminHomeOrdersPage from './pages/admin/AdminHomeOrdersPage'
import AdminServProvidersPage from './pages/admin/AdminServProvidersPage'
import AdminServOrdersPage from './pages/admin/AdminServOrdersPage'
import AdminServProviderReviewPage from './pages/admin/AdminServProviderReviewPage'
import ZasaHomePage from './pages/zasahome/ZasaHomePage'
import HomeProviderPage from './pages/zasahome/HomeProviderPage'
import HomeCheckoutPage from './pages/zasahome/HomeCheckoutPage'
import HomeMyOrdersPage from './pages/zasahome/HomeMyOrdersPage'
import HomeOrderDetailPage from './pages/zasahome/HomeOrderDetailPage'
import ZasaServPage from './pages/zasaserv/ZasaServPage'
import ServProviderPage from './pages/zasaserv/ServProviderPage'
import ServCheckoutPage from './pages/zasaserv/ServCheckoutPage'
import ServMyOrdersPage from './pages/zasaserv/ServMyOrdersPage'
import ServOrderDetailPage from './pages/zasaserv/ServOrderDetailPage'
import HomeProviderDashboardPage from './pages/home_provider/HomeProviderDashboardPage'
import HomeProviderServicesPage from './pages/home_provider/HomeProviderServicesPage'
import HomeProviderSettingsPage from './pages/home_provider/HomeProviderSettingsPage'
import ServProviderDashboardPage from './pages/serv_provider/ServProviderDashboardPage'
import ServProviderServicesPage from './pages/serv_provider/ServProviderServicesPage'
import ServProviderSettingsPage from './pages/serv_provider/ServProviderSettingsPage'
import FoodPage from './pages/zasafood/FoodPage'
import FoodMerchantPage from './pages/zasafood/FoodMerchantPage'
import FoodCartPage from './pages/zasafood/FoodCartPage'
import FoodOrdersPage from './pages/zasafood/FoodOrdersPage'
import FoodTrackingPage from './pages/zasafood/FoodTrackingPage'
import MitraFoodOrdersPage from './pages/zasafood/MitraFoodOrdersPage'
import MitraMartOrdersPage from './pages/zasamart/MitraMartOrdersPage'
import FoodJastipSessionsPage from './pages/zasafood/FoodJastipSessionsPage'
import AdminFoodOrdersPage from './pages/admin/AdminFoodOrdersPage'
import AdminMitraVerificationPage from './pages/admin/AdminMitraVerificationPage'
import AdminMitraReviewPage from './pages/admin/AdminMitraReviewPage'
import AdminPromosPage from './pages/admin/AdminPromosPage'
import MitraOnboardingPage from './pages/MitraOnboardingPage'
import MerchantDashboardPage from './pages/merchant/MerchantDashboardPage'
import MerchantMenuPage from './pages/merchant/MerchantMenuPage'
import MerchantSettingsPage from './pages/merchant/MerchantSettingsPage'
import MerchantOrdersPage from './pages/merchant/MerchantOrdersPage'
import ZasaShopPage from './pages/zasamart/ZasaShopPage'
import MartProductPage from './pages/zasamart/MartProductPage'
import MartCartPage from './pages/zasamart/MartCartPage'
import MartCheckoutPage from './pages/zasamart/MartCheckoutPage'
import MartOrdersPage from './pages/zasamart/MartOrdersPage'
import MartOrderDetailPage from './pages/zasamart/MartOrderDetailPage'
import MartSellerPage from './pages/zasamart/MartSellerPage'
import SellerDashboardPage from './pages/seller/SellerDashboardPage'
import SellerOrdersPage from './pages/seller/SellerOrdersPage'
import SellerProductsPage from './pages/seller/SellerProductsPage'
import SellerSettingsPage from './pages/seller/SellerSettingsPage'
import SellerWalletPage from './pages/seller/SellerWalletPage'
import AdminMartSellersPage from './pages/admin/AdminMartSellersPage'
import AdminMartSellerReviewPage from './pages/admin/AdminMartSellerReviewPage'
import AdminMartProductsPage from './pages/admin/AdminMartProductsPage'
import AdminMartOrdersPage from './pages/admin/AdminMartOrdersPage'
import AdminModulesPage from './pages/admin/AdminModulesPage'
import NotFoundPage from './pages/NotFoundPage'
import LandingPage from './pages/LandingPage'
import AboutPage from './pages/AboutPage'
import TosPage from './pages/TosPage'
import PrivacyPage from './pages/PrivacyPage'
import ContactPage from './pages/ContactPage'
import LayananPage from './pages/LayananPage'
import CaraKerjaPage from './pages/CaraKerjaPage'
import DaftarMitraPage from './pages/DaftarMitraPage'
import RefundPage from './pages/RefundPage'
import AddressesPage from './pages/AddressesPage'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function GuestRoute({ children }) {
  const { user } = useAuth()
  return !user ? children : <Navigate to="/dashboard" replace />
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

function MerchantRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'merchant') return <Navigate to="/dashboard" replace />
  return children
}

function HomeProviderRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'home_provider') return <Navigate to="/dashboard" replace />
  return children
}

function ServProviderRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'serv_provider' && user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

function SellerRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'seller') return <Navigate to="/dashboard" replace />
  return children
}

function DashboardRedirect() {
  const { user } = useAuth()
  if (user?.role === 'merchant')                          return <Navigate to="/merchant" replace />
  if (user?.role === 'admin')                             return <Navigate to="/admin" replace />
  if (user?.role === 'home_provider')                     return <Navigate to="/home/provider" replace />
  if (user?.role === 'seller')                            return <Navigate to="/seller" replace />
  if (user?.role?.startsWith('mitra') && user?.status === 'pending_review') return <Navigate to="/mitra/onboarding" replace />
  return <DashboardPage />
}

function MitraRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!user.role?.startsWith('mitra')) return <Navigate to="/dashboard" replace />
  if (user.status === 'pending_review') return <Navigate to="/mitra/onboarding" replace />
  return children
}

function ThemeInitializer() {
  useTheme()
  return null
}

function MaintenanceScreen() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--k-bg)', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🔧</div>
      <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--k-text)', marginBottom: 8 }}>Sedang Pemeliharaan</div>
      <div style={{ fontSize: 14, color: 'var(--k-sub)', maxWidth: 280, lineHeight: 1.6 }}>
        Aplikasi sedang dalam proses pemeliharaan. Silakan coba beberapa saat lagi.
      </div>
    </div>
  )
}

function AppRoutes() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { maintenance_mode } = useAppInfo()

  // Load Google Maps script sekali di level app — tersedia untuk semua halaman pelanggan
  useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    libraries: _GMAPS_LIBS,
  })

  useEffect(() => {
    const handler = () => { logout(); navigate('/login', { replace: true }) }
    window.addEventListener('zasaqu:unauthorized', handler)
    return () => window.removeEventListener('zasaqu:unauthorized', handler)
  }, [navigate])

  useEffect(() => {
    if (!isNative) return
    const sub = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        CapApp.exitApp()
      }
    })
    return () => { sub.then(s => s.remove()) }
  }, [])

  // Admin bypass maintenance; user belum login tetap bisa ke /login
  if (maintenance_mode && user && user.role !== 'admin') return <MaintenanceScreen />

  return (
    <>
      {/* Notifikasi order untuk mitra — aktif di semua halaman */}
      <MitraOrderAlert />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><DashboardRedirect /></PrivateRoute>} />
      <Route path="/wallet" element={<PrivateRoute><WalletPage /></PrivateRoute>} />
      <Route path="/topup" element={<PrivateRoute><TopUpPage /></PrivateRoute>} />
      <Route path="/withdraw" element={<PrivateRoute><WithdrawPage /></PrivateRoute>} />

      {/* Admin Panel */}
      <Route path="/orders" element={<PrivateRoute><OrdersPage /></PrivateRoute>} />
      <Route path="/orders/create" element={<PrivateRoute><CreateOrderPage /></PrivateRoute>} />
      <Route path="/mitra/orders" element={<MitraRoute><MitraOrdersPage /></MitraRoute>} />
      <Route path="/mitra/gps" element={<MitraRoute><MitraGpsPage /></MitraRoute>} />
      <Route path="/orders/:id/tracking" element={<PrivateRoute><TrackingPage /></PrivateRoute>} />
      <Route path="/orders/:id/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/mitra/orders/:id/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/food/orders/:id/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/mitra/food/orders/:id/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/mart/orders/:id/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/mitra/mart/orders/:id/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/home/orders/:id/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/home/provider/orders/:id/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/jastip" element={<PrivateRoute><JastipPage /></PrivateRoute>} />
      <Route path="/mitra/jastip" element={<PrivateRoute><MitraJastipPage /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
      <Route path="/addresses" element={<PrivateRoute><AddressesPage /></PrivateRoute>} />

      {/* ZasaHome */}
      <Route path="/home" element={<ModuleRoute featureKey="zasahome"><ZasaHomePage /></ModuleRoute>} />
      <Route path="/home/providers/:id" element={<ModuleRoute featureKey="zasahome"><HomeProviderPage /></ModuleRoute>} />
      <Route path="/home/checkout" element={<ModuleRoute featureKey="zasahome"><HomeCheckoutPage /></ModuleRoute>} />
      <Route path="/home/orders" element={<ModuleRoute featureKey="zasahome"><HomeMyOrdersPage /></ModuleRoute>} />
      <Route path="/home/orders/:id" element={<ModuleRoute featureKey="zasahome"><HomeOrderDetailPage /></ModuleRoute>} />
      <Route path="/home/provider" element={<HomeProviderRoute><HomeProviderDashboardPage /></HomeProviderRoute>} />
      <Route path="/home/provider/services" element={<HomeProviderRoute><HomeProviderServicesPage /></HomeProviderRoute>} />
      <Route path="/home/provider/settings" element={<HomeProviderRoute><HomeProviderSettingsPage /></HomeProviderRoute>} />

      {/* ZasaServ */}
      <Route path="/serv" element={<ModuleRoute featureKey="zasaserv"><ZasaServPage /></ModuleRoute>} />
      <Route path="/serv/providers/:id" element={<ModuleRoute featureKey="zasaserv"><ServProviderPage /></ModuleRoute>} />
      <Route path="/serv/checkout" element={<ModuleRoute featureKey="zasaserv"><ServCheckoutPage /></ModuleRoute>} />
      <Route path="/serv/orders" element={<ModuleRoute featureKey="zasaserv"><ServMyOrdersPage /></ModuleRoute>} />
      <Route path="/serv/orders/:id" element={<ModuleRoute featureKey="zasaserv"><ServOrderDetailPage /></ModuleRoute>} />
      <Route path="/serv/provider" element={<ServProviderRoute><ServProviderDashboardPage /></ServProviderRoute>} />
      <Route path="/serv/provider/services" element={<ServProviderRoute><ServProviderServicesPage /></ServProviderRoute>} />
      <Route path="/serv/provider/settings" element={<ServProviderRoute><ServProviderSettingsPage /></ServProviderRoute>} />

      {/* ZasaFood */}
      <Route path="/food" element={<ModuleRoute featureKey="zasafood"><FoodPage /></ModuleRoute>} />
      <Route path="/food/merchants/:id" element={<ModuleRoute featureKey="zasafood"><FoodMerchantPage /></ModuleRoute>} />
      <Route path="/food/cart" element={<ModuleRoute featureKey="zasafood"><FoodCartPage /></ModuleRoute>} />
      <Route path="/food/orders" element={<ModuleRoute featureKey="zasafood"><FoodOrdersPage /></ModuleRoute>} />
      <Route path="/food/orders/:id" element={<ModuleRoute featureKey="zasafood"><FoodTrackingPage /></ModuleRoute>} />
      <Route path="/food/jastip/sessions" element={<ModuleRoute featureKey="zasafood"><FoodJastipSessionsPage /></ModuleRoute>} />
      <Route path="/mitra/food/orders" element={<MitraRoute><ModuleRoute featureKey="zasafood"><MitraFoodOrdersPage /></ModuleRoute></MitraRoute>} />
      <Route path="/mitra/mart/orders" element={<MitraRoute><ModuleRoute featureKey="zasamart"><MitraMartOrdersPage /></ModuleRoute></MitraRoute>} />
      <Route path="/mitra/onboarding" element={<PrivateRoute><MitraOnboardingPage /></PrivateRoute>} />
      <Route path="/admin/mitra/verify" element={<AdminRoute><AdminMitraVerificationPage /></AdminRoute>} />
      <Route path="/admin/mitra/review" element={<AdminRoute><AdminMitraReviewPage /></AdminRoute>} />

      <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route path="/admin/pending" element={<AdminRoute><AdminPendingReviewPage /></AdminRoute>} />
      <Route path="/admin/orders" element={<AdminRoute><AdminOrdersPage /></AdminRoute>} />
      <Route path="/admin/food/merchants" element={<AdminRoute><AdminFoodMerchantsPage /></AdminRoute>} />
      <Route path="/admin/food/review" element={<AdminRoute><AdminFoodMerchantReviewPage /></AdminRoute>} />
      <Route path="/admin/food/orders" element={<AdminRoute><AdminFoodOrdersPage /></AdminRoute>} />
      <Route path="/admin/home/providers" element={<AdminRoute><AdminHomeProvidersPage /></AdminRoute>} />
      <Route path="/admin/home/review" element={<AdminRoute><AdminHomeProviderReviewPage /></AdminRoute>} />
      <Route path="/admin/home/orders" element={<AdminRoute><AdminHomeOrdersPage /></AdminRoute>} />
      <Route path="/admin/serv/providers" element={<AdminRoute><AdminServProvidersPage /></AdminRoute>} />
      <Route path="/admin/serv/review" element={<AdminRoute><AdminServProviderReviewPage /></AdminRoute>} />
      <Route path="/admin/serv/orders" element={<AdminRoute><AdminServOrdersPage /></AdminRoute>} />
      <Route path="/admin/topup" element={<AdminRoute><AdminTopUpPage /></AdminRoute>} />
      <Route path="/admin/withdraw" element={<AdminRoute><AdminWithdrawPage /></AdminRoute>} />
      <Route path="/admin/wallet" element={<AdminRoute><AdminWalletPage /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      <Route path="/admin/promos" element={<AdminRoute><AdminPromosPage /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
      <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogPage /></AdminRoute>} />

      {/* ZasaShop — Customer */}
      <Route path="/mart" element={<ModuleRoute featureKey="zasamart"><ZasaShopPage /></ModuleRoute>} />
      <Route path="/mart/products/:id" element={<ModuleRoute featureKey="zasamart"><MartProductPage /></ModuleRoute>} />
      <Route path="/mart/cart" element={<ModuleRoute featureKey="zasamart"><MartCartPage /></ModuleRoute>} />
      <Route path="/mart/checkout" element={<ModuleRoute featureKey="zasamart"><MartCheckoutPage /></ModuleRoute>} />
      <Route path="/mart/orders" element={<ModuleRoute featureKey="zasamart"><MartOrdersPage /></ModuleRoute>} />
      <Route path="/mart/orders/:id" element={<ModuleRoute featureKey="zasamart"><MartOrderDetailPage /></ModuleRoute>} />
      <Route path="/mart/sellers/:id" element={<ModuleRoute featureKey="zasamart"><MartSellerPage /></ModuleRoute>} />

      {/* ZasaShop — Seller */}
      <Route path="/seller" element={<SellerRoute><SellerDashboardPage /></SellerRoute>} />
      <Route path="/seller/orders" element={<SellerRoute><SellerOrdersPage /></SellerRoute>} />
      <Route path="/seller/products" element={<SellerRoute><SellerProductsPage /></SellerRoute>} />
      <Route path="/seller/settings" element={<SellerRoute><SellerSettingsPage /></SellerRoute>} />
      <Route path="/seller/wallet" element={<SellerRoute><SellerWalletPage /></SellerRoute>} />

      {/* Admin ZasaShop */}
      <Route path="/admin/mart/sellers" element={<AdminRoute><AdminMartSellersPage /></AdminRoute>} />
      <Route path="/admin/mart/review" element={<AdminRoute><AdminMartSellerReviewPage /></AdminRoute>} />
      <Route path="/admin/mart/products" element={<AdminRoute><AdminMartProductsPage /></AdminRoute>} />
      <Route path="/admin/mart/orders" element={<AdminRoute><AdminMartOrdersPage /></AdminRoute>} />

      {/* Admin Modules */}
      <Route path="/admin/modules" element={<AdminRoute><AdminModulesPage /></AdminRoute>} />

      {/* Merchant Panel */}
      <Route path="/merchant" element={<MerchantRoute><MerchantDashboardPage /></MerchantRoute>} />
      <Route path="/merchant/orders" element={<MerchantRoute><MerchantOrdersPage /></MerchantRoute>} />
      <Route path="/merchant/menu" element={<MerchantRoute><MerchantMenuPage /></MerchantRoute>} />
      <Route path="/merchant/settings" element={<MerchantRoute><MerchantSettingsPage /></MerchantRoute>} />

      {/* Halaman publik */}
      <Route path="/about"        element={<AboutPage />} />
      <Route path="/tos"          element={<TosPage />} />
      <Route path="/privacy"      element={<PrivacyPage />} />
      <Route path="/contact"      element={<ContactPage />} />
      <Route path="/layanan"      element={<LayananPage />} />
      <Route path="/cara-kerja"   element={<CaraKerjaPage />} />
      <Route path="/daftar-mitra" element={<DaftarMitraPage />} />
      <Route path="/refund"       element={<RefundPage />} />

      {/* 404 — catch-all */}
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

// Navigasi URL dari data notifikasi FCM
function resolveNotifUrl(data = {}, userRole = '') {
  const { type = '', order_id, order_type, module } = data
  if (type === 'incoming_call' && order_id && order_type) {
    return resolveChatPath(userRole, order_type, order_id)
  }
  if (type.startsWith('food_') || module === 'zasafood')   return order_id ? `/food/orders/${order_id}`  : '/food/orders'
  if (type.startsWith('mart_') || module === 'zasamart')   return order_id ? `/mart/orders/${order_id}`  : '/mart/orders'
  if (order_id) return `/orders/${order_id}/tracking`
  return '/notifications'
}

// Banner notifikasi foreground (native Android — FCM tidak auto-show saat app buka)
function ForegroundBanner({ notif, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])
  if (!notif) return null
  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
      background: 'linear-gradient(135deg, #1A1A2E, #16213E)',
      borderBottom: '2px solid var(--k-accent)',
      padding: '14px 18px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      animation: 'slideDownNotif 0.3s ease',
    }}>
      <style>{`@keyframes slideDownNotif { from{transform:translateY(-100%)} to{transform:translateY(0)} }`}</style>
      <span style={{ fontSize: 24 }}>{notif.data?.emoji ?? '🔔'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 2 }}>{notif.title}</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{notif.body}</p>
      </div>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>×</span>
    </div>
  )
}

// Jembatan notifikasi — dipasang di dalam AuthProvider agar bisa akses user
function NotifBridge() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [foregroundNotif, setForegroundNotif] = useState(null)

  // Ref agar onTap closure selalu bisa baca user terbaru tanpa re-register listener
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  // Web push: daftarkan FCM token (hanya browser, bukan native)
  useFcmToken(user)

  // Simpan API config ke native agar IncomingCallActivity bisa decline
  useEffect(() => {
    if (!isNative || !user) return
    const token = localStorage.getItem('token') || ''
    const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api'
    AgoraVoice.setCallConfig({ baseUrl, token }).catch(() => {})

    // Flush pending FCM token yang disimpan saat user belum login
    const pendingFcm = localStorage.getItem('_pending_fcm_token')
    if (pendingFcm) {
      localStorage.removeItem('_pending_fcm_token')
      api.post('/auth/fcm-token', { fcm_token: pendingFcm }).catch(() => {})
    }
  }, [user?.id])

  // Cek pending call dari IncomingCallActivity (saat app kembali aktif setelah user angkat)
  useEffect(() => {
    if (!isNative || !user) return
    const checkPending = async () => {
      try {
        const res = await AgoraVoice.getPendingCall()
        if (res?.orderId && res?.orderType) {
          storeIncomingCall({ orderId: res.orderId, orderType: res.orderType, callerName: res.callerName || null })
          if (res.autoAnswer) markAutoAnswer()
          const targetPath = resolveChatPath(user.role, res.orderType, res.orderId)
          navigate(targetPath)
        }
      } catch {}
    }
    checkPending()
    const sub = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) checkPending()
    })
    return () => { sub.then(h => h.remove()).catch(() => {}) }
  }, [user?.id, navigate])

  // Deferred navigation: app mati → onTap simpan ke localStorage → user load → navigasi
  useEffect(() => {
    if (!user) return
    const raw = localStorage.getItem('_pending_notif_tap')
    if (!raw) return
    localStorage.removeItem('_pending_notif_tap')
    try {
      const data = JSON.parse(raw)
      // Panggilan masuk ditangani VoiceCallBridge via _pending_call_tap — skip di sini
      if (data.type !== 'incoming_call') {
        navigate(resolveNotifUrl(data, user.role))
      }
    } catch {}
  }, [user?.id, navigate])

  useEffect(() => {
    if (!isNative) return

    initPushNotifications({
      onForeground: (notif) => {
        // Di foreground, tampilkan banner manual (FCM tidak auto-show)
        // incoming_call ditangani ZasaQuFcmService + VoiceCallBridge, tidak perlu banner
        const data = notif?.data ?? {}
        if (data.type !== 'incoming_call') setForegroundNotif(notif)
      },
      onTap: (notif) => {
        const data = notif?.data ?? {}
        const currentUser = userRef.current

        if (data.type === 'incoming_call' && data.order_id && data.order_type) {
          // Simpan ke callBuffer + localStorage (VoiceCallBridge tampilkan overlay)
          storeIncomingCall({ orderId: data.order_id, orderType: data.order_type, callerName: data.caller_name || null })
          localStorage.setItem('_pending_call_tap', JSON.stringify({
            order_id: data.order_id, order_type: data.order_type, caller_name: data.caller_name || null,
          }))
          return // VoiceCallBridge yang handle — tidak navigate manual
        }

        // Notif biasa: navigasi langsung jika user sudah ada, atau simpan untuk nanti
        if (currentUser) {
          navigate(resolveNotifUrl(data, currentUser.role))
        } else {
          localStorage.setItem('_pending_notif_tap', JSON.stringify(data))
        }
      },
    }).catch(() => {})
  }, [navigate])

  return (
    <ForegroundBanner
      notif={foregroundNotif}
      onClose={() => setForegroundNotif(null)}
    />
  )
}

// Resolve URL chat dari role user + orderType + orderId
function resolveChatPath(role, orderType, orderId) {
  const isMitra = role?.startsWith('mitra')
  if (orderType === 'zasafood')  return isMitra ? `/mitra/food/orders/${orderId}/chat` : `/food/orders/${orderId}/chat`
  if (orderType === 'zasamart')  return isMitra ? `/mitra/mart/orders/${orderId}/chat` : `/mart/orders/${orderId}/chat`
  if (orderType === 'zasahome')  return role === 'home_provider' ? `/home/provider/orders/${orderId}/chat` : `/home/orders/${orderId}/chat`
  return isMitra ? `/mitra/orders/${orderId}/chat` : `/orders/${orderId}/chat`
}

// Overlay panggilan masuk — muncul dari manapun, bukan hanya di ChatPage
function IncomingCallOverlay({ onAnswer, onDecline, callerName }) {
  // onTouchEnd sebagai backup onClick — Android WebView kadang delay 300ms pada onClick
  const handleAnswer  = (e) => { e.preventDefault(); onAnswer() }
  const handleDecline = (e) => { e.preventDefault(); onDecline() }
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 20000,
      background: 'rgba(0,0,0,0.85)',
      // backdropFilter dihapus — menyebabkan touch event blocking di Android WebView
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 24, padding: 32,
      touchAction: 'manipulation',
    }}>
      <div style={{ fontSize: 64, animation: 'phonePulse 0.9s ease-in-out infinite' }}>📞</div>
      <p style={{ color: '#fff', fontSize: 22, fontWeight: 800, textAlign: 'center' }}>
        {callerName || 'Panggilan Masuk'}
      </p>
      {callerName && (
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginTop: -16 }}>Panggilan Masuk</p>
      )}
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center' }}>Tap Angkat untuk menerima</p>
      <div style={{ display: 'flex', gap: 28 }}>
        <button
          onClick={handleDecline}
          onTouchEnd={handleDecline}
          style={{
            width: 70, height: 70, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: '#EF4444', fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(239,68,68,0.5)', touchAction: 'manipulation',
          }}>📵</button>
        <button
          onClick={handleAnswer}
          onTouchEnd={handleAnswer}
          style={{
            width: 70, height: 70, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: '#00C896', fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            touchAction: 'manipulation',
            // Animasi box-shadow — tidak menggeser hit area (tidak pakai transform)
            animation: 'ringPulse 1.2s ease-out infinite',
          }}>📲</button>
      </div>
      <style>{`@keyframes ringPulse { 0%{box-shadow:0 0 0 0 rgba(0,200,150,0.6)} 70%{box-shadow:0 0 0 18px rgba(0,200,150,0)} 100%{box-shadow:0 0 0 0 rgba(0,200,150,0)} }`}</style>
    </div>
  )
}

// Subscriber global panggilan masuk — aktif selama user login, bukan hanya di ChatPage
function VoiceCallBridge() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [incoming, setIncoming] = useState(null)

  // Pakai ref agar listener tidak basi saat location berubah
  const locationRef = useRef(location)
  useEffect(() => { locationRef.current = location }, [location])

  // Hapus overlay otomatis saat user sudah berada di halaman chat panggilan ini
  useEffect(() => {
    if (!incoming) return
    const chatPath = resolveChatPath(user?.role, incoming.orderType, incoming.orderId)
    if (location.pathname === chatPath) setIncoming(null)
  }, [location.pathname, incoming, user?.role])

  // ── Tangkap call dari FCM tap saat app mati/background ──────────────────────
  // Skenario 1: app mati → onTap simpan ke _pending_call_tap → user load → cek di sini
  // Skenario 2: app background → onTap → storeIncomingCall → listener di bawah tangkap
  useEffect(() => {
    if (!user) return
    const raw = localStorage.getItem('_pending_call_tap')
    if (!raw) return
    localStorage.removeItem('_pending_call_tap')
    try {
      const d = JSON.parse(raw)
      if (!d.order_id || !d.order_type) return
      const call = { orderId: d.order_id, orderType: d.order_type, callerName: d.caller_name || null }
      storeIncomingCall(call)
      const chatPath = resolveChatPath(user.role, call.orderType, call.orderId)
      if (locationRef.current.pathname !== chatPath) {
        setIncoming(call)
      }
    } catch {}
  }, [user?.id])

  // Skenario 2: app background, WebSocket mati → onTap → storeIncomingCall → listener ini
  useEffect(() => {
    if (!user) return
    const unsub = onIncomingCallUpdate((call) => {
      // Hanya tampilkan overlay jika BUKAN dari WebSocket ring (sudah ditangani listener ws di bawah)
      // Kita tandai dengan ada/tidaknya senderId: FCM tap tidak punya senderId
      if (call.senderId) return
      const chatPath = resolveChatPath(user.role, call.orderType, call.orderId)
      if (locationRef.current.pathname !== chatPath) {
        setIncoming({ orderId: call.orderId, orderType: call.orderType, callerName: call.callerName || null })
      }
    })
    return unsub
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const ch = echo.private(`user.${user.id}`)

    ch.listen('.call.signal', ({ signal_type, data, sender_id }) => {
      const orderId    = data?.order_id
      const orderType  = data?.order_type
      const callerName = data?.caller_name || null
      if (!orderId || !orderType) return

      // Jangan tampilkan overlay jika user sudah berada di ChatPage order ini
      const chatPath  = resolveChatPath(user.role, orderType, orderId)
      const onChat    = locationRef.current.pathname === chatPath

      if (signal_type === 'ring' && !onChat) {
        setIncoming({ orderId, orderType, senderId: sender_id, callerName })
        // Simpan ke buffer agar useVoiceCall di ChatPage bisa auto-answer saat user angkat dari overlay
        storeIncomingCall({ orderId, orderType, senderId: sender_id, callerName })
      }

      if (signal_type === 'ring' && onChat) {
        storeIncomingCall({ orderId, orderType, senderId: sender_id, callerName })
      }

      if (signal_type === 'offer') {
        storeIncomingCall({ orderId, orderType, offer: data.sdp, senderId: sender_id, callerName })
        if (!onChat) setIncoming(prev => prev ?? { orderId, orderType, senderId: sender_id, callerName })
      }

      if (signal_type === 'end') {
        setIncoming(prev => (String(prev?.orderId) === String(orderId) ? null : prev))
      }
    })

    return () => { echo.leave(`user.${user.id}`) }
  }, [user?.id]) // eslint-disable-line

  // Nada dering saat overlay panggilan masuk tampil (user tidak di ChatPage)
  useEffect(() => {
    if (incoming) {
      startRingtone()
    } else {
      stopRingtone()
    }
    return () => stopRingtone()
  }, [incoming])

  const handleAnswer = useCallback(async () => {
    if (!incoming) return
    // Await close AudioContext dulu sebelum navigate — hindari konflik audio di ChatPage
    await stopRingtone()
    // Tandai agar ChatPage auto-jawab tanpa butuh tap Angkat kedua kali
    markAutoAnswer()
    const path = resolveChatPath(user.role, incoming.orderType, incoming.orderId)
    navigate(path)
    setIncoming(null)
  }, [incoming, user?.role, navigate])

  const handleDecline = useCallback(() => {
    if (!incoming) return
    stopRingtone()
    api.post('/call/signal', {
      order_id:    incoming.orderId,
      order_type:  incoming.orderType,
      signal_type: 'end',
      data:        null,
    }).catch(() => {})
    setIncoming(null)
  }, [incoming])

  if (!incoming) return null
  return <IncomingCallOverlay onAnswer={handleAnswer} onDecline={handleDecline} callerName={incoming.callerName} />
}

export default function App() {
  useEffect(() => {
    const unlock = () => { unlockAudio() }
    window.addEventListener('touchstart', unlock, { once: true })
    window.addEventListener('click',      unlock, { once: true })
  }, [])

  return (
    <BrowserRouter>
      <ThemeInitializer />
      <AuthProvider>
        <MitraGpsProvider>
          <NotifBridge />
          <VoiceCallBridge />
          <AppRoutes />
          <ApkPopup />
        </MitraGpsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
