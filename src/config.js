// src/config.js

// 1. Define your Local IP for development
const LOCAL_IP = "192.168.18.27"; 

// 2. Define your Deployed Backend URL (from Render, Railway, etc.)
// Replace 'your-backend-name.onrender.com' with your actual public URL
const PROD_URL = "https://your-backend-name.onrender.com";

// 3. Automatically switch based on the environment
export const API_URL = window.location.hostname === "localhost" 
    ? `http://${LOCAL_IP}:5000` 
    : PROD_URL;
