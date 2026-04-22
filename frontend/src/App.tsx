import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute, GuestRoute } from './components/Auth/RouteGuards'

import HomePage from './pages/HomePage'
import ProductDetailPage from './pages/ProductDetailPage'
import SearchResultsPage from './pages/SearchResultsPage'
import AlertsPage from './pages/AlertsPage'
import WishlistPage from './pages/WishlistPage'
import DealsPage from './pages/DealsPage'
import TrendingDealsPage from './pages/TrendingDealsPage'
import AuthPage from './pages/AuthPage'

export default function App(): JSX.Element {
  return (
      <AuthProvider>
        <BrowserRouter>
          <Routes>

            {/* Guest */}
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<AuthPage />} />
            </Route>

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/trending-deals" element={<TrendingDealsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />

          </Routes>
        </BrowserRouter>
      </AuthProvider>
  )
}