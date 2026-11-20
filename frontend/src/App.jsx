import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProtectedRoute, AdminRoute } from './components/common/ProtectedRoute';
import StoreLayout from './components/layout/StoreLayout';
import AdminLayout from './components/layout/AdminLayout';

import HomePage from './pages/public/HomePage';
import CatalogPage from './pages/public/CatalogPage';
import WatchDetailPage from './pages/public/WatchDetailPage';
import CollectionsPage from './pages/public/CollectionsPage';
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';
import FAQPage from './pages/public/FAQPage';
import PrivacyPage from './pages/public/PrivacyPage';
import TermsPage from './pages/public/TermsPage';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import ProfilePage from './pages/account/ProfilePage';
import CartPage from './pages/account/CartPage';
import CheckoutPage from './pages/account/CheckoutPage';
import FavoritesPage from './pages/account/FavoritesPage';
import OrdersPage from './pages/account/OrdersPage';
import OrderDetailPage from './pages/account/OrderDetailPage';

import DashboardPage from './pages/admin/DashboardPage';
import AdminWatchesPage from './pages/admin/AdminWatchesPage';
import AdminBrandsPage from './pages/admin/AdminBrandsPage';
import AdminCollectionsPage from './pages/admin/AdminCollectionsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminCustomersPage from './pages/admin/AdminCustomersPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '14px' } }} />
          <Routes>
            {/* Store */}
            <Route element={<StoreLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/catalogo" element={<CatalogPage />} />
              <Route path="/catalogo/:slug" element={<WatchDetailPage />} />
              <Route path="/colecciones" element={<CollectionsPage />} />
              <Route path="/nosotros" element={<AboutPage />} />
              <Route path="/contacto" element={<ContactPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/privacidad" element={<PrivacyPage />} />
              <Route path="/terminos" element={<TermsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />
              <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/carrito" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
              <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
              <Route path="/favoritos" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
              <Route path="/pedidos" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
              <Route path="/pedidos/:orderNumber" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
            </Route>

            {/* Admin */}
            <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route path="/admin" element={<DashboardPage />} />
              <Route path="/admin/relojes" element={<AdminWatchesPage />} />
              <Route path="/admin/marcas" element={<AdminBrandsPage />} />
              <Route path="/admin/colecciones" element={<AdminCollectionsPage />} />
              <Route path="/admin/pedidos" element={<AdminOrdersPage />} />
              <Route path="/admin/clientes" element={<AdminCustomersPage />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
