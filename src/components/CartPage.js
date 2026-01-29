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

  // --- FIX 1: Wrap helper in useCallback to satisfy ESLint ---
  const isItemSoldOut = useCallback((cartItem) => {
    const freshProduct = products.find(p => 
        String(p.id) === String(cartItem.id) || 
        String(p._id) === String(cartItem.id)
    );
    // If product not found, assume sold out or invalid
    if (!freshProduct) return true;
    return (freshProduct.quantity || 0) <= 0;
  }, [products]);

  // --- FIX 2: Add isItemSoldOut to dependency array ---
  useEffect(() => {
    if (isLoading) return;
    const saved = sessionStorage.getItem('cart_selected_items');
    
    // Auto-select ONLY available items on first load
    if (cart.length > 0 && saved === null) {
        const availableItems = cart
            .filter(item => !isItemSoldOut(item)) // Filter out sold out
            .map(item => item.id || item._id);
            
        setSelectedItems(availableItems);
    } 
  }, [cart, isLoading, isItemSoldOut]); 

  // --- FIX 3: Remove unused variable & add dependency ---
  useEffect(() => {
    if (isLoading) return;
    sessionStorage.setItem('cart_selected_items', JSON.stringify(selectedItems));
    
    if (cart.length > 0) {
        setSelectedItems(prevSelected => {
            // Remove deleted items AND items that are now sold out
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

  const selectedTotal = cart
    .filter(item => selectedItems.includes(item.id || item._id))
    .reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);

  const handleCheckout = () => {
    // Double check that no sold out items are selected
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

  if (isLoading) {
    return (
      <div className="cart-page">
        <div className="cart-header"><h1>Your Shopping Cart</h1></div>
        <div className="cart-container">
            <div className="cart-items-section" style={{opacity:0.5}}>
                <p>Loading cart...</p>
            </div>
        </div>
      </div>
    );
  }

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
                <span>Total:</span>
                <span>₱{selectedTotal.toLocaleString()}</span>
              </div>
              
              <button 
                className="checkout-btn" 
                onClick={handleCheckout} 
                disabled={selectedItems.length === 0}
              >
                Checkout Now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartPage;