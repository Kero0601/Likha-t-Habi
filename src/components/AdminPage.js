import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { ShopContext } from '../context/ShopContext';
import { toast } from 'react-toastify';
import './AdminPage.css';

const AdminPage = () => {
  const { products, addProduct, updateProduct, deleteProduct, fetchAllOrders, updateOrderStatus, isLoading } = useContext(ShopContext);
  
  // Tabs
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeAdminTab') || 'inventory');
  
  // Data States
  const [orders, setOrders] = useState([]);
  const [conversations, setConversations] = useState([]); 
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
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

  // Edit/Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', category: 'Crochet', stock: '', description: '', images: [] });

  useEffect(() => { localStorage.setItem('activeAdminTab', activeTab); }, [activeTab]);

  // --- LOAD DATA ---
  const loadData = useCallback(async () => {
    setIsLoadingData(true);
    
    if (activeTab === 'orders') {
        const data = await fetchAllOrders();
        const sorted = data ? data.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date)) : [];
        setOrders(sorted);
    } else if (activeTab === 'messages') {
        try {
            const res = await fetch('http://localhost:5000/api/chat/conversations');
            const data = await res.json();
            setConversations(data);
        } catch (err) { console.error("Inbox Error", err); }
    }
    
    setIsLoadingData(false);
  }, [activeTab, fetchAllOrders]);

  useEffect(() => { loadData(); }, [activeTab, loadData]);

  // --- CHAT LOGIC ---
  const handleOpenChat = async (userObj) => {
    setActiveChatUser(userObj);
    if (activeTab !== 'messages') setActiveTab('messages'); 
    
    try {
        const res = await fetch(`http://localhost:5000/api/chat/history/${userObj.id}?side=admin`);
        const data = await res.json();
        setChatHistory(Array.isArray(data) ? data : []);
    } catch (err) { setChatHistory([]); }
  };

  useEffect(() => {
    let interval;
    if (activeChatUser) {
        interval = setInterval(async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/chat/history/${activeChatUser.id}?side=admin`);
                const data = await res.json();
                if (Array.isArray(data)) setChatHistory(data);
            } catch (err) {}
        }, 3000);
    }
    return () => clearInterval(interval);
  }, [activeChatUser]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMessageInput.trim()) return;
    
    const newMessage = { sender: 'admin', text: chatMessageInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatHistory(prev => [...prev, newMessage]);
    setChatMessageInput("");

    if(chatEndRef.current) {
        setTimeout(() => chatEndRef.current.scrollIntoView({ behavior: "smooth" }), 100);
    }

    try {
        await fetch('http://localhost:5000/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_id: activeChatUser.id,
                customer_name: activeChatUser.name,
                message_text: newMessage.text,
                sender_type: 'admin'
            })
        });
    } catch (err) { toast.error("Failed to send"); }
  };

  // --- HANDLERS ---
  const handleStatusChange = async (id, status) => { 
      if(await updateOrderStatus(id, status)) { 
          toast.success("Updated"); 
          loadData(); 
          if(selectedOrder?.id===id) setSelectedOrder(prev=>({...prev, status})); 
      }
  };

  const handleInputChange = (e) => { 
      const { name, value } = e.target; 
      setFormData({ ...formData, [name]: value }); 
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const processFile = (file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
    };
    try {
      const newImages = await Promise.all(files.map(processFile));
      setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
    } catch (error) { toast.error("Error processing images"); }
  };

  const removeImage = (index) => { 
      setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) })); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = { name: formData.name, category: formData.category, price: Number(formData.price), quantity: Number(formData.stock), description: formData.description, images: formData.images };
    try {
      if (isEditing) { 
          await updateProduct(editId, payload); 
          toast.success("Product updated"); 
          setIsEditing(false); 
          setEditId(null); 
          setActiveTab('inventory'); 
      } else { 
          await addProduct(payload); 
          toast.success("Product added");
          setActiveTab('inventory'); 
      }
      setFormData({ name: '', price: '', category: 'Crochet', stock: '', description: '', images: [] });
    } catch (error) { toast.error("Failed to save."); } finally { setIsSaving(false); }
  };

  const handleEdit = (p) => {
    setIsEditing(true); 
    setActiveTab('add-product'); 
    setEditId(p.id || p._id);
    let pImages = p.images; 
    if (typeof pImages === 'string') { try { pImages = JSON.parse(pImages); } catch(e) { pImages = []; } }
    setFormData({ name: p.name, price: p.price, category: p.category, stock: p.quantity || p.stock || 0, description: p.description || '', images: Array.isArray(pImages) ? pImages : [] });
  };

  const handleDelete = async (id) => { 
      if(window.confirm("Are you sure?")) await deleteProduct(id); 
  };
  
  // Helpers
  const parseAddress = (addr) => { try { return typeof addr==='string'?JSON.parse(addr):addr; } catch { return null; }};
  const getCustomerName = (o) => parseAddress(o.address)?.fullName || o.display_name || 'Guest';
  const getStatusColor = (s) => { const st=s?.toLowerCase()||''; if(st.includes('delivered'))return'ok'; if(st.includes('shipped'))return'purple'; if(st.includes('processing'))return'blue'; return'low'; };
  const getItemImage = (item) => { 
      if (item.image) return item.image;
      let imgs = item.images; if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch(e) {} }
      if (Array.isArray(imgs) && imgs.length > 0) return imgs[0];
      return '/placeholder.png'; 
  };
  
  const formatAddressString = (addrData) => { 
    if (!addrData) return 'N/A'; 
    if (typeof addrData === 'string') return addrData;
    const parts = [addrData.street, addrData.barangay, addrData.city, addrData.province, addrData.zip];
    return parts.filter(part => part && part.trim() !== '').join(', ');
  };

  const getOrderCustomerId = (order) => {
    const possibleIds = [order.customer_id, order.user_id, order.userId, order.uid];
    for (const id of possibleIds) {
      if (id && id !== 'undefined' && id !== 'null' && id !== '' && id !== '0' && id !== 0 && String(id) !== String(order.id)) { 
        return id;
      }
    }
    return null;
  };

  // Filter Logic
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredOrders = orders.filter(order => {
    const payMatch = filterPayment === 'All' || (order.payment_method || 'COD').toLowerCase().includes(filterPayment.toLowerCase());
    let dateMatch = true;
    if (filterDate) { const d = new Date(order.created_at || order.date); if(!isNaN(d)) dateMatch = d.toISOString().split('T')[0] === filterDate; }
    const searchMatch = order.id.toString().includes(orderSearchTerm) || getCustomerName(order).toLowerCase().includes(orderSearchTerm.toLowerCase());
    return payMatch && dateMatch && searchMatch;
  });

  // --- SKELETON COMPONENTS ---
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

  // --- STATS LOGIC ---
  const totalProducts = products.length;
  
  // FIX: Threshold includes exactly 5
  const lowStock = products.filter(p => {
    const qty = p.quantity !== undefined ? p.quantity : (p.stock || 0);
    return qty <= 5; 
  }).length;

  const totalValue = products.reduce((acc, p) => {
    const qty = p.quantity !== undefined ? p.quantity : (p.stock || 0);
    return acc + (Number(p.price) * Number(qty));
  }, 0);

  const isPageLoading = isLoading || isLoadingData;

  return (
    <div className="admin-wrapper">
      <aside className="admin-sidebar">
        <div className="admin-logo"><h1>Likha't Habi</h1><span className="admin-tag">ADMIN PANEL</span></div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab==='inventory'?'active':''}`} onClick={()=>setActiveTab('inventory')}>📊 Inventory</button>
          <button className={`nav-item ${activeTab==='add-product'?'active':''}`} onClick={()=>{setActiveTab('add-product'); setIsEditing(false); setFormData({ name: '', price: '', category: 'Crochet', stock: '', description: '', images: [] });}}>➕ Product</button>
          <button className={`nav-item ${activeTab==='orders'?'active':''}`} onClick={()=>setActiveTab('orders')}>🚚 Orders</button>
          <button className={`nav-item ${activeTab==='messages'?'active':''}`} onClick={()=>setActiveTab('messages')}>💬 Inbox</button>
        </nav>
      </aside>

      <main className="admin-main">
        {activeTab === 'inventory' && (
          <div className="tab-content fade-in">
            <header className="content-header"><h2>Inventory Overview</h2></header>
            
            <div className="stats-container">
              {isPageLoading ? (
                 <>
                   <div className="stat-card skeleton-stat"><div className="skeleton sk-icon-lg"></div><div className="stat-details"><div className="skeleton sk-text w-50"></div><div className="skeleton sk-text w-30"></div></div></div>
                   <div className="stat-card skeleton-stat"><div className="skeleton sk-icon-lg"></div><div className="stat-details"><div className="skeleton sk-text w-50"></div><div className="skeleton sk-text w-30"></div></div></div>
                   <div className="stat-card skeleton-stat"><div className="skeleton sk-icon-lg"></div><div className="stat-details"><div className="skeleton sk-text w-50"></div><div className="skeleton sk-text w-30"></div></div></div>
                 </>
              ) : (
                 <>
                   <div className="stat-card"><div className="stat-icon-wrapper">👜</div><div className="stat-details"><span className="stat-number">{totalProducts}</span><span className="stat-label">Listings</span></div></div>
                   <div className="stat-card"><div className="stat-icon-wrapper warning">⚠️</div><div className="stat-details"><span className="stat-number">{lowStock}</span><span className="stat-label">Low Stock</span></div></div>
                   <div className="stat-card"><div className="stat-icon-wrapper money">₱</div><div className="stat-details"><span className="stat-number">₱{totalValue.toLocaleString()}</span><span className="stat-label">Total Value</span></div></div>
                 </>
              )}
            </div>

            <div className="search-bar-wrapper">
                <input type="text" className="search-input" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>

            <div className="table-card">
                <table className="inventory-table">
                    <thead><tr><th>IMAGE</th><th>NAME</th><th>PRICE</th><th>STOCK</th><th>ACTIONS</th></tr></thead>
                    <tbody>
                        {isPageLoading ? (
                            [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                        ) : (
                            filteredProducts.map(p => {
                                const qty = p.quantity !== undefined ? p.quantity : (p.stock || 0);
                                const img = getItemImage(p);
                                const isLow = qty <= 5; // FIX: Threshold fixed
                                return (
                                  <tr key={p.id || p._id} className="inventory-row">
                                    <td><img src={img} alt="" className="table-thumb" onError={(e) => e.target.src='/placeholder.png'}/></td>
                                    <td className="product-name-cell">{p.name}</td>
                                    <td className="price-cell">₱{Number(p.price).toLocaleString()}</td>
                                    <td>
                                      <span className={`stock-pill ${isLow ? 'low' : 'ok'}`}>
                                        {qty <= 0 ? `Out of Stock (0)` : isLow ? `Low (${qty})` : `In Stock (${qty})`}
                                      </span>
                                    </td>
                                    <td className="actions-cell">
                                      <button className="icon-btn edit" onClick={() => handleEdit(p)}>✏️</button>
                                      <button className="icon-btn delete" onClick={() => handleDelete(p.id || p._id)}>🗑️</button>
                                    </td>
                                  </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* --- ADD PRODUCT TAB --- */}
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
                <div className="input-group"><label>Product Description</label><textarea name="description" className="description-input" placeholder="Describe the product..." value={formData.description} onChange={handleInputChange} rows="4"/></div>
                <div className="input-group"><label>Product Images</label><div className="file-upload-wrapper"><input type="file" onChange={handleImageUpload} id="file-upload" className="custom-file-input" accept="image/*" multiple /><label htmlFor="file-upload" className="file-upload-box"><span className="upload-icon">📷</span><span className="upload-text">Click to upload images</span><span className="upload-hint">Supports: JPG, PNG</span></label></div>
                    {formData.images.length > 0 && (<div className="image-gallery">{formData.images.map((img, index) => (<div key={index} className="gallery-item"><img src={img} alt="" /><button type="button" className="remove-btn" onClick={() => removeImage(index)}>×</button></div>))}</div>)}
                </div>
                <div className="form-actions"><button type="submit" className="btn-save" disabled={isSaving}>{isSaving ? 'Saving...' : (isEditing ? 'Update Product' : 'Add Product')}</button>{isEditing && (<button type="button" className="btn-cancel" onClick={() => { setIsEditing(false); setActiveTab('inventory'); }}>Cancel</button>)}</div>
              </form>
            </div>
          </div>
        )}

        {/* --- ORDERS TAB --- */}
        {activeTab === 'orders' && (
          <div className="tab-content fade-in">
             <header className="content-header">
                <h2>Order Queue</h2>
                <div className="filter-wrapper">
                    <input type="text" className="search-input order-search" placeholder="Search ID..." value={orderSearchTerm} onChange={(e)=>setOrderSearchTerm(e.target.value)} />
                    <input type="date" className="filter-date" value={filterDate} onChange={(e)=>setFilterDate(e.target.value)} />
                    <select className="filter-select" value={filterPayment} onChange={(e)=>setFilterPayment(e.target.value)}><option value="All">All</option><option value="COD">COD</option><option value="GCash">GCash</option><option value="Maya">Maya</option></select>
                </div>
             </header>
             <div className="table-card">
                <table className="inventory-table">
                    <thead><tr><th>ID</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
                    <tbody>
                        {isPageLoading ? (
                            [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                        ) : (
                            filteredOrders.map(o => (
                                <tr key={o.id} className="inventory-row clickable-row" onClick={() => setSelectedOrder(o)}>
                                    <td>#{o.id}</td><td>{new Date(o.created_at).toLocaleDateString()}</td><td>₱{o.total_amount}</td>
                                    <td><span className="payment-tag">{o.payment_method||'COD'}</span></td>
                                    <td><span className={`stock-pill ${getStatusColor(o.status)}`}>{o.status}</span></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
             </div>
          </div>
        )}

        {/* --- MESSAGES INBOX TAB --- */}
        {activeTab === 'messages' && (
            <div className={`tab-content fade-in chat-tab-container ${activeChatUser ? 'mobile-chat-active' : ''}`}>
                <div className="chat-sidebar">
                    <div className="chat-search-bar"><input type="text" placeholder="Search messages..." /></div>
                    <div className="chat-list-scroll">
                        {isPageLoading ? (
                            [...Array(5)].map((_, i) => <SkeletonCard key={i} />)
                        ) : conversations.length === 0 ? (
                            <div className="empty-inbox-placeholder"><span>📭</span><p>No messages found</p></div>
                        ) : (
                            conversations.map(conv => (
                                <div key={conv.id} className={`chat-list-item ${activeChatUser && activeChatUser.id === conv.customer_id ? 'active' : ''} ${!conv.is_read_by_admin ? 'unread' : ''}`} onClick={() => handleOpenChat({ id: conv.customer_id, name: conv.customer_name })}>
                                    <div className="chat-list-avatar" style={{backgroundColor: conv.is_read_by_admin ? '#f0f0f0' : '#fff3e0', color: conv.is_read_by_admin ? '#888' : '#e65100'}}>{conv.customer_name.charAt(0).toUpperCase()}</div>
                                    <div className="chat-list-info">
                                        <div className="chat-list-top"><span className="chat-list-name">{conv.customer_name}</span><span className="chat-list-time">{new Date(conv.last_message_at).toLocaleDateString([], {month:'short', day:'numeric'})}</span></div>
                                        <p className="chat-list-preview" style={{fontWeight: !conv.is_read_by_admin ? '600' : '400'}}>{conv.last_message}</p>
                                    </div>
                                    {!conv.is_read_by_admin && <div className="chat-unread-badge"></div>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="chat-main-area">
                    {activeChatUser ? (
                        <>
                            <div className="chat-main-header">
                                <div className="chat-header-left">
                                    <button className="mobile-back-btn" onClick={() => setActiveChatUser(null)}>←</button>
                                    <div className="chat-user-profile">
                                        <div className="chat-header-avatar">{activeChatUser.name.charAt(0).toUpperCase()}</div>
                                        <div><h3>{activeChatUser.name}</h3><span>Online</span></div>
                                    </div>
                                </div>
                                <button className="close-chat-btn desktop-only" onClick={() => setActiveChatUser(null)}>✕</button>
                            </div>
                            <div className="chat-main-messages">
                                {chatHistory.map((msg, i) => (
                                    <div key={i} className={`message-row ${msg.sender==='admin' ? 'mine' : 'theirs'}`}>
                                        <div className="message-bubble"><p>{msg.text}</p><span className="message-time">{msg.time}</span></div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                            <form className="chat-main-footer" onSubmit={handleSendChat}><input type="text" placeholder="Type a message..." value={chatMessageInput} onChange={(e) => setChatMessageInput(e.target.value)} /><button type="submit" className="send-message-btn">➤</button></form>
                        </>
                    ) : (
                        <div className="chat-empty-state"><span>💬</span><h3>Select a conversation</h3></div>
                    )}
                </div>
            </div>
        )}
      </main>

      {/* --- ORDER MODAL --- */}
      {selectedOrder && (
        <div className="admin-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="admin-modal" onClick={(e)=>e.stopPropagation()}>
             <div className="admin-modal-header">
                <div className="header-left"><h2>Order Details</h2><span className="modal-order-id">#{selectedOrder.id}</span></div>
                <button className="admin-modal-close" onClick={() => setSelectedOrder(null)}>✕</button>
             </div>
             <div className="admin-modal-content">
                <div className="modal-status-bar">
                    <div className="status-group"><span className="label">Current Status</span><span className={`status-badge ${selectedOrder.status.toLowerCase().replace(/\s/g, '-')}`}>{selectedOrder.status}</span></div>
                    <div className="date-group"><span className="label">Date Placed</span><span className="value">{new Date(selectedOrder.created_at).toLocaleDateString()}</span></div>
                </div>
                <div className="divider"></div>
                <div className="info-grid-row">
                    <div className="info-col"><span className="label">Customer</span><span className="value bold">{getCustomerName(selectedOrder)}</span></div>
                    <div className="info-col"><span className="label">Contact</span><span className="value">{selectedOrder.phone || 'N/A'}</span></div>
                    <div className="info-col"><span className="label">Payment</span><span className="value">{selectedOrder.payment_method || 'COD'}</span>{selectedOrder.payment_method !== 'COD' && <span className="sub-value">Ref: {selectedOrder.payment_reference || 'N/A'}</span>}</div>
                </div>
                <div className="address-display-card"><div className="icon">📍</div><div className="text"><span className="label">Delivery Address</span><p>{formatAddressString(parseAddress(selectedOrder.address))}</p></div></div>
                <div className="order-items-section">
                    {(Array.isArray(selectedOrder.items) ? selectedOrder.items : JSON.parse(selectedOrder.items || '[]')).map((item, idx) => (
                        <div key={idx} className="order-item-row"><img src={getItemImage(item)} alt=""/><div className="item-info"><span>{item.name}</span></div><div>x{item.quantity}</div><div>₱{(item.price * item.quantity).toLocaleString()}</div></div>
                    ))}
                </div>
             </div>
             <div className="admin-modal-footer">
                <div className="modal-footer-total"><span>Total Amount</span><span className="grand-total">₱{Number(selectedOrder.total_amount).toLocaleString()}</span></div>
                <div className="modal-actions-bar single-action">
                    {(() => {
                        // FIX: Use the helper to resolve ESLint warning
                        const customerId = getOrderCustomerId(selectedOrder);
                        if (customerId) {
                            return (
                                <button className="action-btn message" onClick={() => {
                                    setChatMessageInput(`Hi ${getCustomerName(selectedOrder)}, regarding Order #${selectedOrder.id}: `);
                                    setSelectedOrder(null); 
                                    handleOpenChat({ id: customerId, name: getCustomerName(selectedOrder) });
                                  }} title={`Message ${getCustomerName(selectedOrder)}`}>
                                    💬 Message Customer
                                </button>
                            );
                        } else {
                            return (
                                <button className="action-btn message disabled" style={{opacity: 0.5, cursor: 'not-allowed'}} onClick={() => toast.warning("Guest orders cannot be messaged.")}>
                                    🚫 Guest Order
                                </button>
                            );
                        }
                    })()}

                    {(() => {
                        const s = (selectedOrder.status || '').toLowerCase();
                        if (s.includes('delivered')) return <div className="completion-message">✨ Complete</div>;
                        else if (s.includes('shipped')) return <button className="action-btn delivered full-width" onClick={() => handleStatusChange(selectedOrder.id, 'Delivered')}>✅ Delivered</button>;
                        else if (s.includes('processing')) return <button className="action-btn shipped full-width" onClick={() => handleStatusChange(selectedOrder.id, 'Shipped')}>🚚 Shipped</button>;
                        else return <button className="action-btn processing full-width" onClick={() => handleStatusChange(selectedOrder.id, 'Processing')}>⚙️ Processing</button>;
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