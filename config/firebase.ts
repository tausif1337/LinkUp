// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "AIzaSyDXC9WZuI8S0eZik1a7DtMR7vvQ-F9a724",
  authDomain: "linkup-ef051.firebaseapp.com",
  projectId: "linkup-ef051",
  storageBucket: "linkup-ef051.firebasestorage.app",
  messagingSenderId: "905624735301",
  appId: "1:905624735301:web:01588ff8531e6d0ae41d2c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);