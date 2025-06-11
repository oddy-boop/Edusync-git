
// src/lib/firebase.ts

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// User's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcJRas4M4fOlT8nivk-2oj0L3irSE4XgA",
  authDomain: "fir-j-m.firebaseapp.com",
  projectId: "fir-j-m",
  storageBucket: "fir-j-m.firebasestorage.app",
  messagingSenderId: "219095830420",
  appId: "1:219095830420:web:80f7372ab97bab4c798981",
  measurementId: "G-79Z115PM5W" // This one is optional but good to have if provided
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {