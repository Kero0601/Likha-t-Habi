/* src/components/CheckoutPage.js */
import React, { useContext, useState, useEffect } from 'react';
import { ShopContext } from '../context/ShopContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import './CheckoutPage.css';

// Import your QR Code images
import gcashQr from '../assets/GCash-MyQR-26012026132934.PNG.jpg'; 
import mayaQr from '../assets/Maya QR.jpg'; 

const CheckoutPage = () => {
  const { user, saveProfile, placeOrder, isLoading, products } = useContext(ShopContext);
  const navigate = useNavigate();
  const location = useLocation(); 

  const itemsToBuy = location.state?.checkoutItems || []; 

  // --- STATES ---
  const [addressForm, setAddressForm] = useState({
    fullName: '', phone: '', street: '',
    region: '', province: '', city: '', barangay: '',
    postalCode: '', label: 'Home', isDefault: false,
    isLocationPinned: false 
  });

  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [refNumber, setRefNumber] = useState(''); 
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [isEditing, setIsEditing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState(null); 
  
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // --- DATA LOADING ---
  useEffect(() => {
    if (user) {
      let newData = {
        fullName: user.displayName || '', 
        phone: user.phone || '',
        street: '', region: '', province: '', city: '', barangay: '', postalCode: '', 
        label: 'Home', isLocationPinned: false
      };

      if (user.address) {
        let raw = user.address;
        try {
            let parsed = typeof raw === 'object' ? raw : JSON.parse(raw);
            if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch (e) {} }
            
            if (typeof parsed === 'object' && parsed !== null) {
                newData = { ...newData, ...parsed, isLocationPinned: true };
                if (newData.street) setIsEditing(false);
            } 
        } catch (e) {
            newData.street = raw; 
        }
      }
      setAddressForm(prev => ({ ...prev, ...newData }));
    }
  }, [user]);

  const totalAmount = itemsToBuy.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
  const shippingFee = 50; 
  const grandTotal = totalAmount + shippingFee;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const renderAddressText = () => {
      const { street, barangay, city, province, region, postalCode } = addressForm;
      return [street, barangay, city, province, region, postalCode].filter(Boolean).join(', ');
  };

  const handleOpenMap = () => setShowMapModal(true);
  
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported.");
    const loadingToast = toast.loading("Locating you...");

    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        setMapCoordinates({ lat: latitude, lng: longitude });

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            toast.dismiss(loadingToast);

            if (data && data.address) {
                const addr = data.address;
                setAddressForm(prev => ({
                    ...prev,
                    street: addr.road || addr.house_number || '',
                    barangay: addr.quarter || addr.neighbourhood || '',
                    city: addr.city || addr.town || addr.municipality || '',
                    province: addr.province || addr.state || '',
                    region: addr.region || 'Philippines',
                    postalCode: addr.postcode || '', 
                    isLocationPinned: true
                }));
                toast.success("Address Auto-Filled! 📍");
            }
        } catch (error) { toast.dismiss(loadingToast); toast.error("Could not fetch address."); }
    }, () => { toast.dismiss(loadingToast); toast.error("Unable to retrieve location."); });
  };

  const handleConfirmLocation = () => {
    setAddressForm(prev => ({ ...prev, isLocationPinned: true }));
    setShowMapModal(false);
  };

  const getMapSrc = () => {
    if (mapCoordinates) return `https://maps.google.com/maps?q=${mapCoordinates.lat},${mapCoordinates.lng}&t=&z=17&ie=UTF8&iwloc=&output=embed`;
    const { street, city, province } = addressForm;
    const query = `${street} ${city} ${province} Philippines`.trim() || "Philippines";
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!addressForm.fullName || !addressForm.phone || !addressForm.street) return toast.error("Please fill in required fields.");
    setIsSaving(true);
    const success = await saveProfile(JSON.stringify(addressForm), addressForm.phone);
    setIsSaving(false);
    if (success) { setIsEditing(false); toast.success("Address Saved!"); }
  };

  const validateStock = () => {
    for (const item of itemsToBuy) {
        const freshProduct = products.find(p => String(p.id) === String(item.id) || String(p._id) === String(item.id));
        if (freshProduct) {
            const currentStock = freshProduct.quantity || 0;
            if (currentStock <= 0) {
                toast.error(`Sorry, '${item.name}' is now SOLD OUT!`, { toastId: 'checkout-soldout' });
                return false;
            }
            if (item.quantity > currentStock) {
                toast.error(`'${item.name}' only has ${currentStock} item(s) left.`, { toastId: 'checkout-stock-limit' });
                return false;
            }
        }
    }
    return true;
  };

  const handlePlaceOrderClick = () => {
    if (!addressForm.street) return toast.error("Please add a delivery address.");
    if (!validateStock()) return;

    if (paymentMethod === 'COD') {
        processOrder();
    } else {
        setRefNumber(''); 
        setShowPaymentModal(true);
    }
  };

  const processOrder = async () => {
    if (paymentMethod !== 'COD' && !refNumber.trim()) {
        return toast.error("Please enter the Reference Number.");
    }
    if (!validateStock()) return;

    setIsPlacingOrder(true);
    setShowPaymentModal(false);

    // ✅ UPDATED: Construct order items with SPECIFIC variant details
    const cleanCartItems = itemsToBuy.map(item => ({
        id: item.id || item._id, 
        name: item.name, 
        price: item.price, 
        quantity: item.quantity, 
        // Save the specific variation name
        variation: item.variation || 'Standard',
        // ✅ PRIORITY: Save the specific image variant used in the cart
        image: item.image || item.images?.[0] 
    }));

    const success = await placeOrder({ 
        items: cleanCartItems, 
        total: grandTotal, 
        address: addressForm, 
        phone: addressForm.phone,
        paymentMethod: paymentMethod, 
        paymentReference: refNumber,   
        payment_reference: refNumber
    });

    if (success) { 
        setOrderSuccess(true);
        setTimeout(() => { navigate('/account'); }, 3000);
    } else {
        setIsPlacingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <div className="lh-checkout-wrapper">
        <div className="lh-checkout-container">
          <div className="skeleton-header"></div>
          <div className="lh-grid">
            <div className="lh-col-left">
              <div className="lh-card skeleton-card"><div className="skeleton-title-bar"></div><div className="skeleton-row lg"></div><div className="skeleton-row md"></div><div className="skeleton-row sm"></div></div>
            </div>
            <div className="lh-col-right">
              <div className="lh-card summary skeleton-card"><div className="skeleton-title-bar"></div><div className="skeleton-row sm"></div><div className="skeleton-row sm"></div><div className="skeleton-divider"></div><div className="skeleton-row lg"></div><div className="skeleton-btn big"></div></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (itemsToBuy.length === 0 && !isPlacingOrder && !orderSuccess) {
      return (
        <div className="lh-empty-cart">
            <h2>No Items Selected</h2>
            <button className="lh-text-btn" onClick={() => navigate('/cart')}>Back to Cart</button>
        </div>
      );
  }

  return (
    <div className="lh-checkout-wrapper">
      <div className="lh-checkout-container">
        <div className="lh-header"><h1>Checkout</h1></div>

        <div className="lh-grid">
            <div className="lh-col-left">
                {/* ADDRESS CARD */}
                <div className="lh-card fade-up">
                    <div className="lh-card-header">
                        <h3>Delivery Address</h3>
                        {!isEditing && <button className="lh-text-btn" onClick={() => setIsEditing(true)}>Edit</button>}
                    </div>
                    {isEditing ? (
                        <form onSubmit={handleSaveAddress} className="lh-form fade-in">
                            <div className="lh-row">
                                <input type="text" placeholder="Full Name" value={addressForm.fullName} name="fullName" onChange={handleInputChange} className="lh-input" />
                                <input type="text" placeholder="Phone Number" value={addressForm.phone} name="phone" onChange={handleInputChange} className="lh-input" />
                            </div>
                            <div className="lh-row">
                                <input type="text" placeholder="Street / House No." value={addressForm.street} name="street" onChange={handleInputChange} className="lh-input lg" />
                            </div>
                            <div className="lh-row">
                                <input type="text" placeholder="Barangay" value={addressForm.barangay} name="barangay" onChange={handleInputChange} className="lh-input" />
                                <input type="text" placeholder="City / Municipality" value={addressForm.city} name="city" onChange={handleInputChange} className="lh-input" />
                            </div>
                            <div className="lh-row">
                                <input type="text" placeholder="Province" value={addressForm.province} name="province" onChange={handleInputChange} className="lh-input" />
                                <input type="text" placeholder="Zip Code" value={addressForm.postalCode} name="postalCode" onChange={handleInputChange} className="lh-input sm" />
                            </div>
                            <div className={`lh-map-box ${addressForm.isLocationPinned ? 'active' : ''}`} onClick={handleOpenMap}>
                                {addressForm.isLocationPinned ? <span>📍 Location Pinned via Map</span> : <span>+ Pin Location on Map (Optional)</span>}
                            </div>
                            <div className="lh-form-footer" style={{ display: 'flex', gap: '10px' }}>
                                <button type="submit" className="lh-save-btn" disabled={isSaving}>Save Address</button>
                                {user.address && (
                                    <button type="button" className="lh-btn-secondary" onClick={() => setIsEditing(false)} style={{ background: '#f5f5f5', border: '1px solid #ddd', color: '#666', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                                )}
                            </div>
                        </form>
                    ) : (
                        <div className="lh-view-mode fade-in">
                            <div className="lh-user-info"><strong>{addressForm.fullName}</strong> <span>| {addressForm.phone}</span></div>
                            <p className="lh-address-text">{renderAddressText()}</p>
                        </div>
                    )}
                </div>

                {/* ✅ ITEMS CARD (Updated to show specific variants) */}
                <div className="lh-card fade-up delay-1">
                    <h3>Order Items</h3>
                    <div className="lh-items">
                        {itemsToBuy.map((item, index) => (
                            <div key={`${item.id}-${index}`} className="lh-item-row">
                                {/* ✅ DISPLAY: Use the specific variant image if available */}
                                <img 
                                    src={item.image || item.images?.[0] || '/placeholder.png'} 
                                    alt={item.name} 
                                    onError={(e) => e.target.src = '/placeholder.png'}
                                />
                                <div className="lh-item-info">
                                    <h4>{item.name}</h4>
                                    {/* ✅ DISPLAY: Show variation name or fallback */}
                                    <p>{item.variation || 'Standard'}</p>
                                </div>
                                <div className="lh-item-price">
                                    <span className="qty">x{item.quantity}</span> 
                                    ₱{(item.price * item.quantity).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* PAYMENT METHOD CARD */}
                <div className="lh-card fade-up delay-2">
                    <h3>Payment Method</h3>
                    <div className="payment-options">
                        <div className={`payment-option ${paymentMethod === 'COD' ? 'active' : ''}`} onClick={() => setPaymentMethod('COD')}>
                            <span className="radio-circle"></span><span className="pay-label">💵 Cash on Delivery (COD)</span>
                        </div>
                        <div className={`payment-option ${paymentMethod === 'GCash' ? 'active' : ''}`} onClick={() => setPaymentMethod('GCash')}>
                            <span className="radio-circle"></span><span className="pay-label">🔵 GCash</span>
                        </div>
                        <div className={`payment-option ${paymentMethod === 'Maya' ? 'active' : ''}`} onClick={() => setPaymentMethod('Maya')}>
                            <span className="radio-circle"></span><span className="pay-label">🟢 Maya</span>
                        </div>
                    </div>
                </div>

                {/* MOBILE ONLY: VISIBLE BREAKDOWN */}
                <div className="lh-card mobile-breakdown fade-up delay-2">
                    <h3>Payment Details</h3>
                    <div className="lh-sum-row"><span>Merchandise Subtotal</span> <span>₱{totalAmount.toLocaleString()}</span></div>
                    <div className="lh-sum-row"><span>Shipping Fee</span> <span>₱{shippingFee}</span></div>
                    <div className="lh-divider"></div>
                    <div className="lh-sum-row total"><span>Total Payment</span> <span>₱{grandTotal.toLocaleString()}</span></div>
                </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lh-col-right">
                <div className="lh-card summary fade-up delay-2">
                    <h3>Order Summary</h3>
                    <div className="lh-sum-row"><span>Subtotal</span> <span>₱{totalAmount.toLocaleString()}</span></div>
                    <div className="lh-sum-row"><span>Shipping</span> <span>₱{shippingFee}</span></div>
                    <div className="lh-divider"></div>
                    <div className="lh-sum-row total"><span>Total</span> <span>₱{grandTotal.toLocaleString()}</span></div>
                    
                    <button className={`lh-place-order-btn ${isPlacingOrder ? 'loading' : ''}`} onClick={handlePlaceOrderClick} disabled={isEditing || isPlacingOrder}>
                        {isPlacingOrder ? <div className="btn-spinner"></div> : "Place Order"}
                    </button>
                </div>
            </div>
        </div>

        {/* --- MODALS (Payment & Map) --- */}
        {showPaymentModal && (
            <div className="lh-modal-overlay">
                <div className="lh-modal payment-modal">
                    <div className="lh-modal-head"><h3>Pay via {paymentMethod}</h3><button onClick={() => setShowPaymentModal(false)}>✕</button></div>
                    <div className="qr-container">
                        {paymentMethod === 'GCash' ? (
                            <div className="qr-image-wrapper"><img src={gcashQr} alt="GCash QR" className="qr-real-image" /></div>
                        ) : paymentMethod === 'Maya' ? (
                            <div className="qr-image-wrapper"><img src={mayaQr} alt="Maya QR" className="qr-real-image" /></div>
                        ) : (
                            <div className={`qr-placeholder ${paymentMethod}`}><div className="qr-code-art"></div><span>{paymentMethod}</span></div>
                        )}
                        <div className="merchant-details">
                            <p className="merchant-label">Send payment to:</p>
                            <div className="account-info">
                                <h2>Aeron J.</h2>
                                <h1>{paymentMethod === 'Maya' ? '09514137416' : '09678222521'}</h1> 
                            </div>
                            <div className="amount-box"><span>Total Amount:</span><strong>₱{grandTotal.toLocaleString()}</strong></div>
                        </div>
                        <div className="ref-input-group">
                            <label>Reference No. / Transaction ID</label>
                            <input type="text" placeholder="e.g. 100456789012" value={refNumber} onChange={(e) => setRefNumber(e.target.value)} className="lh-input ref-input"/>
                            <small>Please enter the reference number from your receipt.</small>
                        </div>
                    </div>
                    <div className="lh-modal-foot">
                        <button className="lh-cancel-btn" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                        <button className="lh-confirm-btn" onClick={processOrder} disabled={!refNumber.trim()} style={{ opacity: !refNumber.trim() ? 0.5 : 1 }}>I Have Paid</button>
                    </div>
                </div>
            </div>
        )}

        {orderSuccess && (
            <div className="order-success-overlay">
                <div className="success-card bounce-in">
                    <div className="checkmark-wrapper"><svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/><path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg></div>
                    <h2>Order Placed!</h2>
                    <p>Method: {paymentMethod}</p>
                    <p className="redirect-text">Redirecting to your orders...</p>
                </div>
            </div>
        )}

        {showMapModal && (
            <div className="lh-modal-overlay">
                <div className="lh-modal">
                    <div className="lh-modal-head"><h3>Confirm Location</h3><button onClick={() => setShowMapModal(false)}>✕</button></div>
                    <div className="lh-map-wrapper"><div className="lh-pin-overlay">📍</div><iframe title="Map" src={getMapSrc()} width="100%" height="100%" frameBorder="0"></iframe></div>
                    <div className="lh-modal-foot"><button className="lh-gps-btn" onClick={handleUseCurrentLocation}>🧭 Use My Location</button><button className="lh-confirm-btn" onClick={handleConfirmLocation}>Confirm</button></div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
