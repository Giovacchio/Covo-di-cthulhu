import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ⚠️ INCOLLA QUI LE TUE CREDENZIALI FIREBASE (vedi guida nel README)
const firebaseConfig = {
  apiKey: "INCOLLA_QUI",
  authDomain: "INCOLLA_QUI",
  projectId: "INCOLLA_QUI",
  storageBucket: "INCOLLA_QUI",
  messagingSenderId: "INCOLLA_QUI",
  appId: "INCOLLA_QUI",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
