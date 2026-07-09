import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import ApkPopup from './components/ApkPopup'
import ForceUpdateScreen from './components/ForceUpdateScreen'
import { lazy, Suspense, useEffect, useState, useRef, useCallback } from 'react'
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
import useFloatingBubble from './hooks/useFloatingBubble'

// Role yang jelas hanya sebagai penyedia layanan, bukan pelanggan
const PROVIDER_ONLY_ROLES = ['mitra_motor', 'mitra_mobil', 'home_provider', 'serv_provider', 'seller', 'merchant']

// Guard route modul — redirect ke dashboard jika modul dinonaktifkan admin atau bukan pelanggan
function ModuleRoute({ featureKey, children }) {
  const { features } = useAppInfo()
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (features && features[featureKey] === false) return <Navigate to="/dashboard" replace />
  if (PROVIDER_ONLY_ROLES.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

// Khusus route mitra — cek feature flag tapi TIDAK blokir mitra_motor/mitra_mobil
function MitraModuleRoute({ featureKey, children }) {
  const { features } = useAppInfo()
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (features && features[featureKey] === false) return <Navigate to="/dashboard" replace />
  return children
}

// Route browsing publik — guest boleh masuk, login baru wajib saat mau order
function BrowseRoute({ featureKey, children }) {
  const { features } = useAppInfo()
  const { user } = useAuth()
  if (features && features[featureKey] === false) return <Navigate to={user ? '/dashboard' : '/'} replace />
  if (user && PROVIDER_ONLY_ROLES.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}
import MitraOrderAlert from './components/MitraOrderAlert'

// ── Lazy-load semua halaman agar bundle awal lebih kecil ──────────────────────
const lazy_ = (fn) => lazy(fn)

const LoginPage              = lazy_(() => import('./pages/LoginPage'))
const RegisterPage           = lazy_(() => import('./pages/RegisterPage'))
const ForgotPasswordPage     = lazy_(() => import('./pages/ForgotPasswordPage'))
const DashboardPage          = lazy_(() => import('./pages/DashboardPage'))
const WalletPage             = lazy_(() => import('./pages/WalletPage'))
const TopUpPage              = lazy_(() => import('./pages/TopUpPage'))
const WithdrawPage           = lazy_(() => import('./pages/WithdrawPage'))
const ProfilePage            = lazy_(() => import('./pages/ProfilePage'))
const NotificationsPage      = lazy_(() => import('./pages/NotificationsPage'))
const AddressesPage          = lazy_(() => import('./pages/AddressesPage'))
const OrdersPage             = lazy_(() => import('./pages/OrdersPage'))
const CreateOrderPage        = lazy_(() => import('./pages/CreateOrderPage'))
const MitraOrdersPage        = lazy_(() => import('./pages/MitraOrdersPage'))
const TrackingPage           = lazy_(() => import('./pages/TrackingPage'))
const MitraGpsPage           = lazy_(() => import('./pages/MitraGpsPage'))
const ChatPage               = lazy_(() => import('./pages/ChatPage'))
const JastipPage             = lazy_(() => import('./pages/JastipPage'))
const MitraJastipPage        = lazy_(() => import('./pages/MitraJastipPage'))
const MitraOnboardingPage    = lazy_(() => import('./pages/MitraOnboardingPage'))
const NotFoundPage           = lazy_(() => import('./pages/NotFoundPage'))
const LandingPage            = lazy_(() => import('./pages/LandingPage'))
const AboutPage              = lazy_(() => import('./pages/AboutPage'))
const TosPage                = lazy_(() => import('./pages/TosPage'))
const PrivacyPage            = lazy_(() => import('./pages/PrivacyPage'))
const ContactPage            = lazy_(() => import('./pages/ContactPage'))
const LayananPage            = lazy_(() => import('./pages/LayananPage'))
const CaraKerjaPage          = lazy_(() => import('./pages/CaraKerjaPage'))
const DaftarMitraPage        = lazy_(() => import('./pages/DaftarMitraPage'))
const RefundPage             = lazy_(() => import('./pages/RefundPage'))

// Admin
const AdminDashboardPage         = lazy_(() => import('./pages/admin/AdminDashboardPage'))
const AdminPendingReviewPage     = lazy_(() => import('./pages/admin/AdminPendingReviewPage'))
const AdminTopUpPage             = lazy_(() => import('./pages/admin/AdminTopUpPage'))
const AdminWithdrawPage          = lazy_(() => import('./pages/admin/AdminWithdrawPage'))
const AdminComplaintsPage        = lazy_(() => import('./pages/admin/AdminComplaintsPage'))
const AdminWalletPage            = lazy_(() => import('./pages/admin/AdminWalletPage'))
const AdminUsersPage             = lazy_(() => import('./pages/admin/AdminUsersPage'))
const AdminSettingsPage          = lazy_(() => import('./pages/admin/AdminSettingsPage'))
const AdminAuditLogPage          = lazy_(() => import('./pages/admin/AdminAuditLogPage'))
const AdminOrdersPage            = lazy_(() => import('./pages/admin/AdminOrdersPage'))
const AdminFoodOrdersPage        = lazy_(() => import('./pages/admin/AdminFoodOrdersPage'))
const AdminFoodMerchantsPage     = lazy_(() => import('./pages/admin/AdminFoodMerchantsPage'))
const AdminFoodMerchantReviewPage = lazy_(() => import('./pages/admin/AdminFoodMerchantReviewPage'))
const AdminHomeProvidersPage     = lazy_(() => import('./pages/admin/AdminHomeProvidersPage'))
const AdminHomeProviderReviewPage = lazy_(() => import('./pages/admin/AdminHomeProviderReviewPage'))
const AdminHomeOrdersPage        = lazy_(() => import('./pages/admin/AdminHomeOrdersPage'))
const AdminServProvidersPage     = lazy_(() => import('./pages/admin/AdminServProvidersPage'))
const AdminServOrdersPage        = lazy_(() => import('./pages/admin/AdminServOrdersPage'))
const AdminServProviderReviewPage = lazy_(() => import('./pages/admin/AdminServProviderReviewPage'))
const AdminMitraVerificationPage = lazy_(() => import('./pages/admin/AdminMitraVerificationPage'))
const AdminMitraReviewPage       = lazy_(() => import('./pages/admin/AdminMitraReviewPage'))
const AdminPromosPage            = lazy_(() => import('./pages/admin/AdminPromosPage'))
const AdminVouchersPage          = lazy_(() => import('./pages/admin/AdminVouchersPage'))
const AdminMartSellersPage       = lazy_(() => import('./pages/admin/AdminMartSellersPage'))
const AdminMartSellerReviewPage  = lazy_(() => import('./pages/admin/AdminMartSellerReviewPage'))
const AdminMartProductsPage      = lazy_(() => import('./pages/admin/AdminMartProductsPage'))
const AdminMartOrdersPage        = lazy_(() => import('./pages/admin/AdminMartOrdersPage'))
const AdminRideOrdersPage        = lazy_(() => import('./pages/admin/AdminRideOrdersPage'))
const AdminModulesPage           = lazy_(() => import('./pages/admin/AdminModulesPage'))
const AdminBroadcastPage         = lazy_(() => import('./pages/admin/AdminBroadcastPage'))

// ZasaHome
const ZasaHomePage           = lazy_(() => import('./pages/zasahome/ZasaHomePage'))
const HomeProviderPage       = lazy_(() => import('./pages/zasahome/HomeProviderPage'))
const HomeCheckoutPage       = lazy_(() => import('./pages/zasahome/HomeCheckoutPage'))
const HomeMyOrdersPage       = lazy_(() => import('./pages/zasahome/HomeMyOrdersPage'))
const HomeOrderDetailPage    = lazy_(() => import('./pages/zasahome/HomeOrderDetailPage'))
const HomeProviderDashboardPage  = lazy_(() => import('./pages/home_provider/HomeProviderDashboardPage'))
const HomeProviderServicesPage   = lazy_(() => import('./pages/home_provider/HomeProviderServicesPage'))
const HomeProviderSettingsPage   = lazy_(() => import('./pages/home_provider/HomeProviderSettingsPage'))

// ZasaServ
const ZasaServPage           = lazy_(() => import('./pages/zasaserv/ZasaServPage'))
const ServProviderPage       = lazy_(() => import('./pages/zasaserv/ServProviderPage'))
const ServCheckoutPage       = lazy_(() => import('./pages/zasaserv/ServCheckoutPage'))
const ServMyOrdersPage       = lazy_(() => import('./pages/zasaserv/ServMyOrdersPage'))
const ServOrderDetailPage    = lazy_(() => import('./pages/zasaserv/ServOrderDetailPage'))
const ServProviderDashboardPage  = lazy_(() => import('./pages/serv_provider/ServProviderDashboardPage'))
const ServProviderServicesPage   = lazy_(() => import('./pages/serv_provider/ServProviderServicesPage'))
const ServProviderSettingsPage   = lazy_(() => import('./pages/serv_provider/ServProviderSettingsPage'))

// ZasaFood
const FoodPage               = lazy_(() => import('./pages/zasafood/FoodPage'))
const FoodMerchantPage       = lazy_(() => import('./pages/zasafood/FoodMerchantPage'))
const FoodCartPage           = lazy_(() => import('./pages/zasafood/FoodCartPage'))
const FoodOrdersPage         = lazy_(() => import('./pages/zasafood/FoodOrdersPage'))
const FoodTrackingPage       = lazy_(() => import('./pages/zasafood/FoodTrackingPage'))
const MitraFoodOrdersPage    = lazy_(() => import('./pages/zasafood/MitraFoodOrdersPage'))
const FoodJastipSessionsPage = lazy_(() => import('./pages/zasafood/FoodJastipSessionsPage'))

// ZasaMart
const ZasaShopPage           = lazy_(() => import('./pages/zasamart/ZasaShopPage'))
const MartProductPage        = lazy_(() => import('./pages/zasamart/MartProductPage'))
const MartCartPage           = lazy_(() => import('./pages/zasamart/MartCartPage'))
const MartCheckoutPage       = lazy_(() => import('./pages/zasamart/MartCheckoutPage'))
const MartOrdersPage         = lazy_(() => import('./pages/zasamart/MartOrdersPage'))
const MartOrderDetailPage    = lazy_(() => import('./pages/zasamart/MartOrderDetailPage'))
const MartSellerPage         = lazy_(() => import('./pages/zasamart/MartSellerPage'))
const MitraMartOrdersPage    = lazy_(() => import('./pages/zasamart/MitraMartOrdersPage'))

// Seller
const SellerDashboardPage    = lazy_(() => import('./pages/seller/SellerDashboardPage'))
const SellerOrdersPage       = lazy_(() => import('./pages/seller/SellerOrdersPage'))
const SellerProductsPage     = lazy_(() => import('./pages/seller/SellerProductsPage'))
const SellerSettingsPage     = lazy_(() => import('./pages/seller/SellerSettingsPage'))
const SellerWalletPage       = lazy_(() => import('./pages/seller/SellerWalletPage'))
const SellerMartChatsPage    = lazy_(() => import('./pages/seller/SellerMartChatsPage'))

// Merchant
const MerchantDashboardPage  = lazy_(() => import('./pages/merchant/MerchantDashboardPage'))
const MerchantMenuPage       = lazy_(() => import('./pages/merchant/MerchantMenuPage'))
const MerchantSettingsPage   = lazy_(() => import('./pages/merchant/MerchantSettingsPage'))
const MerchantOrdersPage     = lazy_(() => import('./pages/merchant/MerchantOrdersPage'))

// ZasaRide & Mitra
const RidePage               = lazy_(() => import('./pages/zasaride/RidePage'))
const RideOrdersPage         = lazy_(() => import('./pages/zasaride/RideOrdersPage'))
const MitraRidePage          = lazy_(() => import('./pages/mitra/MitraRidePage'))
const MitraAktivitasPage     = lazy_(() => import('./pages/mitra/MitraAktivitasPage'))
const MitraHomeOrdersPage    = lazy_(() => import('./pages/mitra/MitraHomeOrdersPage'))
const MitraServOrdersPage    = lazy_(() => import('./pages/mitra/MitraServOrdersPage'))

function PageLoader() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--k-bg)' }}>
      <div style={{ width: 28, height: 28, border: '2.5px solid var(--k-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

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
  if (user?.role === 'serv_provider')                     return <Navigate to="/serv/provider" replace />
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

  // Floating bubble — Android only, kelola bubble notifikasi order aktif
  useFloatingBubble()

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
      <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
      <Route path="/dashboard" element={<DashboardRedirect />} />
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
      <Route path="/serv/orders/:id/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/mitra/serv/orders/:id/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/serv/providers/:id/consult" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/serv/provider/consults/:id" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/jastip" element={<PrivateRoute><JastipPage /></PrivateRoute>} />
      <Route path="/mitra/jastip" element={<PrivateRoute><MitraJastipPage /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
      <Route path="/addresses" element={<PrivateRoute><AddressesPage /></PrivateRoute>} />

      {/* ZasaHome */}
      <Route path="/home" element={<BrowseRoute featureKey="zasahome"><ZasaHomePage /></BrowseRoute>} />
      <Route path="/home/providers/:id" element={<BrowseRoute featureKey="zasahome"><HomeProviderPage /></BrowseRoute>} />
      <Route path="/home/checkout" element={<ModuleRoute featureKey="zasahome"><HomeCheckoutPage /></ModuleRoute>} />
      <Route path="/home/orders" element={<ModuleRoute featureKey="zasahome"><HomeMyOrdersPage /></ModuleRoute>} />
      <Route path="/home/orders/:id" element={<ModuleRoute featureKey="zasahome"><HomeOrderDetailPage /></ModuleRoute>} />
      <Route path="/home/provider" element={<HomeProviderRoute><HomeProviderDashboardPage /></HomeProviderRoute>} />
      <Route path="/home/provider/services" element={<HomeProviderRoute><HomeProviderServicesPage /></HomeProviderRoute>} />
      <Route path="/home/provider/settings" element={<HomeProviderRoute><HomeProviderSettingsPage /></HomeProviderRoute>} />

      {/* ZasaServ */}
      <Route path="/serv" element={<BrowseRoute featureKey="zasaserv"><ZasaServPage /></BrowseRoute>} />
      <Route path="/serv/providers/:id" element={<BrowseRoute featureKey="zasaserv"><ServProviderPage /></BrowseRoute>} />
      <Route path="/serv/checkout" element={<ModuleRoute featureKey="zasaserv"><ServCheckoutPage /></ModuleRoute>} />
      <Route path="/serv/orders" element={<ModuleRoute featureKey="zasaserv"><ServMyOrdersPage /></ModuleRoute>} />
      <Route path="/serv/orders/:id" element={<ModuleRoute featureKey="zasaserv"><ServOrderDetailPage /></ModuleRoute>} />
      <Route path="/serv/provider" element={<ServProviderRoute><ServProviderDashboardPage /></ServProviderRoute>} />
      <Route path="/serv/provider/services" element={<ServProviderRoute><ServProviderServicesPage /></ServProviderRoute>} />
      <Route path="/serv/provider/settings" element={<ServProviderRoute><ServProviderSettingsPage /></ServProviderRoute>} />

      {/* ZasaFood */}
      <Route path="/food" element={<BrowseRoute featureKey="zasafood"><FoodPage /></BrowseRoute>} />
      <Route path="/food/merchants/:id" element={<BrowseRoute featureKey="zasafood"><FoodMerchantPage /></BrowseRoute>} />
      <Route path="/food/cart" element={<ModuleRoute featureKey="zasafood"><FoodCartPage /></ModuleRoute>} />
      <Route path="/food/orders" element={<ModuleRoute featureKey="zasafood"><FoodOrdersPage /></ModuleRoute>} />
      <Route path="/food/orders/:id" element={<ModuleRoute featureKey="zasafood"><FoodTrackingPage /></ModuleRoute>} />
      <Route path="/food/jastip/sessions" element={<ModuleRoute featureKey="zasafood"><FoodJastipSessionsPage /></ModuleRoute>} />
      <Route path="/mitra/food/orders" element={<MitraRoute><MitraModuleRoute featureKey="zasafood"><MitraFoodOrdersPage /></MitraModuleRoute></MitraRoute>} />
      <Route path="/mitra/mart/orders" element={<MitraRoute><MitraModuleRoute featureKey="zasamart"><MitraMartOrdersPage /></MitraModuleRoute></MitraRoute>} />
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
      <Route path="/admin/complaints" element={<AdminRoute><AdminComplaintsPage /></AdminRoute>} />
      <Route path="/admin/wallet" element={<AdminRoute><AdminWalletPage /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      <Route path="/admin/promos" element={<AdminRoute><AdminPromosPage /></AdminRoute>} />
      <Route path="/admin/vouchers" element={<AdminRoute><AdminVouchersPage /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
      <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogPage /></AdminRoute>} />

      {/* ZasaShop — Customer */}
      <Route path="/mart" element={<BrowseRoute featureKey="zasamart"><ZasaShopPage /></BrowseRoute>} />
      <Route path="/mart/products/:id" element={<BrowseRoute featureKey="zasamart"><MartProductPage /></BrowseRoute>} />
      <Route path="/mart/cart" element={<ModuleRoute featureKey="zasamart"><MartCartPage /></ModuleRoute>} />
      <Route path="/mart/checkout" element={<ModuleRoute featureKey="zasamart"><MartCheckoutPage /></ModuleRoute>} />
      <Route path="/mart/orders" element={<ModuleRoute featureKey="zasamart"><MartOrdersPage /></ModuleRoute>} />
      <Route path="/mart/orders/:id" element={<ModuleRoute featureKey="zasamart"><MartOrderDetailPage /></ModuleRoute>} />
      <Route path="/mart/sellers/:id" element={<BrowseRoute featureKey="zasamart"><MartSellerPage /></BrowseRoute>} />
      <Route path="/mart/sellers/:id/consult" element={<PrivateRoute><ChatPage /></PrivateRoute>} />

      {/* ZasaShop — Seller */}
      <Route path="/seller" element={<SellerRoute><SellerDashboardPage /></SellerRoute>} />
      <Route path="/seller/orders" element={<SellerRoute><SellerOrdersPage /></SellerRoute>} />
      <Route path="/seller/products" element={<SellerRoute><SellerProductsPage /></SellerRoute>} />
      <Route path="/seller/settings" element={<SellerRoute><SellerSettingsPage /></SellerRoute>} />
      <Route path="/seller/wallet" element={<SellerRoute><SellerWalletPage /></SellerRoute>} />
      <Route path="/seller/mart/chats" element={<SellerRoute><SellerMartChatsPage /></SellerRoute>} />
      <Route path="/seller/mart/chats/:id" element={<SellerRoute><ChatPage /></SellerRoute>} />

      {/* Admin ZasaShop */}
      <Route path="/admin/mart/sellers" element={<AdminRoute><AdminMartSellersPage /></AdminRoute>} />
      <Route path="/admin/mart/review" element={<AdminRoute><AdminMartSellerReviewPage /></AdminRoute>} />
      <Route path="/admin/mart/products" element={<AdminRoute><AdminMartProductsPage /></AdminRoute>} />
      <Route path="/admin/mart/orders" element={<AdminRoute><AdminMartOrdersPage /></AdminRoute>} />

      {/* ZasaRide */}
      <Route path="/ride" element={<BrowseRoute featureKey="zasaride"><RidePage /></BrowseRoute>} />
      <Route path="/ride/orders" element={<ModuleRoute featureKey="zasaride"><RideOrdersPage /></ModuleRoute>} />
      <Route path="/ride/chat/:id" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/mitra/ride" element={<MitraRoute><MitraModuleRoute featureKey="zasaride"><MitraRidePage /></MitraModuleRoute></MitraRoute>} />
      <Route path="/mitra/aktivitas" element={<MitraRoute><MitraAktivitasPage /></MitraRoute>} />
      <Route path="/mitra/home/orders" element={<MitraRoute><MitraModuleRoute featureKey="zasahome"><MitraHomeOrdersPage /></MitraModuleRoute></MitraRoute>} />
      <Route path="/mitra/serv/orders" element={<MitraRoute><MitraModuleRoute featureKey="zasaserv"><MitraServOrdersPage /></MitraModuleRoute></MitraRoute>} />
      <Route path="/ride/mitra/chat/:id" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/admin/ride" element={<AdminRoute><AdminRideOrdersPage /></AdminRoute>} />

      {/* Admin Modules */}
      <Route path="/admin/modules" element={<AdminRoute><AdminModulesPage /></AdminRoute>} />
      <Route path="/admin/broadcast" element={<AdminRoute><AdminBroadcastPage /></AdminRoute>} />

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
      </Suspense>
    </>
  )
}

// Navigasi URL dari data notifikasi FCM
function resolveNotifUrl(data = {}, userRole = '') {
  const { type = '', order_id, order_type, module } = data
  if (type === 'incoming_call' && order_id && order_type) {
    return resolveChatPath(userRole, order_type, order_id)
  }
  // Notif pesan chat — langsung ke halaman chat
  if (type === 'chat_message' && order_id && order_type) {
    return resolveChatPath(userRole, order_type, order_id)
  }
  if (type.startsWith('food_') || module === 'zasafood')   return order_id ? `/food/orders/${order_id}`  : '/food/orders'
  if (type.startsWith('mart_') || module === 'zasamart')   return order_id ? `/mart/orders/${order_id}`  : '/mart/orders'
  if (order_id) return `/orders/${order_id}/tracking`
  return '/notifications'
}

// Banner notifikasi foreground (native Android — FCM tidak auto-show saat app buka)
function ForegroundBanner({ notif, onClose, onTap }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])
  if (!notif) return null
  const handleClick = () => { onTap?.(); onClose() }
  return (
    <div onClick={handleClick} style={{
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
    // Pre-initialize Agora saat user login agar joinChannel lebih cepat saat telepon
    const appId = import.meta.env.VITE_AGORA_APP_ID || ''
    if (appId) AgoraVoice.initialize({ appId }).catch(() => {})

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
          // senderId='__native__' mencegah VoiceCallBridge menampilkan overlay +
          // memainkan ringtone JS (native ringtone sudah berhenti di IncomingCallActivity.answer)
          storeIncomingCall({ orderId: res.orderId, orderType: res.orderType, callerName: res.callerName || null, senderId: '__native__' })
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
      onTap={foregroundNotif?.data ? () => navigate(resolveNotifUrl(foregroundNotif.data, user?.role)) : undefined}
    />
  )
}

// Resolve URL chat dari role user + orderType + orderId
function resolveChatPath(role, orderType, orderId) {
  const isMitra = role?.startsWith('mitra')
  if (orderType === 'zasaride') return isMitra ? `/ride/mitra/chat/${orderId}` : `/ride/chat/${orderId}`
  if (orderType === 'zasafood') return isMitra ? `/mitra/food/orders/${orderId}/chat` : `/food/orders/${orderId}/chat`
  if (orderType === 'zasamart') return isMitra ? `/mitra/mart/orders/${orderId}/chat` : `/mart/orders/${orderId}/chat`
  if (orderType === 'zasahome') return role === 'home_provider' ? `/home/provider/orders/${orderId}/chat` : `/home/orders/${orderId}/chat`
  if (orderType === 'zasaserv') return isMitra ? `/mitra/serv/orders/${orderId}/chat` : `/serv/orders/${orderId}/chat`
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
          <ForceUpdateScreen />
        </MitraGpsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
