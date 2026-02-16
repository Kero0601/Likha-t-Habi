/* src/context/ShopContext.js */
import React, { createContext, useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { toast } from "react-toastify";

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";

export const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
  // --- 1. DATA STATES ---
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // --- 2. USER STATES ---
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // --- 3. LOADING STATES ---
  const [authLoading, setAuthLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isLoading = authLoading || productsLoading || actionLoading;

  const ADMIN_EMAIL = "likhathabi@admin.com";

  // --- HELPERS ---
  const ensureArray = (data) => (Array.isArray(data) ? data : []);
  const toId = (x) => String(x?.id || x?._id || x);

  // ✅ NEW: require login helper
  const requireLogin = (toastId, message) => {
    if (!user) {
      toast.info(message, { position: "top-center", toastId });
      return false;
    }
    return true;
  };

  const saveCartToDB = async (newCart, currentUser) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid), { cart: newCart });
    } catch (err) {
      console.error("Failed to save cart", err);
    }
  };

  const saveWishlistToDB = async (newWishlist, currentUser) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid), { wishlist: newWishlist });
    } catch (err) {
      console.error("Failed to save wishlist", err);
    }
  };

  // --- AUTHENTICATION ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);

      if (firebaseUser) {
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const snap = await getDoc(userRef);

          if (!snap.exists()) {
            await setDoc(userRef, {
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "",
              is_admin:
                (firebaseUser.email || "").toLowerCase() ===
                ADMIN_EMAIL.toLowerCase(),
              phone: "",
              address: null,
              cart: [],
              wishlist: [],
              createdAt: serverTimestamp(),
            });
          }

          const latest = await getDoc(userRef);
          const userData = latest.data() || {};

          setUser({
            uid: firebaseUser.uid,
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            phone: userData.phone || "",
            address: userData.address || null,
          });

          setIsAdmin(
            !!userData.is_admin ||
              (firebaseUser.email || "").toLowerCase() ===
                ADMIN_EMAIL.toLowerCase()
          );

          setCart(ensureArray(userData.cart));
          setWishlist(ensureArray(userData.wishlist));
        } catch (err) {
          console.error("User check failed:", err);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
          });
          setCart([]);
          setWishlist([]);
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

  // --- FETCH PRODUCTS ---
  useEffect(() => {
    setProductsLoading(true);
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setProductsLoading(false);
      },
      (err) => {
        console.error(err);
        setProductsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const fetchProducts = useCallback(async () => true, []);

  // --- CRUD ACTIONS ---
  const addProduct = async (product) => {
    try {
      setActionLoading(true);
      await addDoc(collection(db, "products"), {
        ...product,
        price: Number(product.price || 0),
        quantity: Number(product.quantity || 0),
        createdAt: serverTimestamp(),
      });
      return true;
    } finally {
      setActionLoading(false);
    }
  };

  const updateProduct = async (id, updatedData) => {
    try {
      setActionLoading(true);
      await updateDoc(doc(db, "products", String(id)), {
        ...updatedData,
        price: Number(updatedData.price || 0),
        quantity: Number(updatedData.quantity || 0),
      });
      return true;
    } finally {
      setActionLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    try {
      setActionLoading(true);
      await deleteDoc(doc(db, "products", String(id)));
      return true;
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // ✅ CART ACTIONS (LOGIN REQUIRED) + NEW ITEMS ON TOP
  // ============================================================
  const addToCart = (product, quantityToAdd = 1) => {
    // ✅ Require login
    if (!requireLogin("need-login-cart", "Please sign in to add items to cart 😊")) {
      return false;
    }

    const stock = Number(product.quantity || 0);
    if (stock <= 0) {
      toast.error("Sorry, this item is Sold Out!", {
        position: "top-center",
        toastId: "sold-out",
      });
      return false;
    }

    const productId = toId(product);
    const existingIndex = cart.findIndex((item) => toId(item) === productId);
    let newCart = [...cart];

    if (existingIndex !== -1) {
      const existingItem = newCart[existingIndex];
      const currentQty = Number(existingItem.quantity || 0);

      if (currentQty + quantityToAdd > stock) {
        toast.error(`Only ${stock} items available!`, {
          position: "top-center",
          toastId: "stock-limit",
        });
        return false;
      }

      newCart.splice(existingIndex, 1);
      newCart.unshift({
        ...existingItem,
        quantity: currentQty + quantityToAdd,
      });
    } else {
      if (quantityToAdd > stock) {
        toast.error(`Only ${stock} items available!`, {
          position: "top-center",
          toastId: "stock-limit",
        });
        return false;
      }

      newCart.unshift({ ...product, quantity: quantityToAdd });
    }

    if (!toast.isActive("cart-success")) {
      toast.success(`Added ${quantityToAdd} ${product.name} to cart! 🛒`, {
        position: "top-center",
        autoClose: 1500,
        toastId: "cart-success",
      });
    }

    setCart(newCart);
    saveCartToDB(newCart, user);
    return true;
  };

  const decreaseQuantity = (id) => {
    if (!requireLogin("need-login-cart2", "Please sign in first 😊")) return false;

    const targetId = String(id);
    const newCart = cart.map((item) =>
      toId(item) === targetId
        ? { ...item, quantity: Math.max(1, Number(item.quantity || 1) - 1) }
        : item
    );

    setCart(newCart);
    saveCartToDB(newCart, user);
    return true;
  };

  const updateCartItemCount = (newAmount, id) => {
    if (!requireLogin("need-login-cart3", "Please sign in first 😊")) return false;

    const targetId = String(id);
    const product = products.find((p) => toId(p) === targetId);
    const stock = product ? Number(product.quantity || 0) : Infinity;

    if (newAmount > stock) {
      toast.error(`Limit reached: Only ${stock} items available.`, {
        position: "top-center",
        toastId: "manual-limit",
      });
      return false;
    }

    const newCart = cart.map((item) =>
      toId(item) === targetId
        ? { ...item, quantity: newAmount > 0 ? newAmount : 1 }
        : item
    );

    setCart(newCart);
    saveCartToDB(newCart, user);
    return true;
  };

  const removeFromCart = (id) => {
    if (!requireLogin("need-login-cart4", "Please sign in first 😊")) return false;

    const targetId = String(id);
    const newCart = cart.filter((item) => toId(item) !== targetId);

    setCart(newCart);
    saveCartToDB(newCart, user);
    return true;
  };

  // ============================================================
  // ✅ WISHLIST (LOGIN REQUIRED) + NEW ITEMS ON TOP
  // ============================================================
  const toggleWishlist = (product) => {
    // ✅ Require login
    if (!requireLogin("need-login-wish", "Please sign in to use wishlist ❤️")) {
      return false;
    }

    const targetId = toId(product);
    const existingIndex = wishlist.findIndex((item) => toId(item) === targetId);
    let newWishlist = [...wishlist];

    if (existingIndex !== -1) {
      newWishlist.splice(existingIndex, 1);
      if (!toast.isActive("wish-remove")) {
        toast.info("Removed from wishlist", {
          position: "top-center",
          autoClose: 1000,
          toastId: "wish-remove",
        });
      }
    } else {
      newWishlist.unshift(product);
      if (!toast.isActive("wish-add")) {
        toast.success("Added to wishlist ❤️", {
          position: "top-center",
          autoClose: 1000,
          toastId: "wish-add",
        });
      }
    }

    setWishlist(newWishlist);
    saveWishlistToDB(newWishlist, user);
    return true;
  };

  // --- LOGOUT ---
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setIsAdmin(false);
    setCart([]);
    setWishlist([]);
  };

  // --- PROFILE ---
  const saveProfile = async (address, phone) => {
    if (!user) return false;

    try {
      setActionLoading(true);
      await updateDoc(doc(db, "users", user.uid), { address, phone });
      setUser((prev) => ({ ...prev, address, phone }));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // ✅ ORDER ACTIONS (already requires login)
  // ============================================================
  const placeOrder = async (orderData) => {
    if (!user) {
      toast.error("Please login first.", {
        position: "top-center",
        toastId: "order-login",
      });
      return false;
    }

    try {
      setActionLoading(true);
      const items = orderData.items || [];
      const totalAmount = Number(orderData.total || 0);

      await runTransaction(db, async (tx) => {
        // stock check
        for (const item of items) {
          const pid = String(item.id || item._id);
          const pRef = doc(db, "products", pid);
          const pSnap = await tx.get(pRef);

          if (!pSnap.exists()) throw new Error("Product not found.");
          if (Number(pSnap.data().quantity || 0) < Number(item.quantity)) {
            throw new Error(`Stock error: ${item.name}`);
          }
        }

        // subtract stock
        for (const item of items) {
          const pid = toId(item);
          const pRef = doc(db, "products", pid);
          const pSnap = await tx.get(pRef);

          tx.update(pRef, {
            quantity: Number(pSnap.data().quantity) - Number(item.quantity),
          });
        }

        // create order
        const orderRef = doc(collection(db, "orders"));
        tx.set(orderRef, {
          userId: user.uid,
          items,
          totalAmount,
          address: orderData.address,
          phone: orderData.phone,
          paymentMethod: orderData.paymentMethod,
          paymentReference: orderData.paymentReference || "",
          status: "Order Placed",
          createdAt: serverTimestamp(),
        });

        // clear purchased cart items
        const purchasedIds = items.map((i) => toId(i));
        const remainingCart = cart.filter((c) => !purchasedIds.includes(toId(c)));
        tx.update(doc(db, "users", user.uid), { cart: remainingCart });

        setCart(remainingCart);
      });

      toast.success("Order placed successfully!", {
        position: "top-center",
        toastId: "order-success",
      });

      return true;
    } catch (error) {
      console.error(error);
      toast.error(error.message, {
        position: "top-center",
        toastId: "order-error",
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const fetchUserOrders = useCallback(async () => {
    if (!user) return [];
    try {
      const q = query(
        collection(db, "orders"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      if (String(err).includes("index")) {
        toast.info("Building index...", { position: "top-center", toastId: "idx" });
      }

      const q2 = query(collection(db, "orders"), where("userId", "==", user.uid));
      const snap2 = await getDocs(q2);

      return snap2.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }
  }, [user]);

  const fetchAllOrders = async () => {
    try {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      return [];
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, "orders", String(orderId)), { status: newStatus });
      return true;
    } catch (err) {
      return false;
    }
  };

  return (
    <ShopContext.Provider
      value={{
        products,
        cart,
        wishlist,
        searchQuery,
        setSearchQuery,
        user,
        isAdmin,
        isLoading,
        logout,

        fetchProducts,
        addProduct,
        updateProduct,
        deleteProduct,

        // ✅ login-required functions return true/false now
        addToCart,
        decreaseQuantity,
        updateCartItemCount,
        removeFromCart,
        toggleWishlist,

        saveProfile,
        placeOrder,
        fetchUserOrders,
        fetchAllOrders,
        updateOrderStatus,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};
