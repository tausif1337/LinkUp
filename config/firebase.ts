import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDXC9WZuI8S0eZik1a7DtMR7vvQ-F9a724",
  authDomain: "linkup-ef051.firebaseapp.com",
  projectId: "linkup-ef051",
  storageBucket: "linkup-ef051.firebasestorage.app",
  messagingSenderId: "905624735301",
  appId: "1:905624735301:web:01588ff8531e6d0ae41d2c"
};

let app: FirebaseApp;
let db: Firestore;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  // Initialize Firestore with long polling to prevent React Native Connection timeouts
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} else {
  app = getApp();
  db = getFirestore(app);
}

const auth = getAuth(app);
const storage = getStorage(app);

export { app, auth, db, storage };
