<<<<<<< HEAD
import React from 'react';
import './AboutPage.css';
// --- 1. IMPORT YOUR LOCAL IMAGE HERE ---
// Make sure the path matches where you put image.png
import heartAboutImage from '../assets/heart about.png';

const AboutPage = () => {
  return (
    <div className="about-wrapper">
      
      {/* --- HERO SECTION --- */}
      <div className="about-hero">
        <div className="hero-overlay"></div>
        <div className="hero-content fade-in-up">
          <h1>Weaving Dreams into Reality</h1>
          <div className="separator">✻</div>
          <p>Handcrafted crochet blooms & ribbons, woven with love and timeless dedication.</p>
        </div>
      </div>

      {/* --- OUR STORY SECTION --- */}
      <div className="about-section container">
        <div className="story-grid">
          
          {/* Image Side */}
          <div className="story-image-wrapper fade-in-right">
            <div className="story-img-bg"></div>
            
            {/* --- 2. USE THE IMPORTED IMAGE VARIABLE HERE --- */}
            <img 
              src={heartAboutImage}
              alt="Likha't Habi heart crochet arrangement" 
              className="story-img"
            />
          </div>

          {/* Text Side */}
          <div className="story-text fade-in-left">
            <h4 className="subtitle">Who We Are</h4>
            <h2>Our Story</h2>
            <p>
              Welcome to <strong>Likha't Habi</strong>. Our name is rooted in the Filipino words 
              <em> "Likha"</em> (To Create) and <em>"Habi"</em> (To Weave).
            </p>
            <p>
              What started as a quiet passion project—turning simple yarn into intricate art—has bloomed into a dedicated studio. 
              We believe that flowers shouldn't just last a week; they should capture a memory forever.
            </p>
            <p>
              Each petal is looped by hand, each ribbon carefully tied. Whether it's for a wedding, a graduation, or a simple "I love you," 
              we bring the warmth of handmade artistry into your most cherished moments.
            </p>
            
            <div className="signature">
                <p>With love,</p>
                <h3>The Likha't Habi Team</h3>
            </div>
          </div>

        </div>
      </div>

      {/* --- VALUES SECTION --- */}
      <div className="values-section">
        <div className="container">
            <div className="section-header fade-in-up">
                <h2>Why Choose Us?</h2>
                <div className="separator-line"></div>
            </div>
            
            <div className="values-grid">
                <div className="value-card fade-in-up delay-1">
                    <div className="icon-circle">🌿</div>
                    <h3>Sustainable Beauty</h3>
                    <p>Unlike real flowers that wither, our crochet creations last a lifetime, reducing waste while keeping memories alive.</p>
                </div>
                <div className="value-card fade-in-up delay-2">
                    <div className="icon-circle">🤲</div>
                    <h3>100% Handmade</h3>
                    <p>No machines, just hands. Every stitch is woven with patience, skill, and attention to detail.</p>
                </div>
                <div className="value-card fade-in-up delay-3">
                    <div className="icon-circle">🎨</div>
                    <h3>Fully Custom</h3>
                    <p>Your vision, our hands. We specialize in custom color palettes to match your special themes perfectly.</p>
                </div>
            </div>
        </div>
      </div>

      {/* --- CONTACT / CTA --- */}
      <div className="about-cta-section">
        <div className="cta-overlay"></div>
        <div className="cta-content fade-in-up">
            <h2>Find Your Perfect Arrangement</h2>
            <p>Ready to gift something timeless?</p>
            <button className="btn-shop-now" onClick={() => window.location.href='/shop'}>
                Browse Collections
            </button>
        </div>
      </div>

    </div>
  );
};

=======
import React from 'react';
import './AboutPage.css';
// --- 1. IMPORT YOUR LOCAL IMAGE HERE ---
// Make sure the path matches where you put image.png
import heartAboutImage from '../assets/heart about.png';

const AboutPage = () => {
  return (
    <div className="about-wrapper">
      
      {/* --- HERO SECTION --- */}
      <div className="about-hero">
        <div className="hero-overlay"></div>
        <div className="hero-content fade-in-up">
          <h1>Weaving Dreams into Reality</h1>
          <div className="separator">✻</div>
          <p>Handcrafted crochet blooms & ribbons, woven with love and timeless dedication.</p>
        </div>
      </div>

      {/* --- OUR STORY SECTION --- */}
      <div className="about-section container">
        <div className="story-grid">
          
          {/* Image Side */}
          <div className="story-image-wrapper fade-in-right">
            <div className="story-img-bg"></div>
            
            {/* --- 2. USE THE IMPORTED IMAGE VARIABLE HERE --- */}
            <img 
              src={heartAboutImage}
              alt="Likha't Habi heart crochet arrangement" 
              className="story-img"
            />
          </div>

          {/* Text Side */}
          <div className="story-text fade-in-left">
            <h4 className="subtitle">Who We Are</h4>
            <h2>Our Story</h2>
            <p>
              Welcome to <strong>Likha't Habi</strong>. Our name is rooted in the Filipino words 
              <em> "Likha"</em> (To Create) and <em>"Habi"</em> (To Weave).
            </p>
            <p>
              What started as a quiet passion project—turning simple yarn into intricate art—has bloomed into a dedicated studio. 
              We believe that flowers shouldn't just last a week; they should capture a memory forever.
            </p>
            <p>
              Each petal is looped by hand, each ribbon carefully tied. Whether it's for a wedding, a graduation, or a simple "I love you," 
              we bring the warmth of handmade artistry into your most cherished moments.
            </p>
            
            <div className="signature">
                <p>With love,</p>
                <h3>The Likha't Habi Team</h3>
            </div>
          </div>

        </div>
      </div>

      {/* --- VALUES SECTION --- */}
      <div className="values-section">
        <div className="container">
            <div className="section-header fade-in-up">
                <h2>Why Choose Us?</h2>
                <div className="separator-line"></div>
            </div>
            
            <div className="values-grid">
                <div className="value-card fade-in-up delay-1">
                    <div className="icon-circle">🌿</div>
                    <h3>Sustainable Beauty</h3>
                    <p>Unlike real flowers that wither, our crochet creations last a lifetime, reducing waste while keeping memories alive.</p>
                </div>
                <div className="value-card fade-in-up delay-2">
                    <div className="icon-circle">🤲</div>
                    <h3>100% Handmade</h3>
                    <p>No machines, just hands. Every stitch is woven with patience, skill, and attention to detail.</p>
                </div>
                <div className="value-card fade-in-up delay-3">
                    <div className="icon-circle">🎨</div>
                    <h3>Fully Custom</h3>
                    <p>Your vision, our hands. We specialize in custom color palettes to match your special themes perfectly.</p>
                </div>
            </div>
        </div>
      </div>

      {/* --- CONTACT / CTA --- */}
      <div className="about-cta-section">
        <div className="cta-overlay"></div>
        <div className="cta-content fade-in-up">
            <h2>Find Your Perfect Arrangement</h2>
            <p>Ready to gift something timeless?</p>
            <button className="btn-shop-now" onClick={() => window.location.href='/shop'}>
                Browse Collections
            </button>
        </div>
      </div>

    </div>
  );
};

>>>>>>> 46f177dc8ce17a0f72dc7182eb1b2842c55e7a13
export default AboutPage;