import React, { useContext, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import './ProductPage.css';

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, addToCart, toggleWishlist, wishlist } = useContext(ShopContext);
  
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Helper for IDs
  const getItemId = (item) => String(item?.id || item?._id || '');

  const getSafeImages = (prod) => {
    if (!prod) return [];
    let imgs = prod.images;
    if (typeof imgs === 'string') {
        try { imgs = JSON.parse(imgs); } catch(e) { imgs = []; }
    }
    if (Array.isArray(imgs) && imgs.length > 0) return imgs;
    return prod.image ? [prod.image] : ['/placeholder.png'];
  };

  useEffect(() => {
    // Robust find using the helper
    const found = products.find((p) => getItemId(p) === id);
    if (found) {
        setProduct(found);
        const validImages = getSafeImages(found);
        setSelectedImage(prev => prev || validImages[0]);
    }
  }, [id, products]);

  // --- STATE CHECKS ---
  const isSoldOut = product ? (product.quantity || 0) <= 0 : false;
  const maxStock = product ? (product.quantity || 0) : 0;

  // FIXED: Check Wishlist Status using helper
  const isLiked = product && wishlist.some((item) => getItemId(item) === getItemId(product));

  // --- HANDLERS ---
  const handleAddToCart = () => {
    if (!product || isSoldOut) return;
    addToCart(product, quantity); 
  };

  const handleBuyNow = () => {
    if (!product || isSoldOut) return;
    const itemToBuy = { ...product, quantity: quantity };
    navigate('/checkout', { 
      state: { checkoutItems: [itemToBuy], summaryTotal: product.price * quantity } 
    });
  };

  const handleToggleWishlist = () => {
    if (!product) return;
    toggleWishlist(product);
  };

  if (!product) return <div className="loading-container"><div className="spinner"></div></div>;

  const galleryImages = getSafeImages(product);

  return (
    <div className="product-page">
      <div className="container">
        
        <Link to='/shop' className="back-btn">
            <span className="arrow">←</span> Back to Shop
        </Link>

        <div className="product-layout">
            <div className="product-gallery">
                <div className="main-image-frame" onClick={() => setIsLightboxOpen(true)}>
                    <img src={selectedImage || '/placeholder.png'} alt={product.name} className="main-img" onError={(e) => e.target.src = '/placeholder.png'}/>
                    <span className="zoom-hint">🔍 Click to Zoom</span>
                </div>
                <div className="thumbnails">
                    {galleryImages.map((img, index) => (
                    <img key={index} src={img} alt={`view-${index}`} className={`thumb ${selectedImage === img ? 'active' : ''}`} onClick={() => setSelectedImage(img)} onError={(e) => e.target.src = '/placeholder.png'}/>
                    ))}
                </div>
            </div>

            <div className="product-details">
                <span className="product-category">{product.category || 'Collection'}</span>
                <h1 className="product-title">{product.name}</h1>
                
                <div className="price-row">
                    <span className="main-price">₱{Number(product.price).toLocaleString()}</span>
                    {isSoldOut ? (
                        <span className="stock-badge sold-out">Sold Out</span>
                    ) : (
                        <span className="stock-badge in-stock">In Stock: {product.quantity}</span>
                    )}
                </div>

                <p className="description">{product.description || "Handcrafted with care."}</p>
                <div className="divider"></div>

                <div className="purchase-section">
                    <div className={`qty-wrapper ${isSoldOut ? 'disabled' : ''}`}>
                        <span className="label">Quantity</span>
                        <div className="qty-control">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={isSoldOut}>−</button>
                            <span className="qty-val">{isSoldOut ? 0 : quantity}</span>
                            <button onClick={() => setQuantity(q => Math.min(maxStock, q + 1))} disabled={isSoldOut || quantity >= maxStock}>+</button>
                        </div>
                    </div>

                    <div className="action-row">
                        <button className="btn-add-cart" onClick={handleAddToCart} disabled={isSoldOut}>
                            {isSoldOut ? "Out of Stock" : "Add to Cart"}
                        </button>
                        <button className="btn-buy-now" onClick={handleBuyNow} disabled={isSoldOut}>
                            Buy Now
                        </button>
                        
                        {/* THE HEART BUTTON */}
                        <button 
                            className={`btn-wishlist ${isLiked ? 'active' : ''}`} 
                            onClick={handleToggleWishlist}
                            title={isLiked ? "Remove from Wishlist" : "Add to Wishlist"}
                        >
                            {isLiked ? '♥' : '♡'}
                        </button>
                    </div>

                    <div className="trust-badges">
                        <span>🛡️ Secure Checkout</span>
                        <span>⚡ Fast Shipping</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {isLightboxOpen && (
        <div className="lightbox-overlay" onClick={() => setIsLightboxOpen(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setIsLightboxOpen(false)}>✕</button>
            <img src={selectedImage} alt={product.name} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPage;