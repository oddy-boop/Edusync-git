
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDwi02b0E-TUHUA3VF-rJDV8ebGocaHr9E",
  authDomain: "stjosephmontessori-56562.firebaseapp.com",
  projectId: "stjosephmontessori-56562",
  storageBucket: "stjosephmontessori-56562.firebasestorage.app",
  messagingSenderId: "456806105108",
  appId: "1:456806105108:web:8074eae3cd5ff67e0c6701",
  measurementId: "G-N1TS2BKJVG"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

let analytics;
// Initialize analytics only if running on the client and consent has been given
if (typeof window !== 'undefined') {
  const hasConsent = localStorage.getItem('cookie_consent_edusync') === 'true';
  if (hasConsent) {
    isSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    });
  }
}

export const auth = getAuth(app);
export { app, analytics };
