import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDX5eluS4LCSvNd9dDbLvxZV9Y27UlToJY",
  authDomain: "fablearner-3f909.firebaseapp.com",
  projectId: "fablearner-3f909",
  storageBucket: "fablearner-3f909.firebasestorage.app",
  messagingSenderId: "20290802686",
  appId: "1:20290802686:web:46d87a4332391a507726af",
  measurementId: "G-CK9RNZJ8K6",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
