# Al-Rasekhoon Family Register — online portal

A small, free, self-hosted portal for the Family Register:

- **`index.html`** — public page, anyone with the link can browse/search all ~90 records, grouped by Family Chain.
- **`submit.html`** — public page to add a new student or request an update to an existing one. Nothing goes live immediately — it lands in a pending queue.
- **`admin.html`** — password-protected. Shows every pending submission with a side-by-side diff against the current record, lets you pick which Sr. # (row) it should be saved as, and Approve or Reject it.
- **`import-seed.html`** — a one-time page to load the 90 existing records (from your Excel file) into the database. Run it once, then you can ignore it (or delete the file).

No server to maintain — the data lives in **Firebase Firestore** (Google's free database), and the pages are hosted for free on **GitHub Pages**.

---

## 1. Create a free Firebase project (10 min)

1. Go to https://console.firebase.google.com and sign in with any Google account.
2. Click **Add project** → name it e.g. `al-rasekhoon-register` → you can skip Google Analytics → **Create project**.
3. In the left sidebar, click **Build → Firestore Database** → **Create database** → choose a region close to Pakistan (e.g. `asia-south1`) → start in **production mode**.
4. In the left sidebar, click **Build → Authentication** → **Get started** → enable the **Email/Password** sign-in method.
5. Still in Authentication, go to the **Users** tab → **Add user** → enter the email + password *you* (the admin) will log in with. This is the only account that can approve/reject — create just one, for yourself.
6. Click the gear icon (⚙) next to "Project Overview" → **Project settings** → scroll to **Your apps** → click the **`</>`** (web) icon → give it any nickname → **Register app**. You'll see a code block with `apiKey`, `authDomain`, etc. Keep this tab open.

## 2. Paste your config into the project

Open **`assets/firebase-config.js`** in this folder and replace the placeholder values with the ones Firebase just showed you:

```js
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "al-rasekhoon-register.firebaseapp.com",
  projectId: "al-rasekhoon-register",
  storageBucket: "al-rasekhoon-register.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

## 3. Set Firestore security rules

In Firebase console → **Firestore Database → Rules**, replace the contents with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Anyone can view the live register.
    match /students/{id} {
      allow read: if true;
      allow write: if request.auth != null;   // only the logged-in admin
    }

    // Anyone can submit a request; only the admin can read/manage the queue.
    match /pending/{id} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

Click **Publish**.

## 4. Put it on GitHub Pages

1. Create a new GitHub repository (public), e.g. `family-register`.
2. Upload every file in this folder, keeping the same structure (`index.html`, `submit.html`, `admin.html`, `import-seed.html`, `README.md`, `assets/`, `data/`) to the repo root.
3. In the repo, go to **Settings → Pages** → under "Build and deployment", set **Source: Deploy from a branch**, branch **main**, folder **/(root)** → **Save**.
4. After a minute, GitHub shows your live link, something like:
   `https://yourusername.github.io/family-register/`

That link is what you share for viewing (`.../index.html` or just the folder link) and submitting (`.../submit.html`). Keep `.../admin.html` for yourself only.

## 5. Load the existing 90 records (once)

1. Visit `https://yourusername.github.io/family-register/import-seed.html`
2. Log in with the admin email/password you created in step 1.
3. Click **Import into Firestore**. It loads all 90 rows from your original Excel file.
4. Visit `index.html` — you should see everyone, grouped by Family Chain.

You only need to do this once. If you ever need to re-run it, first delete all documents in the `students` collection in the Firebase console (Firestore → `students` → select all → delete), otherwise you'll get duplicates.

## How the approval flow works day to day

- Someone opens `submit.html`, either updates an existing student (search by name) or adds a new one, and sends it.
- It shows up in `admin.html` (only visible to you, once logged in) as a card with a **field-by-field diff** — old value vs. submitted value, changed fields highlighted.
- You pick the **Sr. #** you want it saved as (defaults to the student's current number for updates, or the next free number for new students — but you can type any number to place it wherever you like).
- **Approve** writes it straight into the live register; **Reject** discards it. Either way it disappears from the queue.

## Notes

- Contact numbers and marks were blank in many original rows — those still show as "—" until someone submits them; there's nothing to fix on your end.
- The register groups by **Family Chain** automatically — grouping is live, not stored order, so it stays correct even as new families are added.
- Everything is free at this scale (Firebase's free "Spark" plan covers far more reads/writes than ~90 students and occasional updates will ever use).
- Want more than one admin? Repeat step 1.5 (Authentication → Users → Add user) for each person who should be able to approve — the security rules already allow any logged-in user to approve.
