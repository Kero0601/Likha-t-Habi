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
import LoginPage from './components/LoginPage'; // Import Login Page
import { ShopProvider } from './context/ShopContext';
import AccountPage from './components/AccountPage';
import CheckoutPage from './components/CheckoutPage';
import Orders from './components/Orders';
import AboutPage from './components/AboutPage';

function App() {
  return (
    <ShopProvider>
      <Router>
        <Navbar />
        
        {/* 2. TOAST NOTIFICATIONS CONTAINER */}
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

        {/* 3. ROUTES */}
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<HomePage />} />
          
          {/* Shop Pages */}
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/category/:category" element={<ShopPage />} />
          
          {/* Product & Cart */}
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          
          {/* User & Admin */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </Router>
    </ShopProvider>
  );
}

export default App;