import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import './Navbar.css';
import logo from '../assets/logo.png'; 
import { API_URL } from '../config';

const Navbar = () => {
  const { cart, wishlist, setSearchQuery, user } = useContext(ShopContext);
  const [searchInput, setSearchInput] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [isAdmin, setIsAdmin] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [hasNotification, setHasNotification] = useState(false);
  const [lastReadMsg, setLastReadMsg] = useState(""); 
  const [chatContext, setChatContext] = useState(null); 

  const chatEndRef = useRef(null);

  // --- HELPER: Get Valid Customer ID ---
  const getValidCustomerId = (user) => {
    if (!user) return null;
    
    const userId = user.id || user.uid;
    
    // Block invalid IDs
    if (!userId || userId === 'undefined' || userId === 'null' || userId === '' || userId === '0' || userId === 0) {
      console.error('[NAVBAR CHAT] Invalid user ID:', userId);
      return null;
    }
    
    return userId;
  };

  // --- 1. CHECK ADMIN STATUS ---
  useEffect(() => {
    const checkAdminStatus = async () => {
        if (!user) { setIsAdmin(false); return; }
        
        const adminEmails = ['likhathabi@admin.com'];
        if (adminEmails.includes(user.email)) { 
          setIsAdmin(true); 
          setShowChat(false); 
          return;
        }

        try {
            const userId = getValidCustomerId(user);
            if (!userId) return;

            const response = await fetch(`${API_URL}/api/users/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  uid: userId, 
                  email: user.email, 
                  displayName: user.displayName 
                })
            });
            const userData = await response.json();
            if (userData && (userData.is_admin === 1 || userData.is_admin === '1' || userData.is_admin === true)) {
                setIsAdmin(true);
                setShowChat(false);
            }
        } catch (error) { 
          console.error('[NAVBAR] Admin check error:', error);
          setIsAdmin(false); 
        }
    };
    checkAdminStatus();
  }, [user]);

  // --- 2. LISTEN FOR NAVIGATION WITH ORDER DATA ---
  useEffect(() => {
    if (location.state && location.state.openChatWithOrder) {
        setShowChat(true);
        setChatContext(location.state.openChatWithOrder);
        window.history.replaceState({}, document.title);
    }
  }, [location]);

  // --- 3. LOGIC TO CLEAR NOTIFICATIONS ---
  useEffect(() => {
    if (showChat && chatHistory.length > 0) {
        const lastMsg = chatHistory[chatHistory.length - 1];
        const msgId = lastMsg.text + lastMsg.time;
        setLastReadMsg(msgId);
        setHasNotification(false);
    }
  }, [showChat, chatHistory]);

  // --- 4. FETCH CHAT (With Validation) ---
  const fetchChat = useCallback(async () => {
    if (!user || isAdmin) return;

    const userId = getValidCustomerId(user);
    if (!userId) {
      console.warn('[NAVBAR CHAT] Cannot fetch chat - invalid user ID');
      return;
    }

    try {
        // Cache busting + valid user ID
        const response = await fetch(`${API_URL}/api/chat/history/${userId}?t=${Date.now()}`);
        
        if (!response.ok) {
          console.error('[NAVBAR CHAT] Fetch failed:', response.status);
          return;
        }

        const data = await response.json();
        
        if (Array.isArray(data)) {
            setChatHistory(data);
            
            if (data.length > 0) {
                const lastMsg = data[data.length - 1];
                const lastMsgId = lastMsg.text + lastMsg.time;

                if (lastMsg.sender === 'admin' && !showChat && lastMsgId !== lastReadMsg) {
                    setHasNotification(true);
                }
            }
        }
    } catch (error) { 
      console.error("[NAVBAR CHAT] Fetch error:", error); 
    }
  }, [user, showChat, isAdmin, lastReadMsg]);

  useEffect(() => {
    let interval;
    if (user && !isAdmin) {
        const userId = getValidCustomerId(user);
        if (userId) {
          fetchChat();
          interval = setInterval(fetchChat, 3000);
        }
    }
    return () => { 
        if (interval) clearInterval(interval);
        setChatHistory([]);
    };
  }, [user, isAdmin, fetchChat]);

  useEffect(() => {
    if (showChat && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, showChat]);

  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchInput(query);
    setSearchQuery(query);
    if (query.trim().length > 0 && location.pathname !== '/shop') {
      navigate('/shop');
    }
  };

  const handleToggleChat = () => {
    if (!user) { 
      alert("Please login to chat."); 
      navigate('/login'); 
      return; 
    }

    const userId = getValidCustomerId(user);
    if (!userId) {
      alert("Invalid user session. Please log in again.");
      navigate('/login');
      return;
    }

    setShowChat(!showChat);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userId = getValidCustomerId(user);
    if (!userId) {
      alert("Cannot send message - invalid user session");
      return;
    }
    
    const newMessage = { 
      sender: 'customer', 
      text: chatInput, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    
    setChatHistory(prev => [...prev, newMessage]);
    setChatInput("");
    setLastReadMsg(newMessage.text + newMessage.time);

    try {
        const response = await fetch(`${API_URL}/api/chat/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              customer_id: userId,  // Use validated ID
              customer_name: user.displayName || user.email, 
              customer_email: user.email, 
              message_text: newMessage.text, 
              sender_type: 'customer' 
            })
        });

        if (!response.ok) {
          console.error('[NAVBAR CHAT] Send failed:', response.status);
        }
    } catch (error) { 
      console.error("[NAVBAR CHAT] Send error:", error); 
    }
  };

  const getContextImage = (item) => {
      if(!item) return '/placeholder.png';
      if(item.image) return item.image;
      if(item.images && item.images.length > 0) return item.images[0];
      return '/placeholder.png';
  }

  const wishlistCount = (wishlist || []).length;
  const cartCount = (cart || []).length;

  return (
    <>
    <nav className="navbar">
      <Link to="/" className="nav-logo"><img src={logo} alt="Likha-Habi" /></Link>
      
      <ul className="nav-menu">
        <li className="nav-item"><NavLink to="/shop" className="nav-link">Shop All</NavLink></li>
        <li className="nav-item"><NavLink to="/category/crochet" className="nav-link">Crochet</NavLink></li>
        <li className="nav-item"><NavLink to="/category/ribbons" className="nav-link">Ribbons</NavLink></li>
        <li className="nav-item"><NavLink to="/about" className="nav-link">About</NavLink></li>
      </ul>
      
      <div className="nav-icons">
        <div className="search-box desktop-search">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search..." className="search-input" value={searchInput} onChange={handleInputChange} />
        </div>

        <button className="nav-icon-btn mobile-search-btn" onClick={() => setShowMobileSearch(!showMobileSearch)}>🔍</button>

        <NavLink to="/wishlist" className="icon-link">
          ♥ {wishlistCount > 0 && <span className="nav-badge">{wishlistCount}</span>}
        </NavLink>
        
        {!isAdmin && (
            <button className="nav-icon-btn" onClick={handleToggleChat} title="Chat" style={{position:'relative'}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3e2723" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                {hasNotification && <span className="nav-badge chat-badge">!</span>}
            </button>
        )}

        <NavLink to="/cart" className="icon-link">
          🛒 {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
        </NavLink>
        
        <NavLink to={user ? "/account" : "/login"} className="icon-link user-profile-nav">
          {user && user.photoURL ? <img src={user.photoURL} alt="Profile" className="nav-profile-img" /> : <span className="icon">👤</span>}
        </NavLink>
      </div>

      {showMobileSearch && (
        <div className="mobile-search-bar">
          <div className="mobile-search-container">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search products..." className="search-input" value={searchInput} onChange={handleInputChange} autoFocus />
            <button className="close-search" onClick={() => setShowMobileSearch(false)}>✕</button>
          </div>
        </div>
      )}
    </nav>

    {showChat && !isAdmin && (
        <div className="customer-chat-widget">
            <div className="chat-widget-header">
              <div className="header-profile">
                <div className="header-avatar">L</div>
                <div className="header-text">
                    <span className="shop-name">Likha't Habi Support</span>
                    <span className="online-status">● Active Now</span>
                </div>
              </div>
              <div className="header-actions">
                 <button className="minimize-btn" onClick={() => setShowChat(false)}>_</button>
                 <button className="close-widget-btn" onClick={() => {setShowChat(false); setChatContext(null);}}>✕</button>
              </div>
            </div>

            <div className="chat-widget-body">
                {chatContext && (
                    <div className="chat-context-card">
                        <div className="context-img">
                            <img src={getContextImage(chatContext.items?.[0] || chatContext)} alt="Context" onError={(e)=>e.target.src='/placeholder.png'} />
                        </div>
                        <div className="context-info">
                            <span className="context-label">Talking about Order #{chatContext.id}</span>
                            <span className="context-price">Total: ₱{chatContext.total_amount || chatContext.total}</span>
                            <span className="context-status">{chatContext.status}</span>
                        </div>
                        <button className="context-send-btn" onClick={() => {
                            setChatInput(`Hi, I have a question about Order #${chatContext.id}`);
                        }}>Send</button>
                    </div>
                )}

                {chatHistory.length === 0 && !chatContext && (
                  <div className="chat-welcome">
                    <div className="welcome-icon">👋</div>
                    <p>Welcome! How can we help you with your order today?</p>
                  </div>
                )}

                {chatHistory.map((msg, i) => (
                  <div key={i} className={`message-row ${msg.sender === 'customer' ? 'mine' : 'theirs'}`}>
                    <div className="message-bubble">
                        <p>{msg.text}</p>
                        <span className="message-time">{msg.time}</span>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef}></div>
            </div>

            <form className="chat-widget-footer" onSubmit={handleSendMessage}>
                <button type="button" className="attach-btn">+</button>
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)} 
                />
                <button type="submit" className="send-btn">➤</button>
            </form>
        </div>
    )}
    </>
  );
};

export default Navbar;