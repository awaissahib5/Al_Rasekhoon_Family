# Al-Rasekhoon Family Register — online portal

- **`index.html`** — public register: search/filter, grouped by Family Chain, shows a bold red "Dropped / Irregular" tag for flagged students.
- **`submit.html`** — public: add a student or request an update. Family Chain is a dropdown (with "None of the Above" → free text). Nothing goes live until approved.
- **`admin.html`** — password-protected. Manage the Family Chains dropdown list at the top; review/approve/reject pending submissions below, with a field-by-field diff and a chosen Sr. #.
- **`import-seed.html`** — one-time setup: two separate buttons, one to import the 90 student records, one to import the 11 family chains. Each button tells you if data already exists before you click, so you won't accidentally duplicate anything.

Data lives in **Firebase Firestore** (free). Pages are hosted for free on **GitHub Pages**.

---

## 1. Firebase project setup

1. https://console.firebase.google.com → your project → **Firestore Database** → create it if you haven't.
2. **Authentication** → Sign-in method → enable **Email/Password**. Then **Users** tab → **Add user** → this is your admin login.
3. **Project settings** → **Your apps** → **`</>`** web app → **Config** tab (not "npm"!) → copy the real values into `assets/firebase-config.js` in this repo, replacing every `PASTE_YOUR_...` placeholder. Keep the word `export` at the start of that line — it must read `export const firebaseConfig = { ... };`.

## 2. Firestore security rules

Firestore Database → **Rules** → replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /students/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /pending/{id} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }

    match /familyChains/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Click **Publish**.

## 3. GitHub Pages

Upload every file here (keeping the folder structure: `index.html`, `submit.html`, `admin.html`, `import-seed.html`, `assets/`, `data/`) to your repo root. Settings → Pages → Deploy from branch → `main` → `/(root)`.

**Important when uploading folders on GitHub's web uploader:** drag the `assets` folder itself (and `data` folder itself) into the upload box — don't drag the files from inside them, or the folder structure gets lost and pages will show 404s for `assets/app.js` etc.

## 4. One-time import (do this once)

Visit `import-seed.html`, log in, then:
1. Click **Import students** (only if it says none exist yet — 90 records from the original Excel).
2. Click **Import family chains** (only if it says none exist yet — the 11 known chains).

If step 2 fails with a permissions error, you skipped the `familyChains` security rule above — add it and try again.

## Everyday use

- **Someone submits a correction or a new student** via `submit.html` → shows up in `admin.html` under Pending, with a diff against the current record → you pick a Sr. # and **Approve**, or **Reject**.
- **A new family chain joins** → add it directly in the "Family Chains" box at the top of `admin.html` — it instantly appears in the submit form's dropdown. You can also remove one with the × on its chip (only affects the dropdown, not existing students).
- **Flag a student who's dropped out or attending irregularly** → edit their record (via submit.html → Update, or directly in Firestore) and set **Status** to "Dropped / Skipped Study" or "Irregular Attendance" → their row shows bold with a red tag on the register automatically.
- **Quick direct edits** (just you, no approval step) → Firebase console → Firestore Database → `students` collection → click the record → edit any field.

## 5. Email notifications on new submissions (optional but recommended)

Get an email the moment someone submits a new student or an update — no backend needed, using the free EmailJS service.

1. Sign up at https://www.emailjs.com (free — 200 emails/month).
2. **Email Services** → **Add New Service** → connect your Gmail (or any email) → copy the **Service ID**.
3. **Email Templates** → **Create New Template**. Set the "To email" field to `{{to_email}}`. Subject, e.g.: `{{kind}} — {{student_name}}`. Body, e.g.:
   ```
   {{kind}}

   Student: {{student_name}}
   Submitted by: {{submitter_note}}

   {{summary}}

   Review it here: {{review_link}}
   ```
   Save → copy the **Template ID**.
4. **Account → General** → copy your **Public Key**.
5. Open `assets/emailjs-config.js` in this repo and fill in `publicKey`, `serviceId`, `templateId`, and `adminEmail` (the address you want notifications sent to). Commit.

That's it — every submission on `submit.html` now emails you. Set `enabled: false` in that same file any time you want to pause notifications without deleting the setup.

## Troubleshooting checklist

- Page looks unstyled / nothing loads → check the browser console (F12). A `404` on `assets/app.js` means the `assets` folder didn't upload correctly (see step 3 above). A `PASTE_YOUR_...` showing up in a network request means `firebase-config.js` still has placeholders.
- `auth/invalid-api-key` → you copied from the "npm" tab instead of "Config" in Firebase project settings.
- Module import errors mentioning `firebase-config.js` → that file is missing the `export` keyword in front of `const firebaseConfig`.
- Family chain dropdown only shows "None of the Above" → you haven't run the "Import family chains" button on `import-seed.html` yet, or the `familyChains` security rule is missing.
