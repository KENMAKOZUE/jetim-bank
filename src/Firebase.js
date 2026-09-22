import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ВСТАВЬ СВОИ ДАННЫЕ СЮДА:
const firebaseConfig = {
  apiKey: "AIzaSyAnGwpVYEHdRtDOqE3pWIJajkdCh_Nq7UM",
  authDomain: "jetim-bank-5f6da.firebaseapp.com",
  projectId: "jetim-bank-5f6da",
  storageBucket: "jetim-bank-5f6da.firebasestorage.app",
  messagingSenderId: "20969012059",
  appId: "1:20969012059:web:309c04987ba53c6106787e"
};

// Инициализация
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);