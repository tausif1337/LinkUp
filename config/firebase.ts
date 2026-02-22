import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
// @ts-ignore
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
let auth: Auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  // Initialize Firestore with long polling to prevent React Native Connection timeouts
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });

  // Use initializeAuth to set persistence for React Native
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} else {
  app = getApp();
  db = getFirestore(app);
  // For existing apps, we try to get the existing auth instance
  try {
    auth = getAuth(app);
  } catch (e) {
    // If it fails, initialize it
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
}

const storage = getStorage(app);

export { app, auth, db, storage };
