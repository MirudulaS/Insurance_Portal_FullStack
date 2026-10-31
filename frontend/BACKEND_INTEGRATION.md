# Backend Integration Plan

This document is the handoff for connecting the Express + MySQL backend to
this already-complete frontend. It assumes the backend will be built exactly
to the contract already assumed by the service layer.

---

## 1. How the switchover works, in one picture

```
USE_MOCK = true   (today)         USE_MOCK = false  (after backend exists)
--------------------------        --------------------------------------
Component                          Component                (unchanged)
   |                                   |
Service function                   Service function          (unchanged)
   |                                   |
if (USE_MOCK) { ...mock... }       apiClient.get/post/...   (the branch
   |                                   |                      that already
in-memory db (src/data/store.js)   Express REST API           exists as a
                                       |                       comment today)
                                    MySQL
```

Flip **one flag** in `src/config/index.js`:

```js
export const USE_MOCK = false;
```

and set `VITE_API_BASE_URL` in `.env` to the running server, e.g.
`http://localhost:5000/api`. Every service file already has the real call
written out in a comment directly under its mock branch — integration is
literally uncommenting those lines and deleting the `if (USE_MOCK)` block,
file by file.

---

## 2. Authentication flow

**Today (mock):** `authService.login()` checks the mock `users` table,
fabricates a token string, and stores `{ token, user }` in `localStorage`.

**Later (JWT):**

```
POST /api/auth/login  { email, password }
  -> 200 { user: {...}, token: "<jwt>" }
  -> 401 { message: "Invalid email or password." }
```

`apiClient.js` already attaches `Authorization: Bearer <token>` to every
request via an interceptor, and already clears `localStorage` and rejects
with a normalized `{ status, message }` shape on a 401 response — no changes
needed there.

Backend responsibilities:
- Hash passwords with bcrypt (never store or return plaintext)
- Issue a JWT (e.g. `jsonwebtoken`) containing `{ id, role, linkedId }`
- Verify the JWT on every protected route via middleware, attaching
  `req.user`
- `GET /api/auth/me` returns the decoded user (used on app reload to
  restore the session instead of trusting the cached `localStorage` copy)

---

## 3. REST API endpoints — request/response contract

All responses are JSON. All list endpoints accept the filters already sent
by the frontend as query params (see each service file for the exact filter
object shape — e.g. `preAuthorizationService.getAll({ hospitalId, status,
search })`).

### Auth

| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` | `{ user, token }` |
| POST | `/api/auth/register` | `{ name, email, password, role, phone }` | `{ user }` |
| POST | `/api/auth/logout` | — | `204` |
| GET | `/api/auth/me` | — | `{ user }` |

### Patients

| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/api/patients?hospitalId=&search=` | — | `Patient[]` |
| GET | `/api/patients/:id` | — | `Patient` |
| POST | `/api/patients` | `Patient` fields | `Patient` |
| PUT | `/api/patients/:id` | partial `Patient` | `Patient` |

`Patient` shape (matches `src/data/mockPatients.js`):
```json
{
  "id": "PAT-1001", "name": "Arun Kumar", "age": 46, "gender": "Male",
  "phone": "...", "email": "...", "address": "...",
  "policyNumber": "SH-POL-778291", "insurerId": "INR-1001",
  "primaryHospitalId": "HOS-1001", "bloodGroup": "B+"
}
```

### Pre-Authorizations

| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/api/preauthorizations?hospitalId=&insurerId=&patientId=&status=&search=` | — | `PreAuth[]` |
| GET | `/api/preauthorizations/:id` | — | `PreAuth` (incl. `statusHistory[]`) |
| POST | `/api/preauthorizations` | draft fields (see `mockPreAuthorizations.js`) | `PreAuth` (status `DRAFT`) |
| PUT | `/api/preauthorizations/:id` | partial fields | `PreAuth` (only while `DRAFT`) |
| POST | `/api/preauthorizations/:id/submit` | — | `PreAuth` (status → `SUBMITTED`/`RESUBMITTED` then `UNDER_REVIEW`) |
| POST | `/api/preauthorizations/:id/approve` | `{ approvedAmount, remarks }` | `PreAuth` (status `APPROVED`) |
| POST | `/api/preauthorizations/:id/partial-approve` | `{ approvedAmount, remarks }` | `PreAuth` (status `PARTIALLY_APPROVED`) |
| POST | `/api/preauthorizations/:id/reject` | `{ remarks }` | `PreAuth` (status `REJECTED`) |
| POST | `/api/preauthorizations/:id/query` | `{ question }` | `{ request, query }` (status `QUERY_RAISED`; creates a `Query` row) |

Every status-changing endpoint above must append one entry to
`statusHistory` (a `preauth_status_history` table, `{ preAuthId, status, at,
by, note }`) — the frontend's `StatusTimeline` component renders this array
directly.

### Documents

| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/api/documents?preAuthorizationId=&claimId=` | — | `Document[]` |
| GET | `/api/documents/:id` | — | `Document` |
| POST | `/api/documents/upload` | `multipart/form-data` (see §5) | `Document` |
| DELETE | `/api/documents/:id` | — | `204` |

### Queries

| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/api/queries?preAuthorizationId=&status=` | — | `Query[]` |
| GET | `/api/queries/:id` | — | `Query` (incl. `messages[]`) |
| POST | `/api/queries/:id/respond` | `{ text, attachments: [documentId] }` | `Query` (status `RESPONDED`, appends to `messages[]`) |
| POST | `/api/queries/:id/resolve` | — | `Query` (status `RESOLVED`) |

### Claims

| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/api/claims?hospitalId=&insurerId=&patientId=&status=` | — | `Claim[]` |
| GET | `/api/claims/:id` | — | `Claim` (incl. `statusHistory[]`) |
| POST | `/api/claims` | `{ preAuthorizationId, claimedAmount }` | `Claim` (status `CLAIM_SUBMITTED`; server derives patient/hospital/insurer/approvedAmount from the linked pre-auth — reject with 400 unless that pre-auth is `APPROVED` or `PARTIALLY_APPROVED`) |
| PUT | `/api/claims/:id` | partial fields | `Claim` |
| POST | `/api/claims/:id/verify` | `{ remarks }` | `Claim` (status `UNDER_VERIFICATION`) |
| POST | `/api/claims/:id/approve` | `{ remarks }` | `Claim` (status `APPROVED`) |
| POST | `/api/claims/:id/reject` | `{ remarks }` | `Claim` (status `REJECTED`) |
| POST | `/api/claims/:id/settle` | `{ settlementAmount }` | `Claim` (status `SETTLEMENT_PROCESSED` then `SETTLED`) |

### Notifications

| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/api/notifications` | — | `Notification[]` for `req.user.id`, newest first |
| PUT | `/api/notifications/:id/read` | — | `Notification` |
| PUT | `/api/notifications/read-all` | — | `204` |

### Reports

| Method | Endpoint | Response |
|---|---|---|
| GET | `/api/reports/summary` | `{ totalRequests, approvedCount, rejectedCount, pendingCount, draftCount, approvalPercentage, rejectionPercentage, avgProcessingTimeHours, totalClaims, claimsSettled, claimsPending, totalSettledAmount }` |
| GET | `/api/reports/preauthorizations` | `{ byStatus: [{status,count}], overTime: [{month,count}] }` |
| GET | `/api/reports/claims` | `{ byStatus: [{status,count}] }` |

The exact same shapes are already computed client-side in
`src/services/reportService.js` — the backend only needs to replace the
in-memory `.filter()`/`.reduce()` calls with SQL `GROUP BY` / `COUNT`
queries returning the same JSON shape.

---

## 4. MySQL schema expected from each endpoint

Suggested tables (names match the mock data files 1:1 so the migration is
mechanical):

- `users` (id, name, email, password_hash, role, linked_id, phone, avatar_color, created_at)
- `patients` (id, user_id, name, age, gender, phone, email, address, policy_number, insurer_id, primary_hospital_id, blood_group)
- `hospitals` (id, name, city, registration_no, contact_email, contact_phone)
- `insurers` (id, name, ircda_code, contact_email, contact_phone)
- `preauthorizations` (id, patient_id, hospital_id, insurer_id, policy_number, diagnosis, treatment, doctor, estimated_cost, admission_date, expected_discharge_date, status, approved_amount, reviewer, remarks, created_at, updated_at)
- `preauth_status_history` (id, preauth_id, status, at, by, note)
- `documents` (id, preauthorization_id NULL, claim_id NULL, type, file_name, file_size, mime_type, uploaded_by, uploaded_at, file_path)
- `queries` (id, preauthorization_id, question, raised_by, raised_by_role, raised_date, status)
- `query_messages` (id, query_id, from_name, role, text, attachments JSON, at)
- `claims` (id, preauthorization_id, patient_id, hospital_id, insurer_id, treatment_cost, approved_amount, claimed_amount, settlement_amount, claim_date, status, reviewer, remarks)
- `claim_status_history` (id, claim_id, status, at, by, note)
- `notifications` (id, user_id, type, title, message, related_id, is_read, created_at)
- `audit_logs` (id, entity_type, entity_id, action, by, at, details)

Every list/detail GET endpoint above maps to a `SELECT` (with `JOIN`s for
history/message sub-arrays); every action endpoint maps to an `UPDATE` plus
an `INSERT` into the relevant `_status_history` table, wrapped in a
transaction so the status change and history row are atomic.

---

## 5. File upload — FormData structure

Frontend already sends (see the commented block in
`src/services/documentService.js`):

```js
const formData = new FormData();
formData.append('file', file);          // browser File object
formData.append('type', type);          // one of the 7 REQUIRED_DOCUMENT_TYPES
if (preAuthorizationId) formData.append('preAuthorizationId', preAuthorizationId);
if (claimId) formData.append('claimId', claimId);

await apiClient.post('/documents/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

Backend: use `multer` with disk storage into `backend/uploads/`, validate
mimetype (`application/pdf`, `image/jpeg`, `image/png`) and size (≤5MB —
already enforced client-side in `src/utils/fileValidation.js`, but must be
re-validated server-side), then insert a `documents` row with the saved
path and return the same `Document` JSON shape the frontend already renders
(`DocumentCard`, `DocumentChecklist`).

---

## 6. Socket.IO event structure

Event names are already fixed by `src/services/socketService.js` and used
throughout the frontend via the `useLiveRefresh` hook — the backend just
needs to emit these at the right moments:

| Event | Emitted when | Payload |
|---|---|---|
| `preauthorization:statusChanged` | any pre-auth status-changing endpoint succeeds | `{ id, status }` |
| `claim:statusChanged` | any claim status-changing endpoint succeeds | `{ id, status }` |
| `notification:new` | a notification is created for a user | full `Notification` object |
| `query:new` | a query is raised | full `Query` object |
| `query:updated` | a query gets a response or is resolved | full `Query` object |

Recommended pattern: authenticate the socket connection with the same JWT
(`io(SOCKET_URL, { auth: { token } })`), join a room per user
(`socket.join(userId)`) and per role+org (`socket.join('insurer:INR-1001')`)
on connect, and emit notifications to the specific user's room while
emitting status-change events to the rooms of everyone who should see them
(patient, hospital, insurer involved in that record).

---

## 7. Mock service functions being replaced

Every function below already contains its real implementation, commented,
directly beneath the mock branch — this is a checklist, not new code to
design:

| File | Functions |
|---|---|
| `src/services/authService.js` | `login`, `register`, `logout`, `getMe` |
| `src/services/patientService.js` | `getAll`, `getById`, `create`, `update` |
| `src/services/preAuthorizationService.js` | `getAll`, `getById`, `create`, `update`, `submit`, `approve`, `partialApprove`, `reject`, `raiseQuery` |
| `src/services/documentService.js` | `getAll`, `getById`, `upload`, `remove` (`getChecklist` stays client-side — it's pure presentation logic) |
| `src/services/queryService.js` | `getAll`, `getById`, `respond`, `resolve` |
| `src/services/claimService.js` | `getAll`, `getById`, `create`, `update`, `verify`, `approve`, `reject`, `settle` |
| `src/services/notificationService.js` | `getAll`, `markAsRead`, `markAllAsRead` (`push` is removed entirely — the backend creates notifications server-side and pushes them via Socket.IO instead) |
| `src/services/reportService.js` | `getSummary`, `getPreAuthorizationReport`, `getClaimReport` |
| `src/services/organizationService.js` | `getHospitals`, `getInsurers` |
| `src/services/userService.js` | `getAll`, `getAuditLogs` |
| `src/services/socketService.js` | entire file body (keep the exported `on`/`off`/`emit` function names identical) |

---

## 8. Exact files to touch during integration

**Must change:**
- `src/config/index.js` — set `USE_MOCK = false`
- `.env` — set `VITE_API_BASE_URL` (and `VITE_SOCKET_URL`)
- Every file listed in the table in §7 — remove the `if (USE_MOCK) {...}`
  mock branch, uncomment the real call below it

**Should NOT need to change:**
- Anything in `src/pages/`
- Anything in `src/components/`
- Anything in `src/context/`
- Anything in `src/hooks/`
- `src/routes/`
- `src/layouts/`

**Can be deleted once the backend is live:**
- `src/data/` (all mock seed files + `store.js`) — no longer imported by
  anything once every service's mock branch is removed

If a page ever needs to change during integration, that's a signal the
service layer's return shape doesn't match what was assumed here — the fix
belongs in the service function's real implementation, not in the page.
