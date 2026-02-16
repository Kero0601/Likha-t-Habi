/* src/components/ShopPage.js */
import React, { useContext, useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';
import './ShopPage.css';

const ShopPage = () => {
  const {
    products,
    addToCart,
    toggleWishlist,
    wishlist,
    searchQuery,
    setSearchQuery,
    fetchProducts,
    isLoading,
    user, // ✅ needed for login check
  } = useContext(ShopContext);

  const { category } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeFilter, setActiveFilter] = useState('All');
  const subFilters = ['All', 'Flowers', 'Amigurumi', 'Wearables'];

  useEffect(() => {
    fetchProducts(false);
    setActiveFilter('All');
    setSearchQuery('');
    window.scrollTo(0, 0);
  }, [category, setSearchQuery, fetchProducts]);

  const baseProducts = products.filter((product) => {
    if (!product) return false;
    const prodCat = (product.category || '').toLowerCase().trim();
    const paramCat = (category || '').toLowerCase().trim();
    const matchesCategory = category ? prodCat === paramCat : true;
    const matchesSearch = product.name
      ? product.name.toLowerCase().includes((searchQuery || '').toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  const displayedProducts = baseProducts.filter((product) => {
    if (activeFilter === 'All') return true;
    const term = activeFilter.toLowerCase().replace(/s$/, "");
    const prodName = (product.name || '').toLowerCase();
    const prodCat = (product.category || '').toLowerCase();
    const prodDesc = (product.description || '').toLowerCase();
    return prodName.includes(term) || prodCat.includes(term) || prodDesc.includes(term);
  });

  const getProductImage = (product) => {
    if (product.image) return product.image;
    let imgs = product.images;
    if (typeof imgs === 'string') {
      try { imgs = JSON.parse(imgs); } catch (e) { imgs = []; }
    }
    if (Array.isArray(imgs) && imgs.length > 0) return imgs[0];
    return '/placeholder.png';
  };

  const renderSkeletons = () => {
    return Array(8).fill(0).map((_, index) => (
      <div key={index} className="product-card skeleton-card">
        <div className="skeleton skeleton-image" />
        <div className="skeleton-info">
          <div className="skeleton skeleton-tag" />
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-title-short" />
          <div className="skeleton skeleton-price-row" />
        </div>
      </div>
    ));
  };

  // ✅ redirect helper (keeps "from" path)
  const goLogin = () => {
    navigate('/login', { state: { from: location.pathname + location.search } });
  };

  // ✅ wishlist click
  const handleWishlistClick = (e, product) => {
    e.stopPropagation();
    e.preventDefault();

    // quick check (optional) to avoid calling toggleWishlist
    if (!user) return goLogin();

    const ok = toggleWishlist(product);
    if (!ok) goLogin();
  };

  // ✅ add to cart click
  const handleAddToCartClick = (e, product, isOutOfStock) => {
    e.preventDefault();

    if (isOutOfStock) return;

    if (!user) return goLogin();

    const ok = addToCart(product, 1);
    if (!ok) goLogin();
  };

  return (
    <div className="shop-page">
      <div className="container">
        <h2 className="section-title">
          {category ? `${category.toUpperCase()} COLLECTION` : 'ALL PRODUCTS'}
        </h2>

        <div className="filter-bar">
          {subFilters.map((filter) => (
            <button
              key={filter}
              className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="product-grid">
            {renderSkeletons()}
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="no-results">
            <div className="empty-icon">🧶</div>
            <h3>No treasures found</h3>
            <p>
              We couldn't find any items in <strong>"{category || 'All'}"</strong>.
              <br />Try clearing your search or picking a different category!
            </p>
            <Link to="/shop" className="reset-btn" onClick={() => setActiveFilter('All')}>
              Browse All Products
            </Link>
          </div>
        ) : (
          <div className="product-grid">
            {displayedProducts.map((product) => {
              const productId = product.id || product._id;

              const isLiked = wishlist.some((item) => {
                const itemId = item.id || item._id;
                return String(itemId) === String(productId);
              });

              const imageUrl = getProductImage(product);

              const stock = product.quantity !== undefined ? product.quantity : (product.stock || 0);
              const isOutOfStock = Number(stock) <= 0;

              return (
                <div key={productId} className={`product-card ${isOutOfStock ? 'out-of-stock-card' : ''}`}>
                  <div className="image-wrapper">
                    <Link to={`/product/${productId}`}>
                      <img
                        src={imageUrl}
                        alt={product.name}
                        onError={(e) => { e.target.src = '/placeholder.png'; }}
                        style={isOutOfStock ? { filter: 'grayscale(100%)' } : {}}
                      />
                    </Link>

                    <button
                      className={`wishlist-icon ${isLiked ? 'liked' : ''}`}
                      onClick={(e) => handleWishlistClick(e, product)}
                    >
                      {isLiked ? '♥' : '♡'}
                    </button>

                    {isOutOfStock && <span className="badge out-of-stock">Sold Out</span>}
                  </div>

                  <div className="card-info">
                    <span className="category-tag">{(product.category || 'CROCHET')}</span>

                    <Link to={`/product/${productId}`} className="product-title-link">
                      <h3>{product.name}</h3>
                    </Link>

                    <div className="price-row">
                      <span className="price">₱{Number(product.price || 0).toLocaleString()}</span>

                      <button
                        className="add-btn-icon"
                        onClick={(e) => handleAddToCartClick(e, product, isOutOfStock)}
                        disabled={isOutOfStock}
                        style={{
                          opacity: isOutOfStock ? 0.5 : 1,
                          cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                          backgroundColor: isOutOfStock ? '#ccc' : ''
                        }}
                      >
                        {isOutOfStock ? '✕' : '+'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopPage;
