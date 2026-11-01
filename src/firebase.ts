import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyDj_neKSouBkrdq6bHSni0E0LrTX1YkWwE",
  authDomain: "shoptodash.firebaseapp.com",
  projectId: "shoptodash",
  storageBucket: "shoptodash.firebasestorage.app",
  messagingSenderId: "857362333061",
  appId: "1:857362333061:web:ff2f23b0ee313d194dd8ec"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

let authUserPromise: Promise<User | null> | null = null;

export function ensureAuth(): Promise<User | null> {
  if (authUserPromise) return authUserPromise;
  authUserPromise = new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve(user);
      } else {
        signInAnonymously(auth)
          .then((cred) => resolve(cred.user))
          .catch((err) => {
            console.warn('Anonymous auth note (proceeding):', err);
            resolve(null);
          });
      }
    });
  });
  return authUserPromise;
}

export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where
};
