<<<<<<< HEAD
/* src/components/ProductPage.js */
import React, { useContext, useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import './ProductPage.css';

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { products, addToCart, toggleWishlist, wishlist, user } = useContext(ShopContext);

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getItemId = (item) => String(item?.id || item?._id || '');

  const getSafeImages = (prod) => {
    if (!prod) return [];
    let imgs = prod.images;
    if (typeof imgs === 'string') {
      try { imgs = JSON.parse(imgs); } catch (e) { imgs = []; }
    }
    if (Array.isArray(imgs) && imgs.length > 0) return imgs;
    return prod.image ? [prod.image] : ['/placeholder.png'];
  };

  useEffect(() => {
    setIsLoading(true);

    if (products.length > 0) {
      const found = products.find((p) => getItemId(p) === id);
      if (found) {
        setProduct(found);
        const validImages = getSafeImages(found);
        setSelectedImage(validImages[0]);
      }
      setIsLoading(false);
    } else {
      const timer = setTimeout(() => setIsLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [id, products]);

  const goLogin = () => {
    navigate('/login', { state: { from: location.pathname + location.search } });
  };

  // ✅ UPDATED: Pass the specific selected image to the Cart
  const handleAddToCart = () => {
    if (!product || (product.quantity || 0) <= 0) return;

    if (!user) return goLogin();

    // Create a product object that includes the SPECIFIC selected image
    const itemWithVariant = { 
      ...product, 
      image: selectedImage // This ensures the chosen variant is saved
    };

    const ok = addToCart(itemWithVariant, quantity);
    if (!ok) goLogin();
  };

  // ✅ UPDATED: Pass the specific selected image to Buy Now / Checkout
  const handleBuyNow = () => {
    if (!product || (product.quantity || 0) <= 0) return;

    if (!user) return goLogin();

    // Create a product object that includes the SPECIFIC selected image
    const itemToBuy = { 
      ...product, 
      quantity: quantity, 
      image: selectedImage // Pass the variant image to checkout
    };

    navigate('/checkout', {
      state: {
        checkoutItems: [itemToBuy],
        summaryTotal: Number(product.price || 0) * Number(quantity || 1),
      }
    });
  };

  // ✅ Wishlist (login required)
  const handleToggleWishlist = () => {
    if (!product) return;

    if (!user) return goLogin();

    const ok = toggleWishlist(product);
    if (!ok) goLogin();
  };

  // --- SKELETON LOADING VIEW ---
  if (isLoading || (products.length === 0 && !product)) {
    return (
      <div className="product-page">
        <div className="container">
          <div className="skeleton-loader">
            <div className="sk-gallery">
              <div className="skeleton-box sk-image"></div>
              <div className="sk-thumbnails">
                <div className="skeleton-box sk-thumb"></div>
                <div className="skeleton-box sk-thumb"></div>
                <div className="skeleton-box sk-thumb"></div>
              </div>
            </div>

            <div className="sk-details">
              <div className="skeleton-box sk-category"></div>
              <div className="skeleton-box sk-title"></div>
              <div className="skeleton-box sk-price"></div>
              <div className="skeleton-box sk-desc"></div>
              <div className="skeleton-box sk-actions"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-page">
        <div className="container">
          <h2>Product not found</h2>
        </div>
      </div>
    );
  }

  const isSoldOut = (product.quantity || 0) <= 0;
  const maxStock = (product.quantity || 0);
  const isLiked = wishlist.some((item) => getItemId(item) === getItemId(product));
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
              <img
                src={selectedImage || '/placeholder.png'}
                alt={product.name}
                className="main-img"
                onError={(e) => e.target.src = '/placeholder.png'}
              />
              <span className="zoom-hint">🔍 Click to Zoom</span>
            </div>

            <div className="thumbnails">
              {galleryImages.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`view-${index}`}
                  className={`thumb ${selectedImage === img ? 'active' : ''}`}
                  onClick={() => setSelectedImage(img)}
                  onError={(e) => e.target.src = '/placeholder.png'}
                />
              ))}
            </div>
          </div>

          <div className="product-details">
            <span className="product-category">{product.category || 'Collection'}</span>
            <h1 className="product-title">{product.name}</h1>

            <div className="price-row">
              <span className="main-price">₱{Number(product.price || 0).toLocaleString()}</span>
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
=======
/* src/components/ProductPage.js */
import React, { useContext, useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import './ProductPage.css';

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { products, addToCart, toggleWishlist, wishlist, user } = useContext(ShopContext);

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getItemId = (item) => String(item?.id || item?._id || '');

  const getSafeImages = (prod) => {
    if (!prod) return [];
    let imgs = prod.images;
    if (typeof imgs === 'string') {
      try { imgs = JSON.parse(imgs); } catch (e) { imgs = []; }
    }
    if (Array.isArray(imgs) && imgs.length > 0) return imgs;
    return prod.image ? [prod.image] : ['/placeholder.png'];
  };

  useEffect(() => {
    setIsLoading(true);

    if (products.length > 0) {
      const found = products.find((p) => getItemId(p) === id);
      if (found) {
        setProduct(found);
        const validImages = getSafeImages(found);
        setSelectedImage(validImages[0]);
      }
      setIsLoading(false);
    } else {
      const timer = setTimeout(() => setIsLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [id, products]);

  const goLogin = () => {
    navigate('/login', { state: { from: location.pathname + location.search } });
  };

  // ✅ UPDATED: Pass the specific selected image to the Cart
  const handleAddToCart = () => {
    if (!product || (product.quantity || 0) <= 0) return;

    if (!user) return goLogin();

    // Create a product object that includes the SPECIFIC selected image
    const itemWithVariant = { 
      ...product, 
      image: selectedImage // This ensures the chosen variant is saved
    };

    const ok = addToCart(itemWithVariant, quantity);
    if (!ok) goLogin();
  };

  // ✅ UPDATED: Pass the specific selected image to Buy Now / Checkout
  const handleBuyNow = () => {
    if (!product || (product.quantity || 0) <= 0) return;

    if (!user) return goLogin();

    // Create a product object that includes the SPECIFIC selected image
    const itemToBuy = { 
      ...product, 
      quantity: quantity, 
      image: selectedImage // Pass the variant image to checkout
    };

    navigate('/checkout', {
      state: {
        checkoutItems: [itemToBuy],
        summaryTotal: Number(product.price || 0) * Number(quantity || 1),
      }
    });
  };

  // ✅ Wishlist (login required)
  const handleToggleWishlist = () => {
    if (!product) return;

    if (!user) return goLogin();

    const ok = toggleWishlist(product);
    if (!ok) goLogin();
  };

  // --- SKELETON LOADING VIEW ---
  if (isLoading || (products.length === 0 && !product)) {
    return (
      <div className="product-page">
        <div className="container">
          <div className="skeleton-loader">
            <div className="sk-gallery">
              <div className="skeleton-box sk-image"></div>
              <div className="sk-thumbnails">
                <div className="skeleton-box sk-thumb"></div>
                <div className="skeleton-box sk-thumb"></div>
                <div className="skeleton-box sk-thumb"></div>
              </div>
            </div>

            <div className="sk-details">
              <div className="skeleton-box sk-category"></div>
              <div className="skeleton-box sk-title"></div>
              <div className="skeleton-box sk-price"></div>
              <div className="skeleton-box sk-desc"></div>
              <div className="skeleton-box sk-actions"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-page">
        <div className="container">
          <h2>Product not found</h2>
        </div>
      </div>
    );
  }

  const isSoldOut = (product.quantity || 0) <= 0;
  const maxStock = (product.quantity || 0);
  const isLiked = wishlist.some((item) => getItemId(item) === getItemId(product));
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
              <img
                src={selectedImage || '/placeholder.png'}
                alt={product.name}
                className="main-img"
                onError={(e) => e.target.src = '/placeholder.png'}
              />
              <span className="zoom-hint">🔍 Click to Zoom</span>
            </div>

            <div className="thumbnails">
              {galleryImages.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`view-${index}`}
                  className={`thumb ${selectedImage === img ? 'active' : ''}`}
                  onClick={() => setSelectedImage(img)}
                  onError={(e) => e.target.src = '/placeholder.png'}
                />
              ))}
            </div>
          </div>

          <div className="product-details">
            <span className="product-category">{product.category || 'Collection'}</span>
            <h1 className="product-title">{product.name}</h1>

            <div className="price-row">
              <span className="main-price">₱{Number(product.price || 0).toLocaleString()}</span>
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
>>>>>>> 592f8bc1311febf4d01e70c805d9e340229663f2
