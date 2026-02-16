<<<<<<< HEAD
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './HomePage.css'; 

// --- ASSETS ---
import amiImg from '../assets/ami.png';
import blanketImg from '../assets/blanket.png';
import flowerImg from '../assets/flower.png';
import ribbonImg from '../assets/ribbon.png';
import acceImg from '../assets/acce.png';
import heroImg from '../assets/crochet-flower-bouquet-pattern-4.png'; 

const HomePage = () => {
  const navigate = useNavigate();

  const categories = [
    { label: 'Amigurumi', img: amiImg },
    { label: 'Blankets', img: blanketImg },
    { label: 'Flowers', img: flowerImg },
    { label: 'Ribbons', img: ribbonImg },
    { label: 'Accessories', img: acceImg },
  ];

  return (
    <div className="homepage">
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Handcrafted with Love</h1>
          <p>Discover unique crochet creations and beautiful poly florist ribbons for every occasion.</p>
          <button className="hero-btn" onClick={() => navigate('/shop')}>
            Shop Collection
          </button>
        </div>
        
        <div className="hero-image-container">
            <div className="main-circle">
                <img src={heroImg} alt="Hero Showcase" />
            </div>
            <div className="floating-badge">
                <img src={ribbonImg} alt="New" />
            </div>
        </div>
      </section>

      {/* WAVE DIVIDER */}
      <div className="wave-divider">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path className="wave-path" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      {/* CATEGORY SECTION */}
      <section className="category-section">
        <h2>Shop by Category</h2>
        <div className="category-list">
            {categories.map((cat, idx) => (
            <Link to={`/category/${cat.label.toLowerCase()}`} key={idx} className="category-item">
                <div className="cat-circle">
                <img src={cat.img} alt={cat.label} />
                </div>
                <span>{cat.label}</span>
            </Link>
            ))}
        </div>
      </section>
    </div>
  );
};

=======
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './HomePage.css'; 

// --- ASSETS ---
import amiImg from '../assets/ami.png';
import blanketImg from '../assets/blanket.png';
import flowerImg from '../assets/flower.png';
import ribbonImg from '../assets/ribbon.png';
import acceImg from '../assets/acce.png';
import heroImg from '../assets/crochet-flower-bouquet-pattern-4.png'; 

const HomePage = () => {
  const navigate = useNavigate();

  const categories = [
    { label: 'Amigurumi', img: amiImg },
    { label: 'Blankets', img: blanketImg },
    { label: 'Flowers', img: flowerImg },
    { label: 'Ribbons', img: ribbonImg },
    { label: 'Accessories', img: acceImg },
  ];

  return (
    <div className="homepage">
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Handcrafted with Love</h1>
          <p>Discover unique crochet creations and beautiful poly florist ribbons for every occasion.</p>
          <button className="hero-btn" onClick={() => navigate('/shop')}>
            Shop Collection
          </button>
        </div>
        
        <div className="hero-image-container">
            <div className="main-circle">
                <img src={heroImg} alt="Hero Showcase" />
            </div>
            <div className="floating-badge">
                <img src={ribbonImg} alt="New" />
            </div>
        </div>
      </section>

      {/* WAVE DIVIDER */}
      <div className="wave-divider">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path className="wave-path" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      {/* CATEGORY SECTION */}
      <section className="category-section">
        <h2>Shop by Category</h2>
        <div className="category-list">
            {categories.map((cat, idx) => (
            <Link to={`/category/${cat.label.toLowerCase()}`} key={idx} className="category-item">
                <div className="cat-circle">
                <img src={cat.img} alt={cat.label} />
                </div>
                <span>{cat.label}</span>
            </Link>
            ))}
        </div>
      </section>
    </div>
  );
};

>>>>>>> 46f177dc8ce17a0f72dc7182eb1b2842c55e7a13
export default HomePage;