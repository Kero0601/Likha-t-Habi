const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const {
      userId, user_id, customer_id,
      items,
      totalAmount,
      address,
      paymentMethod,
      paymentReference,
      payment_reference
    } = req.body;

    const finalUserId = customer_id || userId || user_id || null;
    const finalRef = paymentReference || payment_reference || null;
    const addressStr = typeof address === 'string' ? address : JSON.stringify(address);

    // 1. INSERT ORDER
    const [result] = await req.db.query(
      `INSERT INTO orders 
      (user_id, customer_id, items, total_amount, address, payment_method, payment_reference, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())`,
      [
        finalUserId,
        finalUserId,
        JSON.stringify(items),
        totalAmount,
        addressStr,
        paymentMethod || 'COD',
        finalRef
      ]
    );

    // --- 2. REDUCE STOCK (THE MISSING FIX) ---
    // Parse items if they are a string, otherwise use as is
    const orderItems = typeof items === 'string' ? JSON.parse(items) : items;

    if (Array.isArray(orderItems)) {
        for (const item of orderItems) {
            const pId = item.id || item._id;
            const qty = item.quantity;
            
            if (pId && qty) {
                // Subtract quantity from products table
                await req.db.query(
                    'UPDATE products SET quantity = quantity - ? WHERE id = ?', 
                    [qty, pId]
                );
            }
        }
    }

    res.status(201).json({ success: true, orderId: result.insertId });

  } catch (err) {
    console.error('❌ ORDER ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;