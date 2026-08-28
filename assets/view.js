import { db, collection, onSnapshot, query, orderBy, escapeHtml, fmt, debounce, statusLabel } from "./app.js";

const contentEl = document.getElementById("content");
const searchEl = document.getElementById("search");
const familyFilterEl = document.getElementById("familyFilter");
const resultCountEl = document.getElementById("resultCount");

let allStudents = [];

function cell(v){
  const s = fmt(v);
  return s ? escapeHtml(s) : `<span class="empty-cell">—</span>`;
}

// statuses that should visually stand out as needing attention
const FLAGGED_STATUSES = new Set(["dropped", "irregular"]);

function statusBadge(status){
  if (!status) return `<span class="empty-cell">—</span>`;
  const flagged = FLAGGED_STATUSES.has(status);
  return `<span class="status-tag ${flagged ? "status-flag" : "status-ok"}">${escapeHtml(statusLabel(status))}</span>`;
}

function render(){
  const q = searchEl.value.trim().toLowerCase();
  const familyPick = familyFilterEl.value;

  let rows = allStudents;
  if (familyPick) rows = rows.filter(s => s.familyChain === familyPick);
  if (q) {
    rows = rows.filter(s => {
      const hay = [s.studentName, s.fatherName, s.familyChain, s.instituteName, s.presentClass, s.contact]
        .map(v => (v || "").toString().toLowerCase()).join(" ");
      return hay.includes(q);
    });
  }

  resultCountEl.textContent = `${rows.length} of ${allStudents.length} record${allStudents.length===1?"":"s"}`;

  if (rows.length === 0) {
    contentEl.innerHTML = `<div class="card empty-state">
      <div class="big">No matching records</div>
      <div>Try a different name or clear the search.</div>
    </div>`;
    return;
  }

  // group by familyChain, preserving first-seen order
  const groups = new Map();
  for (const s of rows) {
    const key = s.familyChain || "— No family chain listed —";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  let html = "";
  for (const [family, students] of groups) {
    students.sort((a,b) => (a.sr ?? 9999) - (b.sr ?? 9999));
    html += `
    <section class="family-group">
      <div class="family-heading">
        <span class="label">Family Chain</span>
        <h2>${escapeHtml(family)}</h2>
        <span class="count">${students.length} student${students.length===1?"":"s"}</span>
      </div>
      <div class="register">
        <table class="register-table">
          <thead><tr>
            <th>Sr.#</th><th>Student</th><th>Father</th><th>Class</th><th>Status</th>
            <th>Institute</th><th>Marks</th><th>Contact #</th><th>Remarks</th>
          </tr></thead>
          <tbody>
            ${students.map(s => `
              <tr class="${FLAGGED_STATUSES.has(s.status) ? "row-flagged" : ""}">
                <td class="sr-badge">${cell(s.sr)}</td>
                <td class="student-name">${cell(s.studentName)}</td>
                <td class="muted">${cell(s.fatherName)}</td>
                <td>${cell(s.presentClass)}</td>
                <td>${statusBadge(s.status)}</td>
                <td class="muted">${cell(s.instituteName)}</td>
                <td class="marks">${s.totalMarks || s.obtMarks ? `${cell(s.obtMarks)} / ${cell(s.totalMarks)}` : `<span class="empty-cell">—</span>`}</td>
                <td class="marks">${cell(s.contact)}</td>
                <td class="muted">${cell(s.remarks)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
        <div class="register-cards">
          ${students.map(s => `
            <div class="reg-card ${FLAGGED_STATUSES.has(s.status) ? "row-flagged" : ""}">
              <div class="reg-card-top">
                <span class="student-name">${cell(s.studentName)}</span>
                <span class="sr-badge">#${cell(s.sr)}</span>
              </div>
              <dl>
                <dt>Father</dt><dd>${cell(s.fatherName)}</dd>
                <dt>Class</dt><dd>${cell(s.presentClass)}</dd>
                <dt>Status</dt><dd>${statusBadge(s.status)}</dd>
                <dt>Institute</dt><dd>${cell(s.instituteName)}</dd>
                <dt>Marks</dt><dd>${s.totalMarks || s.obtMarks ? `${cell(s.obtMarks)} / ${cell(s.totalMarks)}` : "—"}</dd>
                <dt>Contact</dt><dd>${cell(s.contact)}</dd>
                <dt>Remarks</dt><dd>${cell(s.remarks)}</dd>
              </dl>
            </div>`).join("")}
        </div>
      </div>
    </section>`;
  }
  contentEl.innerHTML = html;
}

function populateFamilyFilter(){
  const current = familyFilterEl.value;
  const families = [...new Set(allStudents.map(s => s.familyChain).filter(Boolean))].sort();
  familyFilterEl.innerHTML = `<option value="">All family chains</option>` +
    families.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join("");
  familyFilterEl.value = current;
}

const q = query(collection(db, "students"), orderBy("sr", "asc"));
onSnapshot(q, snap => {
  allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  populateFamilyFilter();
  render();
}, err => {
  contentEl.innerHTML = `<div class="card empty-state">
    <div class="big">Couldn't load the register</div>
    <div>${escapeHtml(err.message)}</div>
    <div style="margin-top:10px;">If you're setting this up for the first time, check <code>assets/firebase-config.js</code>
      and the Firestore security rules in the README.</div>
  </div>`;
});

searchEl.addEventListener("input", debounce(render, 150));
familyFilterEl.addEventListener("change", render);
