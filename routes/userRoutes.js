const express = require('express');
const router = express.Router();

// --- GET USER DATA (Profile, Cart, Wishlist) ---
router.get('/:uid', async (req, res) => {
  try {
    const [rows] = await req.db.query('SELECT * FROM users WHERE id = ?', [req.params.uid]);
    
    if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];

    // FIX: MySQL might return these as JSON strings. Parse them safely.
    const safeParse = (data) => {
        if (!data) return [];
        if (typeof data === 'string') {
            try { return JSON.parse(data); } catch (e) { return []; }
        }
        return data; // Already an object/array
    };

    // Prepare clean user object
    const cleanUser = {
        ...user,
        cart: safeParse(user.cart),
        wishlist: safeParse(user.wishlist),
        address: typeof user.address === 'string' ? JSON.parse(user.address) : user.address
    };

    res.json(cleanUser);
  } catch (err) {
    console.error("Fetch User Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- UPDATE CART ---
router.put('/:uid/cart', async (req, res) => {
  const { cart } = req.body;
  try {
    // Stringify for MySQL storage
    const cartJson = JSON.stringify(cart || []);
    await req.db.query('UPDATE users SET cart = ? WHERE id = ?', [cartJson, req.params.uid]);
    res.json({ message: 'Cart updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- UPDATE WISHLIST ---
router.put('/:uid/wishlist', async (req, res) => {
  const { wishlist } = req.body;
  try {
    const wishJson = JSON.stringify(wishlist || []);
    await req.db.query('UPDATE users SET wishlist = ? WHERE id = ?', [wishJson, req.params.uid]);
    res.json({ message: 'Wishlist updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- UPDATE PROFILE (Address/Phone) ---
router.put('/:uid/profile', async (req, res) => {
  const { address, phone } = req.body;
  try {
    const addrString = typeof address === 'string' ? address : JSON.stringify(address);
    
    await req.db.query(
      'UPDATE users SET address = ?, phone = ? WHERE id = ?', 
      [addrString, phone, req.params.uid]
    );
    
    // Return updated user data
    const [rows] = await req.db.query('SELECT * FROM users WHERE id = ?', [req.params.uid]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;