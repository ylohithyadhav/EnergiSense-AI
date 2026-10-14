import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBI9VyCeXH1Ro5FCd7rqUuVuIVWf0ad46E",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "energisense-ai.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "energisense-ai",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "energisense-ai.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "854944745598",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:854944745598:web:fe5d7ac4b686a6b4c2f02f"
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.apiKey !== "your_firebase_api_key" &&
  firebaseConfig.apiKey.length > 10
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.warn("Failed to initialize Firebase app:", err);
  }
}

export { auth, db };
