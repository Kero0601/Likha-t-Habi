const express = require('express');
const router = express.Router();

// 1. GET ALL PRODUCTS
router.get('/', async (req, res) => {
  try {
    const [rows] = await req.db.query('SELECT * FROM products ORDER BY id DESC');
    
    // Convert MySQL JSON string to Array
    const products = rows.map(p => ({
      ...p,
      images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || [])
    }));

    res.json(products);
  } catch (err) {
    console.error("Fetch Products Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2. ADD PRODUCT
router.post('/', async (req, res) => {
  const { name, price, category, quantity, stock, description, images } = req.body;
  
  // Use 'quantity' or 'stock' depending on what frontend sends
  const finalQty = quantity !== undefined ? quantity : (stock || 0);

  try {
    const query = `
      INSERT INTO products (name, price, category, quantity, description, images) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    // Convert Array -> JSON String for MySQL
    const imageJson = JSON.stringify(images || []);
    
    const [result] = await req.db.query(query, [
        name, 
        price, 
        category, 
        finalQty, 
        description || '', 
        imageJson
    ]);

    res.status(201).json({ message: 'Product added', id: result.insertId });
  } catch (err) {
    console.error("Add Product Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 3. UPDATE PRODUCT (THIS IS THE MISSING PART YOU NEED)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, category, quantity, stock, description, images } = req.body;

  // Handle quantity mapping (frontend might send 'stock' or 'quantity')
  const finalQty = quantity !== undefined ? quantity : (stock || 0);

  try {
    const query = `
      UPDATE products 
      SET name = ?, price = ?, category = ?, quantity = ?, description = ?, images = ?
      WHERE id = ?
    `;

    // Ensure images is always a JSON string
    const imageJson = JSON.stringify(images || []);

    const [result] = await req.db.query(query, [
      name,
      price,
      category,
      finalQty,
      description || '',
      imageJson,
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error("Update Product Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 4. DELETE PRODUCT (THIS WAS ALSO MISSING)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await req.db.query('DELETE FROM products WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error("Delete Product Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;