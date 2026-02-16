import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { ShopContext } from '../context/ShopContext';
import { toast } from 'react-toastify';
import './AdminPage.css';

// ✅ FIRESTORE (CHAT)
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";

const AdminPage = () => {
  const { products, addProduct, updateProduct, deleteProduct, fetchAllOrders, updateOrderStatus, isLoading } =
    useContext(ShopContext);

  // Tabs
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeAdminTab') || 'inventory');

  // Data States
  const [orders, setOrders] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // ✅ Upload UI states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); 


  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');

  const [selectedOrder, setSelectedOrder] = useState(null);

  // Chat State
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [chatMessageInput, setChatMessageInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);
  const chatUnsubRef = useRef(null);

  // Edit/Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'Crochet',
    stock: '',
    description: '',
    images: []
  });

  const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

  const uploadToCloudinary = (file, onProgress) => {
    return new Promise((resolve, reject) => {
      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        reject(new Error("Missing Cloudinary env vars."));
        return;
      }

      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", UPLOAD_PRESET);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        if (onProgress) onProgress(percent);
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || "{}");
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data.secure_url);
          } else {
            reject(new Error(data?.error?.message || "Cloudinary upload failed"));
          }
        } catch (e) {
          reject(new Error("Cloudinary returned invalid response"));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(form);
    });
  };


  useEffect(() => { localStorage.setItem('activeAdminTab', activeTab); }, [activeTab]);

  // ORDER HELPERS
  const getOrderCreatedDate = (o) => {
    if (!o) return null;
    if (o.createdAt?.toDate) return o.createdAt.toDate();
    if (o.createdAt?.seconds) return new Date(o.createdAt.seconds * 1000);
    if (o.created_at) return new Date(o.created_at);
    return null;
  };

  const getOrderTotal = (o) => {
    if (!o) return 0;
    return Number(o.totalAmount || o.total || o.total_amount || 0);
  };

  const getOrderPaymentMethod = (o) => o?.paymentMethod || o?.payment_method || "COD";
  const getOrderPaymentRef = (o) => o?.paymentReference || o?.payment_reference || "";
  const formatDateSafe = (d) => (!d || isNaN(d)) ? "—" : d.toLocaleDateString();

  const loadData = useCallback(async () => {
    setIsLoadingData(true);
    if (activeTab === 'orders' || activeTab === 'messages') {
      const data = await fetchAllOrders();
      const sorted = (data || []).sort((a, b) => {
        const da = getOrderCreatedDate(a)?.getTime() || 0;
        const dbb = getOrderCreatedDate(b)?.getTime() || 0;
        return dbb - da;
      });
      setOrders(sorted);
    }
    setIsLoadingData(false);
  }, [activeTab, fetchAllOrders]);

  useEffect(() => { loadData(); }, [activeTab, loadData]);

  const handleOpenOrderFromChat = (orderId) => {
    if (!orderId) return;
    const foundOrder = orders.find(o => 
      String(o.id || o._id).toUpperCase() === String(orderId).toUpperCase()
    );
    if (foundOrder) {
      setSelectedOrder(foundOrder);
    } else {
      toast.error("Order details not found. It might be an older order.");
    }
  };

  // ✅ LISTEN CONVERSATIONS (Global Listener for Notification Dot)
  useEffect(() => {
    const q = query(collection(db, "conversations"), orderBy("last_message_at", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Inbox Error", err));
    return () => unsub();
  }, []); // Run on mount, regardless of activeTab

  // ✅ CHECK FOR UNREAD MESSAGES
  const hasUnreadMessages = conversations.some(conv => conv.is_read_by_admin === false);

  // CHAT LOGIC
  const handleOpenChat = async (userObj) => {
    setActiveChatUser(userObj);
    if (activeTab !== 'messages') setActiveTab('messages');

    if (chatUnsubRef.current) chatUnsubRef.current();

    try {
      await updateDoc(doc(db, "conversations", userObj.id), { is_read_by_admin: true });
    } catch (e) { }

    const msgsRef = collection(db, "conversations", userObj.id, "messages");
    const q = query(msgsRef, orderBy("createdAt", "asc"));

    chatUnsubRef.current = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => {
        const data = d.data();
        const time = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
        return { sender: data.sender, text: data.text, time };
      });
      setChatHistory(msgs);
      setTimeout(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); }, 50);
    }, (err) => { console.error("Chat error:", err); setChatHistory([]); });
  };

  useEffect(() => { return () => { if (chatUnsubRef.current) chatUnsubRef.current(); }; }, []);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMessageInput.trim() || !activeChatUser) return;

    const customerId = activeChatUser.id;
    const text = chatMessageInput.trim();
    setChatMessageInput("");

    setChatHistory(prev => [...prev, { sender: 'admin', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);

    try {
      await addDoc(collection(db, "conversations", customerId, "messages"), { sender: "admin", text, createdAt: serverTimestamp() });
      await updateDoc(doc(db, "conversations", customerId), { last_message: text, last_message_at: serverTimestamp(), is_read_by_admin: true });
    } catch (err) { toast.error("Failed to send"); }
  };

  const handleStatusChange = async (id, status) => {
    if (await updateOrderStatus(id, status)) {
      toast.success("Updated");
      loadData();
      if ((selectedOrder?.id || selectedOrder?._id) === id) setSelectedOrder(prev => ({ ...prev, status }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      setIsUploading(true);
      setUploadProgress(0);
      toast.info("Uploading images...", { toastId: "uploading-images" });
      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadToCloudinary(files[i], (p) => {
          const overall = Math.round(((i + p / 100) / files.length) * 100);
          setUploadProgress(overall);
        });
        uploadedUrls.push(url);
      }
      setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      toast.dismiss("uploading-images");
      toast.success("Images uploaded ✅");
    } catch (error) {
      toast.dismiss("uploading-images");
      toast.error(error.message || "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  };

  const removeImage = (index) => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    // ✅ FIX: Duplicate Name Check
    // We only check for duplicates if the admin is ADDING a new product (not editing)
    if (!isEditing) {
      const isDuplicate = products.some(p => 
        (p.name || "").trim().toLowerCase() === formData.name.trim().toLowerCase()
      );

      if (isDuplicate) {
        toast.warn(`"${formData.name}" is already in your inventory!`, { 
          position: "top-center",
          toastId: "duplicate-warning" 
        });
        setIsSaving(false);
        return; // Stop the function here
      }
    }

    const payload = { 
      name: formData.name, 
      category: formData.category, 
      price: Number(formData.price), 
      quantity: Number(formData.stock), 
      description: formData.description, 
      images: formData.images 
    };

    try {
      if (isEditing) {
        await updateProduct(editId, payload);
        toast.success("Product updated");
        setIsEditing(false);
        setEditId(null);
      } else {
        await addProduct(payload);
        toast.success("Product added");
      }
      setActiveTab('inventory');
      setFormData({ name: '', price: '', category: 'Crochet', stock: '', description: '', images: [] });
    } catch (error) { 
      toast.error("Failed to save."); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleEdit = (p) => {
    setIsEditing(true);
    setActiveTab('add-product');
    setEditId(p.id || p._id);
    let pImages = p.images;
    if (typeof pImages === 'string') { try { pImages = JSON.parse(pImages); } catch (e) { pImages = []; } }
    setFormData({ name: p.name, price: p.price, category: p.category, stock: p.quantity || p.stock || 0, description: p.description || '', images: Array.isArray(pImages) ? pImages : [] });
  };

  const handleDelete = async (id) => { if (window.confirm("Are you sure?")) await deleteProduct(id); };

  const parseAddress = (addr) => { try { return typeof addr === 'string' ? JSON.parse(addr) : addr; } catch { return null; } };
  const getCustomerName = (o) => parseAddress(o.address)?.fullName || o.display_name || o.customer_name || 'Guest';

  const getStatusColor = (s) => {
    const st = s?.toLowerCase() || '';
    if (st.includes('delivered')) return 'ok';
    if (st.includes('shipped')) return 'purple';
    if (st.includes('processing')) return 'blue';
    return 'low';
  };

  const getItemImage = (item) => {
    if (item.image) return item.image;
    let imgs = item.images;
    if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch (e) { } }
    if (Array.isArray(imgs) && imgs.length > 0) return imgs[0];
    return '/placeholder.png';
  };

  const formatAddressString = (addrData) => {
    if (!addrData) return 'N/A';
    if (typeof addrData === 'string') return addrData;
    const parts = [addrData.street, addrData.barangay, addrData.city, addrData.province, addrData.zip || addrData.postalCode];
    return parts.filter(part => part && String(part).trim() !== '').join(', ');
  };

  const getOrderCustomerId = (order) => {
    const possibleIds = [order.customer_id, order.user_id, order.userId, order.uid];
    for (const id of possibleIds) { if (id && String(id) !== String(order.id)) return id; }
    return null;
  };

  const filteredProducts = products.filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

  const filteredOrders = orders.filter(order => {
    const method = getOrderPaymentMethod(order);
    const payMatch = filterPayment === 'All' || method.toLowerCase().includes(filterPayment.toLowerCase());
    let dateMatch = true;
    if (filterDate) { const d = getOrderCreatedDate(order); if (d && !isNaN(d)) dateMatch = d.toISOString().split('T')[0] === filterDate; }
    const name = (getCustomerName(order) || '').toLowerCase();
    const searchMatch = String(order.id || order._id || '').includes(orderSearchTerm) || name.includes(orderSearchTerm.toLowerCase());
    return payMatch && dateMatch && searchMatch;
  });

  const SkeletonRow = () => (
    <tr className="inventory-row skeleton-row">
      <td><div className="skeleton sk-img"></div></td>
      <td><div className="skeleton sk-text w-100"></div></td>
      <td><div className="skeleton sk-text w-50"></div></td>
      <td><div className="skeleton sk-pill"></div></td>
      <td className="actions-cell"><div className="skeleton sk-icon"></div><div className="skeleton sk-icon"></div></td>
    </tr>
  );

  const SkeletonCard = () => (
    <div className="chat-list-item skeleton-chat-item">
      <div className="skeleton sk-avatar"></div>
      <div className="chat-list-info w-100">
        <div className="chat-list-top"><div className="skeleton sk-text w-50"></div><div className="skeleton sk-text w-20"></div></div>
        <div className="skeleton sk-text w-80 mt-2"></div>
      </div>
    </div>
  );

  const totalProducts = products.length;
  const lowStock = products.filter(p => (p.quantity ?? p.stock ?? 0) <= 5).length;
  const totalValue = products.reduce((acc, p) => acc + (Number(p.price) * Number(p.quantity ?? p.stock ?? 0)), 0);
  const isPageLoading = isLoading || isLoadingData;

  const currentConversation = conversations.find(c => c.id === activeChatUser?.id);

  return (
    <div className="admin-wrapper">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <h1>Likha't Habi</h1>
          <span className="admin-tag">ADMIN PANEL</span>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>📊 Inventory</button>
          <button className={`nav-item ${activeTab === 'add-product' ? 'active' : ''}`} onClick={() => { setActiveTab('add-product'); setIsEditing(false); setFormData({ name: '', price: '', category: 'Crochet', stock: '', description: '', images: [] }); }}>➕ Product</button>
          <button className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>🚚 Orders</button>
          
          <button className={`nav-item ${activeTab === 'messages' ? 'active' : ''} nav-inbox`} onClick={() => setActiveTab('messages')}>
             💬 Inbox
             {hasUnreadMessages && <span className="admin-nav-dot"></span>}
          </button>
        </nav>
      </aside>

      <main className="admin-main">
        {activeTab === 'inventory' && (
          <div className="tab-content fade-in">
            <header className="content-header"><h2>Inventory Overview</h2></header>
            <div className="stats-container">
              {isPageLoading ? [...Array(3)].map((_, i) => <div key={i} className="stat-card skeleton-stat"><div className="skeleton sk-icon-lg"></div><div className="stat-details"><div className="skeleton sk-text w-50"></div><div className="skeleton sk-text w-30"></div></div></div>) : (
                <>
                  <div className="stat-card"><div className="stat-icon-wrapper">👜</div><div className="stat-details"><span className="stat-number">{totalProducts}</span><span className="stat-label">Listings</span></div></div>
                  <div className="stat-card"><div className="stat-icon-wrapper warning">⚠️</div><div className="stat-details"><span className="stat-number">{lowStock}</span><span className="stat-label">Low Stock</span></div></div>
                  <div className="stat-card"><div className="stat-icon-wrapper money">₱</div><div className="stat-details"><span className="stat-number">₱{totalValue.toLocaleString()}</span><span className="stat-label">Total Value</span></div></div>
                </>
              )}
            </div>
            <div className="search-bar-wrapper"><input type="text" className="search-input" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            <div className="table-card">
              <table className="inventory-table">
                <thead><tr><th>IMAGE</th><th>NAME</th><th>PRICE</th><th>STOCK</th><th>ACTIONS</th></tr></thead>
                <tbody>{isPageLoading ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />) : filteredProducts.map(p => {
                  const qty = p.quantity ?? p.stock ?? 0;
                  return (
                    <tr key={p.id ?? p._id} className="inventory-row">
                      <td><img src={getItemImage(p)} alt="" className="table-thumb" onError={(e) => e.target.src = '/placeholder.png'} /></td>
                      <td className="product-name-cell">{p.name}</td>
                      <td className="price-cell">₱{Number(p.price).toLocaleString()}</td>
                      <td><span className={`stock-pill ${qty <= 5 ? 'low' : 'ok'}`}>{qty <= 0 ? `Out of Stock (0)` : qty <= 5 ? `Low (${qty})` : `In Stock (${qty})`}</span></td>
                      <td className="actions-cell"><button className="icon-btn edit" onClick={() => handleEdit(p)}>✏️</button><button className="icon-btn delete" onClick={() => handleDelete(p.id ?? p._id)}>🗑️</button></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'add-product' && (
          <div className="tab-content fade-in">
            <header className="content-header"><h2>{isEditing ? 'Edit Product' : 'Add New Product'}</h2></header>
            <div className="form-card">
              <form onSubmit={handleSubmit} className="product-form">
                <div className="input-group"><label>Product Name</label><input type="text" name="name" placeholder="e.g. Handmade Crochet Bouquet" value={formData.name} onChange={handleInputChange} required /></div>
                <div className="form-row">
                  <div className="input-group"><label>Price (₱)</label><input type="number" name="price" placeholder="0.00" value={formData.price} onChange={handleInputChange} required /></div>
                  <div className="input-group"><label>Stock</label><input type="number" name="stock" placeholder="0" value={formData.stock} onChange={handleInputChange} required /></div>
                  <div className="input-group"><label>Category</label><select name="category" value={formData.category} onChange={handleInputChange}><option value="Crochet">Crochet</option><option value="Ribbons">Ribbons</option><option value="Amigurumi">Amigurumi</option></select></div>
                </div>
                <div className="input-group"><label>Product Description</label><textarea name="description" className="description-input" placeholder="Describe the product..." value={formData.description} onChange={handleInputChange} rows="4" /></div>
                <div className="input-group">
                  <label>Product Images</label>
                  <div className="file-upload-wrapper">
                    <input type="file" onChange={handleImageUpload} id="file-upload" className="custom-file-input" accept="image/*" multiple />
                    <label htmlFor="file-upload" className={`file-upload-box ${isUploading ? "is-uploading" : ""}`}>
                      <span className="upload-icon">📷</span>
                      <span className="upload-text">{isUploading ? "Uploading..." : "Click to upload images"}</span>
                      {isUploading && <><div className="upload-status">⏳ {uploadProgress}%</div><div className="upload-progress"><div style={{ width: `${uploadProgress}%` }} /></div></>}
                    </label>
                  </div>
                  {formData.images.length > 0 && <div className="image-gallery">{formData.images.map((img, index) => <div key={index} className="gallery-item"><img src={img} alt="" onError={(e) => e.target.src = "/placeholder.png"} /><button type="button" className="remove-btn" onClick={() => removeImage(index)}>×</button></div>)}</div>}
                </div>
                <div className="form-actions"><button type="submit" className="btn-save" disabled={isSaving}>{isSaving ? 'Saving...' : (isEditing ? 'Update Product' : 'Add Product')}</button>{isEditing && <button type="button" className="btn-cancel" onClick={() => { setIsEditing(false); setActiveTab('inventory'); }}>Cancel</button>}</div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="tab-content fade-in">
            <header className="content-header">
              <h2>Order Queue</h2>
              <div className="filter-wrapper"><input type="text" className="search-input order-search" placeholder="Search ID..." value={orderSearchTerm} onChange={(e) => setOrderSearchTerm(e.target.value)} /><input type="date" className="filter-date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} /><select className="filter-select" value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}><option value="All">All</option><option value="COD">COD</option><option value="GCash">GCash</option><option value="Maya">Maya</option></select></div>
            </header>
            <div className="table-card">
              <table className="inventory-table">
                <thead><tr><th>ID</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
                <tbody>{isPageLoading ? [...Array(6)].map((_, i) => <SkeletonRow key={i} />) : filteredOrders.map(o => (
                  <tr key={o.id ?? o._id} className="inventory-row clickable-row" onClick={() => setSelectedOrder(o)}>
                    <td>#{String(o.id ?? o._id).slice(-6).toUpperCase()}</td>
                    <td>{formatDateSafe(getOrderCreatedDate(o))}</td>
                    <td>₱{getOrderTotal(o).toLocaleString()}</td>
                    <td><span className="payment-tag">{getOrderPaymentMethod(o)}</span></td>
                    <td><span className={`stock-pill ${getStatusColor(o.status)}`}>{o.status || 'Pending'}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className={`tab-content fade-in chat-tab-container ${activeChatUser ? 'mobile-chat-active' : ''}`}>
            <div className="chat-sidebar">
              <div className="chat-search-bar"><input type="text" placeholder="Search messages..." /></div>
              <div className="chat-list-scroll">
                {isPageLoading ? [...Array(5)].map((_, i) => <SkeletonCard key={i} />) : conversations.length === 0 ? <div className="empty-inbox-placeholder"><span>📭</span><p>No messages found</p></div> : conversations.map(conv => {
                  const isActive = activeChatUser?.id === conv.id;
                  const name = conv.customer_name || "Customer";
                  const lastDate = conv.last_message_at?.toDate ? conv.last_message_at.toDate() : (conv.last_message_at ? new Date(conv.last_message_at) : null);
                  return (
                    <div key={conv.id} className={`chat-list-item ${isActive ? 'active' : ''} ${conv.is_read_by_admin === false ? 'unread' : ''}`} onClick={() => handleOpenChat({ id: conv.id, name })}>
                      <div className="chat-list-avatar" style={{ backgroundColor: conv.is_read_by_admin === false ? '#fff3e0' : '#f0f0f0', color: conv.is_read_by_admin === false ? '#e65100' : '#888' }}>{name.charAt(0).toUpperCase()}</div>
                      <div className="chat-list-info"><div className="chat-list-top"><span className="chat-list-name">{name}</span><span className="chat-list-time">{lastDate ? lastDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}</span></div><p className="chat-list-preview" style={{ fontWeight: conv.is_read_by_admin === false ? '600' : '400' }}>{conv.last_message || ''}</p></div>
                      {conv.is_read_by_admin === false && <div className="chat-unread-badge"></div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="chat-main-area">
              {activeChatUser ? (
                <>
                  <div className="chat-main-header">
                    <div className="chat-header-left">
                      <button className="mobile-back-btn" onClick={() => setActiveChatUser(null)}>←</button>
                      <div className="chat-user-profile"><div className="chat-header-avatar">{activeChatUser.name.charAt(0).toUpperCase()}</div><div><h3>{activeChatUser.name}</h3><span>Online</span></div></div>
                    </div>
                    <button className="close-chat-btn desktop-only" onClick={() => setActiveChatUser(null)}>✕</button>
                  </div>

                  {currentConversation && currentConversation.product_name && (
                    <div 
                      className="chat-product-context admin-version clickable-context" 
                      onClick={() => handleOpenOrderFromChat(currentConversation.related_order_id)}
                      title="Click to view full order details"
                      style={{ cursor: 'pointer' }}
                    >
                      <img 
                        src={currentConversation.product_image || '/placeholder.png'} 
                        alt="Product" 
                        onError={(e) => e.target.src = '/placeholder.png'}
                      />
                      <div className="chat-context-info">
                        <span className="context-title">Customer inquiring about:</span>
                        <span className="context-item">
                            {currentConversation.product_name} 
                            {currentConversation.related_order_id && ` (Order #${currentConversation.related_order_id.slice(-6).toUpperCase()})`}
                        </span>
                      </div>
                      <div className="context-arrow">→</div>
                    </div>
                  )}

                  <div className="chat-main-messages">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`message-row ${msg.sender === 'admin' ? 'mine' : 'theirs'}`}>
                        <div className="message-bubble"><p>{msg.text}</p><span className="message-time">{msg.time}</span></div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  <form className="chat-main-footer" onSubmit={handleSendChat}>
                    <input type="text" placeholder="Type a message..." value={chatMessageInput} onChange={(e) => setChatMessageInput(e.target.value)} />
                    <button type="submit" className="send-message-btn">➤</button>
                  </form>
                </>
              ) : <div className="chat-empty-state"><span>💬</span><h3>Select a conversation</h3></div>}
            </div>
          </div>
        )}
      </main>

      {/* ORDER MODAL */}
      {selectedOrder && (
        <div className="admin-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header"><div className="header-left"><h2>Order Details</h2><span className="modal-order-id">#{String(selectedOrder.id ?? selectedOrder._id).toUpperCase()}</span></div><button className="admin-modal-close" onClick={() => setSelectedOrder(null)}>✕</button></div>
            <div className="admin-modal-content">
              <div className="modal-status-bar"><div className="status-group"><span className="label">Current Status</span><span className={`status-badge ${(selectedOrder.status || '').toLowerCase().replace(/\s/g, '-')}`}>{selectedOrder.status || "Pending"}</span></div><div className="date-group"><span className="label">Date Placed</span><span className="value">{formatDateSafe(getOrderCreatedDate(selectedOrder))}</span></div></div>
              <div className="divider"></div>
              <div className="info-grid-row">
                <div className="info-col"><span className="label">Customer</span><span className="value bold">{getCustomerName(selectedOrder)}</span></div>
                <div className="info-col"><span className="label">Contact</span><span className="value">{selectedOrder.phone || 'N/A'}</span></div>
                <div className="info-col"><span className="label">Payment</span><span className="value">{getOrderPaymentMethod(selectedOrder)}</span>{getOrderPaymentMethod(selectedOrder) !== "COD" && <span className="sub-value">Ref: {getOrderPaymentRef(selectedOrder) || 'N/A'}</span>}</div>
              </div>
              <div className="address-display-card"><div className="icon">📍</div><div className="text"><span className="label">Delivery Address</span><p>{formatAddressString(parseAddress(selectedOrder.address))}</p></div></div>
              <div className="order-items-section">{(Array.isArray(selectedOrder.items) ? selectedOrder.items : JSON.parse(selectedOrder.items || '[]')).map((item, idx) => (<div key={idx} className="order-item-row"><img src={getItemImage(item)} alt="" onError={(e) => e.target.src = '/placeholder.png'} /><div className="item-info"><span>{item.name}</span></div><div>x{item.quantity}</div><div>₱{(item.price * item.quantity).toLocaleString()}</div></div>))}</div>
            </div>
            <div className="admin-modal-footer">
              <div className="modal-footer-total"><span>Total Amount</span><span className="grand-total">₱{getOrderTotal(selectedOrder).toLocaleString()}</span></div>
              <div className="modal-actions-bar single-action">
                {(() => {
                  const customerId = getOrderCustomerId(selectedOrder);
                  return customerId ? (
                    <button className="action-btn message" onClick={() => { 
                      setChatMessageInput(`Hi ${getCustomerName(selectedOrder)}, regarding Order #${String(selectedOrder.id ?? selectedOrder._id).slice(-6)}: `); 
                      setSelectedOrder(null); 
                      handleOpenChat({ id: customerId, name: getCustomerName(selectedOrder) }); 
                    }}>💬 Message Customer</button>
                  ) : <button className="action-btn message disabled" style={{ opacity: 0.5, cursor: 'not-allowed' }} onClick={() => toast.warning("Guest orders cannot be messaged.")}>🚫 Guest Order</button>;
                })()}
                {(() => {
                  const s = (selectedOrder.status || '').toLowerCase();
                  const orderId = selectedOrder.id ?? selectedOrder._id;
                  if (s.includes('delivered')) return <div className="completion-message">✨ Complete</div>;
                  if (s.includes('shipped')) return <button className="action-btn delivered full-width" onClick={() => handleStatusChange(orderId, 'Delivered')}>✅ Delivered</button>;
                  if (s.includes('processing')) return <button className="action-btn shipped full-width" onClick={() => handleStatusChange(orderId, 'Shipped')}>🚚 Shipped</button>;
                  return <button className="action-btn processing full-width" onClick={() => handleStatusChange(orderId, 'Processing')}>⚙️ Processing</button>;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
