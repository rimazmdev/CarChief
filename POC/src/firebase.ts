import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAWK6PHFUVHxTdlSdOgyaqPCOaTUauHW4M",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "carcheif-5f982.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "carcheif-5f982",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "carcheif-5f982.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "927343083284",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:927343083284:web:a1ada646bf6d769b02cc01",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-TV0XRMHW71",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true
  });
} catch (e) {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const auth = getAuth(app);
export default app;
