import { initializeApp } from 'firebase/app';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Suppress idle stream warnings
setLogLevel('error');

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBpWw_2Llt2NhGPFOb3l3uyvkha10ACkMg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "thinkbyte-8f5a7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "thinkbyte-8f5a7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "thinkbyte-8f5a7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "921395532154",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:921395532154:web:00651548096bca381fc6c3"
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;
