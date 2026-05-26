import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useTheme } from './hooks/useTheme'
import { unlockAudio } from './hooks/useNewOrderNotif'
import { isNative, initPushNotifications } from './utils/nativePlatform'
import { App as CapApp } from '@capacitor/app'
import useAppInfo from './hooks/useAppInfo'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import DashboardPage from './pages/DashboardPage'
import WalletPage from './pages/WalletPage'
import TopUpPage from './pages/TopUpPage'
import WithdrawPage from './pages/WithdrawPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminTopUpPage from './pages/admin/AdminTopUpPage'
import AdminWithdrawPage from './pages/admin/AdminWithdrawPage'
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
import AdminHomeProvidersPage from './pages/admin/AdminHomeProvidersPage'
import AdminHomeOrdersPage from './pages/admin/AdminHomeOrdersPage'
import ZasaHomePage from './pages/zasahome/ZasaHomePage'
import HomeProviderPage from './pages/zasahome/HomeProviderPage'
import HomeCheckoutPage from './pages/zasahome/HomeCheckoutPage'
import HomeMyOrdersPage from './pages/zasahome/HomeMyOrdersPage'
import HomeOrderDetailPage from './pages/zasahome/HomeOrderDetailPage'
import HomeProviderDashboardPage from './pages/home_provider/HomeProviderDashboardPage'
import HomeProviderServicesPage from './pages/home_provider/HomeProviderServicesPage'
import HomeProviderSettingsPage from './pages/home_provider/HomeProviderSettingsPage'
import FoodPage from './pages/zasafood/FoodPage'
import FoodMerchantPage from './pages/zasafood/FoodMerchantPage'
import FoodCartPage from './pages/zasafood/FoodCartPage'
import FoodOrdersPage from './pages/zasafood/FoodOrdersPage'
import FoodTrackingPage from './pages/zasafood/FoodTrackingPage'
import MitraFoodOrdersPage from './pages/zasafood/MitraFoodOrdersPage'
import FoodJastipSessionsPage from './pages/zasafood/FoodJastipSessionsPage'
import AdminFoodOrdersPage from './pages/admin/AdminFoodOrdersPage'
import AdminMitraVerificationPage from './pages/admin/AdminMitraVerificationPage'
import AdminPromosPage from './pages/admin/AdminPromosPage'
import MitraOnboardingPage from './pages/MitraOnboardingPage'
import MerchantDashboardPage from './pages/merchant/MerchantDashboardPage'
import MerchantMenuPage from './pages/merchant/MerchantMenuPage'
import MerchantSettingsPage from './pages/merchant/MerchantSettingsPage'
import MerchantOrdersPage from './pages/merchant/MerchantOrdersPage'
import ZasaMartPage from './pages/zasamart/ZasaMartPage'
import MartProductPage from './pages/zasamart/MartProductPage'
import MartCartPage from './pages/zasamart/MartCartPage'
import MartCheckoutPage from './pages/zasamart/MartCheckoutPage'
import MartOrdersPage from './pages/zasamart/MartOrdersPage'
import MartOrderDetailPage from './pages/zasamart/MartOrderDetailPage'
import SellerDashboardPage from './pages/seller/SellerDashboardPage'
import SellerOrdersPage from './pages/seller/SellerOrdersPage'
import SellerProductsPage from './pages/seller/SellerProductsPage'
import SellerSettingsPage from './pages/seller/SellerSettingsPage'
import AdminMartSellersPage from './pages/admin/AdminMartSellersPage'
import AdminMartOrdersPage from './pages/admin/AdminMartOrdersPage'

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--k-bg)', padding: 32, textAlign: 'center' }}>
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
  const { user } = useAuth()
  const { maintenance_mode } = useAppInfo()

  useEffect(() => {
    const handler = () => navigate('/login', { replace: true })
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
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
      <Route path="/jastip" element={<PrivateRoute><JastipPage /></PrivateRoute>} />
      <Route path="/mitra/jastip" element={<PrivateRoute><MitraJastipPage /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />

      {/* ZasaHome */}
      <Route path="/home" element={<PrivateRoute><ZasaHomePage /></PrivateRoute>} />
      <Route path="/home/providers/:id" element={<PrivateRoute><HomeProviderPage /></PrivateRoute>} />
      <Route path="/home/checkout" element={<PrivateRoute><HomeCheckoutPage /></PrivateRoute>} />
      <Route path="/home/orders" element={<PrivateRoute><HomeMyOrdersPage /></PrivateRoute>} />
      <Route path="/home/orders/:id" element={<PrivateRoute><HomeOrderDetailPage /></PrivateRoute>} />
      <Route path="/home/provider" element={<HomeProviderRoute><HomeProviderDashboardPage /></HomeProviderRoute>} />
      <Route path="/home/provider/services" element={<HomeProviderRoute><HomeProviderServicesPage /></HomeProviderRoute>} />
      <Route path="/home/provider/settings" element={<HomeProviderRoute><HomeProviderSettingsPage /></HomeProviderRoute>} />

      {/* ZasaFood */}
      <Route path="/food" element={<PrivateRoute><FoodPage /></PrivateRoute>} />
      <Route path="/food/merchants/:id" element={<PrivateRoute><FoodMerchantPage /></PrivateRoute>} />
      <Route path="/food/cart" element={<PrivateRoute><FoodCartPage /></PrivateRoute>} />
      <Route path="/food/orders" element={<PrivateRoute><FoodOrdersPage /></PrivateRoute>} />
      <Route path="/food/orders/:id" element={<PrivateRoute><FoodTrackingPage /></PrivateRoute>} />
      <Route path="/food/jastip/sessions" element={<PrivateRoute><FoodJastipSessionsPage /></PrivateRoute>} />
      <Route path="/mitra/food/orders" element={<MitraRoute><MitraFoodOrdersPage /></MitraRoute>} />
      <Route path="/mitra/onboarding" element={<PrivateRoute><MitraOnboardingPage /></PrivateRoute>} />
      <Route path="/admin/mitra/verify" element={<AdminRoute><AdminMitraVerificationPage /></AdminRoute>} />

      <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route path="/admin/orders" element={<AdminRoute><AdminOrdersPage /></AdminRoute>} />
      <Route path="/admin/food/merchants" element={<AdminRoute><AdminFoodMerchantsPage /></AdminRoute>} />
      <Route path="/admin/food/orders" element={<AdminRoute><AdminFoodOrdersPage /></AdminRoute>} />
      <Route path="/admin/home/providers" element={<AdminRoute><AdminHomeProvidersPage /></AdminRoute>} />
      <Route path="/admin/home/orders" element={<AdminRoute><AdminHomeOrdersPage /></AdminRoute>} />
      <Route path="/admin/topup" element={<AdminRoute><AdminTopUpPage /></AdminRoute>} />
      <Route path="/admin/withdraw" element={<AdminRoute><AdminWithdrawPage /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      <Route path="/admin/promos" element={<AdminRoute><AdminPromosPage /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
      <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogPage /></AdminRoute>} />

      {/* ZasaMart — Customer */}
      <Route path="/mart" element={<PrivateRoute><ZasaMartPage /></PrivateRoute>} />
      <Route path="/mart/products/:id" element={<PrivateRoute><MartProductPage /></PrivateRoute>} />
      <Route path="/mart/cart" element={<PrivateRoute><MartCartPage /></PrivateRoute>} />
      <Route path="/mart/checkout" element={<PrivateRoute><MartCheckoutPage /></PrivateRoute>} />
      <Route path="/mart/orders" element={<PrivateRoute><MartOrdersPage /></PrivateRoute>} />
      <Route path="/mart/orders/:id" element={<PrivateRoute><MartOrderDetailPage /></PrivateRoute>} />

      {/* ZasaMart — Seller */}
      <Route path="/seller" element={<SellerRoute><SellerDashboardPage /></SellerRoute>} />
      <Route path="/seller/orders" element={<SellerRoute><SellerOrdersPage /></SellerRoute>} />
      <Route path="/seller/products" element={<SellerRoute><SellerProductsPage /></SellerRoute>} />
      <Route path="/seller/settings" element={<SellerRoute><SellerSettingsPage /></SellerRoute>} />

      {/* Admin ZasaMart */}
      <Route path="/admin/mart/sellers" element={<AdminRoute><AdminMartSellersPage /></AdminRoute>} />
      <Route path="/admin/mart/orders" element={<AdminRoute><AdminMartOrdersPage /></AdminRoute>} />

      {/* Merchant Panel */}
      <Route path="/merchant" element={<MerchantRoute><MerchantDashboardPage /></MerchantRoute>} />
      <Route path="/merchant/orders" element={<MerchantRoute><MerchantOrdersPage /></MerchantRoute>} />
      <Route path="/merchant/menu" element={<MerchantRoute><MerchantMenuPage /></MerchantRoute>} />
      <Route path="/merchant/settings" element={<MerchantRoute><MerchantSettingsPage /></MerchantRoute>} />
      </Routes>
    </>
  )
}

export default function App() {
  useEffect(() => {
    const unlock = () => { unlockAudio() }
    window.addEventListener('touchstart', unlock, { once: true })
    window.addEventListener('click',      unlock, { once: true })

    // Init Capacitor native features (hanya di APK Android/iOS)
    if (isNative) {
      initPushNotifications({
        onForeground: (notif) => {
          // Notif masuk saat app terbuka — bunyi sudah ditangani Capacitor
          console.log('Push foreground:', notif.title)
        },
        onTap: (notif) => {
          // User tap notif dari luar app — navigasi ditangani di NotificationsPage
        },
      }).catch(() => {})
    }
  }, [])

  return (
    <BrowserRouter>
      <ThemeInitializer />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
