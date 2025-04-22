import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Optional: if using Firebase Auth

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCCWJzF4ZR8dOd8SgEzuN_onp4odK3WK8o",
  authDomain: "scc-queue.firebaseapp.com",
  projectId: "scc-queue",
  storageBucket: "scc-queue.firebasestorage.app",
  messagingSenderId: "392786976763",
  appId: "1:392786976763:web:444f7fbc70368831c3f55e",
  measurementId: "G-RY97MTCN11"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app); // Optional: if using Firebase Auth

export { app, db, auth };