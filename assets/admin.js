import {
  db, auth, collection, doc, getDocs, updateDoc, addDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  FIELDS, escapeHtml, fmt, statusLabel
} from "./app.js";

const loginView = document.getElementById("loginView");
const pendingView = document.getElementById("pendingView");
const loginForm = document.getElementById("loginForm");
const loginBanner = document.getElementById("loginBanner");
const logoutBtn = document.getElementById("logoutBtn");
const pendingListEl = document.getElementById("pendingList");
const pendingCountEl = document.getElementById("pendingCount");

const DISPLAY_FIELDS = FIELDS.filter(f => f.key !== "sr");

let studentsById = new Map();
let unsubPending = null;
let unsubStudents = null;

onAuthStateChanged(auth, user => {
  if (user) {
    loginView.hidden = true;
    pendingView.hidden = false;
    logoutBtn.hidden = false;
    startListening();
  } else {
    loginView.hidden = false;
    pendingView.hidden = true;
    logoutBtn.hidden = true;
    stopListening();
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginBanner.innerHTML = "";
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    loginBanner.innerHTML = `<div class="banner banner-error">Couldn't log in: ${escapeHtml(err.message)}</div>`;
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

function startListening(){
  unsubStudents = onSnapshot(collection(db, "students"), snap => {
    studentsById = new Map(snap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
    renderPending(currentPendingDocs);
  });
  unsubPending = onSnapshot(
    query(collection(db, "pending"), orderBy("submittedAt", "asc")),
    snap => {
      currentPendingDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderPending(currentPendingDocs);
    },
    err => {
      pendingListEl.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
    }
  );
}
function stopListening(){
  if (unsubPending) unsubPending();
  if (unsubStudents) unsubStudents();
}

let currentPendingDocs = [];

function nextSuggestedSr(){
  let max = 0;
  for (const s of studentsById.values()) if (typeof s.sr === "number" && s.sr > max) max = s.sr;
  return max + 1;
}

function diffRow(field, oldVal, newVal){
  const changed = fmt(oldVal) !== fmt(newVal) && fmt(newVal) !== "";
  const display = v => field.key === "status" ? statusLabel(fmt(v)) : fmt(v);
  return `
    <div class="field-name">${field.label}</div>
    <div class="${changed ? "diff-old diff-changed" : "diff-old"}">${fmt(oldVal) ? escapeHtml(display(oldVal)) : "—"}</div>
    <div class="${changed ? "diff-new diff-changed" : ""}">${fmt(newVal) ? escapeHtml(display(newVal)) : "<span class=\"muted\">(unchanged)</span>"}</div>
  `;
}

function renderPending(items){
  pendingCountEl.textContent = `${items.length} pending submission${items.length===1?"":"s"}`;

  if (items.length === 0) {
    pendingListEl.innerHTML = `<div class="empty-state">
      <div class="big">All caught up</div>
      <div>No submissions waiting for review.</div>
    </div>`;
    return;
  }

  pendingListEl.innerHTML = items.map(p => {
    const isUpdate = p.type === "update";
    const current = isUpdate ? studentsById.get(p.targetId) : null;
    const suggestedSr = isUpdate ? (current?.sr ?? p.targetSr ?? "") : nextSuggestedSr();
    const submittedWhen = p.submittedAt?.toDate ? p.submittedAt.toDate().toLocaleString() : "";

    const diffBody = isUpdate
      ? (current
          ? `<div class="diff-grid">
               <div class="dh">Field</div><div class="dh">Current</div><div class="dh">Submitted</div>
               ${DISPLAY_FIELDS.map(f => diffRow(f, current[f.key], p.submittedData?.[f.key])).join("")}
             </div>`
          : `<p class="muted" style="margin:10px 0 0;">Original record no longer exists — this will be treated as a new entry if approved.</p>
             <div class="diff-grid">
               <div class="dh">Field</div><div class="dh"></div><div class="dh">Submitted</div>
               ${DISPLAY_FIELDS.map(f => diffRow(f, "", p.submittedData?.[f.key])).join("")}
             </div>`)
      : `<div class="diff-grid">
           <div class="dh">Field</div><div class="dh"></div><div class="dh">Submitted</div>
           ${DISPLAY_FIELDS.map(f => diffRow(f, "", p.submittedData?.[f.key])).join("")}
         </div>`;

    return `
    <div class="pending-item" data-id="${p.id}">
      <div class="pending-top">
        <div>
          <span class="pending-type ${p.type}">${p.type === "update" ? "Update" : "New student"}</span>
          ${p.submitterNote ? `<span class="pending-meta"> · submitted by ${escapeHtml(p.submitterNote)}</span>` : ""}
        </div>
        <span class="pending-meta">${escapeHtml(submittedWhen)}</span>
      </div>
      ${diffBody}
      <div class="pending-actions">
        <label class="row-picker">
          Sr.# to save as
          <input type="number" class="sr-input" value="${escapeHtml(fmt(suggestedSr))}" min="1" />
        </label>
        <button class="btn btn-moss btn-sm approve-btn">Approve → save to register</button>
        <button class="btn btn-sm btn-ghost reject-btn">Reject</button>
      </div>
    </div>`;
  }).join("");

  pendingListEl.querySelectorAll(".approve-btn").forEach(btn => {
    btn.addEventListener("click", () => onApprove(btn.closest(".pending-item")));
  });
  pendingListEl.querySelectorAll(".reject-btn").forEach(btn => {
    btn.addEventListener("click", () => onReject(btn.closest(".pending-item")));
  });
}

async function onApprove(itemEl){
  const id = itemEl.dataset.id;
  const p = currentPendingDocs.find(x => x.id === id);
  if (!p) return;
  const srVal = Number(itemEl.querySelector(".sr-input").value);
  if (!srVal) { alert("Please enter a valid Sr. # to save this record as."); return; }

  const approveBtn = itemEl.querySelector(".approve-btn");
  approveBtn.disabled = true;
  approveBtn.textContent = "Saving…";

  try {
    const payload = { ...p.submittedData, sr: srVal, updatedAt: serverTimestamp() };
    const existing = p.type === "update" ? studentsById.get(p.targetId) : null;
    if (existing) {
      await updateDoc(doc(db, "students", p.targetId), payload);
    } else {
      await addDoc(collection(db, "students"), payload);
    }
    await deleteDoc(doc(db, "pending", id));
  } catch (err) {
    alert("Couldn't save this record: " + err.message);
    approveBtn.disabled = false;
    approveBtn.textContent = "Approve → save to register";
  }
}

async function onReject(itemEl){
  const id = itemEl.dataset.id;
  if (!confirm("Reject and remove this submission?")) return;
  try {
    await deleteDoc(doc(db, "pending", id));
  } catch (err) {
    alert("Couldn't reject this: " + err.message);
  }
}
