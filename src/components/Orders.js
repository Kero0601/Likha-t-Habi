/* src/components/Orders.js */
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ShopContext } from "../context/ShopContext";
import { toast } from "react-toastify";
import "./Orders.css";

// 🔥 FIRESTORE CHAT IMPORTS
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const Orders = () => {
  const { user, fetchUserOrders, isLoading } = useContext(ShopContext);

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ✅ Chat modal state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatMessageInput, setChatMessageInput] = useState("");
  const chatEndRef = useRef(null);
  const chatUnsubRef = useRef(null);

  // ---------------- HELPERS ----------------
  const safeParse = (v) => {
    try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; }
  };

  const formatDateSafe = (ts) => {
    try {
      if (!ts) return "—";
      if (ts?.toDate) return ts.toDate().toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit' });
      if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString();
      const d = new Date(ts);
      return isNaN(d) ? "—" : d.toLocaleString();
    } catch { return "—"; }
  };

  const getOrderItems = (order) => {
    const items = order?.items;
    if (Array.isArray(items)) return items;
    const parsed = safeParse(items);
    return Array.isArray(parsed) ? parsed : [];
  };

  const getItemImage = (item) => {
    if (item?.image) return item.image;
    let imgs = item?.images;
    if (typeof imgs === "string") { try { imgs = JSON.parse(imgs); } catch { imgs = []; } }
    if (Array.isArray(imgs) && imgs.length > 0) return imgs[0];
    return "/placeholder.png";
  };

  const getCustomerName = (order) => {
    const addr = safeParse(order?.address);
    return addr?.fullName || order?.customer_name || user?.displayName || user?.email || "Customer";
  };

  const getAddressString = (order) => {
    const addr = safeParse(order?.address);
    if (!addr) return "N/A";
    if (typeof addr === "string") return addr;
    const parts = [addr.street, addr.barangay, addr.city, addr.province, addr.zip || addr.postalCode];
    return parts.filter((p) => p && String(p).trim() !== "").join(", ");
  };

  const getOrderTotal = (order) => {
    if (order?.totalAmount != null) return Number(order.totalAmount);
    if (order?.total != null) return Number(order.total);
    return 0;
  };

  // ✅ Conversation ID
  const conversationId = useMemo(() => user?.uid || null, [user]);

  // ---------------- LOAD ORDERS ----------------
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const data = await fetchUserOrders();
      setOrders(data || []);
    };
    load();
  }, [user, fetchUserOrders]);

  // ---------------- CHAT LOGIC ----------------
  const openChat = async () => {
    if (!user || !conversationId) { toast.info("Please login first."); return; }
    
    if (chatOpen) { setChatOpen(false); return; }
    setChatOpen(true);

    if (chatUnsubRef.current) { chatUnsubRef.current(); chatUnsubRef.current = null; }

    const firstItem = getOrderItems(selectedOrder)[0];
    const orderId = String(selectedOrder.id).toUpperCase();
    const productName = firstItem?.name || "Multiple Items";
    const productImage = getItemImage(firstItem);

    const convRef = doc(db, "conversations", conversationId);

    try {
      // ✅ Updated logic: Only update metadata, not the timestamp
      await setDoc(convRef, {
        customer_id: conversationId,
        customer_name: getCustomerName(selectedOrder),
        // ✅ REMOVED: last_message_at: serverTimestamp()
        // Removing this prevents the chat from moving to the top of the Admin list on click.
        
        is_read_by_admin: true, // Keep this true so the red dot stays hidden initially
        related_order_id: orderId,
        product_name: productName,
        product_image: productImage
      }, { merge: true });
    } catch (e) { console.error("Create conversation error:", e); }

    const msgsRef = collection(db, "conversations", conversationId, "messages");
    const q = query(msgsRef, orderBy("createdAt", "asc"));

    chatUnsubRef.current = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => {
        const data = d.data();
        const time = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
        return { sender: data.sender, text: data.text, time };
      });
      setChatHistory(msgs);
      setTimeout(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); }, 50);
    }, (err) => { console.error("Chat listen error:", err); setChatHistory([]); });
  };

  useEffect(() => { return () => { if (chatUnsubRef.current) chatUnsubRef.current(); }; }, []);

  const sendChat = async (e) => {
    e.preventDefault();
    if (!chatMessageInput.trim() || !user || !conversationId) return;
    const text = chatMessageInput.trim();
    setChatMessageInput("");

    setChatHistory((prev) => [...prev, { sender: "customer", text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    setTimeout(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); }, 50);

    try {
      await addDoc(collection(db, "conversations", conversationId, "messages"), { sender: "customer", text, createdAt: serverTimestamp() });
      await updateDoc(doc(db, "conversations", conversationId), {
        customer_name: getCustomerName(selectedOrder),
        last_message: text,
        // ✅ MOVE TO TOP: Update the timestamp ONLY when a message is sent
        last_message_at: serverTimestamp(),
        // ✅ NOTIFY ADMIN: Show the red dot
        is_read_by_admin: false,
      });
    } catch (err) { console.error(err); toast.error("Failed to send message"); }
  };

  // ---------------- RENDER ----------------
  if (!user) {
    return (
      <div className="orders-page">
        <div className="container">
            <h2 className="section-title">My Orders</h2>
            <div className="lh-empty-state">
                <h2>Please login to view your orders.</h2>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="container">
        <h2 className="section-title">My Orders</h2>

        {isLoading ? (
          <div className="orders-list">
             <div className="order-card" style={{height:'150px', opacity:0.5, background:'#eee'}}></div>
             <div className="order-card" style={{height:'150px', opacity:0.5, background:'#eee'}}></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="lh-empty-state">
            <div style={{fontSize: '4rem', marginBottom: '20px'}}>📦</div>
            <h2>No orders yet.</h2>
            <p style={{color:'#888'}}>Looks like you haven't bought anything yet.</p>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((o) => {
              const firstItem = getOrderItems(o)[0];
              const itemCount = getOrderItems(o).length;
              const statusClass = (o.status || 'pending').toLowerCase();

              return (
                <div
                  key={o.id}
                  className="order-card"
                  onClick={() => setSelectedOrder(o)}
                >
                  <div className="order-card-preview">
                    <img 
                      src={getItemImage(firstItem)} 
                      alt="Order Preview" 
                      onError={(e) => (e.target.src = "/placeholder.png")}
                    />
                  </div>
                  <div className="order-card-content">
                    <div className="order-card-header">
                      <div>
                        <div className="order-id">#{String(o.id).slice(-8).toUpperCase()}</div>
                        <span className="order-date">{formatDateSafe(o.createdAt)}</span>
                      </div>
                      <div className={`order-status ${statusClass}`}>
                        {o.status || "Pending"}
                      </div>
                    </div>
                    <div className="order-card-footer">
                      <div className="order-summary-text">
                        <span className="order-total">₱{getOrderTotal(o).toLocaleString()}</span>
                        <span className="order-items-count">{itemCount} item{itemCount > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="order-modal-overlay" onClick={() => { setSelectedOrder(null); setChatOpen(false); }}>
          <div className="order-modal" onClick={(e) => e.stopPropagation()}>
            <div className="order-modal-header">
              <div>
                <h3>Order Details</h3>
                <small>#{String(selectedOrder.id).toUpperCase()}</small>
              </div>
              <button className="order-modal-close" onClick={() => { setSelectedOrder(null); setChatOpen(false); }}>✕</button>
            </div>

            <div className="order-modal-body">
              <div className="order-status-pill">{(selectedOrder.status || "ORDER PLACED").toUpperCase()}</div>

              {/* Items */}
              <div className="order-section">
                <div className="order-section-title">ITEMS PURCHASED</div>
                {getOrderItems(selectedOrder).map((item, idx) => (
                  <div key={idx} className="order-item-row">
                    <img
                      src={getItemImage(item)}
                      alt=""
                      onError={(e) => (e.target.src = "/placeholder.png")}
                      className="order-item-img"
                    />
                    <div className="order-item-info">
                      <div className="order-item-name">{item.name}</div>
                      <div className="order-item-meta">Qty: {item.quantity}</div>
                    </div>
                    <div className="order-item-total">
                      ₱{(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Address */}
              <div className="order-section">
                <div className="order-section-title">DELIVERY ADDRESS</div>
                <div className="order-text">
                    <div style={{fontWeight:600, marginBottom:4}}>{getCustomerName(selectedOrder)}</div>
                    {getAddressString(selectedOrder)}
                </div>
              </div>

              {/* Payment */}
              <div className="order-section">
                <div className="order-section-title">PAYMENT INFORMATION</div>
                <div className="order-text">
                    Method: <strong>{selectedOrder.paymentMethod || "COD"}</strong>
                    {selectedOrder.paymentMethod && selectedOrder.paymentMethod !== "COD" && (
                        <div style={{fontSize: '0.85rem', marginTop: 4, color:'#888'}}>
                            Ref: {selectedOrder.paymentReference || "N/A"}
                        </div>
                    )}
                </div>
              </div>

              {/* Total */}
              <div className="order-section total-row">
                <div className="order-total-label">Total Payment</div>
                <div className="order-total-value">₱{getOrderTotal(selectedOrder).toLocaleString()}</div>
              </div>

              {/* Message Button */}
              <div style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className={`btn-message-seller ${chatOpen ? 'active' : ''}`}
                  onClick={openChat}
                >
                  {chatOpen ? 'Close Chat' : '💬 Message Seller'}
                </button>
              </div>

              {/* ✅ ENHANCED CHAT UI WITH PRODUCT CONTEXT */}
              {chatOpen && (
                <div className="chat-container fade-in">
                  <div className="chat-header">
                    <span>Live Chat</span>
                    <small>Online</small>
                  </div>

                  <div className="chat-product-context">
                    <img 
                        src={getItemImage(getOrderItems(selectedOrder)[0])} 
                        alt="Product" 
                        onError={(e) => e.target.src='/placeholder.png'}
                    />
                    <div className="chat-context-info">
                        <span className="context-title">Order #{String(selectedOrder.id).slice(-6).toUpperCase()}</span>
                        <span className="context-item">{getOrderItems(selectedOrder)[0]?.name || 'Item'}</span>
                    </div>
                  </div>

                  <div className="chat-messages">
                    {chatHistory.length === 0 ? (
                      <div className="chat-empty">
                        <span style={{fontSize: '2rem'}}>👋</span>
                        <p>Questions about this order? <br/>Send us a message!</p>
                      </div>
                    ) : (
                      chatHistory.map((msg, i) => (
                        <div key={i} className={`chat-bubble-row ${msg.sender === "customer" ? "customer" : "seller"}`}>
                          <div className="chat-bubble">
                            <div className="chat-text">{msg.text}</div>
                            <div className="chat-time">{msg.time}</div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={sendChat} className="chat-input-area">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={chatMessageInput}
                      onChange={(e) => setChatMessageInput(e.target.value)}
                    />
                    <button type="submit">➤</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;