<<<<<<< HEAD
/* src/components/CartPage.js */
import React, { useContext, useState, useEffect, useCallback } from 'react';
import { ShopContext } from '../context/ShopContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './CartPage.css';

const CartPage = () => {
  const { cart, removeFromCart, updateCartItemCount, isLoading, products } = useContext(ShopContext);
  const navigate = useNavigate();
  
  const [selectedItems, setSelectedItems] = useState(() => {
    const saved = sessionStorage.getItem('cart_selected_items');
    return saved ? JSON.parse(saved) : [];
  });

  const getProductImage = (item) => {
      if (item.image) return item.image;
      let imgs = item.images;
      if (typeof imgs === 'string') {
          try { imgs = JSON.parse(imgs); } catch(e) { imgs = []; }
      }
      if (Array.isArray(imgs) && imgs.length > 0) return imgs[0];
      return '/placeholder.png';
  };

  const isItemSoldOut = useCallback((cartItem) => {
    const freshProduct = products.find(p => 
        String(p.id) === String(cartItem.id) || 
        String(p._id) === String(cartItem.id)
    );
    if (!freshProduct) return true;
    return (freshProduct.quantity || 0) <= 0;
  }, [products]);

  // Sync selection with available items
  useEffect(() => {
    if (isLoading) return;
    const saved = sessionStorage.getItem('cart_selected_items');
    
    if (cart.length > 0 && saved === null) {
        const availableItems = cart
            .filter(item => !isItemSoldOut(item))
            .map(item => item.id || item._id);
        setSelectedItems(availableItems);
    } 
  }, [cart, isLoading, isItemSoldOut]); 

  // Save selection
  useEffect(() => {
    if (isLoading) return;
    sessionStorage.setItem('cart_selected_items', JSON.stringify(selectedItems));
    
    if (cart.length > 0) {
        setSelectedItems(prevSelected => {
            const validSelection = prevSelected.filter(id => {
                const item = cart.find(c => (c.id || c._id) === id);
                return item && !isItemSoldOut(item);
            });
            return validSelection.length === prevSelected.length ? prevSelected : validSelection;
        });
    }
  }, [selectedItems, cart, isLoading, isItemSoldOut]);

  const toggleSelect = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleSelectAll = () => {
    const availableItems = cart.filter(item => !isItemSoldOut(item)).map(i => i.id || i._id);
    if (selectedItems.length === availableItems.length) {
      setSelectedItems([]); 
    } else {
      setSelectedItems(availableItems); 
    }
  };

  const selectedTotal = cart
    .filter(item => selectedItems.includes(item.id || item._id))
    .reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);

  const handleCheckout = () => {
    const validItemsToBuy = cart.filter(item => {
        const id = item.id || item._id;
        return selectedItems.includes(id) && !isItemSoldOut(item);
    });

    if (validItemsToBuy.length === 0) {
        toast.error("Please select available items to checkout.");
        return;
    }

    navigate('/checkout', { 
      state: { 
        checkoutItems: validItemsToBuy, 
        summaryTotal: selectedTotal 
      } 
    });
  };

  // --- SKELETON LOADING STATE ---
  if (isLoading) {
    return (
      <div className="cart-page">
        <div className="cart-header">
            {/* Keeping the header text visible or you can skeletonize it too */}
            <h1>Your Shopping Cart</h1>
        </div>
        <div className="cart-container">
            {/* Left Column: Skeleton Items */}
            <div className="cart-items-section">
                {/* Generate 3 fake items for the loading look */}
                {[1, 2, 3].map((n) => (
                    <div key={n} className="cart-item skeleton-row" style={{ alignItems: 'center', gap: '20px', padding: '20px' }}>
                        {/* Checkbox Placeholder */}
                        <div className="skeleton-box" style={{ width: '20px', height: '20px', borderRadius: '4px' }}></div>
                        
                        {/* Image Placeholder */}
                        <div className="skeleton-box cart-sk-img" style={{ width: '80px', height: '80px', borderRadius: '12px' }}></div>
                        
                        {/* Text Details Placeholder */}
                        <div style={{ flex: 1 }}>
                            <div className="skeleton-box cart-sk-title" style={{ width: '60%', height: '20px', marginBottom: '10px' }}></div>
                            <div className="skeleton-box cart-sk-price" style={{ width: '30%', height: '16px' }}></div>
                        </div>
                        
                        {/* Quantity Handler Placeholder */}
                        <div className="skeleton-box cart-sk-qty" style={{ width: '80px', height: '32px', borderRadius: '30px' }}></div>
                    </div>
                ))}
            </div>

            {/* Right Column: Skeleton Summary */}
            <div className="cart-summary">
                <div className="skeleton-box" style={{ width: '150px', height: '28px', marginBottom: '25px', margin: '0 auto' }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <div className="skeleton-box" style={{ width: '100px', height: '16px' }}></div>
                    <div className="skeleton-box" style={{ width: '40px', height: '16px' }}></div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', borderTop: '2px dashed #eee', paddingTop: '20px' }}>
                    <div className="skeleton-box" style={{ width: '120px', height: '24px' }}></div>
                    <div className="skeleton-box" style={{ width: '80px', height: '24px' }}></div>
                </div>
                
                <div className="skeleton-box" style={{ width: '100%', height: '54px', borderRadius: '50px', marginTop: '25px' }}></div>
            </div>
        </div>
      </div>
    );
  }

  const allAvailableCount = cart.filter(item => !isItemSoldOut(item)).length;
  const isAllSelected = allAvailableCount > 0 && selectedItems.length === allAvailableCount;

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1>Your Shopping Cart</h1>
      </div>

      <div className="cart-container">
        {cart.length === 0 ? (
          <div className="empty-cart-section">
            <div className="empty-cart-icon">🛍️</div>
            <h2>Your cart is currently empty</h2>
            <p>Looks like you haven't added any beautiful items yet.</p>
            <button className="start-shopping-btn" onClick={() => navigate('/shop')}>
              Start Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items-section">
              <div className="cart-item select-all-header" style={{ marginBottom: '10px', padding: '15px 20px' }}>
                 <div className="cart-checkbox-wrapper">
                    <input 
                      type="checkbox" 
                      className="cart-checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                    />
                 </div>
                 <span style={{ fontWeight: 600, color: '#555', marginLeft: '10px' }}>
                    Select All ({cart.length} items)
                 </span>
              </div>

              {cart.map((item) => {
                const itemId = item.id || item._id;
                const imgSrc = getProductImage(item);
                const soldOut = isItemSoldOut(item); 

                return (
                  <div key={itemId} className={`cart-item ${selectedItems.includes(itemId) ? 'selected' : ''} ${soldOut ? 'sold-out-row' : ''}`}>
                    <button 
                      className="remove-btn" 
                      onClick={() => removeFromCart(itemId)}
                      title="Remove Item"
                    >
                      ✕
                    </button>

                    <div className="cart-checkbox-wrapper">
                      <input 
                        type="checkbox" 
                        className="cart-checkbox"
                        checked={selectedItems.includes(itemId)}
                        onChange={() => toggleSelect(itemId)}
                        disabled={soldOut} 
                        style={soldOut ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
                      />
                    </div>

                    <div className="cart-image-wrapper">
                      <img 
                        src={imgSrc} 
                        alt={item.name} 
                        className="cart-item-image" 
                        onError={(e) => {e.target.src = '/placeholder.png'}} 
                        style={soldOut ? { filter: 'grayscale(100%)' } : {}}
                      />
                      {soldOut && <span className="cart-sold-out-badge">SOLD OUT</span>}
                    </div>

                    <div className="cart-item-details">
                      <h3 style={soldOut ? { color: '#999' } : {}}>{item.name}</h3>
                      <p className="cart-item-price">₱{Number(item.price).toLocaleString()}</p>
                      {soldOut && <small style={{color:'red', fontWeight:'bold'}}>Out of Stock</small>}
                    </div>

                    <div className={`cart-count-handler ${soldOut ? 'disabled' : ''}`}>
                      <button 
                        onClick={() => updateCartItemCount(Number(item.quantity) - 1, itemId)}
                        disabled={soldOut}
                      >-</button>
                      <span className="qty-display">{item.quantity}</span>
                      <button 
                        onClick={() => updateCartItemCount(Number(item.quantity) + 1, itemId)}
                        disabled={soldOut}
                      >+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cart-summary">
              <h2>Order Summary</h2>
              <div className="summary-row">
                <span>Selected Items:</span>
                <span>{selectedItems.length}</span>
              </div>
              <div className="summary-row total">
                <span>Total Payment</span> 
                <span>₱{selectedTotal.toLocaleString()}</span>
              </div>
              
              <button 
                className="checkout-btn" 
                onClick={handleCheckout} 
                disabled={selectedItems.length === 0}
              >
                Checkout ({selectedItems.length})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

=======
/* src/components/CartPage.js */
import React, { useContext, useState, useEffect, useCallback } from 'react';
import { ShopContext } from '../context/ShopContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './CartPage.css';

const CartPage = () => {
  const { cart, removeFromCart, updateCartItemCount, isLoading, products } = useContext(ShopContext);
  const navigate = useNavigate();
  
  const [selectedItems, setSelectedItems] = useState(() => {
    const saved = sessionStorage.getItem('cart_selected_items');
    return saved ? JSON.parse(saved) : [];
  });

  const getProductImage = (item) => {
      if (item.image) return item.image;
      let imgs = item.images;
      if (typeof imgs === 'string') {
          try { imgs = JSON.parse(imgs); } catch(e) { imgs = []; }
      }
      if (Array.isArray(imgs) && imgs.length > 0) return imgs[0];
      return '/placeholder.png';
  };

  const isItemSoldOut = useCallback((cartItem) => {
    const freshProduct = products.find(p => 
        String(p.id) === String(cartItem.id) || 
        String(p._id) === String(cartItem.id)
    );
    if (!freshProduct) return true;
    return (freshProduct.quantity || 0) <= 0;
  }, [products]);

  // Sync selection with available items
  useEffect(() => {
    if (isLoading) return;
    const saved = sessionStorage.getItem('cart_selected_items');
    
    if (cart.length > 0 && saved === null) {
        const availableItems = cart
            .filter(item => !isItemSoldOut(item))
            .map(item => item.id || item._id);
        setSelectedItems(availableItems);
    } 
  }, [cart, isLoading, isItemSoldOut]); 

  // Save selection
  useEffect(() => {
    if (isLoading) return;
    sessionStorage.setItem('cart_selected_items', JSON.stringify(selectedItems));
    
    if (cart.length > 0) {
        setSelectedItems(prevSelected => {
            const validSelection = prevSelected.filter(id => {
                const item = cart.find(c => (c.id || c._id) === id);
                return item && !isItemSoldOut(item);
            });
            return validSelection.length === prevSelected.length ? prevSelected : validSelection;
        });
    }
  }, [selectedItems, cart, isLoading, isItemSoldOut]);

  const toggleSelect = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleSelectAll = () => {
    const availableItems = cart.filter(item => !isItemSoldOut(item)).map(i => i.id || i._id);
    if (selectedItems.length === availableItems.length) {
      setSelectedItems([]); 
    } else {
      setSelectedItems(availableItems); 
    }
  };

  const selectedTotal = cart
    .filter(item => selectedItems.includes(item.id || item._id))
    .reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);

  const handleCheckout = () => {
    const validItemsToBuy = cart.filter(item => {
        const id = item.id || item._id;
        return selectedItems.includes(id) && !isItemSoldOut(item);
    });

    if (validItemsToBuy.length === 0) {
        toast.error("Please select available items to checkout.");
        return;
    }

    navigate('/checkout', { 
      state: { 
        checkoutItems: validItemsToBuy, 
        summaryTotal: selectedTotal 
      } 
    });
  };

  // --- SKELETON LOADING STATE ---
  if (isLoading) {
    return (
      <div className="cart-page">
        <div className="cart-header">
            {/* Keeping the header text visible or you can skeletonize it too */}
            <h1>Your Shopping Cart</h1>
        </div>
        <div className="cart-container">
            {/* Left Column: Skeleton Items */}
            <div className="cart-items-section">
                {/* Generate 3 fake items for the loading look */}
                {[1, 2, 3].map((n) => (
                    <div key={n} className="cart-item skeleton-row" style={{ alignItems: 'center', gap: '20px', padding: '20px' }}>
                        {/* Checkbox Placeholder */}
                        <div className="skeleton-box" style={{ width: '20px', height: '20px', borderRadius: '4px' }}></div>
                        
                        {/* Image Placeholder */}
                        <div className="skeleton-box cart-sk-img" style={{ width: '80px', height: '80px', borderRadius: '12px' }}></div>
                        
                        {/* Text Details Placeholder */}
                        <div style={{ flex: 1 }}>
                            <div className="skeleton-box cart-sk-title" style={{ width: '60%', height: '20px', marginBottom: '10px' }}></div>
                            <div className="skeleton-box cart-sk-price" style={{ width: '30%', height: '16px' }}></div>
                        </div>
                        
                        {/* Quantity Handler Placeholder */}
                        <div className="skeleton-box cart-sk-qty" style={{ width: '80px', height: '32px', borderRadius: '30px' }}></div>
                    </div>
                ))}
            </div>

            {/* Right Column: Skeleton Summary */}
            <div className="cart-summary">
                <div className="skeleton-box" style={{ width: '150px', height: '28px', marginBottom: '25px', margin: '0 auto' }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <div className="skeleton-box" style={{ width: '100px', height: '16px' }}></div>
                    <div className="skeleton-box" style={{ width: '40px', height: '16px' }}></div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', borderTop: '2px dashed #eee', paddingTop: '20px' }}>
                    <div className="skeleton-box" style={{ width: '120px', height: '24px' }}></div>
                    <div className="skeleton-box" style={{ width: '80px', height: '24px' }}></div>
                </div>
                
                <div className="skeleton-box" style={{ width: '100%', height: '54px', borderRadius: '50px', marginTop: '25px' }}></div>
            </div>
        </div>
      </div>
    );
  }

  const allAvailableCount = cart.filter(item => !isItemSoldOut(item)).length;
  const isAllSelected = allAvailableCount > 0 && selectedItems.length === allAvailableCount;

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1>Your Shopping Cart</h1>
      </div>

      <div className="cart-container">
        {cart.length === 0 ? (
          <div className="empty-cart-section">
            <div className="empty-cart-icon">🛍️</div>
            <h2>Your cart is currently empty</h2>
            <p>Looks like you haven't added any beautiful items yet.</p>
            <button className="start-shopping-btn" onClick={() => navigate('/shop')}>
              Start Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items-section">
              <div className="cart-item select-all-header" style={{ marginBottom: '10px', padding: '15px 20px' }}>
                 <div className="cart-checkbox-wrapper">
                    <input 
                      type="checkbox" 
                      className="cart-checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                    />
                 </div>
                 <span style={{ fontWeight: 600, color: '#555', marginLeft: '10px' }}>
                    Select All ({cart.length} items)
                 </span>
              </div>

              {cart.map((item) => {
                const itemId = item.id || item._id;
                const imgSrc = getProductImage(item);
                const soldOut = isItemSoldOut(item); 

                return (
                  <div key={itemId} className={`cart-item ${selectedItems.includes(itemId) ? 'selected' : ''} ${soldOut ? 'sold-out-row' : ''}`}>
                    <button 
                      className="remove-btn" 
                      onClick={() => removeFromCart(itemId)}
                      title="Remove Item"
                    >
                      ✕
                    </button>

                    <div className="cart-checkbox-wrapper">
                      <input 
                        type="checkbox" 
                        className="cart-checkbox"
                        checked={selectedItems.includes(itemId)}
                        onChange={() => toggleSelect(itemId)}
                        disabled={soldOut} 
                        style={soldOut ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
                      />
                    </div>

                    <div className="cart-image-wrapper">
                      <img 
                        src={imgSrc} 
                        alt={item.name} 
                        className="cart-item-image" 
                        onError={(e) => {e.target.src = '/placeholder.png'}} 
                        style={soldOut ? { filter: 'grayscale(100%)' } : {}}
                      />
                      {soldOut && <span className="cart-sold-out-badge">SOLD OUT</span>}
                    </div>

                    <div className="cart-item-details">
                      <h3 style={soldOut ? { color: '#999' } : {}}>{item.name}</h3>
                      <p className="cart-item-price">₱{Number(item.price).toLocaleString()}</p>
                      {soldOut && <small style={{color:'red', fontWeight:'bold'}}>Out of Stock</small>}
                    </div>

                    <div className={`cart-count-handler ${soldOut ? 'disabled' : ''}`}>
                      <button 
                        onClick={() => updateCartItemCount(Number(item.quantity) - 1, itemId)}
                        disabled={soldOut}
                      >-</button>
                      <span className="qty-display">{item.quantity}</span>
                      <button 
                        onClick={() => updateCartItemCount(Number(item.quantity) + 1, itemId)}
                        disabled={soldOut}
                      >+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cart-summary">
              <h2>Order Summary</h2>
              <div className="summary-row">
                <span>Selected Items:</span>
                <span>{selectedItems.length}</span>
              </div>
              <div className="summary-row total">
                <span>Total Payment</span> 
                <span>₱{selectedTotal.toLocaleString()}</span>
              </div>
              
              <button 
                className="checkout-btn" 
                onClick={handleCheckout} 
                disabled={selectedItems.length === 0}
              >
                Checkout ({selectedItems.length})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

>>>>>>> 46f177dc8ce17a0f72dc7182eb1b2842c55e7a13
export default CartPage;