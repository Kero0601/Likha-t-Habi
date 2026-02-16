<<<<<<< HEAD
// src/routes/ProtectedRoute.js
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

/**
 * Usage:
 * <Route path="/checkout" element={<ProtectedRoute><CheckoutPage/></ProtectedRoute>} />
 *
 * If not logged in -> redirects to /login and remembers the page user tried to open.
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setChecking(false);
    });

    return () => unsub();
  }, []);

  // Optional: show a simple loading while checking auth
  if (checking) {
    return (
      <div style={{ padding: 30, textAlign: "center" }}>
        Checking account...
      </div>
    );
  }

  // Not logged in -> go to login, and save where we came from
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // Logged in -> show page
  return children;
};

export default ProtectedRoute;
=======
// src/routes/ProtectedRoute.js
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

/**
 * Usage:
 * <Route path="/checkout" element={<ProtectedRoute><CheckoutPage/></ProtectedRoute>} />
 *
 * If not logged in -> redirects to /login and remembers the page user tried to open.
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setChecking(false);
    });

    return () => unsub();
  }, []);

  // Optional: show a simple loading while checking auth
  if (checking) {
    return (
      <div style={{ padding: 30, textAlign: "center" }}>
        Checking account...
      </div>
    );
  }

  // Not logged in -> go to login, and save where we came from
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // Logged in -> show page
  return children;
};

export default ProtectedRoute;
>>>>>>> 46f177dc8ce17a0f72dc7182eb1b2842c55e7a13
