// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyALLjY6C1W8CA5jCfe3AXEsqrMhxZs-Iqc",
  authDomain: "likhat-habi.firebaseapp.com",
  projectId: "likhat-habi",
  storageBucket: "likhat-habi.firebasestorage.app",
  messagingSenderId: "934093437828",
  appId: "1:934093437828:web:e6aa83213c045621b43bd1",
  measurementId: "G-NPP4M98ZCW",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
