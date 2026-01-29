const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config(); // Load environment variables from .env

// Import routes
const productRoutes = require('./routes/productRoutes'); 
const userRoutes = require('./routes/userRoutes'); 
const chatRoutes = require('./routes/chatRoutes'); 

const app = express();

// --- 1. MIDDLEWARE ---
app.use(cors()); 
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- 2. DATABASE CONNECTION POOL ---
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',      
  password: process.env.DB_PASSWORD || '',      
  database: process.env.DB_NAME || 'likhat_habi_db', 
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware to attach DB pool to every request
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// --- 3. API ROUTES ---
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/chat', chatRoutes);

// =======================================================
//  ORDER ROUTES (WITH ROBUST STOCK VALIDATION)
// =======================================================

app.post('/api/orders', async (req, res) => {
  try {
    console.log("📦 [ORDER] Incoming:", req.body);

    const { 
        userId, user_id, 
        items, 
        total, totalAmount, 
        address, 
        phone, 
        paymentMethod, 
        paymentReference, payment_reference 
    } = req.body;

    // Handle incoming items (support both raw array and JSON string)
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

    if (!parsedItems || !Array.isArray(parsedItems)) {
        return res.status(400).json({ error: "Invalid items format." });
    }

    // -------------------------------------------------------------
    // 1. SAFETY CHECK: Verify Stock Before Creating Order
    // -------------------------------------------------------------
    for (const item of parsedItems) {
        const pId = item.id || item._id;
        const orderQty = item.quantity || 1;

        if (pId) {
            const [rows] = await pool.query('SELECT quantity, name FROM products WHERE id = ?', [pId]);
            
            if (rows.length === 0) {
                 return res.status(400).json({ error: `Product '${item.name}' (ID: ${pId}) no longer exists.` });
            }

            const productInDb = rows[0];
            if (productInDb.quantity < orderQty) {
                // REJECT ORDER IF STOCK IS INSUFFICIENT
                return res.status(400).json({ 
                    error: `Order Failed: '${productInDb.name}' only has ${productInDb.quantity} left in stock.` 
                });
            }
        }
    }

    // -------------------------------------------------------------
    // 2. DATA NORMALIZATION
    // -------------------------------------------------------------
    const finalUserId = userId || user_id || null;
    const finalTotal = total || totalAmount || 0;
    const finalRef = paymentReference || payment_reference || ''; 
    const formatJson = (data) => (typeof data === 'string' ? data : JSON.stringify(data));

    // -------------------------------------------------------------
    // 3. INSERT ORDER
    // -------------------------------------------------------------
    const query = `
      INSERT INTO orders (
        user_id, items, total_amount, status, address, phone, 
        payment_method, payment_reference, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW()) 
    `;

    const values = [
      finalUserId, 
      formatJson(parsedItems), 
      finalTotal, 
      'Order Placed', 
      formatJson(address), 
      phone, 
      paymentMethod || 'COD', 
      finalRef 
    ];

    const [result] = await pool.query(query, values);

    // -------------------------------------------------------------
    // 4. REDUCE STOCK (Now safe because we validated first)
    // -------------------------------------------------------------
    for (const item of parsedItems) {
        const pId = item.id || item._id;
        const qty = item.quantity || 1;

        if (pId) {
            console.log(`📉 Reducing Stock: Product ID ${pId} minus ${qty}`);
            await pool.query(
                'UPDATE products SET quantity = GREATEST(0, quantity - ?) WHERE id = ?', 
                [qty, pId]
            );
        }
    }

    const [newOrder] = await pool.query('SELECT * FROM orders WHERE id = ?', [result.insertId]);
    console.log("✅ [ORDER] Saved & Stock Updated");
    
    res.status(201).json({ success: true, order: newOrder[0] });

  } catch (err) {
    console.error("❌ [ORDER ERROR]:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- GET ALL ORDERS (Admin Access) ---
app.get('/api/orders/all', async (req, res) => {
  try {
    const query = `
      SELECT o.*, u.display_name, u.email 
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

// --- GET USER ORDERS (Customer History) ---
app.get('/api/orders/user/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', 
      [uid]
    );
    const orders = rows.map(order => ({
      ...order,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      address: typeof order.address === 'string' ? JSON.parse(order.address) : order.address
    }));
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

// --- UPDATE ORDER STATUS ---
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; 
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

// --- SYNC USER (Firebase Integration) ---
app.post('/api/users/sync', async (req, res) => {
  const { uid, email, displayName, isAdmin } = req.body;
  try {
    const query = `
      INSERT INTO users (id, email, display_name, is_admin) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), is_admin = VALUES(is_admin)
    `;
    await pool.query(query, [uid, email, displayName, isAdmin]);
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [uid]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SERVER INITIALIZATION ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend Server running on port ${PORT}`));
