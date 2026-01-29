// src/config.js

// 1. Your Local IP for development
const LOCAL_IP = "192.168.18.27"; 

// 2. YOUR REAL LIVE BACKEND URL (From Render, Railway, etc.)
// Replace 'likhat-habi-api' with your actual service name
const PROD_URL = "https://likha-t-habi.onrender.com"; 

// 3. Automatically switch based on where the app is running
export const API_URL = window.location.hostname === "localhost" 
    ? `http://${LOCAL_IP}:5000` 
    : PROD_URL;

