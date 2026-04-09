import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA5DhwlylgKVgurB6eK1fK-GV3Iv1RT-G8",
  authDomain: "covo-di-cthulhu.firebaseapp.com",
  databaseURL: "https://covo-di-cthulhu-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "covo-di-cthulhu",
  storageBucket: "covo-di-cthulhu.firebasestorage.app",
  messagingSenderId: "1002748799651",
  appId: "1:1002748799651:web:16de0efcaf251803e6ed16",
  measurementId: "G-S5VDCHP1J7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
