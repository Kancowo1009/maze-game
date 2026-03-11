// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD7yvejwpRsWLEn_xFg-hyDEXulsinLfO4",
  authDomain: "maze-battle-c7392.firebaseapp.com",
  databaseURL: "https://maze-battle-c7392-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "maze-battle-c7392",
  storageBucket: "maze-battle-c7392.firebasestorage.app",
  messagingSenderId: "718695400645",
  appId: "1:718695400645:web:cc111a4319017c8250dcac",
  measurementId: "G-DDR414NBS9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);