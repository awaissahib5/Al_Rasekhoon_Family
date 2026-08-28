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

// Options for the Status field — value is what's stored, label is
// what's shown. Add/rename entries here if you need a different set.
export const STATUS_OPTIONS = [
  { value: "",           label: "— Not set —" },
  { value: "active",     label: "Active" },
  { value: "dropped",    label: "Dropped / Skipped Study" },
  { value: "irregular",  label: "Irregular Attendance" },
  { value: "graduated",  label: "Graduated / Passed Out" },
  { value: "other",      label: "Other (see remarks)" }
];

// The fields every student record has. Order here drives form
// order and diff order everywhere in the app.
export const FIELDS = [
  { key: "sr",            label: "Sr. #",                    type: "number" },
  { key: "studentName",   label: "Student Name",              type: "text", required: true },
  { key: "fatherName",    label: "Father Name",               type: "text", required: true },
  { key: "presentClass",  label: "Present Class",              type: "text" },
  { key: "status",        label: "Status",                     type: "select", options: STATUS_OPTIONS },
  { key: "instituteName", label: "Institute Name",             type: "text" },
  { key: "totalMarks",    label: "Total Marks (last class)",   type: "text" },
  { key: "obtMarks",      label: "Obtained Marks (last class)",type: "text" },
  { key: "contact",       label: "Contact #",                  type: "text" },
  { key: "familyChain",   label: "Family Chain",               type: "text", required: true },
  { key: "remarks",       label: "Remarks / Future Plan",      type: "textarea" }
];

export function statusLabel(value){
  const found = STATUS_OPTIONS.find(o => o.value === (value || ""));
  return found ? found.label : value;
}

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
