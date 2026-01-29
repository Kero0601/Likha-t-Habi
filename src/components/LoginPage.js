import React, { useState } from 'react'; 
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './LoginPage.css';

// Firebase remains for the initial handshake/token generation
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { auth, googleProvider } from '../firebase';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // NEW: Sync user to PostgreSQL
  const syncUserToPostgres = async (user, displayName) => {
    try {
      await fetch('http://localhost:5000/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: displayName || user.displayName,
          isAdmin: user.email === "likhathabi@admin.com" // Matches your admin check
        })
      });
    } catch (err) {
      console.error("Failed to sync to PostgreSQL:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let result;

      if (isSignUp) {
        result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        // Sync new user to Neon
        await syncUserToPostgres(result.user, formData.name);
        toast.success(`Welcome to Likha't Habi, ${formData.name}!`);
        navigate('/account');
      } else {
        result = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        toast.success("Welcome back!");

        if (result.user.email === "likhathabi@admin.com") {
          navigate('/admin');
        } else {
          navigate('/account');
        }
      }
    } catch (error) {
      toast.error("Login Failed: " + error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Sync Google user to Neon
      await syncUserToPostgres(result.user);
      toast.success(`Welcome, ${result.user.displayName}!`);
      navigate('/account');
    } catch (error) {
      toast.error("Google Login Failed: " + error.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        
        <div className="login-brand-section">
          <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
            <h1>LikhaT-Habi</h1>
          </Link>
          <p>Handcrafted treasures made with love.</p>
          <div className="yarn-decoration">🧶</div>
        </div>

        <div className="login-form-section">
          <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="subtitle">
            {isSignUp ? 'Join our cozy community today' : 'Please enter your details'}
          </p>

          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="input-group">
                <input 
                  type="text" 
                  name="name" 
                  placeholder="Full Name" 
                  value={formData.name} 
                  onChange={handleChange}
                  required 
                />
              </div>
            )}
            
            <div className="input-group">
              <input 
                type="email" 
                name="email" 
                placeholder="Email Address" 
                value={formData.email} 
                onChange={handleChange}
                required 
              />
            </div>

            <div className="input-group">
              <input 
                type="password" 
                name="password" 
                placeholder="Password" 
                value={formData.password} 
                onChange={handleChange}
                required 
              />
            </div>

            <button type="submit" className="btn-primary">
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="divider">
            <span>OR</span>
          </div>

          <button className="btn-google" onClick={handleGoogleLogin}>
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google G" 
            />
            Continue with Google
          </button>

          <p className="toggle-text">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <span onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? ' Login' : ' Sign Up'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;