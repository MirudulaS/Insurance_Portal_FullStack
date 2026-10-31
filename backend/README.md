# Backend — Patient Insurance Pre-Authorization & Claim Status Tracking Dashboard

Express + MySQL + Socket.IO API implementing the exact contract the frontend
was built against. Tested
end-to-end against the real frontend's demo flow.

## Stack

Node.js, Express 5, MySQL (via `mysql2`), JWT auth (`jsonwebtoken` +
`bcryptjs`), file uploads (`multer`), real-time events (`socket.io`).

## Setup

1. **Create the database and a user** (as MySQL root; adjust the password):
   ```sql
   CREATE DATABASE preauth_claims_db;
   CREATE USER 'preauth_app'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
   GRANT ALL PRIVILEGES ON preauth_claims_db.* TO 'preauth_app'@'localhost';
   FLUSH PRIVILEGES;
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure environment** — copy `.env.example` to `.env` and set `DB_USER`,
   `DB_PASSWORD` and a real `JWT_SECRET`.
4. **Create the 14 tables and load demo data** (no `mysql` command needed; uses
   your `.env` credentials; this wipes existing data):
   ```bash
   npm run db:reset
   ```
   (`npm run db:init` = tables only, `npm run seed` = demo data only.)
5. **Start the server:**
   ```bash
   npm run dev     # nodemon, auto-restarts on file changes
   # or
   npm start
   ```
   It listens on `http://localhost:5000` (`PORT` in `.env`).

## Demo accounts (password `demo123` for all)

| Role     | Email               |
|----------|---------------------|
| Patient (Arun Kumar)       | patient@demo.com  |
| Patient (Divya Prakash)    | patient2@demo.com |
| Patient (Ganesh Moorthy)   | ganesh@demo.com   |
| Patient (Lakshmi Narayanan)| lakshmi@demo.com  |
| Hospital | hospital@demo.com   |
| Insurer  | insurer@demo.com    |
| Admin    | admin@demo.com      |

## API summary

All routes are under `/api` and need `Authorization: Bearer <jwt>` except `auth/login`, `auth/register`, `auth/organizations` and `health`.

| Area | Endpoints |
|---|---|
| Auth | `POST auth/login`, `auth/register` (patient self-registration: creates the patient record + its own login), `auth/logout`, `auth/change-password`; `GET auth/me`, `auth/organizations` |
| Patients | `GET/POST patients` (POST accepts optional `loginEmail` + `loginPassword`), `GET/PUT patients/:id`, **`POST patients/:id/account`** (`email?`, `password`: give an existing patient their own login) |
| **Patient Document Vault** | `GET patient-documents?patientId=`, `POST patient-documents/upload` (multipart: `file`, `patientId`, `type`, `expiryDate?`; replaces the existing copy of that type), `DELETE patient-documents/:id` |
| Pre-authorizations | `GET/POST preauthorizations`, `GET/PUT preauthorizations/:id`, **`GET preauthorizations/:id/readiness`**, `POST :id/submit` (**rejects with 400 and the missing items if not ready**), `:id/approve`, `:id/partial-approve`, `:id/reject`, `:id/query` |
| Request / claim documents | `GET documents`, `POST documents/upload` (multipart: `file`, `type`, and exactly one of `preAuthorizationId` / `claimId`), `DELETE documents/:id` |
| Queries | `GET queries`, `POST queries/:id/respond` (`text`, `attachments: [documentId]`), `POST queries/:id/resolve` |
| Claims | `GET/POST claims`, `GET/PUT claims/:id`, `POST :id/verify` (**needs a Hospital Bill**), `:id/approve`, `:id/reject`, `:id/settle` |
| Notifications | `GET notifications`, `PUT notifications/:id/read`, `PUT notifications/read-all` |
| Admin | `GET reports/summary`, `reports/preauthorizations`, `reports/claims`, `users`, `audit-logs`; `GET hospitals`, `insurers` |

Rules enforced on the server:

- Vault types (Government ID, Insurance Card, Policy Document) can only go to the vault; Hospital Bill / Discharge Summary only to a claim; the four treatment types (+ Additional Document) only to a pre-authorization.
- A request can only be submitted from `DRAFT` or `QUERY_RAISED`, and only when the readiness check passes. Expired vault documents count as missing.
- Hospitals can only change their own requests, claims and patients' vaults; patients only their own vault; insurers may read a vault only for patients with a request addressed to them.
- **Per-patient isolation:** each patient login is linked to one patient record. Patients only ever get their own patient record, requests, claims, documents, queries, notifications and live events; another patient's id returns 404. Hospitals and insurers are likewise limited to their own records. Public registration can only create PATIENT accounts.
- A claim can only be created from an `APPROVED` / `PARTIALLY_APPROVED` request.

## Connecting the frontend

The frontend calls this API directly. In `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```
`CLIENT_ORIGIN` in the backend `.env` must match the frontend's address (default `http://localhost:5173`).

## Project structure

```
backend/
├── schema.sql          # all 14 tables (applied by `npm run db:init`)
├── scripts/init-db.js   # applies schema.sql without the mysql CLI
├── seed.js              # run once to populate demo data
├── src/
│   ├── config/env.js    # reads .env
│   ├── db/pool.js       # mysql2 connection pool
│   ├── middleware/       # auth (JWT), upload (multer), errorHandler
│   ├── controllers/      # one file per resource — all business logic here
│   ├── routes/           # thin route -> controller wiring
│   ├── sockets/index.js  # Socket.IO setup + emit helpers
│   ├── utils/helpers.js  # asyncHandler, ApiError, nextId, addAuditLog
│   ├── app.js            # Express app (middleware + routes)
│   └── server.js         # HTTP server + Socket.IO bootstrap - entry point
└── uploads/              # uploaded documents land here (gitignored)
```

## Notes on design choices

- **Raw SQL over an ORM** — kept deliberately simple and transparent for a
  final-year project; every query is visible in its controller.
- **Sequential IDs** (`PA-1006`, `DOC-1010`, ...) are generated by looking at
  the current max per prefix (`utils/helpers.js: nextId`) to match the
  scheme the frontend displays (PA-1001, CLM-1001, DOC-1001...).
- **Status history tables** (`preauth_status_history`, `claim_status_history`)
  are append-only logs — every status-changing endpoint inserts one row here,
  which is exactly what the frontend's `StatusTimeline` component renders.
- **Socket.IO events** (`preauthorization:statusChanged`, `claim:statusChanged`,
  `notification:new`, `query:new`, `query:updated`) are emitted from inside
  the controllers right after the related database write, inside the same
  request — not from a separate job/queue — since the whole demo runs on a
  single instance.
- **Notifications** are created server-side (`notificationController.createNotification`)
  whenever a patient/hospital/insurer needs to know something changed, and
  pushed live to that one user's socket room.
