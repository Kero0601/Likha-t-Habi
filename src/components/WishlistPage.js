<<<<<<< HEAD
import React, { useContext } from 'react';
import { ShopContext } from '../context/ShopContext';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './WishlistPage.css';

const WishlistPage = () => {
  const { wishlist, addToCart, toggleWishlist, isLoading } = useContext(ShopContext);

  // --- HELPER: Safely Get Image URL ---
  const getProductImage = (product) => {
      // 1. Check for legacy/single image property
      if (product.image) return product.image;
      
      let imgs = product.images;
      // 2. Handle if MySQL sent it as a string (JSON string)
      if (typeof imgs === 'string') {
          try { imgs = JSON.parse(imgs); } catch(e) { imgs = []; }
      }
      
      // 3. Return first image or placeholder
      if (Array.isArray(imgs) && imgs.length > 0) return imgs[0];
      
      return '/placeholder.png'; // Fallback
  };

  const renderSkeletons = () => {
    return Array(4).fill(0).map((_, i) => (
      <div key={i} className="product-card skeleton-card">
        <div className="skeleton-box wish-sk-img"></div>
        <div className="skeleton-info">
            <div className="skeleton-box wish-sk-title"></div>
            <div className="skeleton-box wish-sk-btn"></div>
        </div>
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="wishlist-page">
        <h2 className="section-title">Your Wishlist</h2>
        <div className="wishlist-grid">
            {renderSkeletons()}
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <h2 className="section-title">Your Wishlist</h2>
      
      {wishlist.length === 0 ? (
        <div className="empty-state">
           <div className="empty-icon">✨</div>
           <h3>Your wishlist is empty</h3>
           <Link to="/shop" className="btn-primary">Start Shopping</Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          {wishlist.map((product) => {
            const imageUrl = getProductImage(product);
            const productId = product.id || product._id;

            return (
              <div key={productId} className="product-card">
                <div className="image-wrapper">
                  <Link to={`/product/${productId}`}>
                      <img 
                        src={imageUrl} 
                        alt={product.name} 
                        onError={(e) => { e.target.src = '/placeholder.png'; }}
                      />
                  </Link>
                  <button className="remove-wish-btn" onClick={() => toggleWishlist(product)}>×</button>
                </div>
                <div className="card-info">
                  <h3>{product.name}</h3>
                  <p className="price">₱{product.price}</p>
                  <button 
                    className="btn-add-cart" 
                    onClick={() => { addToCart(product); toast.success("Moved to Cart!"); }}
                    disabled={product.quantity === 0 || product.stock === 0}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

=======
import React, { useContext } from 'react';
import { ShopContext } from '../context/ShopContext';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './WishlistPage.css';

const WishlistPage = () => {
  const { wishlist, addToCart, toggleWishlist, isLoading } = useContext(ShopContext);

  // --- HELPER: Safely Get Image URL ---
  const getProductImage = (product) => {
      // 1. Check for legacy/single image property
      if (product.image) return product.image;
      
      let imgs = product.images;
      // 2. Handle if MySQL sent it as a string (JSON string)
      if (typeof imgs === 'string') {
          try { imgs = JSON.parse(imgs); } catch(e) { imgs = []; }
      }
      
      // 3. Return first image or placeholder
      if (Array.isArray(imgs) && imgs.length > 0) return imgs[0];
      
      return '/placeholder.png'; // Fallback
  };

  const renderSkeletons = () => {
    return Array(4).fill(0).map((_, i) => (
      <div key={i} className="product-card skeleton-card">
        <div className="skeleton-box wish-sk-img"></div>
        <div className="skeleton-info">
            <div className="skeleton-box wish-sk-title"></div>
            <div className="skeleton-box wish-sk-btn"></div>
        </div>
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="wishlist-page">
        <h2 className="section-title">Your Wishlist</h2>
        <div className="wishlist-grid">
            {renderSkeletons()}
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <h2 className="section-title">Your Wishlist</h2>
      
      {wishlist.length === 0 ? (
        <div className="empty-state">
           <div className="empty-icon">✨</div>
           <h3>Your wishlist is empty</h3>
           <Link to="/shop" className="btn-primary">Start Shopping</Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          {wishlist.map((product) => {
            const imageUrl = getProductImage(product);
            const productId = product.id || product._id;

            return (
              <div key={productId} className="product-card">
                <div className="image-wrapper">
                  <Link to={`/product/${productId}`}>
                      <img 
                        src={imageUrl} 
                        alt={product.name} 
                        onError={(e) => { e.target.src = '/placeholder.png'; }}
                      />
                  </Link>
                  <button className="remove-wish-btn" onClick={() => toggleWishlist(product)}>×</button>
                </div>
                <div className="card-info">
                  <h3>{product.name}</h3>
                  <p className="price">₱{product.price}</p>
                  <button 
                    className="btn-add-cart" 
                    onClick={() => { addToCart(product); toast.success("Moved to Cart!"); }}
                    disabled={product.quantity === 0 || product.stock === 0}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

>>>>>>> 46f177dc8ce17a0f72dc7182eb1b2842c55e7a13
export default WishlistPage;