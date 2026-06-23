import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAaWb5Z6_Dj66ub8hG9CjZYdA35c2mVBA4",
  authDomain: "routine-tracker-dc7d3.firebaseapp.com",
  projectId: "routine-tracker-dc7d3",
  storageBucket: "routine-tracker-dc7d3.firebasestorage.app",
  messagingSenderId: "337493657824",
  appId: "1:337493657824:web:e3091e5bdae74e1f8be885",
  measurementId: "G-P7TGLLD0F3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}
export function logout() {
  return signOut(auth);
}
export function onAuthChange(cb) {
  return onAuthStateChanged(auth, cb);
}

// 체크 데이터 저장
export async function saveChecks(uid, date, checks) {
  await setDoc(doc(db, "users", uid, "checks", date), checks);
}

// 체크 데이터 불러오기
export async function loadChecks(uid, date) {
  const snap = await getDoc(doc(db, "users", uid, "checks", date));
  return snap.exists() ? snap.data() : {};
}

// 루틴 저장
export async function saveRoutines(uid, routines) {
  await setDoc(doc(db, "users", uid, "config", "routines"), routines);
}

// 루틴 불러오기
export async function loadRoutines(uid) {
  const snap = await getDoc(doc(db, "users", uid, "config", "routines"));
  return snap.exists() ? snap.data() : null;
}

// 주간 체크 불러오기
export async function loadWeekChecks(uid, dates) {
  const result = {};
  await Promise.all(dates.map(async date => {
    const snap = await getDoc(doc(db, "users", uid, "checks", date));
    result[date] = snap.exists() ? snap.data() : {};
  }));
  return result;
}
