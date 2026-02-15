import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// 1. IMPORTS
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import ShopPage from './components/ShopPage';
import AdminPage from './components/AdminPage';
import ProductPage from './components/ProductPage';
import CartPage from './components/CartPage';
import WishlistPage from './components/WishlistPage';
import LoginPage from './components/LoginPage';
import { ShopProvider } from './context/ShopContext';
import AccountPage from './components/AccountPage';
import CheckoutPage from './components/CheckoutPage';
import Orders from './components/Orders';
import AboutPage from './components/AboutPage';

// ✅ add this import
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ShopProvider>
      <Router>
        <Navbar />

        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />

        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/category/:category" element={<ShopPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* ✅ Protected (must sign in) */}
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />

          {/* ✅ Protected + Admin-only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </ShopProvider>
  );
}

export default App;
