const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config(); 

// Import routes
const productRoutes = require('./routes/productRoutes'); 
const userRoutes = require('./routes/userRoutes'); 
const chatRoutes = require('./routes/chatRoutes'); 

const app = express();

// --- 1. ENHANCED CORS FOR PRODUCTION ---
// This fixes the 'blocked by CORS policy' errors seen in your console
const allowedOrigins = [
  'http://localhost:3000', 
  'https://likha-t-habi.vercel.app' // Your actual Vercel URL
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy: Origin not allowed'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- 2. DATABASE CONNECTION POOL (PRODUCTION READY) ---
// Changed 'localhost' to process.env.DB_HOST to work with Cloud Databases
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,      
  password: process.env.DB_PASSWORD,      
  database: process.env.DB_NAME, 
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false } // Required for most cloud DBs like Aiven or TiDB
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
    const { userId, user_id, items, total, totalAmount, address, phone, paymentMethod, paymentReference, payment_reference } = req.body;

    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    if (!parsedItems || !Array.isArray(parsedItems)) {
        return res.status(400).json({ error: "Invalid items format." });
    }

    // 1. SAFETY CHECK: Verify Stock
    for (const item of parsedItems) {
        const pId = item.id || item._id;
        const orderQty = item.quantity || 1;
        if (pId) {
            const [rows] = await pool.query('SELECT quantity, name FROM products WHERE id = ?', [pId]);
            if (rows.length === 0) return res.status(400).json({ error: `Product ID ${pId} no longer exists.` });
            const productInDb = rows[0];
            if (productInDb.quantity < orderQty) {
                return res.status(400).json({ error: `Order Failed: '${productInDb.name}' only has ${productInDb.quantity} left.` });
            }
        }
    }

    // 2. DATA NORMALIZATION
    const finalUserId = userId || user_id || null;
    const finalTotal = total || totalAmount || 0;
    const finalRef = paymentReference || payment_reference || ''; 
    const formatJson = (data) => (typeof data === 'string' ? data : JSON.stringify(data));

    // 3. INSERT ORDER
    const query = `INSERT INTO orders (user_id, items, total_amount, status, address, phone, payment_method, payment_reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
    const values = [finalUserId, formatJson(parsedItems), finalTotal, 'Order Placed', formatJson(address), phone, paymentMethod || 'COD', finalRef];
    const [result] = await pool.query(query, values);

    // 4. REDUCE STOCK
    for (const item of parsedItems) {
        const pId = item.id || item._id;
        if (pId) {
            await pool.query('UPDATE products SET quantity = GREATEST(0, quantity - ?) WHERE id = ?', [item.quantity || 1, pId]);
        }
    }

    const [newOrder] = await pool.query('SELECT * FROM orders WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, order: newOrder[0] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ORDER RETRIEVAL ROUTES ---
app.get('/api/orders/all', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT o.*, u.display_name, u.email FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

app.get('/api/orders/user/:uid', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.params.uid]);
    const orders = rows.map(o => ({ ...o, items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items, address: typeof o.address === 'string' ? JSON.parse(o.address) : o.address }));
    res.json(orders);
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

app.post('/api/users/sync', async (req, res) => {
  const { uid, email, displayName, isAdmin } = req.body;
  try {
    await pool.query(`INSERT INTO users (id, email, display_name, is_admin) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), is_admin = VALUES(is_admin)`, [uid, email, displayName, isAdmin]);
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [uid]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 4. SERVER INITIALIZATION ---
// Changed to process.env.PORT for Render deployment
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend Server running on port ${PORT}`));
