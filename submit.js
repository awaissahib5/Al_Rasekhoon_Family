import {
  db, collection, getDocs, addDoc, serverTimestamp,
  FIELDS, escapeHtml, fmt, debounce, FAMILY_CHAIN_OTHER
} from "./app.js";

const modeUpdateBtn = document.getElementById("modeUpdateBtn");
const modeNewBtn = document.getElementById("modeNewBtn");
const findBlock = document.getElementById("findStudentBlock");
const findInput = document.getElementById("findInput");
const autocompleteList = document.getElementById("autocompleteList");
const selectedNote = document.getElementById("selectedStudentNote");
const formFieldsEl = document.getElementById("formFields");
const form = document.getElementById("recordForm");
const submitBtn = document.getElementById("submitBtn");
const bannerEl = document.getElementById("banner");

const FORM_FIELDS = FIELDS.filter(f => f.key !== "sr"); // admin assigns Sr.# on approval

let mode = "update"; // "update" | "new"
let allStudents = [];
let familyChains = []; // [{id, name}]
let selectedStudent = null;
let currentPrefill = null; // what the form is currently showing (null = nothing loaded yet)

// -- load students + family chains once for search/prefill/dropdown --
getDocs(collection(db, "students")).then(snap => {
  allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}).catch(err => {
  showBanner("error", "Couldn't load the student list: " + err.message);
});

getDocs(collection(db, "familyChains")).then(snap => {
  familyChains = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  if (currentPrefill !== null) renderFields(currentPrefill); // refresh if form already drawn
}).catch(err => {
  showBanner("error", "Couldn't load the family chain list: " + err.message);
});

function showBanner(kind, msg){
  bannerEl.innerHTML = `<div class="banner banner-${kind}">${msg}</div>`;
  bannerEl.scrollIntoView({ behavior: "smooth", block: "start" });
}
function clearBanner(){ bannerEl.innerHTML = ""; }

function setMode(next){
  mode = next;
  modeUpdateBtn.classList.toggle("active", mode === "update");
  modeNewBtn.classList.toggle("active", mode === "new");
  findBlock.hidden = mode !== "update";
  selectedStudent = null;
  findInput.value = "";
  selectedNote.textContent = "";
  autocompleteList.hidden = true;
  renderFields(mode === "update" ? null : {});
}
modeUpdateBtn.addEventListener("click", () => setMode("update"));
modeNewBtn.addEventListener("click", () => setMode("new"));

// -- autocomplete --
findInput.addEventListener("input", debounce(() => {
  const q = findInput.value.trim().toLowerCase();
  if (!q) { autocompleteList.hidden = true; return; }
  const matches = allStudents.filter(s =>
    (s.studentName || "").toLowerCase().includes(q) ||
    (s.fatherName || "").toLowerCase().includes(q)
  ).slice(0, 8);
  if (matches.length === 0) {
    autocompleteList.innerHTML = `<div class="autocomplete-item muted">No matches — check spelling, or switch to "Add a new student"</div>`;
    autocompleteList.hidden = false;
    return;
  }
  autocompleteList.innerHTML = matches.map(s => `
    <div class="autocomplete-item" data-id="${s.id}">
      <div class="an">${escapeHtml(s.studentName)} <span class="af">— #${escapeHtml(fmt(s.sr))}</span></div>
      <div class="af">Father: ${escapeHtml(s.fatherName)} · ${escapeHtml(s.familyChain || "")}</div>
    </div>`).join("");
  autocompleteList.hidden = false;
}, 150));

autocompleteList.addEventListener("click", (e) => {
  const item = e.target.closest(".autocomplete-item[data-id]");
  if (!item) return;
  selectedStudent = allStudents.find(s => s.id === item.dataset.id);
  findInput.value = `${selectedStudent.studentName} (Father: ${selectedStudent.fatherName})`;
  autocompleteList.hidden = true;
  selectedNote.innerHTML = `Editing record <strong>#${escapeHtml(fmt(selectedStudent.sr))}</strong> — the fields below are pre-filled with what's currently on the register. Change only what needs updating.`;
  renderFields(selectedStudent);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".autocomplete")) autocompleteList.hidden = true;
});

// -- dynamic form fields --
function renderFamilyChainField(f, prefill){
  const currentVal = fmt(prefill[f.key]);
  const matchesKnown = familyChains.some(c => c.name === currentVal);
  const isOther = !!currentVal && !matchesKnown;

  return `<div class="form-row">
    <label for="fc_${f.key}_select">${f.label}${f.required ? " *" : ""}</label>
    <select id="fc_${f.key}_select">
      <option value="">— Select —</option>
      ${familyChains.map(c => `<option value="${escapeHtml(c.name)}" ${!isOther && c.name === currentVal ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
      <option value="${FAMILY_CHAIN_OTHER}" ${isOther ? "selected" : ""}>None of the Above</option>
    </select>
    <input id="f_${f.key}" name="${f.key}" type="text" value="${escapeHtml(currentVal)}"
      placeholder="Type the family chain name"
      style="margin-top:8px;${isOther ? "" : "display:none;"}" />
  </div>`;
}

function wireFamilyChainField(f){
  const select = document.getElementById(`fc_${f.key}_select`);
  const input = document.getElementById(`f_${f.key}`);
  if (!select || !input) return;
  select.addEventListener("change", () => {
    if (select.value === FAMILY_CHAIN_OTHER) {
      input.value = "";
      input.style.display = "";
      input.focus();
    } else {
      input.value = select.value;
      input.style.display = "none";
    }
  });
}

function renderFields(prefill){
  currentPrefill = prefill;
  if (prefill === null) {
    formFieldsEl.innerHTML = `<p class="form-hint" style="margin-top:0;">Search and select a student above to load the update form.</p>`;
    submitBtn.disabled = true;
    return;
  }
  submitBtn.disabled = false;
  formFieldsEl.innerHTML = FORM_FIELDS.map(f => {
    const val = escapeHtml(fmt(prefill[f.key]));

    if (f.key === "familyChain") return renderFamilyChainField(f, prefill);

    if (f.type === "textarea") {
      return `<div class="form-row">
        <label for="f_${f.key}">${f.label}${f.required ? " *" : ""}</label>
        <textarea id="f_${f.key}" name="${f.key}" rows="3">${val}</textarea>
      </div>`;
    }
    if (f.type === "select") {
      return `<div class="form-row">
        <label for="f_${f.key}">${f.label}${f.required ? " *" : ""}</label>
        <select id="f_${f.key}" name="${f.key}">
          ${f.options.map(o => `<option value="${escapeHtml(o.value)}" ${o.value === fmt(prefill[f.key]) ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}
        </select>
      </div>`;
    }
    return `<div class="form-row">
      <label for="f_${f.key}">${f.label}${f.required ? " *" : ""}</label>
      <input id="f_${f.key}" name="${f.key}" type="text" value="${val}" />
    </div>`;
  }).join("");

  wireFamilyChainField(FIELDS.find(f => f.key === "familyChain"));
}
renderFields(null);
setMode("update");

// -- submit --
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearBanner();

  if (mode === "update" && !selectedStudent) {
    showBanner("error", "Please search for and select the student you're updating first.");
    return;
  }

  const submittedData = {};
  for (const f of FORM_FIELDS) {
    const el = document.getElementById(`f_${f.key}`);
    submittedData[f.key] = el.value.trim();
  }
  if (!submittedData.studentName || !submittedData.fatherName) {
    showBanner("error", "Student name and father's name are required.");
    return;
  }
  if (!submittedData.familyChain) {
    showBanner("error", "Please choose a family chain (or select \"None of the Above\" and type it in).");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";

  try {
    await addDoc(collection(db, "pending"), {
      type: mode === "update" ? "update" : "new",
      targetId: mode === "update" ? selectedStudent.id : null,
      targetSr: mode === "update" ? (selectedStudent.sr ?? null) : null,
      submittedData,
      submitterNote: document.getElementById("submitterNote").value.trim(),
      status: "pending",
      submittedAt: serverTimestamp()
    });
    showBanner("success", "Thanks — this has been sent to the admin for approval. It'll appear on the register once approved.");
    form.reset();
    selectedStudent = null;
    findInput.value = "";
    selectedNote.textContent = "";
    renderFields(mode === "update" ? null : {});
  } catch (err) {
    showBanner("error", "Couldn't send this: " + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send for approval";
  }
});
