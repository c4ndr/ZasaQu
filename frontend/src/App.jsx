import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { unlockAudio } from './hooks/useNewOrderNotif'
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
import FoodPage from './pages/zasafood/FoodPage'
import FoodMerchantPage from './pages/zasafood/FoodMerchantPage'
import FoodCartPage from './pages/zasafood/FoodCartPage'
import FoodOrdersPage from './pages/zasafood/FoodOrdersPage'
import FoodTrackingPage from './pages/zasafood/FoodTrackingPage'
import MitraFoodOrdersPage from './pages/zasafood/MitraFoodOrdersPage'
import AdminFoodOrdersPage from './pages/admin/AdminFoodOrdersPage'
import AdminMitraVerificationPage from './pages/admin/AdminMitraVerificationPage'
import MitraOnboardingPage from './pages/MitraOnboardingPage'
import MerchantDashboardPage from './pages/merchant/MerchantDashboardPage'
import MerchantMenuPage from './pages/merchant/MerchantMenuPage'
import MerchantSettingsPage from './pages/merchant/MerchantSettingsPage'
import MerchantOrdersPage from './pages/merchant/MerchantOrdersPage'

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

function DashboardRedirect() {
  const { user } = useAuth()
  if (user?.role === 'merchant')                          return <Navigate to="/merchant" replace />
  if (user?.role === 'admin')                             return <Navigate to="/admin" replace />
  if (user?.isMitra && user?.status === 'pending_review') return <Navigate to="/mitra/onboarding" replace />
  return <DashboardPage />
}

function MitraRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!user.role?.startsWith('mitra')) return <Navigate to="/dashboard" replace />
  if (user.status === 'pending_review') return <Navigate to="/mitra/onboarding" replace />
  return children
}

function AppRoutes() {
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

      {/* ZasaFood */}
      <Route path="/food" element={<PrivateRoute><FoodPage /></PrivateRoute>} />
      <Route path="/food/merchants/:id" element={<PrivateRoute><FoodMerchantPage /></PrivateRoute>} />
      <Route path="/food/cart" element={<PrivateRoute><FoodCartPage /></PrivateRoute>} />
      <Route path="/food/orders" element={<PrivateRoute><FoodOrdersPage /></PrivateRoute>} />
      <Route path="/food/orders/:id" element={<PrivateRoute><FoodTrackingPage /></PrivateRoute>} />
      <Route path="/mitra/food/orders" element={<MitraRoute><MitraFoodOrdersPage /></MitraRoute>} />
      <Route path="/mitra/onboarding" element={<PrivateRoute><MitraOnboardingPage /></PrivateRoute>} />
      <Route path="/admin/mitra/verify" element={<AdminRoute><AdminMitraVerificationPage /></AdminRoute>} />

      <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route path="/admin/orders" element={<AdminRoute><AdminOrdersPage /></AdminRoute>} />
      <Route path="/admin/food/merchants" element={<AdminRoute><AdminFoodMerchantsPage /></AdminRoute>} />
      <Route path="/admin/food/orders" element={<AdminRoute><AdminFoodOrdersPage /></AdminRoute>} />
      <Route path="/admin/topup" element={<AdminRoute><AdminTopUpPage /></AdminRoute>} />
      <Route path="/admin/withdraw" element={<AdminRoute><AdminWithdrawPage /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
      <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogPage /></AdminRoute>} />

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
    // Unlock AudioContext saat pertama kali user interaksi
    const unlock = () => { unlockAudio() }
    window.addEventListener('touchstart', unlock, { once: true })
    window.addEventListener('click',      unlock, { once: true })
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
