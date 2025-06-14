
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export const auth = getAuth(app);
export { app, analytics };
