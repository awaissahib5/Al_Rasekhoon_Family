// Shared setup: Firebase init + small helpers used across pages.
import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  onSnapshot, query, orderBy, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  onSnapshot, query, orderBy, setDoc, serverTimestamp,
  onAuthStateChanged, signInWithEmailAndPassword, signOut
};

// The fields every student record has. Order here drives form
// order and diff order everywhere in the app.
export const FIELDS = [
  { key: "sr",            label: "Sr. #",                    type: "number" },
  { key: "studentName",   label: "Student Name",              type: "text", required: true },
  { key: "fatherName",    label: "Father Name",               type: "text", required: true },
  { key: "presentClass",  label: "Present Class",              type: "text" },
  { key: "instituteName", label: "Institute Name",             type: "text" },
  { key: "totalMarks",    label: "Total Marks (last class)",   type: "text" },
  { key: "obtMarks",      label: "Obtained Marks (last class)",type: "text" },
  { key: "contact",       label: "Contact #",                  type: "text" },
  { key: "familyChain",   label: "Family Chain",               type: "text", required: true },
  { key: "remarks",       label: "Remarks / Future Plan",      type: "textarea" }
];

export function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

export function fmt(v){
  if (v === undefined || v === null || v === "") return "";
  return String(v);
}

export function debounce(fn, ms=250){
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), ms); };
}
