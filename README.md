# Centralized Insurance Pre-Authorization & Claim Management System

A web platform that connects **patient, hospital and insurer** and manages the
whole insurance process, from pre-authorization to claim settlement.

> Store once → Reuse when needed → Check before submission → Resolve queries → Track until settlement

```
preauth-claims-project/
├── frontend/   React + Vite + Tailwind dashboard
└── backend/    Express + MySQL + Socket.IO API  (schema.sql, seed.js)
```

---

## What the system does

| Step | What happens | Who |
|---|---|---|
| 1. **Patient Document Vault** | Reusable documents (Government ID, Insurance Card, Policy Document) are stored **once per patient**, with an optional expiry date | Hospital or patient |
| 2. Create pre-authorization | Treatment, doctor, cost, dates; policy and insurer come from the patient record | Hospital |
| 3. **Reuse vault documents** | The request automatically counts valid vault documents; nothing is re-uploaded | System |
| 4. Upload treatment documents | Only Medical Report, Doctor Prescription, Diagnostic Report, Treatment Estimate | Hospital |
| 5. **Readiness check** | Panel shows READY / NOT READY and lists what is missing. The **server re-checks on submit**, so an incomplete request can never reach the insurer | System |
| 6. Insurer review | Approve, partially approve, reject, or raise a query. The hospital answers (with an optional attachment) and the request returns to review | Insurer / hospital |
| 7. Claim | Hospital submits the claim and uploads the **Hospital Bill** (and optional Discharge Summary). The insurer can only start verification once the bill is present, then approves and settles | Hospital / insurer |
| 8. Tracking | Status timelines, live updates (Socket.IO) and notifications for everyone involved | All |

Roles: **Patient**, **Hospital**, **Insurer**, **Admin** (dashboard, reports, audit logs).

Document stages (enforced by the backend, not just the UI):

| Stage | Document types | Stored in |
|---|---|---|
| Vault (per patient) | Government ID, Insurance Card, Policy Document | `patient_documents` |
| Pre-authorization | Medical Report, Doctor Prescription, Diagnostic Report, Treatment Estimate (+ Additional Document for query replies) | `documents` |
| Claim | Hospital Bill, Discharge Summary | `documents` |

An **expired** vault document is treated as missing until a current copy is uploaded.

---

## 0. Prerequisites

- Node.js 18+ and npm
- MySQL Server 8.x, installed and **running** (Windows: `services.msc` → MySQL80 → *Running*)

You do **not** need the `mysql` command on your PATH. The only time you need a MySQL
prompt is step 1; on Windows open it from **Start menu → "MySQL 8.0 Command Line Client"**
(it asks for the root password and needs no PATH setup).

---

## 1. Create the database and user (one time)

At the MySQL prompt (as root):
```sql
CREATE DATABASE preauth_claims_db;
CREATE USER 'preauth_app'@'localhost' IDENTIFIED WITH mysql_native_password BY 'choose_a_password';
GRANT ALL PRIVILEGES ON preauth_claims_db.* TO 'preauth_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```
(If it says the database or user already exists, that is fine.)

---

## 2. Backend

```bash
cd backend
npm install
```
Create your `.env` from the template (`copy .env.example .env` on Windows,
`cp .env.example .env` on macOS/Linux) and set:
```
DB_USER=preauth_app
DB_PASSWORD=choose_a_password
JWT_SECRET=any_long_random_string
```
Create all **14 tables** and load the demo data with one command:
```bash
npm run db:reset
```
This reads `schema.sql` using the credentials from `.env`, so no `mysql` command is needed.
(`npm run db:init` creates only the tables; `npm run seed` loads only the demo data.
**Both db:init and db:reset wipe existing data.**)

Start the API:
```bash
npm run dev        # http://localhost:5000
```
Leave it running and check `http://localhost:5000/api/health`.

## 3. Frontend (second terminal)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```
`frontend/.env` already points at `http://localhost:5000/api`. The frontend only
talks to the real backend; there is no mock mode.

---

## 4. Log in

Password for all accounts: `demo123`

| Role | Email | Notes |
|---|---|---|
| Hospital | hospital@demo.com | Apollo Care. Patients: Arun, Ganesh, Lakshmi |
| Insurer | insurer@demo.com | Star Health |
| Patient | patient@demo.com | Arun Kumar (PAT-1001) |
| Patient | patient2@demo.com | Divya Prakash (PAT-1002) |
| Patient | ganesh@demo.com | Ganesh Moorthy (PAT-1003) |
| Patient | lakshmi@demo.com | Lakshmi Narayanan (PAT-1004) |
| Admin | admin@demo.com | reports, users, audit logs |

**Every patient has their own login.** A patient account is linked to exactly one patient record and the server only returns that patient's own requests, claims, documents, queries and notifications (this is enforced in the API, not just hidden in the UI). New patients get a login in one of three ways:
- they **register** themselves on the Register page (a patient record and login are created together);
- a **hospital** registers a patient and fills in the optional login email + password; or
- a **hospital/admin** clicks **Create login** next to an existing patient in the Patients list.

## 5. Demo walkthrough (about 5 minutes)

1. **Hospital → Pre-Authorizations → PA-1004** (Lakshmi's draft). The panel says **Not ready**: her Government ID is *expired* and her Policy Document is missing, plus the 4 treatment documents. *Submit* is disabled.
2. **Hospital → Document Vault** → pick Lakshmi → upload a Policy Document and *Replace* the expired Government ID.
3. Back on PA-1004: vault items are now ticked **automatically**. Upload the 4 treatment documents → **Ready for submission** → *Submit*.
4. **Reuse:** Pre-Authorizations → *New request* for **Arun** → the vault is already complete; only the 4 treatment documents are listed as missing.
5. **Insurer** → PA-1004 → *Raise query* → **Hospital** answers with an attached file (the request returns to review) → **Insurer** approves.
6. **Hospital** → PA-1004 → *Create claim*. The page says the Hospital Bill is required; upload it.
7. **Insurer** → Claims → *Start verification* → *Approve claim* → *Process settlement*.
8. **Patient** (patient@demo.com) sees the request approved, the claim settled, and the vault.
9. **Admin** → Reports and Audit Logs.

Reset the demo data at any time: `cd backend && npm run seed`.

---

## Troubleshooting

| What you see | Cause and fix |
|---|---|
| `Table 'preauth_claims_db.patient_documents' doesn't exist`, or the Document Vault / readiness panel shows an error | The database still has the older schema. In `backend`, run `npm run db:reset`, then restart `npm run dev`. |
| `mysql is not recognized` | You don't need it. Use `npm run db:reset` (step 2). Only step 1 needs a MySQL prompt: use Start menu → MySQL Command Line Client. |
| `MySQL refused the login for user "preauth_app"` | `DB_USER` / `DB_PASSWORD` in `backend/.env` don't match step 1. |
| `database ... does not exist, or user ... has no access` | Do step 1 (create the database and grant access). |
| `Could not reach MySQL` / `ECONNREFUSED` | The MySQL service isn't running. Start it in `services.msc`. |
| Login screen says "Network Error" | The backend isn't running, or `CLIENT_ORIGIN` in `backend/.env` doesn't match the frontend URL (default `http://localhost:5173`). |
| Data looks wrong after testing | Reset the demo data: `cd backend && npm run db:reset`. |

---

## How it is built

- **Service layer:** pages never call the API directly; every call goes through `frontend/src/services/*` (Axios, JWT attached by an interceptor).
- **Readiness logic lives on the server** (`backend/src/utils/readiness.js`) and is used by both the readiness endpoint (for the UI) and `POST /preauthorizations/:id/submit` (enforcement).
- **Status history tables** (`preauth_status_history`, `claim_status_history`) are append-only and drive both the timeline and the audit trail.
- **Real-time:** Socket.IO events `preauthorization:statusChanged`, `claim:statusChanged`, `notification:new`, `query:new`, `query:updated`.
- **No OCR / AI:** only document *types* are checked, never their contents.

Backend details and the full endpoint list are in `backend/README.md`.

## Known limitations (be upfront about these in your report)

- Uploaded files are saved on the server's disk (`backend/uploads/`) and served at `/uploads/<random-name>`. The names are unguessable, but the URL itself is not login-protected. A production system would serve files through an authenticated endpoint or private object storage.
- Document *content* is not verified (by design); a wrong file in the right slot is not detected.
- Single-server design: Socket.IO rooms are in memory, so scaling to several servers would need a Redis adapter.
- The demo `JWT_SECRET` and passwords are for development only.
