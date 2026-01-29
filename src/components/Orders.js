import React, { useContext, useEffect, useState } from 'react';
import { ShopContext } from '../context/ShopContext';
import { useNavigate } from 'react-router-dom';
import './Orders.css';

const Orders = () => {
  const { user, fetchUserOrders, isLoading, products } = useContext(ShopContext);
  const [orders, setOrders] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) navigate('/login');
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (user) {
        const loadData = async () => {
            setIsFetching(true);
            const data = await fetchUserOrders();
            // Sort by newest first
            const sorted = data ? data.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date)) : [];
            setOrders(sorted);
            setIsFetching(false);
        };
        loadData();
    }
  }, [user, fetchUserOrders]);

  const getStatusColor = (status) => {
      switch(status?.toLowerCase()) {
          case 'pending': return 'orange';
          case 'processing': return 'blue';
          case 'shipped': return 'purple';
          case 'delivered': return 'green';
          case 'cancelled': return 'red';
          default: return 'gray';
      }
  };

  const formatAddress = (addr) => {
    if (!addr) return 'N/A';
    try {
        let parsed = typeof addr === 'string' ? JSON.parse(addr) : addr;
        if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch (e) {}
        }
        if (typeof parsed === 'object' && parsed !== null) {
            return `${parsed.street || ''}, ${parsed.barangay || ''}, ${parsed.city || ''}, ${parsed.province || ''}`;
        }
        return String(addr);
    } catch { return String(addr); }
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
  };

  const getItemImage = (item) => {
    if (item.image) return item.image;
    if (item.images && item.images.length > 0) return item.images[0];
    
    if (products && products.length > 0) {
        const foundProduct = products.find(p => 
            String(p.id) === String(item.id) || 
            String(p._id) === String(item.id)
        );
        if (foundProduct) {
            return foundProduct.images?.[0] || foundProduct.image;
        }
    }
    return '/placeholder.png'; 
  };

  // --- SKELETON LOADING RENDER ---
  if (isLoading || isFetching) {
    return (
      <div className="lh-orders-wrapper">
        <div className="lh-orders-container">
          <div className="lh-page-header">
              <h1>My Orders</h1>
              <p>Track your recent purchases</p>
          </div>
          <div className="lh-orders-grid">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="lh-order-card skeleton-card">
                {/* Top: ID + Status Pill */}
                <div className="card-top">
                  <div className="skeleton sk-id"></div>
                  <div className="skeleton sk-badge"></div>
                </div>
                {/* Mid: Date + Items */}
                <div className="card-mid">
                  <div className="skeleton sk-date"></div>
                  <div className="skeleton sk-items"></div>
                  <div className="skeleton sk-ref"></div>
                </div>
                {/* Bot: Total */}
                <div className="card-bot">
                  <div className="skeleton sk-label"></div>
                  <div className="skeleton sk-price"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN RENDER ---
  return (
    <div className="lh-orders-wrapper">
      <div className="lh-orders-container">
        
        <div className="lh-page-header">
            <h1>My Orders</h1>
            <p>Track your recent purchases</p>
        </div>

        {orders.length === 0 ? (
            <div className="lh-empty-state">
                <span style={{fontSize: '50px', marginBottom: '10px'}}>🛍️</span>
                <h2>No orders yet</h2>
                <p>Looks like you haven't bought anything yet.</p>
                <button onClick={() => navigate('/shop')} className="lh-btn-primary">Start Shopping</button>
            </div>
        ) : (
            <div className="lh-orders-grid">
                {orders.map((order) => {
                    const refId = order.payment_reference || order.paymentReference;
                    const isNonCod = order.payment_method !== 'COD';

                    return (
                        <div 
                            key={order.id || order._id} 
                            className="lh-order-card fade-up"
                            onClick={() => handleOrderClick(order)}
                        >
                            <div className="card-top">
                                <span className="order-id">#{String(order.id || order._id).slice(-6).toUpperCase()}</span>
                                <span className={`status-pill ${getStatusColor(order.status)}`}>{order.status || 'Pending'}</span>
                            </div>
                            
                            <div className="card-mid">
                                <div className="date-row">
                                    <span>📅 {new Date(order.created_at || order.date).toLocaleDateString()}</span>
                                </div>
                                <div className="item-preview">
                                    <span className="item-count">
                                        {Array.isArray(order.items) ? order.items.length : (JSON.parse(order.items || '[]').length)} Items
                                    </span>
                                    <span className="pay-method-badge">{order.payment_method || 'COD'}</span>
                                </div>
                                {isNonCod && refId && (
                                    <div className="ref-preview">
                                        Ref: <strong>{refId}</strong>
                                    </div>
                                )}
                            </div>

                            <div className="card-bot">
                                <span className="total-label">Total</span>
                                <span className="total-amount">₱{Number(order.total_amount || order.total).toLocaleString()}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        {/* --- ORDER DETAILS MODAL --- */}
        {selectedOrder && (
            <div className="lh-modal-overlay" onClick={() => setSelectedOrder(null)}>
                <div className="lh-modal order-modal" onClick={(e) => e.stopPropagation()}>
                    
                    <div className="modal-header">
                        <div>
                            <h2>Order Details</h2>
                            <span className="modal-id">#{String(selectedOrder.id || selectedOrder._id).toUpperCase()}</span>
                        </div>
                        <button className="modal-close" onClick={() => setSelectedOrder(null)}>✕</button>
                    </div>

                    <div className="modal-content-scroll">
                        <div className="modal-section">
                            <div className={`status-banner ${getStatusColor(selectedOrder.status)}`}>
                                {selectedOrder.status || 'Pending'}
                            </div>
                        </div>

                        <div className="modal-section">
                            <label>Items Purchased</label>
                            <div className="modal-items-list">
                                {(Array.isArray(selectedOrder.items) ? selectedOrder.items : JSON.parse(selectedOrder.items || '[]')).map((item, idx) => {
                                    const imgSrc = getItemImage(item);
                                    return (
                                        <div key={idx} className="modal-item">
                                            <img 
                                                src={imgSrc} 
                                                alt={item.name} 
                                                onError={(e) => e.target.src = '/placeholder.png'}
                                            />
                                            <div className="modal-item-info">
                                                <h4>{item.name}</h4>
                                                <p>{item.variation || 'Standard'} x {item.quantity}</p>
                                            </div>
                                            <span className="modal-item-price">
                                                ₱{(item.price * item.quantity).toLocaleString()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="modal-info-grid">
                            <div className="info-box">
                                <label>Delivery Address</label>
                                <p>{formatAddress(selectedOrder.address)}</p>
                            </div>

                            <div className="info-box">
                                <label>Payment Information</label>
                                <p>
                                    <span style={{fontWeight:'600'}}>{selectedOrder.payment_method || 'COD'}</span>
                                    {(selectedOrder.payment_reference || selectedOrder.paymentReference) && (
                                        <span className="ref-tag" style={{ display: 'block', color: '#8d5e48', fontSize: '0.9em', marginTop: '2px' }}>
                                            Ref: {selectedOrder.payment_reference || selectedOrder.paymentReference}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="modal-totals">
                            <div className="total-row"><span>Subtotal</span> <span>₱{Number(selectedOrder.total_amount || selectedOrder.total).toLocaleString()}</span></div>
                            <div className="total-row"><span>Shipping</span> <span>Free</span></div>
                            <div className="total-row grand"><span>Total</span> <span>₱{Number(selectedOrder.total_amount || selectedOrder.total).toLocaleString()}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Orders;