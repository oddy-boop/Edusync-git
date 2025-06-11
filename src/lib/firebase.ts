
// src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage"; // Added
// import { getAnalytics } from "firebase/analytics"; // Analytics can be added if needed later

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcJRas4M4fOlT8nivk-2oj0L3irSE4XgA",
  authDomain: "fir-j-m.firebaseapp.com",
  projectId: "fir-j-m",
  storageBucket: "fir-j-m.appspot.com", // Corrected storageBucket usually ends with .appspot.com
  messagingSenderId: "219095830420",
  appId: "1:219095830420:web:80f7372ab97bab4c798981",
  measurementId: "G-79Z115PM5W"
};

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage; // Added

// Initialize Firebase
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

authInstance = getAuth(app);
dbInstance = getFirestore(app);
storageInstance = getStorage(app); // Added

// const analytics = getAnalytics(app); // Initialize if/when analytics is needed

export { app, authInstance as auth, dbInstance as db, storageInstance as storage }; // Export storage
