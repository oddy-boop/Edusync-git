
// src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
// Firestore is being removed, so getFirestore and Firestore type are no longer needed here.
// import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
// import { getAnalytics } from "firebase/analytics"; // Analytics can be added if needed later

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcJRas4M4fOlT8nivk-2oj0L3irSE4XgA",
  authDomain: "fir-j-m.firebaseapp.com",
  projectId: "fir-j-m",
  storageBucket: "fir-j-m.appspot.com",
  messagingSenderId: "219095830420",
  appId: "1:219095830420:web:80f7372ab97bab4c798981",
  measurementId: "G-79Z115PM5W"
};

let app: FirebaseApp;
let authInstance: Auth;
// let dbInstance: Firestore; // Firestore instance removed
let storageInstance: FirebaseStorage;

// Initialize Firebase
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

authInstance = getAuth(app);
// dbInstance = getFirestore(app); // Firestore initialization removed
storageInstance = getStorage(app);

// const analytics = getAnalytics(app); // Initialize if/when analytics is needed

// Export dbInstance is removed as Firestore is disconnected.
export { app, authInstance as auth, storageInstance as storage };
