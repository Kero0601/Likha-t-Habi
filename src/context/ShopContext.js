import React, { createContext, useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { toast } from 'react-toastify';
import { API_URL } from "../config"; 

export const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
  // --- 1. DATA STATES ---
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- 2. USER STATES ---
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // --- 3. LOADING STATES ---
  const [authLoading, setAuthLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false); 

  const isLoading = authLoading || productsLoading || actionLoading;

  // --- HELPER: ENSURE DATA IS ARRAY ---
  const ensureArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try { return JSON.parse(data); } catch (e) { return []; }
  };

  // --- DATA SYNC ---
  const saveCartToDB = async (newCart, currentUser) => {
    if (!currentUser) return;
    try {
      await fetch(`${API_URL}/api/users/${currentUser.uid}/cart`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: newCart, email: currentUser.email })
      });
    } catch (err) { console.error("Failed to save cart", err); }
  };

  const saveWishlistToDB = async (newWishlist, currentUser) => {
    if (!currentUser) return;
    try {
      await fetch(`${API_URL}/api/users/${currentUser.uid}/wishlist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishlist: newWishlist, email: currentUser.email })
      });
    } catch (err) { console.error("Failed to save wishlist", err); }
  };

  // --- 5. AUTHENTICATION ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const response = await fetch(`${API_URL}/api/users/${firebaseUser.uid}`);
          if (response.ok) {
            const userData = await response.json();
            setUser({
              uid: firebaseUser.uid,
              id: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              phone: userData.phone || "",
              address: userData.address || null,
            });
            setIsAdmin(userData.is_admin || firebaseUser.email === "likhathabi@admin.com");
            setCart(ensureArray(userData.cart));
            setWishlist(ensureArray(userData.wishlist));
          } else {
             setUser({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName });
          }
        } catch (err) {
          console.error("User check failed:", err);
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setCart([]);
        setWishlist([]);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 6. REAL-TIME FETCH PRODUCTS ---
  const fetchProducts = useCallback(async (showLoading = true) => {
      try {
        if (showLoading) setProductsLoading(true);
        const response = await fetch(`${API_URL}/api/products?t=${Date.now()}`); 
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        if (showLoading) setProductsLoading(false);
      }
  }, []);

  useEffect(() => {
    fetchProducts(true); 
    const interval = setInterval(() => { fetchProducts(false); }, 3000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  // --- 7. DATABASE ACTIONS ---
  const addProduct = async (product) => {
    try {
      const response = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      if (!response.ok) throw new Error("Failed to add");
      await fetchProducts(true); 
      return true;
    } catch (err) { throw err; }
  };

  const updateProduct = async (id, updatedData) => {
    try {
      const response = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (!response.ok) throw new Error("Failed to update");
      await fetchProducts(true); 
      return true;
    } catch (err) { throw err; }
  };

  const deleteProduct = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error("Failed to delete");
      await fetchProducts(true); 
      return true;
    } catch (err) { throw err; }
  };

  // --- 8. CART ACTIONS (With Anti-Spam Notification) ---
  const addToCart = (product, quantityToAdd = 1) => {
    const stock = product.quantity || 0;
    
    if (stock <= 0) {
        toast.error("Sorry, this item is Sold Out!", { toastId: 'sold-out-error' });
        return;
    }

    setCart((prev) => {
      const productId = product.id || product._id;
      const existing = prev.find(item => (item.id || item._id) === productId);
      let newCart;

      if (existing) {
        if (existing.quantity + quantityToAdd > stock) {
            toast.error(`Only ${stock} items available!`, { toastId: 'stock-limit' });
            return prev; 
        }
        newCart = prev.map(item => (item.id || item._id) === productId 
            ? { ...item, quantity: item.quantity + quantityToAdd } 
            : item
        );
      } else {
        if (quantityToAdd > stock) {
             toast.error(`Only ${stock} items available!`, { toastId: 'stock-limit' });
             return prev;
        }
        newCart = [...prev, { ...product, quantity: quantityToAdd }];
      }
      
      saveCartToDB(newCart, user);
      
      toast.success(`Added ${quantityToAdd} ${product.name} to cart! 🛒`, { 
          position: "bottom-center",
          autoClose: 1500,
          toastId: 'cart-success-toast' 
      });

      return newCart;
    });
  };

  const decreaseQuantity = (id) => {
    setCart((prev) => {
      const newCart = prev.map(item => {
        if ((item.id || item._id) === id) return { ...item, quantity: Math.max(1, item.quantity - 1) };
        return item;
      });
      saveCartToDB(newCart, user);
      return newCart;
    });
  };

  const updateCartItemCount = (newAmount, id) => {
    const product = products.find(p => (p.id || p._id) === id);
    const stock = product ? (product.quantity || 0) : Infinity;

    if (newAmount > stock) {
        toast.error(`Limit reached: Only ${stock} items available.`, { toastId: 'manual-limit' });
        setCart((prev) => {
            const newCart = prev.map(item => (item.id || item._id) === id ? { ...item, quantity: stock } : item);
            saveCartToDB(newCart, user);
            return newCart;
        });
        return;
    }

    setCart((prev) => {
      const newCart = prev.map((item) => {
        if ((item.id || item._id) === id) {
          return { ...item, quantity: newAmount > 0 ? newAmount : 1 };
        }
        return item;
      });
      saveCartToDB(newCart, user);
      return newCart;
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => {
      const newCart = prev.filter(item => (item.id || item._id) !== id);
      saveCartToDB(newCart, user);
      return newCart;
    });
  };

  // --- 9. WISHLIST ACTION (FIXED ID MATCHING) ---
  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      // 1. Force ID to String for strict comparison (Fixes the issue)
      const targetId = String(product.id || product._id);
      
      // 2. Check if item exists using strict string comparison
      const existingIndex = prev.findIndex(item => String(item.id || item._id) === targetId);
      
      let newWishlist;
      const TOAST_ID = 'wishlist-toast'; // Unique ID prevents stacking

      if (existingIndex !== -1) {
        // --- REMOVE ITEM ---
        newWishlist = [...prev];
        newWishlist.splice(existingIndex, 1);
        
        toast.info('Removed from wishlist', { 
            autoClose: 1000, 
            toastId: TOAST_ID 
        });
      } else {
        // --- ADD ITEM ---
        newWishlist = [...prev, product];
        
        toast.success('Added to wishlist ❤️', { 
            autoClose: 1000, 
            toastId: TOAST_ID 
        });
      }

      saveWishlistToDB(newWishlist, user);
      return newWishlist;
    });
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setIsAdmin(false);
    setCart([]);
    setWishlist([]);
  };

  const saveProfile = async (address, phone) => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/api/users/${user.uid}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, phone })
      });
      if (!response.ok) throw new Error("Failed to save profile");
      const updatedData = await response.json();
      setUser(prev => ({ ...prev, address: updatedData.address || address, phone: updatedData.phone || phone }));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };
  
  // --- 10. ORDER ACTIONS ---
  const placeOrder = async (orderData) => {
    try {
      setActionLoading(true);
      
      const payload = {
        userId: user ? user.uid : null,
        items: orderData.items,
        totalAmount: orderData.total,
        address: orderData.address,
        phone: orderData.phone,
        paymentMethod: orderData.paymentMethod || 'COD',
        paymentReference: orderData.paymentReference || orderData.payment_reference || '' 
      };

      const response = await fetch(`${API_URL}/api/orders`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      let data;
      try {
          data = JSON.parse(text);
          if (!response.ok) throw new Error(data.error || "Failed to place order");
      } catch (err) {
          throw new Error(data?.error || `Server Error: ${text.substring(0, 50)}...`);
      }

      // Success
      const purchasedIds = orderData.items.map(item => item.id || item._id);
      const remainingCart = cart.filter(cartItem => !purchasedIds.includes(cartItem.id || cartItem._id));
      
      setCart(remainingCart); 
      saveCartToDB(remainingCart, user);
      
      await fetchProducts(false); 

      toast.success("Order placed successfully!", { toastId: 'order-success' });
      return true;

    } catch (error) {
      console.error("Order Error:", error);
      toast.error(error.message, { toastId: 'order-error' });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const fetchUserOrders = useCallback(async () => {
    if (!user) return [];
    try {
      const response = await fetch(`${API_URL}/api/orders/user/${user.uid}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (err) {
      console.error("Error fetching orders:", err);
      return [];
    }
  }, [user]);

  const fetchAllOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders/all`); 
      if (!response.ok) return [];
      return await response.json();
    } catch (err) {
      console.error("Failed to fetch all orders:", err);
      return [];
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      return response.ok;
    } catch (err) {
      console.error("Failed to update status:", err);
      return false;
    }
  };

  return (
    <ShopContext.Provider value={{
      products, cart, wishlist, searchQuery, setSearchQuery,
      user, isAdmin, isLoading, logout, 
      fetchProducts, addProduct, updateProduct, deleteProduct,
      addToCart, decreaseQuantity, updateCartItemCount, removeFromCart, toggleWishlist, 
      saveProfile, 
      placeOrder, 
      fetchUserOrders, 
      fetchAllOrders, 
      updateOrderStatus
    }}>
      {children}
    </ShopContext.Provider>
  );
};