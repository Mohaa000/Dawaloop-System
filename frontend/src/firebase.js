import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCReZdsJ3UuwkQiVMCvztr4peTmNqJ9cmI",
  authDomain: "dawaloop-951ec.firebaseapp.com",
  projectId: "dawaloop-951ec",
  storageBucket: "dawaloop-951ec.firebasestorage.app",
  messagingSenderId: "808761451239",
  appId: "1:808761451239:web:7200d20d807e1ca2067842"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };