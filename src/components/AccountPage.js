import React, { useContext, useState, useEffect } from 'react';
import { ShopContext } from '../context/ShopContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './AccountPage.css';

const AccountPage = () => {
  const { user, logout, isLoading, isAdmin, saveProfile } = useContext(ShopContext);
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  
  // Initialize form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    zipCode: ''
  });

  // --- HELPER: Parse Address Safely ---
  const parseAddress = (addr) => {
    if (!addr) return {};
    if (typeof addr === 'string') {
        try { return JSON.parse(addr); } catch (e) { return {}; }
    }
    return addr;
  };

  // --- FIX: LOAD DATA CORRECTLY ---
  useEffect(() => {
    if (user) {
      const addr = parseAddress(user.address);
      
      setFormData({
        // 1. Check if 'fullName' exists in the SAVED ADDRESS first.
        // 2. If not, fall back to the Account Name (user.displayName).
        fullName: addr.fullName || user.displayName || '', 
        
        phone: user.phone || '',
        street: addr.street || '',
        barangay: addr.barangay || '',
        city: addr.city || '',
        province: addr.province || '',
        zipCode: addr.zipCode || ''
      });
    }
  }, [user, isEditing]); 

  // --- HANDLERS ---
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Save the specific Shipping Name into the address object
    const addressObj = {
      fullName: formData.fullName, // <--- THIS SAVES THE SHIPPING NAME
      street: formData.street,
      barangay: formData.barangay,
      city: formData.city,
      province: formData.province,
      zipCode: formData.zipCode
    };

    const success = await saveProfile(addressObj, formData.phone);
    if (success) {
      toast.success("Details updated successfully!");
      setIsEditing(false);
    } else {
      toast.error("Failed to update.");
    }
  };

  // --- SKELETON LOADING COMPONENT ---
  if (isLoading) {
    return (
      <div className="account-page-wrapper">
        <div className="account-card">
          <div className="profile-header">
            <div className="skeleton sk-avatar"></div>
            <div className="skeleton sk-name"></div>
            <div className="skeleton sk-email"></div>
            <div className="skeleton sk-btn"></div>
          </div>
          <div className="details-box">
            <div className="sk-detail-row">
              <div className="skeleton sk-label"></div>
              <div className="skeleton sk-value"></div>
            </div>
            <div className="sk-detail-row">
              <div className="skeleton sk-label"></div>
              <div className="skeleton sk-value"></div>
            </div>
            <div className="sk-detail-row">
              <div className="skeleton sk-label"></div>
              <div className="skeleton sk-value long"></div>
            </div>
          </div>
          <div className="divider"></div>
          <div className="account-actions">
             <div className="skeleton sk-action-card"></div>
             <div className="skeleton sk-action-card"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  // Display Logic
  const initial = user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U';
  const userAddr = parseAddress(user.address);
  
  const fullAddressStr = userAddr.street 
    ? `${userAddr.street}, ${userAddr.barangay}, ${userAddr.city}` 
    : 'No address set';

  // FIX: Use the Address Name if available, otherwise Account Name
  const shippingName = userAddr.fullName || user.displayName;

  return (
    <div className="account-page-wrapper">
      <div className="account-card">
        
        {/* --- HEADER (Keeps the Main Account Name) --- */}
        <div className="profile-header">
            <div className="avatar-circle">{initial}</div>
            {/* This shows the Global Account Name (e.g. from Google) */}
            <h2 className="user-name">{user.displayName}</h2> 
            <p className="user-email">{user.email}</p>
            {isAdmin && <span className="admin-badge">Administrator</span>}

            <button className="btn-edit-pill" onClick={() => setIsEditing(true)}>
                ✏️ Edit Details
            </button>
        </div>

        {/* --- DETAILS BOX (Shows the Shipping Name) --- */}
        <div className="details-box">
            <div className="detail-row">
                <span className="d-label">Receiver:</span>
                {/* This shows the Saved Shipping Name */}
                <span className="d-value">{shippingName}</span> 
            </div>
            <div className="detail-row">
                <span className="d-label">Phone:</span>
                <span className="d-value">{user.phone || 'N/A'}</span>
            </div>
            <div className="detail-row">
                <span className="d-label">Address:</span>
                <span className="d-value address-text">{fullAddressStr}</span>
            </div>
        </div>

        <div className="divider"></div>

        {/* ... Rest of your buttons (My Orders, etc) ... */}
        <div className="account-actions">
            {isAdmin && (
                <div className="action-card admin-card" onClick={() => navigate('/admin')}>
                    <div className="icon-box">⚙️</div>
                    <div className="action-text"><h3>Admin Dashboard</h3><p>Manage store</p></div>
                </div>
            )}
            <div className="action-card" onClick={() => navigate('/orders')}> 
                <div className="icon-box">📦</div>
                <div className="action-text"><h3>My Orders</h3><p>Track history</p></div>
            </div>
            <div className="action-card" onClick={() => navigate('/wishlist')}>
                <div className="icon-box">❤️</div>
                <div className="action-text"><h3>Wishlist</h3><p>Saved items</p></div>
            </div>
        </div>

        <button className="btn-logout-main" onClick={() => { logout(); navigate('/'); }}>
            Log Out
        </button>

      </div>

      {/* --- EDIT MODAL --- */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Edit Shipping Details</h3>
                    <button className="close-btn" onClick={() => setIsEditing(false)}>×</button>
                </div>
                
                <form onSubmit={handleSave} className="edit-form">
                    <div className="form-group">
                        <label>Receiver Name</label>
                        {/* This inputs updates the Address Name */}
                        <input name="fullName" value={formData.fullName} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input name="phone" value={formData.phone} onChange={handleChange} required />
                    </div>
                    
                    <h4 className="sub-head">Delivery Address</h4>
                    <div className="form-row">
                        <input name="street" placeholder="Street / Block" value={formData.street} onChange={handleChange} />
                        <input name="barangay" placeholder="Barangay" value={formData.barangay} onChange={handleChange} />
                    </div>
                    <div className="form-row">
                        <input name="city" placeholder="City" value={formData.city} onChange={handleChange} />
                        <input name="province" placeholder="Province" value={formData.province} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <input name="zipCode" placeholder="Zip Code" value={formData.zipCode} onChange={handleChange} />
                    </div>

                    <button type="submit" className="btn-save-modal">Save Changes</button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};

export default AccountPage;