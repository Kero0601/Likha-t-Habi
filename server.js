<<<<<<< HEAD
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// =======================
// PRODUCTS
// =======================
app.get("/api/products", async (req, res) => {
  try {
    const snap = await db.collection("products").orderBy("createdAt", "desc").get();
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const payload = {
      ...req.body,
      price: Number(req.body.price || 0),
      quantity: Number(req.body.quantity || 0),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection("products").add(payload);
    res.status(201).json({ success: true, id: ref.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };
    if (payload.price !== undefined) payload.price = Number(payload.price || 0);
    if (payload.quantity !== undefined) payload.quantity = Number(payload.quantity || 0);

    await db.collection("products").doc(id).update(payload);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("products").doc(id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// USERS (Cart/Wishlist/Profile)
// =======================
app.get("/api/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return res.status(404).json({ error: "User not found" });
    res.json({ uid, ...snap.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:uid/cart", async (req, res) => {
  try {
    const { uid } = req.params;
    const { cart } = req.body;
    await db.collection("users").doc(uid).set({ cart }, { merge: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:uid/wishlist", async (req, res) => {
  try {
    const { uid } = req.params;
    const { wishlist } = req.body;
    await db.collection("users").doc(uid).set({ wishlist }, { merge: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:uid/profile", async (req, res) => {
  try {
    const { uid } = req.params;
    const { address, phone } = req.body;
    await db.collection("users").doc(uid).set({ address, phone }, { merge: true });
    res.json({ success: true, address, phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// ORDERS (with stock validation + update)
// =======================
app.post("/api/orders", async (req, res) => {
  try {
    const {
      userId,
      items,
      totalAmount,
      address,
      phone,
      paymentMethod,
      paymentReference,
    } = req.body;

    if (!userId) return res.status(400).json({ error: "Missing userId" });
    if (!Array.isArray(items)) return res.status(400).json({ error: "Items must be array" });

    await db.runTransaction(async (tx) => {
      // Validate stock
      for (const item of items) {
        const pid = String(item.id || item._id);
        const qty = Number(item.quantity || 1);

        const pRef = db.collection("products").doc(pid);
        const pSnap = await tx.get(pRef);
        if (!pSnap.exists) throw new Error(`Product ${pid} not found`);

        const stock = Number(pSnap.data().quantity || 0);
        if (stock < qty) throw new Error(`Order Failed: only ${stock} left`);
      }

      // Reduce stock
      for (const item of items) {
        const pid = String(item.id || item._id);
        const qty = Number(item.quantity || 1);

        const pRef = db.collection("products").doc(pid);
        const pSnap = await tx.get(pRef);
        const stock = Number(pSnap.data().quantity || 0);

        tx.update(pRef, { quantity: stock - qty });
      }

      // Create order
      await db.collection("orders").add({
        userId,
        items,
        totalAmount: Number(totalAmount || 0),
        address: address || null,
        phone: phone || "",
        paymentMethod: paymentMethod || "COD",
        paymentReference: paymentReference || "",
        status: "Order Placed",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/orders/all", async (req, res) => {
  try {
    const snap = await db.collection("orders").orderBy("createdAt", "desc").get();
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders/user/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const snap = await db
      .collection("orders")
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.collection("orders").doc(id).update({ status });
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Firestore API server running on port ${PORT}`));
=======
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// =======================
// PRODUCTS
// =======================
app.get("/api/products", async (req, res) => {
  try {
    const snap = await db.collection("products").orderBy("createdAt", "desc").get();
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const payload = {
      ...req.body,
      price: Number(req.body.price || 0),
      quantity: Number(req.body.quantity || 0),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection("products").add(payload);
    res.status(201).json({ success: true, id: ref.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };
    if (payload.price !== undefined) payload.price = Number(payload.price || 0);
    if (payload.quantity !== undefined) payload.quantity = Number(payload.quantity || 0);

    await db.collection("products").doc(id).update(payload);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("products").doc(id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// USERS (Cart/Wishlist/Profile)
// =======================
app.get("/api/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return res.status(404).json({ error: "User not found" });
    res.json({ uid, ...snap.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:uid/cart", async (req, res) => {
  try {
    const { uid } = req.params;
    const { cart } = req.body;
    await db.collection("users").doc(uid).set({ cart }, { merge: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:uid/wishlist", async (req, res) => {
  try {
    const { uid } = req.params;
    const { wishlist } = req.body;
    await db.collection("users").doc(uid).set({ wishlist }, { merge: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:uid/profile", async (req, res) => {
  try {
    const { uid } = req.params;
    const { address, phone } = req.body;
    await db.collection("users").doc(uid).set({ address, phone }, { merge: true });
    res.json({ success: true, address, phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// ORDERS (with stock validation + update)
// =======================
app.post("/api/orders", async (req, res) => {
  try {
    const {
      userId,
      items,
      totalAmount,
      address,
      phone,
      paymentMethod,
      paymentReference,
    } = req.body;

    if (!userId) return res.status(400).json({ error: "Missing userId" });
    if (!Array.isArray(items)) return res.status(400).json({ error: "Items must be array" });

    await db.runTransaction(async (tx) => {
      // Validate stock
      for (const item of items) {
        const pid = String(item.id || item._id);
        const qty = Number(item.quantity || 1);

        const pRef = db.collection("products").doc(pid);
        const pSnap = await tx.get(pRef);
        if (!pSnap.exists) throw new Error(`Product ${pid} not found`);

        const stock = Number(pSnap.data().quantity || 0);
        if (stock < qty) throw new Error(`Order Failed: only ${stock} left`);
      }

      // Reduce stock
      for (const item of items) {
        const pid = String(item.id || item._id);
        const qty = Number(item.quantity || 1);

        const pRef = db.collection("products").doc(pid);
        const pSnap = await tx.get(pRef);
        const stock = Number(pSnap.data().quantity || 0);

        tx.update(pRef, { quantity: stock - qty });
      }

      // Create order
      await db.collection("orders").add({
        userId,
        items,
        totalAmount: Number(totalAmount || 0),
        address: address || null,
        phone: phone || "",
        paymentMethod: paymentMethod || "COD",
        paymentReference: paymentReference || "",
        status: "Order Placed",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/orders/all", async (req, res) => {
  try {
    const snap = await db.collection("orders").orderBy("createdAt", "desc").get();
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders/user/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const snap = await db
      .collection("orders")
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.collection("orders").doc(id).update({ status });
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Firestore API server running on port ${PORT}`));
>>>>>>> 46f177dc8ce17a0f72dc7182eb1b2842c55e7a13
