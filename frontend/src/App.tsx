import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { WishlistProvider } from './context/WishlistProvider'
import { ProtectedRoute, GuestRoute } from './components/Auth/RouteGuards'

import HomePage from './pages/HomePage'
import ProductDetailPage from './pages/ProductDetailPage'
import SearchResultsPage from './pages/SearchResultsPage'
import AlertsPage from './pages/AlertsPage'
import WishlistPage from './pages/WishlistPage'
import DealsPage from './pages/DealsPage'
import TrendingDealsPage from './pages/TrendingDealsPage'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AdminPage from './pages/AdminPage'
import PaymentPage from './pages/PaymentPage'
import UserChatWidget from './components/chat/UserChatWidget'
import SkinAdvicePage from './pages/SkinAdvicePage'

export default function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WishlistProvider>
          <UserChatWidget />
          <Routes>

            {/* Guest */}
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<AuthPage />} />
            </Route>

            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/trending-deals" element={<TrendingDealsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/payment/qr" element={<PaymentPage />} />
              <Route path="/skin-advice" element={<SkinAdvicePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />

          </Routes>
        </WishlistProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}