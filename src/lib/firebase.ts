import { initializeApp, getApps } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAAy0ZC8DlMDk8wy0_lQlsp5R7Qz_nBFkg',
  authDomain: 'cartasonline.firebaseapp.com',
  projectId: 'cartasonline',
  storageBucket: 'cartasonline.firebasestorage.app',
  messagingSenderId: '1075036646414',
  appId: '1:1075036646414:web:892238feb2d6c03af2e05f',
  measurementId: 'G-T0MZ84EL3T',
};

// Evitar inicializar dos veces en HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const storage = getStorage(app);

export const IMAGE_UPLOAD_CACHE_CONTROL = 'public,max-age=31536000,immutable';
